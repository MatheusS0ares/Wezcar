-- Extensions & shared helpers used by every subsequent migration.

create extension if not exists "pgcrypto" with schema extensions;

-- Generic trigger to keep `updated_at` current on any table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Row trigger: stamps updated_at = now() on every UPDATE. Attach to any table with an updated_at column.';
