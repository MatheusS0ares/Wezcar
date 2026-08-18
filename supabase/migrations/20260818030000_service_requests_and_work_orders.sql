-- SERVICE_REQUESTS (Chamados) / WORK_ORDERS (OS) / WORK_ORDER_EVENTS — first slice of the
-- Wezcar Oficina module (OFI-002/OFI-006 from the Especificação Técnica). Scoped tightly:
-- no diagnostics, no estimates, no agenda/appointments yet — those extend the OS workflow
-- later. Status enums here are intentionally simpler than the full spec's until those
-- modules exist (documented in docs/banco-de-dados/dicionario-de-dados.md).
--
-- WORKSHOP_ADMIN is a new tenant-scoped-by-membership system role (tenant_id null, like
-- CUSTOMER and PLATFORM_ADMIN) — the RLS policies below combine it with tenant_id matching,
-- the same pattern already used everywhere else.

insert into public.permissions (code, description) values
  ('service_request.manage', 'Ver, aceitar e recusar chamados da própria oficina');

insert into public.roles (tenant_id, name, description) values
  (null, 'WORKSHOP_ADMIN', 'Administrador/atendente da oficina — chamados e ordens de serviço');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('service_request.manage', 'work_order.update')
where r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

-- ── SERVICE_REQUESTS ──────────────────────────────────────────────────────
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  customer_id uuid not null references public.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  description text not null,
  priority varchar(20) not null default 'NORMAL',
  status varchar(30) not null default 'OPEN',
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_requests_status_check check (status in ('OPEN', 'ACCEPTED', 'REJECTED', 'CANCELED')),
  constraint service_requests_priority_check check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

comment on table public.service_requests is 'SERVICE_REQUESTS ("chamados") from the data dictionary. RN-VEH-001-style ownership: a customer only sees their own; a workshop only sees requests addressed to it.';

create index service_requests_tenant_id_idx on public.service_requests (tenant_id);
create index service_requests_customer_id_idx on public.service_requests (customer_id);

create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

alter table public.service_requests enable row level security;

-- A customer can only open a chamado for a vehicle they actually own.
-- SECURITY DEFINER: the vehicle lookup must bypass RLS, otherwise a workshop staff member
-- (who cannot SELECT another customer's vehicle at all) would wrongly trip this check with
-- a false "vehicle not found" mismatch on every UPDATE, not just on real ownership mismatches.
create or replace function public.enforce_service_request_vehicle_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select customer_id into v_owner from public.vehicles where id = new.vehicle_id;

  if v_owner is distinct from new.customer_id then
    raise exception 'vehicle % does not belong to customer %', new.vehicle_id, new.customer_id;
  end if;

  return new;
end;
$$;

create trigger service_requests_enforce_vehicle_ownership
  before insert or update on public.service_requests
  for each row execute function public.enforce_service_request_vehicle_ownership();

-- Keeps accepted_at/closed_at consistent with status, instead of relying on the app to set
-- three fields correctly on every transition.
create or replace function public.stamp_service_request_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'ACCEPTED' and old.accepted_at is null then
    new.accepted_at = now();
  end if;

  if new.status in ('REJECTED', 'CANCELED') and old.closed_at is null then
    new.closed_at = now();
  end if;

  return new;
end;
$$;

create trigger service_requests_stamp_timestamps
  before update on public.service_requests
  for each row execute function public.stamp_service_request_timestamps();

-- ── WORK_ORDERS (OS) ────────────────────────────────────────────────────────
create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  service_request_id uuid references public.service_requests (id) on delete set null,
  customer_id uuid not null references public.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  status varchar(30) not null default 'OPEN',
  notes text,
  opened_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_orders_status_check check (status in ('OPEN', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELED'))
);

comment on table public.work_orders is 'WORK_ORDERS ("OS") from the data dictionary. Only workshop staff of the owning tenant create/update; the customer can only read their own.';

create index work_orders_tenant_id_idx on public.work_orders (tenant_id);
create index work_orders_customer_id_idx on public.work_orders (customer_id);

create trigger work_orders_set_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();

alter table public.work_orders enable row level security;

-- Same SECURITY DEFINER reasoning as enforce_service_request_vehicle_ownership() above.
create or replace function public.enforce_work_order_vehicle_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select customer_id into v_owner from public.vehicles where id = new.vehicle_id;

  if v_owner is distinct from new.customer_id then
    raise exception 'vehicle % does not belong to customer %', new.vehicle_id, new.customer_id;
  end if;

  return new;
end;
$$;

create trigger work_orders_enforce_vehicle_ownership
  before insert or update on public.work_orders
  for each row execute function public.enforce_work_order_vehicle_ownership();

-- ── WORK_ORDER_EVENTS (timeline) ──────────────────────────────────────────
create table public.work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  event_type varchar(50) not null,
  old_status varchar(30),
  new_status varchar(30),
  description text,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now()
);

comment on table public.work_order_events is 'WORK_ORDER_EVENTS from the data dictionary. Append-only timeline, written only by the triggers below — never inserted directly by the app (RN-OS-style: history is never edited).';

create index work_order_events_work_order_id_idx on public.work_order_events (work_order_id);

alter table public.work_order_events enable row level security;

create or replace function public.log_work_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.work_order_events (work_order_id, event_type, new_status, created_by)
  values (new.id, 'CREATED', new.status, auth.uid());
  return new;
end;
$$;

create trigger work_orders_log_created
  after insert on public.work_orders
  for each row execute function public.log_work_order_created();

create or replace function public.log_work_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.work_order_events (work_order_id, event_type, old_status, new_status, created_by)
    values (new.id, 'STATUS_CHANGE', old.status, new.status, auth.uid());

    if new.status = 'DELIVERED' and new.completed_at is null then
      new.completed_at = now();
    end if;
  end if;

  return new;
end;
$$;

create trigger work_orders_log_status_change
  before update on public.work_orders
  for each row execute function public.log_work_order_status_change();

-- ── grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on
  public.service_requests, public.work_orders, public.work_order_events
to service_role;

grant select, insert, update on public.service_requests to authenticated;
grant select, insert, update on public.work_orders to authenticated;
grant select on public.work_order_events to authenticated;

-- Any authenticated user (customer or staff) can browse active tenants — needed so a
-- customer can pick a workshop when opening a chamado. There is no "nearby" search yet
-- (PostGIS/geolocation is out of scope for this slice), so this is a plain directory.
create policy "tenants_select_active_directory"
  on public.tenants for select
  to authenticated
  using (status = 'ACTIVE');

-- ── RLS: service_requests ───────────────────────────────────────────────────
create policy "service_requests_select_own_or_staff"
  on public.service_requests for select
  to authenticated
  using (
    customer_id = auth.uid()
    or (tenant_id = public.current_tenant_id() and public.has_permission('service_request.manage'))
    or public.has_permission('platform.super_admin')
  );

create policy "service_requests_insert_own"
  on public.service_requests for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy "service_requests_customer_cancel"
  on public.service_requests for update
  to authenticated
  using (customer_id = auth.uid() and status = 'OPEN')
  with check (customer_id = auth.uid() and status = 'CANCELED');

create policy "service_requests_staff_manage"
  on public.service_requests for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('service_request.manage'))
  with check (tenant_id = public.current_tenant_id() and public.has_permission('service_request.manage'));

-- ── RLS: work_orders ────────────────────────────────────────────────────────
create policy "work_orders_select_own_or_staff"
  on public.work_orders for select
  to authenticated
  using (
    customer_id = auth.uid()
    or (tenant_id = public.current_tenant_id() and public.has_permission('work_order.update'))
    or public.has_permission('platform.super_admin')
  );

create policy "work_orders_insert_staff"
  on public.work_orders for insert
  to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('work_order.update'));

create policy "work_orders_update_staff"
  on public.work_orders for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('work_order.update'))
  with check (tenant_id = public.current_tenant_id() and public.has_permission('work_order.update'));

-- ── RLS: work_order_events ──────────────────────────────────────────────────
create policy "work_order_events_select_visible_work_order"
  on public.work_order_events for select
  to authenticated
  using (
    exists (
      select 1 from public.work_orders wo
      where wo.id = work_order_events.work_order_id
        and (
          wo.customer_id = auth.uid()
          or (wo.tenant_id = public.current_tenant_id() and public.has_permission('work_order.update'))
          or public.has_permission('platform.super_admin')
        )
    )
  );
