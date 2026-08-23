-- DIAGNOSTICS / ESTIMATES / ESTIMATE_ITEMS — closes the gap between "chamado aceito" and "OS
-- criada": Solicitação → Diagnóstico → Orçamento → Aprovação → OS (Especificação Técnica).
-- Until now createWorkOrderFromServiceRequest() let staff create an OS straight from an
-- ACCEPTED chamado with no diagnosis or customer approval in between — this migration adds
-- that missing step and makes it mandatory at the database level, not just in the UI.
--
-- estimate.approve already existed in the permission catalog (seeded in
-- 20260818010600_seed_permissions_and_roles.sql, granted to CUSTOMER) with no feature behind
-- it yet — this is that feature.

insert into public.permissions (code, description) values
  ('diagnostic.manage', 'Registrar e atualizar o diagnóstico de um chamado'),
  ('estimate.manage', 'Criar e enviar um orçamento para um chamado');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('diagnostic.manage', 'estimate.manage')
where r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

-- ── DIAGNOSTICS ─────────────────────────────────────────────────────────────
-- One mutable diagnosis per chamado (staff working notes, not a customer-facing commitment —
-- unlike estimates, it is not versioned; RN-EST-001 only applies to the orçamento itself).
create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  service_request_id uuid not null unique references public.service_requests (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  summary text not null,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.diagnostics is 'DIAGNOSTICS from the data dictionary. One row per chamado, editable by the owning workshop''s staff; read-only for the customer.';

create index diagnostics_tenant_id_idx on public.diagnostics (tenant_id);

create trigger diagnostics_set_updated_at
  before update on public.diagnostics
  for each row execute function public.set_updated_at();

alter table public.diagnostics enable row level security;

-- Same defense-in-depth pattern as enforce_service_request_vehicle_ownership(): the app sends
-- tenant_id/customer_id directly (RLS already checks them against current_tenant_id()/auth.uid()
-- at the row level), this trigger additionally guarantees they match the parent chamado's own
-- tenant/customer, so a diagnosis can never point at the wrong chamado's owner.
create or replace function public.enforce_diagnostic_matches_service_request()
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
  from public.service_requests where id = new.service_request_id;

  if v_tenant_id is distinct from new.tenant_id or v_customer_id is distinct from new.customer_id then
    raise exception 'diagnostic tenant/customer does not match service_request %', new.service_request_id;
  end if;

  return new;
end;
$$;

create trigger diagnostics_enforce_service_request_match
  before insert or update on public.diagnostics
  for each row execute function public.enforce_diagnostic_matches_service_request();

-- ── ESTIMATES ───────────────────────────────────────────────────────────────
-- RN-EST-001: "Orçamento enviado deve ser versionado quando alterado." Enforced structurally,
-- not by convention: there is no UPDATE policy letting staff edit a sent estimate's content —
-- the only way to change one is to INSERT a new row, which the trigger below auto-versions and
-- automatically supersedes whatever was still SENT for that chamado.
create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  service_request_id uuid not null references public.service_requests (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  version int not null default 1,
  status varchar(20) not null default 'SENT',
  notes text,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.users (id),
  constraint estimates_status_check check (status in ('SENT', 'APPROVED', 'REJECTED', 'SUPERSEDED')),
  constraint estimates_service_request_version_unique unique (service_request_id, version)
);

comment on table public.estimates is 'ESTIMATES from the data dictionary. Immutable once inserted (RN-EST-001): a revision is a new version, never an UPDATE to the content.';

create index estimates_tenant_id_idx on public.estimates (tenant_id);
create index estimates_service_request_id_idx on public.estimates (service_request_id);

alter table public.estimates enable row level security;

create or replace function public.enforce_estimate_matches_service_request()
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
  from public.service_requests where id = new.service_request_id;

  if v_tenant_id is distinct from new.tenant_id or v_customer_id is distinct from new.customer_id then
    raise exception 'estimate tenant/customer does not match service_request %', new.service_request_id;
  end if;

  return new;
end;
$$;

create trigger estimates_enforce_service_request_match
  before insert on public.estimates
  for each row execute function public.enforce_estimate_matches_service_request();

-- Computes the next version for this chamado and supersedes whatever was still SENT — the
-- mechanism behind RN-EST-001. Runs before the ownership-match trigger above in alphabetical
-- trigger order is irrelevant here since neither depends on the other's output.
create or replace function public.version_and_supersede_estimate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(max(version), 0) + 1 into new.version
  from public.estimates
  where service_request_id = new.service_request_id;

  update public.estimates
  set status = 'SUPERSEDED'
  where service_request_id = new.service_request_id and status = 'SENT';

  return new;
end;
$$;

create trigger estimates_version_and_supersede
  before insert on public.estimates
  for each row execute function public.version_and_supersede_estimate();

-- Stamps who decided and when, the same way stamp_service_request_timestamps() stamps
-- accepted_at/closed_at — the app only ever sets `status`, never the timestamp/actor directly.
create or replace function public.stamp_estimate_decision()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('APPROVED', 'REJECTED') and old.status = 'SENT' then
    new.decided_at = now();
    new.decided_by = auth.uid();
  end if;

  return new;
end;
$$;

create trigger estimates_stamp_decision
  before update on public.estimates
  for each row execute function public.stamp_estimate_decision();

-- ── ESTIMATE_ITEMS ──────────────────────────────────────────────────────────
create table public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  kind varchar(20) not null,
  description varchar(200) not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint estimate_items_kind_check check (kind in ('PART', 'LABOR')),
  constraint estimate_items_quantity_check check (quantity > 0),
  constraint estimate_items_unit_price_check check (unit_price >= 0)
);

comment on table public.estimate_items is 'ESTIMATE_ITEMS from the data dictionary. Line items (peça/mão de obra) of one estimate version; total is computed by summing quantity * unit_price, not stored redundantly on estimates.';

create index estimate_items_estimate_id_idx on public.estimate_items (estimate_id);

alter table public.estimate_items enable row level security;

-- ── WORK_ORDERS: traceability + the "OS requires an approved estimate" rule ─────────────────
-- RN-EST-002 (nova): a work order that originates from a chamado can only be created once that
-- chamado has an APPROVED estimate. A work order created without a service_request_id (a
-- walk-in/manual OS, outside the chamado flow) is unaffected — there is no estimate to require.
alter table public.work_orders add column estimate_id uuid references public.estimates (id) on delete set null;

create index work_orders_estimate_id_idx on public.work_orders (estimate_id);

create or replace function public.enforce_work_order_requires_approved_estimate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_approved boolean;
begin
  if new.service_request_id is null then
    return new;
  end if;

  select exists (
    select 1 from public.estimates
    where service_request_id = new.service_request_id and status = 'APPROVED'
  ) into v_approved;

  if not v_approved then
    raise exception 'service_request % has no approved estimate yet', new.service_request_id;
  end if;

  return new;
end;
$$;

create trigger work_orders_enforce_approved_estimate
  before insert on public.work_orders
  for each row execute function public.enforce_work_order_requires_approved_estimate();

-- ── grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on
  public.diagnostics, public.estimates, public.estimate_items
to service_role;

grant select, insert, update on public.diagnostics to authenticated;
-- insert: staff sending a new version. update: only the customer's decision (see RLS below) —
-- there is deliberately no staff UPDATE policy, so "versioned when altered" is enforced by the
-- absence of a way to edit, not by convention.
grant select, insert, update on public.estimates to authenticated;
grant select, insert on public.estimate_items to authenticated;

-- ── RLS: diagnostics ────────────────────────────────────────────────────────
create policy "diagnostics_select_own_or_staff"
  on public.diagnostics for select
  to authenticated
  using (
    customer_id = auth.uid()
    or (tenant_id = public.current_tenant_id() and public.has_permission('diagnostic.manage'))
    or public.has_permission('platform.super_admin')
  );

create policy "diagnostics_insert_staff"
  on public.diagnostics for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('diagnostic.manage'));

create policy "diagnostics_update_staff"
  on public.diagnostics for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('diagnostic.manage'))
  with check (tenant_id = public.current_tenant_id() and public.has_permission('diagnostic.manage'));

-- ── RLS: estimates ──────────────────────────────────────────────────────────
create policy "estimates_select_own_or_staff"
  on public.estimates for select
  to authenticated
  using (
    customer_id = auth.uid()
    or (tenant_id = public.current_tenant_id() and public.has_permission('estimate.manage'))
    or public.has_permission('platform.super_admin')
  );

create policy "estimates_insert_staff"
  on public.estimates for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('estimate.manage'));

-- Mirrors service_requests_customer_cancel: the customer can only move their own estimate from
-- SENT to a decided state, nothing else — RLS blocks changing notes/items/version this way too,
-- since those columns aren't even in `with check`'s reach for a customer without estimate.manage.
create policy "estimates_customer_decide"
  on public.estimates for update
  to authenticated
  using (customer_id = auth.uid() and status = 'SENT')
  with check (customer_id = auth.uid() and status in ('APPROVED', 'REJECTED'));

-- ── RLS: estimate_items ─────────────────────────────────────────────────────
create policy "estimate_items_select_visible_estimate"
  on public.estimate_items for select
  to authenticated
  using (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_items.estimate_id
        and (
          e.customer_id = auth.uid()
          or (e.tenant_id = public.current_tenant_id() and public.has_permission('estimate.manage'))
          or public.has_permission('platform.super_admin')
        )
    )
  );

-- Items are only ever inserted together with their estimate, in the same request, so this only
-- needs to check the estimate is still SENT (i.e. it is the one just created, not an old
-- version) — there is no feature for adding items to an estimate later.
create policy "estimate_items_insert_staff"
  on public.estimate_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.estimates e
      where e.id = estimate_items.estimate_id
        and e.status = 'SENT'
        and e.tenant_id = public.current_tenant_id()
        and public.has_permission('estimate.manage')
    )
  );
