-- MAINTENANCE_RECORDS / WARRANTY_DEFINITIONS / WARRANTIES — primeira fatia da Vida do Carro
-- completa (ADR 0004): o veículo, não a oficina, é dono do próprio histórico. Uma OS entregue
-- vira automaticamente um registro na Vida do Carro e uma garantia; o motorista também pode
-- registrar manutenções feitas fora da Wezcar, porque o histórico é dele, não de uma oficina
-- específica.
--
-- Documentos/fotos ficam pra uma fatia futura (dependem de Supabase Storage, fora do escopo
-- desta migration) — ver docs/banco-de-dados/dicionario-de-dados.md.

insert into public.permissions (code, description) values
  ('warranty.manage', 'Configurar o prazo padrão de garantia da oficina');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'warranty.manage'
where r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

-- ── MAINTENANCE_RECORDS ─────────────────────────────────────────────────────
-- Fato imutável (ADR 0004, princípio 2): igual vehicle_mileage_history/work_order_events, só
-- inserção, nunca editado ou apagado. Pertence ao veículo (vehicle_id), não a um tenant — uma
-- linha WORK_ORDER carrega o tenant_id de quem prestou o serviço só como metadado.
create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  work_order_id uuid references public.work_orders (id) on delete set null,
  source varchar(20) not null,
  description text not null,
  mileage int,
  cost numeric(12, 2),
  performed_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  constraint maintenance_records_source_check check (source in ('WORK_ORDER', 'MANUAL')),
  constraint maintenance_records_work_order_source_check check (
    (source = 'WORK_ORDER' and work_order_id is not null)
    or (source = 'MANUAL' and work_order_id is null and tenant_id is null)
  )
);

comment on table public.maintenance_records is 'MAINTENANCE_RECORDS from the data dictionary — the vehicle''s history timeline. WORK_ORDER rows are written only by create_maintenance_record_from_work_order(); MANUAL rows are the vehicle owner logging service done outside Wezcar.';

create index maintenance_records_vehicle_id_idx on public.maintenance_records (vehicle_id);
create index maintenance_records_tenant_id_idx on public.maintenance_records (tenant_id);

alter table public.maintenance_records enable row level security;

create or replace function public.create_maintenance_record_from_work_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_description text;
  v_cost numeric(12, 2);
  v_mileage int;
begin
  if new.status = 'DELIVERED' and old.status is distinct from 'DELIVERED' then
    select string_agg(ei.description, ', ' order by ei.description), sum(ei.quantity * ei.unit_price)
      into v_description, v_cost
      from public.estimate_items ei
      where ei.estimate_id = new.estimate_id;

    select mileage into v_mileage from public.vehicles where id = new.vehicle_id;

    insert into public.maintenance_records
      (vehicle_id, tenant_id, work_order_id, source, description, mileage, cost, performed_at)
    values (
      new.vehicle_id, new.tenant_id, new.id, 'WORK_ORDER',
      coalesce(v_description, 'Ordem de serviço concluída'), v_mileage, v_cost, now()
    );
  end if;

  return new;
end;
$$;

create trigger work_orders_create_maintenance_record
  after update on public.work_orders
  for each row execute function public.create_maintenance_record_from_work_order();

-- ── WARRANTY_DEFINITIONS ────────────────────────────────────────────────────
-- Mesmo padrão de sla_definitions: uma linha por tenant, prazo padrão configurável.
create table public.warranty_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  default_months int not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warranty_definitions_default_months_check check (default_months > 0)
);

comment on table public.warranty_definitions is 'WARRANTY_DEFINITIONS from the data dictionary. Tenant-configurable default warranty period (months) for a completed work order.';

create trigger warranty_definitions_set_updated_at
  before update on public.warranty_definitions
  for each row execute function public.set_updated_at();

alter table public.warranty_definitions enable row level security;

-- ── WARRANTIES ──────────────────────────────────────────────────────────────
create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  work_order_id uuid not null unique references public.work_orders (id) on delete cascade,
  maintenance_record_id uuid references public.maintenance_records (id) on delete set null,
  description text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.warranties is 'WARRANTIES from the data dictionary. One per work order, stamped once by create_warranty_from_work_order() — expires_at never recalculated after creation, same immutability spirit as sla_instances.due_at.';

create index warranties_vehicle_id_idx on public.warranties (vehicle_id);
create index warranties_tenant_id_idx on public.warranties (tenant_id);

alter table public.warranties enable row level security;

create or replace function public.create_warranty_from_work_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months int;
  v_description text;
  v_maintenance_record_id uuid;
begin
  if new.status = 'DELIVERED' and old.status is distinct from 'DELIVERED' then
    select default_months into v_months from public.warranty_definitions where tenant_id = new.tenant_id;
    v_months := coalesce(v_months, 3);

    select id, description into v_maintenance_record_id, v_description
      from public.maintenance_records
      where work_order_id = new.id
      order by created_at desc
      limit 1;

    insert into public.warranties
      (vehicle_id, tenant_id, work_order_id, maintenance_record_id, description, expires_at)
    values (
      new.vehicle_id, new.tenant_id, new.id, v_maintenance_record_id,
      coalesce(v_description, 'Serviço realizado'), now() + (v_months || ' months')::interval
    );
  end if;

  return new;
end;
$$;

create trigger work_orders_create_warranty
  after update on public.work_orders
  for each row execute function public.create_warranty_from_work_order();

-- Computed column (convenção PostgREST), mesmo espírito de work_orders_sla_status().
create or replace function public.warranties_status(w public.warranties)
returns text
language sql
stable
as $$
  select case when now() > w.expires_at then 'EXPIRED' else 'ACTIVE' end;
$$;

comment on function public.warranties_status(public.warranties) is 'Computed column: select=*,warranties_status em warranties. Deriva ACTIVE/EXPIRED na leitura a partir de expires_at.';

-- ── grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on
  public.maintenance_records, public.warranty_definitions, public.warranties
to service_role;

-- Sem UPDATE/DELETE pra authenticated em maintenance_records/warranties: são fatos imutáveis
-- (ADR 0004, princípio 2). Só INSERT (restrito a MANUAL pela policy abaixo) e SELECT.
grant select, insert on public.maintenance_records to authenticated;
grant select, insert, update on public.warranty_definitions to authenticated;
grant select on public.warranties to authenticated;
grant execute on function public.warranties_status(public.warranties) to authenticated;

-- ── RLS: maintenance_records ────────────────────────────────────────────────
create policy "maintenance_records_select_owner_or_staff"
  on public.maintenance_records for select
  to authenticated
  using (
    exists (select 1 from public.vehicles v where v.id = maintenance_records.vehicle_id and v.customer_id = auth.uid())
    or (tenant_id = public.current_tenant_id() and public.has_permission('work_order.update'))
    or public.has_permission('platform.super_admin')
  );

-- O dono do veículo só consegue registrar manutenção MANUAL (feita fora da Wezcar) — uma linha
-- WORK_ORDER só nasce pelo trigger acima, nunca por INSERT direto do app.
create policy "maintenance_records_insert_owner_manual"
  on public.maintenance_records for insert
  to authenticated
  with check (
    source = 'MANUAL'
    and tenant_id is null
    and work_order_id is null
    and exists (select 1 from public.vehicles v where v.id = maintenance_records.vehicle_id and v.customer_id = auth.uid())
  );

-- ── RLS: warranty_definitions ───────────────────────────────────────────────
create policy "warranty_definitions_select_staff"
  on public.warranty_definitions for select
  to authenticated
  using (tenant_id = public.current_tenant_id() or public.has_permission('platform.super_admin'));

create policy "warranty_definitions_insert_staff"
  on public.warranty_definitions for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('warranty.manage'));

create policy "warranty_definitions_update_staff"
  on public.warranty_definitions for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('warranty.manage'))
  with check (tenant_id = public.current_tenant_id() and public.has_permission('warranty.manage'));

-- ── RLS: warranties ─────────────────────────────────────────────────────────
create policy "warranties_select_owner_or_staff"
  on public.warranties for select
  to authenticated
  using (
    exists (select 1 from public.vehicles v where v.id = warranties.vehicle_id and v.customer_id = auth.uid())
    or (tenant_id = public.current_tenant_id() and public.has_permission('work_order.update'))
    or public.has_permission('platform.super_admin')
  );
