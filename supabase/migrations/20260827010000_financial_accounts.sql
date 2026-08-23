-- ACCOUNTS_RECEIVABLE / ACCOUNTS_PAYABLE / PAYMENTS — fecha o ciclo financeiro: OS entregue
-- vira conta a receber do cliente, compra recebida vira conta a pagar ao fornecedor. Mesmo
-- padrão de INVENTORY_MOVEMENTS: um livro-razão append-only (payments) com um saldo cache
-- (paid_amount) mantido por trigger — nunca escrito direto pelo app.
--
-- RN-FIN-001: pagamentos precisam ser idempotentes pra evitar baixa duplicada. Cada pagamento
-- carrega um idempotency_key único por tenant; o app gera essa chave uma vez por carregamento
-- da tela (não por clique), então um duplo-clique tenta inserir a mesma chave duas vezes — a
-- segunda tentativa esbarra na unique constraint e é tratada como "já registrado", não como
-- erro nem como uma segunda baixa.

insert into public.permissions (code, description) values
  ('financial.manage', 'Gerenciar contas a receber/pagar e registrar pagamentos');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'financial.manage'
where r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

-- ── ACCOUNTS_RECEIVABLE ──────────────────────────────────────────────────────
create table public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  work_order_id uuid not null unique references public.work_orders (id) on delete cascade,
  amount numeric(12, 2) not null,
  paid_amount numeric(12, 2) not null default 0,
  status varchar(20) not null default 'OPEN',
  created_at timestamptz not null default now(),
  constraint accounts_receivable_amount_check check (amount >= 0),
  constraint accounts_receivable_status_check check (status in ('OPEN', 'PAID', 'CANCELED'))
);

comment on table public.accounts_receivable is 'ACCOUNTS_RECEIVABLE from the data dictionary. One per delivered work order, created by create_receivable_from_work_order(). paid_amount/status are caches kept in sync by sync_payment_balance() from payments — never written directly by the app.';

create index accounts_receivable_tenant_id_idx on public.accounts_receivable (tenant_id);

alter table public.accounts_receivable enable row level security;

create or replace function public.create_receivable_from_work_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(12, 2);
begin
  if new.status = 'DELIVERED' and old.status is distinct from 'DELIVERED' and new.estimate_id is not null then
    select coalesce(sum(quantity * unit_price), 0) into v_amount
      from public.estimate_items where estimate_id = new.estimate_id;

    insert into public.accounts_receivable (tenant_id, customer_id, work_order_id, amount)
    values (new.tenant_id, new.customer_id, new.id, v_amount);
  end if;

  return new;
end;
$$;

create trigger work_orders_create_receivable
  after update on public.work_orders
  for each row execute function public.create_receivable_from_work_order();

-- ── ACCOUNTS_PAYABLE ─────────────────────────────────────────────────────────
create table public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  purchase_id uuid not null unique references public.purchases (id) on delete cascade,
  amount numeric(12, 2) not null,
  paid_amount numeric(12, 2) not null default 0,
  status varchar(20) not null default 'OPEN',
  created_at timestamptz not null default now(),
  constraint accounts_payable_amount_check check (amount >= 0),
  constraint accounts_payable_status_check check (status in ('OPEN', 'PAID', 'CANCELED'))
);

comment on table public.accounts_payable is 'ACCOUNTS_PAYABLE from the data dictionary. One per received purchase, created by create_payable_from_purchase(). Same cache pattern as accounts_receivable.';

create index accounts_payable_tenant_id_idx on public.accounts_payable (tenant_id);

alter table public.accounts_payable enable row level security;

create or replace function public.create_payable_from_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(12, 2);
begin
  if new.status = 'RECEIVED' and old.status is distinct from 'RECEIVED' then
    select coalesce(sum(quantity * unit_cost), 0) into v_amount
      from public.purchase_items where purchase_id = new.id;

    insert into public.accounts_payable (tenant_id, supplier_id, purchase_id, amount)
    values (new.tenant_id, new.supplier_id, new.id, v_amount);
  end if;

  return new;
end;
$$;

create trigger purchases_create_payable
  after update on public.purchases
  for each row execute function public.create_payable_from_purchase();

-- ── PAYMENTS ────────────────────────────────────────────────────────────────
-- Livro-razão append-only. Exatamente uma de receivable_id/payable_id é preenchida — um
-- pagamento é ou um recebimento de cliente ou uma baixa a fornecedor, nunca os dois.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  receivable_id uuid references public.accounts_receivable (id) on delete cascade,
  payable_id uuid references public.accounts_payable (id) on delete cascade,
  amount numeric(12, 2) not null,
  method varchar(20) not null,
  idempotency_key text not null,
  notes text,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  constraint payments_amount_check check (amount > 0),
  constraint payments_method_check check (method in ('PIX', 'CARD', 'CASH', 'TRANSFER', 'OTHER')),
  constraint payments_exactly_one_account_check check (
    (receivable_id is not null and payable_id is null)
    or (receivable_id is null and payable_id is not null)
  )
);

comment on table public.payments is 'PAYMENTS from the data dictionary. Append-only ledger — accounts_receivable/payable.paid_amount are computed from this by sync_payment_balance(). idempotency_key is unique per tenant (RN-FIN-001).';

create unique index payments_tenant_idempotency_key_unique on public.payments (tenant_id, idempotency_key);
create index payments_receivable_id_idx on public.payments (receivable_id);
create index payments_payable_id_idx on public.payments (payable_id);

alter table public.payments enable row level security;

create or replace function public.sync_payment_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.receivable_id is not null then
    update public.accounts_receivable
    set paid_amount = paid_amount + new.amount,
        status = case when paid_amount + new.amount >= amount then 'PAID' else status end
    where id = new.receivable_id;
  end if;

  if new.payable_id is not null then
    update public.accounts_payable
    set paid_amount = paid_amount + new.amount,
        status = case when paid_amount + new.amount >= amount then 'PAID' else status end
    where id = new.payable_id;
  end if;

  return new;
end;
$$;

create trigger payments_sync_balance
  after insert on public.payments
  for each row execute function public.sync_payment_balance();

-- ── grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on
  public.accounts_receivable, public.accounts_payable, public.payments
to service_role;

-- Sem UPDATE pra authenticated em accounts_receivable/payable: só os triggers de OS
-- entregue/compra recebida criam a linha, e só o trigger de pagamento atualiza o saldo.
grant select on public.accounts_receivable to authenticated;
grant select on public.accounts_payable to authenticated;
grant select, insert on public.payments to authenticated;

-- ── RLS: accounts_receivable ─────────────────────────────────────────────────
create policy "accounts_receivable_select_own_or_staff"
  on public.accounts_receivable for select
  to authenticated
  using (
    customer_id = auth.uid()
    or (tenant_id = public.current_tenant_id() and public.has_permission('financial.manage'))
    or public.has_permission('platform.super_admin')
  );

-- ── RLS: accounts_payable ─────────────────────────────────────────────────────
create policy "accounts_payable_select_staff"
  on public.accounts_payable for select
  to authenticated
  using (tenant_id = public.current_tenant_id() or public.has_permission('platform.super_admin'));

-- ── RLS: payments ───────────────────────────────────────────────────────────
create policy "payments_select_visible_account"
  on public.payments for select
  to authenticated
  using (
    (
      receivable_id is not null and exists (
        select 1 from public.accounts_receivable ar
        where ar.id = payments.receivable_id
          and (ar.customer_id = auth.uid() or ar.tenant_id = public.current_tenant_id())
      )
    )
    or (
      payable_id is not null
      and tenant_id = public.current_tenant_id()
    )
    or public.has_permission('platform.super_admin')
  );

-- Só staff com financial.manage registra pagamento, e só contra uma conta da própria oficina —
-- cliente nunca insere pagamento diretamente (evita ele mesmo "quitar" a própria conta).
create policy "payments_insert_staff"
  on public.payments for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.has_permission('financial.manage')
    and (
      (receivable_id is not null and exists (
        select 1 from public.accounts_receivable ar
        where ar.id = payments.receivable_id and ar.tenant_id = public.current_tenant_id()
      ))
      or (payable_id is not null and exists (
        select 1 from public.accounts_payable ap
        where ap.id = payments.payable_id and ap.tenant_id = public.current_tenant_id()
      ))
    )
  );
