-- Local-development-only fixtures, applied by `supabase db reset` (and by `supabase test db`
-- before running supabase/tests/database/*.test.sql). Never applied to a remote/production
-- project. The permission catalog and system roles are NOT here — they're part of
-- 20260818010600_seed_permissions_and_roles.sql because every environment needs them.

insert into public.tenants (name, slug) values
  ('Oficina Demo', 'oficina-demo')
on conflict (slug) do nothing;

-- Sign up through the running app (http://localhost:3000/cadastro) to create real staff/
-- customer users against this demo tenant — the auth trigger in
-- 20260818010200_users.sql/20260818010700_auto_assign_customer_role.sql wires up
-- public.users and roles automatically.
