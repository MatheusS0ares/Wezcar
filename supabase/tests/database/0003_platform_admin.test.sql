-- pgTAP suite for the PLATFORM_ADMIN role ("Wezcar Admin"): a platform admin bypasses
-- tenant scoping on reads and can create new tenants; a regular customer cannot.

begin;
select plan(5);

insert into public.tenants (id, name, slug) values
  ('33333333-3333-3333-3333-333333333333', 'Oficina Gamma', 'oficina-gamma'),
  ('44444444-4444-4444-4444-444444444444', 'Oficina Delta', 'oficina-delta');

insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'admin@wezcar.test', jsonb_build_object('name', 'Admin Wezcar')),
  ('99999999-9999-9999-9999-999999999999', 'cliente-c@wezcar.test', jsonb_build_object('name', 'Cliente C'));

insert into public.user_roles (user_id, role_id)
select 'ffffffff-ffff-ffff-ffff-ffffffffffff', r.id
from public.roles r
where r.name = 'PLATFORM_ADMIN' and r.tenant_id is null;

-- ── platform admin enxerga todos os tenants, mesmo sem pertencer a nenhum ───
set local role authenticated;
set local request.jwt.claim.sub = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

select ok(
  (select count(*) from public.tenants) >= 2,
  'platform admin enxerga todos os tenants, não só o próprio (que nem existe)'
);

select ok(
  (select count(*) from public.users) >= 2,
  'platform admin enxerga usuários de todos os tenants'
);

-- ── platform admin pode criar um novo tenant ─────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('55555555-5555-5555-5555-555555555555', 'Oficina Epsilon', 'oficina-epsilon');

select is(
  (select name from public.tenants where id = '55555555-5555-5555-5555-555555555555'),
  'Oficina Epsilon',
  'platform admin consegue criar um novo tenant (permissão tenant.manage)'
);

reset role;

-- ── um cliente comum vê o diretório de tenants ativos, mas não pode criar um ─
set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';

select ok(
  (select count(*) from public.tenants) >= 3,
  'cliente comum (sem platform.super_admin) vê o diretório de tenants ativos'
);

select throws_ok(
  $$insert into public.tenants (name, slug) values ('Oficina Invasora', 'oficina-invasora')$$,
  'new row violates row-level security policy for table "tenants"',
  'cliente comum não consegue criar tenant (sem permissão tenant.manage)'
);

reset role;

select * from finish();
rollback;
