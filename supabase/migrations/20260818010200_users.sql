-- USERS: application profile for every Supabase Auth user (auth.users holds credentials;
-- Supabase Auth owns password hashing, so `password_hash` from the original data dictionary
-- is not duplicated here). tenant_id is nullable: workshop staff belong to a tenant, customers
-- (Wezcar App) do not belong to any tenant.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete restrict,
  name varchar(150) not null,
  email varchar(150) not null unique,
  phone varchar(30),
  status varchar(30) not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_status_check check (status in ('ACTIVE', 'INACTIVE', 'BLOCKED'))
);

comment on table public.users is 'Application profile mirroring auth.users. Corresponds to the USERS entry in the data dictionary.';

create index users_tenant_id_idx on public.users (tenant_id);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;

-- Automatically create the profile row when someone signs up through Supabase Auth.
-- tenant_id is optional signup metadata: workshop staff sign up with a tenant_id,
-- customers sign up without one.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, tenant_id, name, email, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
