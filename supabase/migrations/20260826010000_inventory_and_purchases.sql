-- PRODUCTS / INVENTORY_MOVEMENTS / SUPPLIERS / PURCHASES / PURCHASE_ITEMS — base do estoque
-- da oficina. RN-STK-001: saldo de estoque só muda por movimentação auditável — products.
-- stock_on_hand é uma coluna cache mantida por trigger a partir de inventory_movements, mesmo
-- padrão de vehicles.mileage/vehicle_mileage_history (sync_vehicle_mileage).
--
-- Conecta com o que já existe: estimate_items ganha product_id opcional (peça do catálogo);
-- quando uma OS chega em DELIVERED, os itens com produto vinculado geram uma saída de estoque
-- automaticamente — mesmo gatilho de evento (AFTER UPDATE ... DELIVERED) já usado por
-- create_maintenance_record_from_work_order()/create_warranty_from_work_order().
--
-- Fora do escopo desta fatia: reserva de estoque no momento da aprovação do orçamento (só
-- desconta na entrega) e bloqueio de saldo negativo — deixado passar de propósito, porque
-- bloquear entregaria a OS travada por um problema de cadastro de estoque, sem tela dedicada
-- ainda pra staff resolver isso no fluxo. Saldo negativo fica visível na tela como sinal de que
-- algo precisa de ajuste manual.

insert into public.permissions (code, description) values
  ('product.manage', 'Gerenciar catálogo de produtos e ajustar estoque'),
  ('purchase.manage', 'Criar e receber compras de fornecedores');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('product.manage', 'purchase.manage')
where r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

-- ── PRODUCTS ────────────────────────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sku varchar(50),
  name varchar(200) not null,
  unit varchar(10) not null default 'UN',
  unit_cost numeric(12, 2),
  unit_price numeric(12, 2),
  min_stock int not null default 0,
  stock_on_hand int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_min_stock_check check (min_stock >= 0)
);

comment on table public.products is 'PRODUCTS from the data dictionary. stock_on_hand is a cache kept in sync by sync_product_stock() from inventory_movements — never updated directly by the app (RN-STK-001).';

create unique index products_tenant_sku_unique on public.products (tenant_id, sku) where sku is not null;
create index products_tenant_id_idx on public.products (tenant_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

-- ── SUPPLIERS ───────────────────────────────────────────────────────────────
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name varchar(200) not null,
  phone varchar(30),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.suppliers is 'SUPPLIERS from the data dictionary.';

create index suppliers_tenant_id_idx on public.suppliers (tenant_id);

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

-- ── PURCHASES ───────────────────────────────────────────────────────────────
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  status varchar(20) not null default 'DRAFT',
  notes text,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  received_at timestamptz,
  constraint purchases_status_check check (status in ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELED'))
);

comment on table public.purchases is 'PURCHASES from the data dictionary. Receiving (status -> RECEIVED) generates inventory_movements for every item — see receive_purchase().';

create index purchases_tenant_id_idx on public.purchases (tenant_id);

alter table public.purchases enable row level security;

-- ── PURCHASE_ITEMS ──────────────────────────────────────────────────────────
create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity int not null,
  unit_cost numeric(12, 2) not null,
  constraint purchase_items_quantity_check check (quantity > 0),
  constraint purchase_items_unit_cost_check check (unit_cost >= 0)
);

comment on table public.purchase_items is 'PURCHASE_ITEMS from the data dictionary. Only inserted while the parent purchase is still DRAFT/ORDERED — see purchase_items_insert_staff.';

create index purchase_items_purchase_id_idx on public.purchase_items (purchase_id);

alter table public.purchase_items enable row level security;

-- ── INVENTORY_MOVEMENTS ─────────────────────────────────────────────────────
-- Fato imutável (mesmo espírito do ADR 0004 aplicado ao estoque): só inserção, nunca editado
-- ou apagado. quantity é assinada (positiva = entrada, negativa = saída) pra somar direto.
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  type varchar(20) not null,
  quantity int not null,
  work_order_id uuid references public.work_orders (id) on delete set null,
  purchase_id uuid references public.purchases (id) on delete set null,
  notes text,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  constraint inventory_movements_type_check check (type in ('PURCHASE', 'USAGE', 'ADJUSTMENT', 'RETURN')),
  constraint inventory_movements_quantity_not_zero_check check (quantity <> 0)
);

comment on table public.inventory_movements is 'INVENTORY_MOVEMENTS from the data dictionary. Append-only ledger — the only way products.stock_on_hand changes (RN-STK-001).';

create index inventory_movements_tenant_id_idx on public.inventory_movements (tenant_id);
create index inventory_movements_product_id_idx on public.inventory_movements (product_id);

alter table public.inventory_movements enable row level security;

create or replace function public.sync_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products set stock_on_hand = stock_on_hand + new.quantity where id = new.product_id;
  return new;
end;
$$;

create trigger inventory_movements_sync_stock
  after insert on public.inventory_movements
  for each row execute function public.sync_product_stock();

-- ── receber uma compra gera as movimentações de entrada ────────────────────
create or replace function public.receive_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  if new.status = 'RECEIVED' and old.status is distinct from 'RECEIVED' then
    for v_item in select * from public.purchase_items where purchase_id = new.id loop
      insert into public.inventory_movements
        (tenant_id, product_id, type, quantity, purchase_id, created_by)
      values (new.tenant_id, v_item.product_id, 'PURCHASE', v_item.quantity, new.id, auth.uid());

      update public.products set unit_cost = v_item.unit_cost where id = v_item.product_id;
    end loop;

    new.received_at = now();
  end if;

  return new;
end;
$$;

create trigger purchases_receive
  before update on public.purchases
  for each row execute function public.receive_purchase();

-- ── ESTIMATE_ITEMS: link opcional pro catálogo ──────────────────────────────
alter table public.estimate_items add column product_id uuid references public.products (id) on delete set null;

create or replace function public.enforce_estimate_item_product_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estimate_tenant_id uuid;
  v_product_tenant_id uuid;
begin
  if new.product_id is null then
    return new;
  end if;

  select tenant_id into v_estimate_tenant_id from public.estimates where id = new.estimate_id;
  select tenant_id into v_product_tenant_id from public.products where id = new.product_id;

  if v_estimate_tenant_id is distinct from v_product_tenant_id then
    raise exception 'product % does not belong to the same tenant as estimate %', new.product_id, new.estimate_id;
  end if;

  return new;
end;
$$;

create trigger estimate_items_enforce_product_tenant
  before insert or update on public.estimate_items
  for each row execute function public.enforce_estimate_item_product_tenant();

-- ── WORK_ORDERS: entrega consome estoque dos itens com produto vinculado ───
create or replace function public.consume_stock_on_work_order_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  if new.status = 'DELIVERED' and old.status is distinct from 'DELIVERED' and new.estimate_id is not null then
    for v_item in
      select product_id, quantity from public.estimate_items
      where estimate_id = new.estimate_id and product_id is not null
    loop
      insert into public.inventory_movements
        (tenant_id, product_id, type, quantity, work_order_id)
      values (new.tenant_id, v_item.product_id, 'USAGE', -v_item.quantity, new.id);
    end loop;
  end if;

  return new;
end;
$$;

create trigger work_orders_consume_stock
  after update on public.work_orders
  for each row execute function public.consume_stock_on_work_order_delivered();

-- ── grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on
  public.products, public.suppliers, public.purchases, public.purchase_items, public.inventory_movements
to service_role;

grant select, insert, update on public.products to authenticated;
grant select, insert, update on public.suppliers to authenticated;
grant select, insert, update on public.purchases to authenticated;
grant select, insert on public.purchase_items to authenticated;
-- INSERT existe só pro ajuste manual (type ADJUSTMENT) — PURCHASE e USAGE só nascem pelos
-- triggers acima (RN-STK-001); a policy abaixo garante isso, não o GRANT.
grant select, insert on public.inventory_movements to authenticated;

-- ── RLS: products ───────────────────────────────────────────────────────────
create policy "products_select_staff"
  on public.products for select
  to authenticated
  using (tenant_id = public.current_tenant_id() or public.has_permission('platform.super_admin'));

create policy "products_insert_staff"
  on public.products for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('product.manage'));

create policy "products_update_staff"
  on public.products for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('product.manage'))
  with check (tenant_id = public.current_tenant_id() and public.has_permission('product.manage'));

-- ── RLS: suppliers ──────────────────────────────────────────────────────────
create policy "suppliers_select_staff"
  on public.suppliers for select
  to authenticated
  using (tenant_id = public.current_tenant_id() or public.has_permission('platform.super_admin'));

create policy "suppliers_insert_staff"
  on public.suppliers for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('purchase.manage'));

create policy "suppliers_update_staff"
  on public.suppliers for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('purchase.manage'))
  with check (tenant_id = public.current_tenant_id() and public.has_permission('purchase.manage'));

-- ── RLS: purchases ──────────────────────────────────────────────────────────
create policy "purchases_select_staff"
  on public.purchases for select
  to authenticated
  using (tenant_id = public.current_tenant_id() or public.has_permission('platform.super_admin'));

create policy "purchases_insert_staff"
  on public.purchases for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('purchase.manage'));

create policy "purchases_update_staff"
  on public.purchases for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('purchase.manage'))
  with check (tenant_id = public.current_tenant_id() and public.has_permission('purchase.manage'));

-- ── RLS: purchase_items ─────────────────────────────────────────────────────
create policy "purchase_items_select_visible_purchase"
  on public.purchase_items for select
  to authenticated
  using (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_items.purchase_id
        and (p.tenant_id = public.current_tenant_id() or public.has_permission('platform.super_admin'))
    )
  );

-- Só dá pra adicionar item enquanto a compra ainda não foi recebida/cancelada — depois disso
-- ela vira histórico (mesmo espírito de estimate_items_insert_staff: só junto com a criação).
create policy "purchase_items_insert_staff"
  on public.purchase_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_items.purchase_id
        and p.status in ('DRAFT', 'ORDERED')
        and p.tenant_id = public.current_tenant_id()
        and public.has_permission('purchase.manage')
    )
  );

-- ── RLS: inventory_movements ─────────────────────────────────────────────────
create policy "inventory_movements_select_staff"
  on public.inventory_movements for select
  to authenticated
  using (tenant_id = public.current_tenant_id() or public.has_permission('platform.super_admin'));

-- Único jeito de um INSERT direto do app passar: type = 'ADJUSTMENT' (correção manual de
-- estoque). PURCHASE nasce só de receive_purchase() e USAGE só de
-- consume_stock_on_work_order_delivered() — ambos SECURITY DEFINER, então não dependem desta
-- policy pra escrever.
create policy "inventory_movements_insert_adjustment_staff"
  on public.inventory_movements for insert
  to authenticated
  with check (
    type = 'ADJUSTMENT'
    and tenant_id = public.current_tenant_id()
    and public.has_permission('product.manage')
  );
