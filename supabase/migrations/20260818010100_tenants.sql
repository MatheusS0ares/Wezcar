-- TENANTS: one row per workshop/organization. Every tenant-scoped table carries tenant_id
-- and is isolated by RLS via public.current_tenant_id() (defined in a later migration).

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name varchar(150) not null,
  slug varchar(100) not null unique,
  status varchar(30) not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_status_check check (status in ('ACTIVE', 'SUSPENDED', 'CANCELED'))
);

comment on table public.tenants is 'Organizations (oficinas) that operate on Wezcar. Corresponds to the TENANTS entry in the data dictionary.';

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

alter table public.tenants enable row level security;
