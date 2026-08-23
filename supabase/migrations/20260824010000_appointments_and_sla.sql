-- APPOINTMENTS (agenda) / SLA_DEFINITIONS / SLA_INSTANCES — fecha o vão entre "orçamento
-- aprovado" e "veículo chega pra execução": a partir de uma OS já criada, a oficina agenda a
-- execução e passa a ter um prazo de entrega (SLA) calculado pelo backend (RN-SLA-001), não
-- estimado no frontend.

insert into public.permissions (code, description) values
  ('appointment.manage', 'Agendar e gerenciar a execução de uma OS'),
  ('sla.manage', 'Configurar o prazo padrão de SLA da oficina');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('appointment.manage', 'sla.manage')
where r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

-- ── SLA_DEFINITIONS ─────────────────────────────────────────────────────────
-- Uma linha por tenant: prazo padrão (em horas) prometido para uma OS, contado a partir de
-- opened_at. Sem linha configurada, o trigger abaixo usa 48h como fallback.
create table public.sla_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  default_hours int not null default 48,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sla_definitions_default_hours_check check (default_hours > 0)
);

comment on table public.sla_definitions is 'SLA_DEFINITIONS from the data dictionary. Tenant-configurable default turnaround (hours) for a work order.';

create trigger sla_definitions_set_updated_at
  before update on public.sla_definitions
  for each row execute function public.set_updated_at();

alter table public.sla_definitions enable row level security;

-- ── SLA_INSTANCES ───────────────────────────────────────────────────────────
-- Uma linha por OS, com o prazo (due_at) já calculado pelo trigger de criação — o app nunca
-- escreve due_at diretamente (RN-SLA-001: cálculo do SLA é responsabilidade do backend).
create table public.sla_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  work_order_id uuid not null unique references public.work_orders (id) on delete cascade,
  due_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.sla_instances is 'SLA_INSTANCES from the data dictionary. due_at is stamped once by create_sla_instance_for_work_order() and never updated — status (ON_TRACK/AT_RISK/BREACHED/MET/MISSED) is derived on read by work_orders_sla_status(), not stored.';

create index sla_instances_tenant_id_idx on public.sla_instances (tenant_id);

alter table public.sla_instances enable row level security;

create or replace function public.create_sla_instance_for_work_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours int;
begin
  select default_hours into v_hours from public.sla_definitions where tenant_id = new.tenant_id;
  v_hours := coalesce(v_hours, 48);

  insert into public.sla_instances (tenant_id, work_order_id, due_at)
  values (new.tenant_id, new.id, new.opened_at + (v_hours || ' hours')::interval);

  return new;
end;
$$;

create trigger work_orders_create_sla_instance
  after insert on public.work_orders
  for each row execute function public.create_sla_instance_for_work_order();

-- PostgREST computed column: `select=*,work_orders_sla_status` em cima de work_orders. STABLE
-- e sem SECURITY DEFINER de propósito — roda com o papel de quem chamou, então a leitura de
-- sla_instances por dentro da função continua sujeita à RLS normal (nada de bypass).
create or replace function public.work_orders_sla_status(wo public.work_orders)
returns text
language plpgsql
stable
as $$
declare
  v_due_at timestamptz;
begin
  select due_at into v_due_at from public.sla_instances where work_order_id = wo.id;

  if v_due_at is null then
    return 'NONE';
  elsif wo.status = 'CANCELED' then
    return 'CANCELED';
  elsif wo.status = 'DELIVERED' then
    return case when wo.completed_at <= v_due_at then 'MET' else 'MISSED' end;
  elsif now() > v_due_at then
    return 'BREACHED';
  elsif v_due_at - now() <= interval '4 hours' then
    return 'AT_RISK';
  else
    return 'ON_TRACK';
  end if;
end;
$$;

comment on function public.work_orders_sla_status(public.work_orders) is 'Computed column (PostgREST convention: function of the table''s row type) — RN-SLA-001. NONE quando a OS não tem sla_instances (ex.: OS manual criada antes deste módulo existir).';

-- ── APPOINTMENTS (agenda) ───────────────────────────────────────────────────
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  work_order_id uuid not null unique references public.work_orders (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  scheduled_at timestamptz not null,
  status varchar(20) not null default 'SCHEDULED',
  notes text,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_status_check check (status in ('SCHEDULED', 'CONFIRMED', 'DONE', 'CANCELED', 'NO_SHOW'))
);

comment on table public.appointments is 'APPOINTMENTS from the data dictionary. One appointment per work order — when the vehicle is expected in for execution.';

create index appointments_tenant_id_idx on public.appointments (tenant_id);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;

-- Mesmo padrão de enforce_diagnostic_matches_service_request: tenant_id/customer_id do
-- agendamento têm que bater com os da OS que ele agenda.
create or replace function public.enforce_appointment_matches_work_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_customer_id uuid;
begin
  select tenant_id, customer_id into v_tenant_id, v_customer_id
  from public.work_orders where id = new.work_order_id;

  if v_tenant_id is distinct from new.tenant_id or v_customer_id is distinct from new.customer_id then
    raise exception 'appointment tenant/customer does not match work_order %', new.work_order_id;
  end if;

  return new;
end;
$$;

create trigger appointments_enforce_work_order_match
  before insert or update on public.appointments
  for each row execute function public.enforce_appointment_matches_work_order();

-- ── grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on
  public.sla_definitions, public.sla_instances, public.appointments
to service_role;

grant select, insert, update on public.sla_definitions to authenticated;
grant select on public.sla_instances to authenticated;
grant select, insert, update on public.appointments to authenticated;
grant execute on function public.work_orders_sla_status(public.work_orders) to authenticated;

-- ── RLS: sla_definitions ────────────────────────────────────────────────────
create policy "sla_definitions_select_staff"
  on public.sla_definitions for select
  to authenticated
  using (tenant_id = public.current_tenant_id() or public.has_permission('platform.super_admin'));

create policy "sla_definitions_insert_staff"
  on public.sla_definitions for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('sla.manage'));

create policy "sla_definitions_update_staff"
  on public.sla_definitions for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('sla.manage'))
  with check (tenant_id = public.current_tenant_id() and public.has_permission('sla.manage'));

-- ── RLS: sla_instances ──────────────────────────────────────────────────────
-- Somente leitura para authenticated — só o trigger de criação da OS grava aqui.
create policy "sla_instances_select_own_or_staff"
  on public.sla_instances for select
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    or public.has_permission('platform.super_admin')
    or exists (
      select 1 from public.work_orders wo
      where wo.id = sla_instances.work_order_id and wo.customer_id = auth.uid()
    )
  );

-- ── RLS: appointments ───────────────────────────────────────────────────────
create policy "appointments_select_own_or_staff"
  on public.appointments for select
  to authenticated
  using (
    customer_id = auth.uid()
    or (tenant_id = public.current_tenant_id() and public.has_permission('appointment.manage'))
    or public.has_permission('platform.super_admin')
  );

create policy "appointments_insert_staff"
  on public.appointments for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('appointment.manage'));

create policy "appointments_update_staff"
  on public.appointments for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('appointment.manage'))
  with check (tenant_id = public.current_tenant_id() and public.has_permission('appointment.manage'));

-- Cliente só pode confirmar (SCHEDULED -> CONFIRMED) o próprio agendamento — mesmo padrão de
-- estimates_customer_decide: uma transição de status específica, nada mais.
create policy "appointments_customer_confirm"
  on public.appointments for update
  to authenticated
  using (customer_id = auth.uid() and status = 'SCHEDULED')
  with check (customer_id = auth.uid() and status = 'CONFIRMED');
