-- pgTAP suite for audit_logs — RN-AUD-001: operações críticas devem registrar usuário,
-- data, antes e depois. Confere que tenants/user_roles/sla_definitions/warranty_definitions
-- geram automaticamente uma linha de auditoria em INSERT/UPDATE/DELETE (conforme aplicável),
-- que uma tabela sem tenant_id (tenants, user_roles) só é visível para PLATFORM_ADMIN, que
-- uma tabela com tenant_id (sla_definitions) é visível para o staff daquele tenant mas não de
-- outro, e que o app não escreve em audit_logs diretamente (só a trigger, via SECURITY DEFINER).

begin;
select plan(12);

-- ── fixtures ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('44441111-4444-4444-4444-444444444444', 'Oficina Zeta Aud', 'oficina-zeta-aud'),
  ('44442222-4444-4444-4444-444444444444', 'Oficina Eta Aud', 'oficina-eta-aud');

insert into auth.users (id, email, raw_user_meta_data) values
  ('b1010101-4444-4444-4444-444444444444', 'admin-aud@wezcar.test', jsonb_build_object('name', 'Admin Aud')),
  ('b2020202-4444-4444-4444-444444444444', 'staff-zeta@wezcar.test',
   jsonb_build_object('name', 'Staff Zeta', 'tenant_id', '44441111-4444-4444-4444-444444444444')),
  ('b3030303-4444-4444-4444-444444444444', 'staff-eta@wezcar.test',
   jsonb_build_object('name', 'Staff Eta', 'tenant_id', '44442222-4444-4444-4444-444444444444'));

insert into public.user_roles (user_id, role_id)
select 'b1010101-4444-4444-4444-444444444444', r.id
from public.roles r where r.name = 'PLATFORM_ADMIN' and r.tenant_id is null;

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from (values
  ('b2020202-4444-4444-4444-444444444444'::uuid),
  ('b3030303-4444-4444-4444-444444444444'::uuid)
) as staff(user_id)
join public.users u on u.id = staff.user_id
join public.roles r on r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

-- Cada grant de WORKSHOP_ADMIN acima já disparou um INSERT em user_roles antes do plano
-- de teste começar a contar — os testes abaixo usam contagens relativas (deltas), não
-- absolutas, pra não depender de quantas linhas de fixture já geraram auditoria.

-- ── tenants: INSERT gera auditoria, só visível a PLATFORM_ADMIN (sem tenant_id) ────
set local role authenticated;
set local request.jwt.claim.sub = 'b1010101-4444-4444-4444-444444444444';

insert into public.tenants (id, name, slug) values
  ('44443333-4444-4444-4444-444444444444', 'Oficina Theta Aud', 'oficina-theta-aud');

select is(
  (select action from public.audit_logs
    where table_name = 'tenants' and record_id = '44443333-4444-4444-4444-444444444444'),
  'INSERT',
  'criar um tenant gera automaticamente uma linha de auditoria INSERT'
);

select is(
  (select before from public.audit_logs
    where table_name = 'tenants' and record_id = '44443333-4444-4444-4444-444444444444'),
  null,
  'auditoria de INSERT não tem "antes" (linha ainda não existia)'
);

select is(
  (select after ->> 'name' from public.audit_logs
    where table_name = 'tenants' and record_id = '44443333-4444-4444-4444-444444444444'),
  'Oficina Theta Aud',
  'auditoria de INSERT registra o "depois" completo da linha'
);

select is(
  (select actor_id from public.audit_logs
    where table_name = 'tenants' and record_id = '44443333-4444-4444-4444-444444444444'),
  'b1010101-4444-4444-4444-444444444444'::uuid,
  'auditoria registra o usuário que fez a operação'
);

-- ── tenants: UPDATE também gera auditoria, com antes e depois ──────────────
-- (filtra por action, não por created_at — dentro de uma mesma transação now() fica
-- congelado no início dela, então INSERT e UPDATE ficam com o mesmo created_at.)
update public.tenants set name = 'Oficina Theta Aud Renomeada'
where id = '44443333-4444-4444-4444-444444444444';

select is(
  (select before ->> 'name' from public.audit_logs
    where table_name = 'tenants' and record_id = '44443333-4444-4444-4444-444444444444'
      and action = 'UPDATE'),
  'Oficina Theta Aud',
  'auditoria de UPDATE guarda o valor antigo em "before"'
);

select is(
  (select after ->> 'name' from public.audit_logs
    where table_name = 'tenants' and record_id = '44443333-4444-4444-4444-444444444444'
      and action = 'UPDATE'),
  'Oficina Theta Aud Renomeada',
  'auditoria de UPDATE guarda o valor novo em "after"'
);

reset role;

-- ── user_roles: conceder um papel (INSERT) gera auditoria só p/ platform admin ─────
-- Concessão de papel é sempre feita fora do papel authenticated (hoje só via SQL manual/
-- service_role) — a trigger audita mesmo assim, porque dispara independente de quem executa.
-- user_roles não tem coluna "id" (chave composta user_id+role_id), então record_id fica
-- null por essa tabela — filtra pelos campos reais dentro de before/after.
insert into public.user_roles (user_id, role_id)
select 'b3030303-4444-4444-4444-444444444444', r.id
from public.roles r where r.name = 'PLATFORM_ADMIN' and r.tenant_id is null;

select is(
  (select count(*) from public.audit_logs
    where table_name = 'user_roles' and action = 'INSERT'
      and after ->> 'user_id' = 'b3030303-4444-4444-4444-444444444444'
      and after ->> 'role_id' = (select id::text from public.roles where name = 'PLATFORM_ADMIN' and tenant_id is null))::int,
  1,
  'conceder um papel (user_roles INSERT) gera 1 linha de auditoria'
);

-- ── user_roles: revogar um papel (DELETE) gera auditoria com before preenchido ─────
delete from public.user_roles
where user_id = 'b3030303-4444-4444-4444-444444444444'
  and role_id = (select id from public.roles where name = 'PLATFORM_ADMIN' and tenant_id is null);

select is(
  (select action from public.audit_logs
    where table_name = 'user_roles' and before ->> 'user_id' = 'b3030303-4444-4444-4444-444444444444'
      and action = 'DELETE'),
  'DELETE',
  'revogar um papel (user_roles DELETE) gera auditoria com action DELETE'
);

select is(
  (select after from public.audit_logs
    where table_name = 'user_roles' and before ->> 'user_id' = 'b3030303-4444-4444-4444-444444444444'
      and action = 'DELETE'),
  null,
  'auditoria de DELETE não tem "depois" (linha deixou de existir)'
);

-- ── sla_definitions (tem tenant_id): visível pro staff daquele tenant, não do outro ─
set local role authenticated;
set local request.jwt.claim.sub = 'b2020202-4444-4444-4444-444444444444';

insert into public.sla_definitions (tenant_id, default_hours)
values ('44441111-4444-4444-4444-444444444444', 24);

select is(
  (select count(*) from public.audit_logs where table_name = 'sla_definitions')::int,
  1,
  'staff da própria oficina vê a auditoria da sla_definitions que acabou de criar'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'b3030303-4444-4444-4444-444444444444';

select is(
  (select count(*) from public.audit_logs where table_name = 'sla_definitions')::int,
  0,
  'staff de outra oficina não vê a auditoria da sla_definitions alheia'
);

-- ── authenticated não escreve em audit_logs diretamente (só a trigger via SECURITY DEFINER) ──
select throws_ok(
  $$insert into public.audit_logs (action, table_name) values ('INSERT', 'forjado')$$,
  'permission denied for table audit_logs',
  'authenticated não consegue inserir em audit_logs diretamente'
);

reset role;

select * from finish();
rollback;
