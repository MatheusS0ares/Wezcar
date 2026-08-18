-- VEHICLES / VEHICLE_MILEAGE_HISTORY — ETAPA 4 ("Cliente, veículo e histórico de
-- quilometragem"). RN-VEH-001: cliente só visualiza/altera veículos associados à sua conta.
--
-- Deviation from the original data dictionary: vehicles.customer_id references
-- public.users directly instead of a separate CUSTOMERS table — there is no customer-only
-- profile data (cpf, birth_date) collected yet. Introduce CUSTOMERS when that's actually
-- needed (see docs/banco-de-dados/dicionario-de-dados.md).

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.users (id) on delete cascade,
  plate varchar(10),
  brand varchar(100) not null,
  model varchar(100) not null,
  version varchar(100),
  manufacture_year int,
  model_year int,
  engine varchar(100),
  fuel_type varchar(30),
  color varchar(50),
  mileage int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vehicles is 'VEHICLES from the data dictionary. RN-VEH-001: only the owning customer can see/change a vehicle.';

create index vehicles_customer_id_idx on public.vehicles (customer_id);

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

alter table public.vehicles enable row level security;

create table public.vehicle_mileage_history (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  mileage int not null,
  source varchar(30) not null default 'MANUAL',
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.users (id)
);

comment on table public.vehicle_mileage_history is 'VEHICLE_MILEAGE_HISTORY from the data dictionary. Append-only: mileage is only ever changed by inserting a new row here (see sync_vehicle_mileage()).';

create index vehicle_mileage_history_vehicle_id_idx on public.vehicle_mileage_history (vehicle_id);

alter table public.vehicle_mileage_history enable row level security;

-- Keeps vehicles.mileage as the "current" denormalized value. Rejects a mileage lower than
-- what's already on file — an odometer does not go backwards.
create or replace function public.sync_vehicle_mileage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_mileage int;
begin
  select mileage into v_current_mileage from public.vehicles where id = new.vehicle_id;

  if v_current_mileage is not null and new.mileage < v_current_mileage then
    raise exception 'nova quilometragem (%) é menor que a atual (%) para o veículo %',
      new.mileage, v_current_mileage, new.vehicle_id;
  end if;

  update public.vehicles set mileage = new.mileage where id = new.vehicle_id;
  return new;
end;
$$;

create trigger vehicle_mileage_history_sync
  after insert on public.vehicle_mileage_history
  for each row execute function public.sync_vehicle_mileage();

-- Every vehicle created with an initial mileage gets its first history row automatically,
-- so the history is always the complete trail (not just updates after creation).
create or replace function public.seed_initial_mileage_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mileage is not null then
    insert into public.vehicle_mileage_history (vehicle_id, mileage, source, recorded_by)
    values (new.id, new.mileage, 'INITIAL', new.customer_id);
  end if;
  return new;
end;
$$;

create trigger vehicles_seed_initial_mileage_history
  after insert on public.vehicles
  for each row execute function public.seed_initial_mileage_history();

-- ── grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.vehicles, public.vehicle_mileage_history to service_role;

grant select, insert, delete on public.vehicles to authenticated;
-- mileage is intentionally excluded: it can only change via a vehicle_mileage_history insert
-- (sync_vehicle_mileage() trigger), the same "no balance change without a movement" principle
-- used for inventory (RN-STK-001) applied to the odometer.
grant update (plate, brand, model, version, manufacture_year, model_year, engine, fuel_type, color)
  on public.vehicles to authenticated;
grant select, insert on public.vehicle_mileage_history to authenticated;

-- ── RLS: vehicles ───────────────────────────────────────────────────────────
create policy "vehicles_select_own"
  on public.vehicles for select
  to authenticated
  using (customer_id = auth.uid());

create policy "vehicles_insert_own"
  on public.vehicles for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy "vehicles_update_own"
  on public.vehicles for update
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "vehicles_delete_own"
  on public.vehicles for delete
  to authenticated
  using (customer_id = auth.uid());

-- ── RLS: vehicle_mileage_history (immutable — no update/delete policy at all) ──
create policy "vehicle_mileage_history_select_own"
  on public.vehicle_mileage_history for select
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_mileage_history.vehicle_id and v.customer_id = auth.uid()
    )
  );

create policy "vehicle_mileage_history_insert_own"
  on public.vehicle_mileage_history for insert
  to authenticated
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_mileage_history.vehicle_id and v.customer_id = auth.uid()
    )
  );
