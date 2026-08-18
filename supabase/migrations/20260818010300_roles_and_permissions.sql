-- ROLES / PERMISSIONS: minimal RBAC engine backing the "RBAC" security requirement.
-- role_permissions and user_roles are not explicit entries in the original data dictionary
-- table list, but are required to link ROLES <-> PERMISSIONS <-> USERS; documented in
-- docs/banco-de-dados as an addition on top of the dictionary.

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  name varchar(100) not null,
  description text,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

comment on table public.roles is 'ROLES from the data dictionary. tenant_id null = system-wide role (e.g. CUSTOMER); tenant_id set = role scoped to that tenant.';

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code varchar(120) not null unique,
  description text,
  constraint permissions_code_format check (code ~ '^[a-z_]+\.[a-z_]+$')
);

comment on table public.permissions is 'PERMISSIONS from the data dictionary. Global catalog, code format "<module>.<action>" e.g. vehicle.create.';

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

comment on table public.user_roles is 'Links a user to a role. A role trigger enforces that the role''s tenant matches the user''s tenant (or is a system-wide role).';

-- A user can only hold a role that is either system-wide (tenant_id is null) or
-- belongs to the same tenant as the user. Cross-table constraints need a trigger in Postgres.
create or replace function public.enforce_user_role_tenant_match()
returns trigger
language plpgsql
as $$
declare
  v_user_tenant uuid;
  v_role_tenant uuid;
begin
  select tenant_id into v_user_tenant from public.users where id = new.user_id;
  select tenant_id into v_role_tenant from public.roles where id = new.role_id;

  if v_role_tenant is not null and v_role_tenant is distinct from v_user_tenant then
    raise exception 'role % belongs to a different tenant than user %', new.role_id, new.user_id;
  end if;

  return new;
end;
$$;

create trigger user_roles_enforce_tenant_match
  before insert or update on public.user_roles
  for each row execute function public.enforce_user_role_tenant_match();

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
