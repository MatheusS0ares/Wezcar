-- pgTAP suite for RN-TENANT-001: "Usuário de um tenant não pode acessar registros de
-- outro tenant." Run with `supabase test db` (spins up a fresh local db, applies every
-- migration + seed.sql, then runs every *.test.sql file under this directory).
--
-- Covers:
--   * signup trigger creates a public.users profile and assigns tenant_id from metadata
--   * a customer (no tenant_id) is auto-assigned the system-wide CUSTOMER role
--   * RLS lets staff see only their own tenant and their own tenant's users
--   * RLS blocks cross-tenant writes (staff-beta cannot update staff-alpha's profile)
--   * a customer sees no tenant rows and only their own user row

begin;
select plan(9);

-- ── fixtures ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Oficina Alpha', 'oficina-alpha'),
  ('22222222-2222-2222-2222-222222222222', 'Oficina Beta', 'oficina-beta');

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'staff-alpha@wezcar.test',
   jsonb_build_object('name', 'Staff Alpha', 'tenant_id', '11111111-1111-1111-1111-111111111111')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'staff-beta@wezcar.test',
   jsonb_build_object('name', 'Staff Beta', 'tenant_id', '22222222-2222-2222-2222-222222222222')),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'customer@wezcar.test',
   jsonb_build_object('name', 'Cliente Exemplo'));

-- ── signup trigger ────────────────────────────────────────────────────────
select is(
  (select tenant_id from public.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'signup trigger copies tenant_id from auth metadata into public.users'
);

select is(
  (select tenant_id from public.users where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  null::uuid,
  'a signup without tenant_id metadata is a customer (tenant_id null)'
);

select is(
  (select r.name from public.user_roles ur
     join public.roles r on r.id = ur.role_id
     where ur.user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'CUSTOMER',
  'a customer signup is auto-assigned the system-wide CUSTOMER role'
);

-- ── RLS: staff-alpha sees only tenant Alpha ─────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select count(*) from public.tenants)::int, 1,
  'staff-alpha sees exactly one tenant (their own)'
);

select is(
  (select array_agg(email::text order by email) from public.users),
  array['staff-alpha@wezcar.test']::text[],
  'staff-alpha sees only staff-alpha in public.users, not staff-beta or the customer'
);

reset role;

-- ── RLS: staff-beta sees only tenant Beta, cannot write into tenant Alpha ──
set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select is(
  (select count(*) from public.tenants)::int, 1,
  'staff-beta sees exactly one tenant (their own)'
);

update public.users set name = 'HACKED' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select count(*) from public.users where name = 'HACKED')::int, 0,
  'RLS blocks staff-beta from updating a staff-alpha (different tenant) profile'
);

reset role;

-- ── RLS: the customer has no tenant, sees no tenants, only their own profile ──
set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

select is(
  (select count(*) from public.tenants)::int, 0,
  'a customer (no tenant) sees zero rows in public.tenants'
);

select is(
  (select array_agg(email::text) from public.users),
  array['customer@wezcar.test']::text[],
  'a customer sees only their own row in public.users'
);

reset role;

select * from finish();
rollback;
