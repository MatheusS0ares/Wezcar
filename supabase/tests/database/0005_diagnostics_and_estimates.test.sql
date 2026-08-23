-- pgTAP suite for diagnostics/estimates/estimate_items — the Solicitação → Diagnóstico →
-- Orçamento → Aprovação → OS gap closed by 20260823010000_diagnostics_and_estimates.sql.
-- Reuses the two-workshop fixture pattern from 0004.

begin;
select plan(18);

-- ── fixtures ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('88888888-8888-8888-8888-888888888888', 'Oficina Theta', 'oficina-theta'),
  ('99999999-9999-9999-9999-999999999999', 'Oficina Iota', 'oficina-iota');

insert into auth.users (id, email, raw_user_meta_data) values
  ('50505050-5050-5050-5050-505050505050', 'staff-theta@wezcar.test',
   jsonb_build_object('name', 'Staff Theta', 'tenant_id', '88888888-8888-8888-8888-888888888888')),
  ('60606060-6060-6060-6060-606060606060', 'staff-iota@wezcar.test',
   jsonb_build_object('name', 'Staff Iota', 'tenant_id', '99999999-9999-9999-9999-999999999999')),
  ('70707070-7070-7070-7070-707070707070', 'cliente-z@wezcar.test', jsonb_build_object('name', 'Cliente Z'));

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from (values
  ('50505050-5050-5050-5050-505050505050'::uuid),
  ('60606060-6060-6060-6060-606060606060'::uuid)
) as staff(user_id)
join public.users u on u.id = staff.user_id
join public.roles r on r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

set local role authenticated;
set local request.jwt.claim.sub = '70707070-7070-7070-7070-707070707070';

insert into public.vehicles (id, customer_id, brand, model)
values ('aaaaaaaa-0000-0000-0000-000000000003', '70707070-7070-7070-7070-707070707070', 'Honda', 'Civic');

insert into public.service_requests (id, tenant_id, customer_id, vehicle_id, description)
values ('bbbbbbbb-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
        '70707070-7070-7070-7070-707070707070', 'aaaaaaaa-0000-0000-0000-000000000003',
        'Barulho ao frear');

reset role;

update public.service_requests set status = 'ACCEPTED'
where id = 'bbbbbbbb-0000-0000-0000-000000000002';

-- ── staff de outra oficina não consegue diagnosticar o chamado ─────────────
set local role authenticated;
set local request.jwt.claim.sub = '60606060-6060-6060-6060-606060606060';

select is(
  (select count(*) from public.service_requests)::int, 0,
  'staff de outra oficina nem enxerga o chamado (baseline reaproveitado de 0004)'
);

select throws_ok(
  $$insert into public.diagnostics (tenant_id, service_request_id, customer_id, summary)
    values ('88888888-8888-8888-8888-888888888888', 'bbbbbbbb-0000-0000-0000-000000000002',
            '70707070-7070-7070-7070-707070707070', 'tentando diagnosticar chamado de outra oficina')$$,
  'new row violates row-level security policy for table "diagnostics"',
  'staff de outra oficina não consegue inserir diagnóstico (RLS bloqueia)'
);

reset role;

-- ── staff da própria oficina registra o diagnóstico ────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '50505050-5050-5050-5050-505050505050';

insert into public.diagnostics (id, tenant_id, service_request_id, customer_id, summary)
values ('dddddddd-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
        'bbbbbbbb-0000-0000-0000-000000000002', '70707070-7070-7070-7070-707070707070',
        'Pastilhas de freio dianteiras gastas, disco com sinais de desgaste irregular.');

select is(
  (select count(*) from public.diagnostics)::int, 1,
  'staff da oficina certa consegue registrar o diagnóstico'
);

select throws_ok(
  $$insert into public.diagnostics (tenant_id, service_request_id, customer_id, summary)
    values ('99999999-9999-9999-9999-999999999999', 'bbbbbbbb-0000-0000-0000-000000000002',
            '70707070-7070-7070-7070-707070707070', 'tenant errado de propósito')$$,
  'diagnostic tenant/customer does not match service_request bbbbbbbb-0000-0000-0000-000000000002',
  'trigger rejeita diagnóstico com tenant_id que não bate com o do chamado'
);

reset role;

-- ── cliente enxerga o diagnóstico (leitura) mas não consegue alterá-lo ─────
set local role authenticated;
set local request.jwt.claim.sub = '70707070-7070-7070-7070-707070707070';

select is(
  (select count(*) from public.diagnostics)::int, 1,
  'cliente enxerga o diagnóstico do próprio chamado'
);

update public.diagnostics set summary = 'tentando reescrever o diagnóstico'
where id = 'dddddddd-0000-0000-0000-000000000001';

select is(
  (select summary from public.diagnostics where id = 'dddddddd-0000-0000-0000-000000000001'),
  'Pastilhas de freio dianteiras gastas, disco com sinais de desgaste irregular.',
  'cliente não consegue alterar o diagnóstico (RLS bloqueia)'
);

reset role;

-- ── staff cria o primeiro orçamento (v1) com itens ─────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '50505050-5050-5050-5050-505050505050';

insert into public.estimates (id, tenant_id, service_request_id, customer_id)
values ('eeeeeeee-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
        'bbbbbbbb-0000-0000-0000-000000000002', '70707070-7070-7070-7070-707070707070');

select is(
  (select version from public.estimates where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  1,
  'primeiro orçamento do chamado nasce na versão 1'
);

select is(
  (select status from public.estimates where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  'SENT',
  'orçamento nasce com status SENT'
);

insert into public.estimate_items (estimate_id, kind, description, quantity, unit_price) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'PART', 'Pastilha de freio dianteira (jogo)', 1, 180.00),
  ('eeeeeeee-0000-0000-0000-000000000001', 'LABOR', 'Mão de obra — troca de pastilhas', 1, 120.00);

select is(
  (select count(*) from public.estimate_items where estimate_id = 'eeeeeeee-0000-0000-0000-000000000001')::int,
  2,
  'os dois itens do orçamento (peça + mão de obra) foram inseridos'
);

select is(
  (select sum(quantity * unit_price) from public.estimate_items
     where estimate_id = 'eeeeeeee-0000-0000-0000-000000000001')::numeric,
  300.00::numeric,
  'o total do orçamento (soma dos itens) bate: R$ 300,00'
);

-- ── staff revisa o orçamento: v2 supera a v1 automaticamente (RN-EST-001) ──
insert into public.estimates (id, tenant_id, service_request_id, customer_id, notes)
values ('eeeeeeee-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
        'bbbbbbbb-0000-0000-0000-000000000002', '70707070-7070-7070-7070-707070707070',
        'Revisão: disco também precisa ser trocado.');

select is(
  (select version from public.estimates where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  2,
  'a revisão do orçamento nasce automaticamente como versão 2'
);

select is(
  (select status from public.estimates where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  'SUPERSEDED',
  'a v1 é automaticamente marcada como SUPERSEDED quando a v2 é criada (RN-EST-001)'
);

-- Sem policy de UPDATE pra staff em estimates, o USING não bate com nenhuma linha: a
-- atualização silenciosamente afeta 0 linhas (não lança exceção — mesmo comportamento do
-- "cliente não consegue alterar o status da própria OS" em 0004).
update public.estimates set notes = 'staff tentando editar o orçamento direto'
where id = 'eeeeeeee-0000-0000-0000-000000000002';

select is(
  (select notes from public.estimates where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  'Revisão: disco também precisa ser trocado.',
  'staff não consegue editar o conteúdo de um orçamento já enviado — só criar nova versão'
);

reset role;

-- ── OS não pode ser criada sem orçamento aprovado (RN-EST-002) ─────────────
set local role authenticated;
set local request.jwt.claim.sub = '50505050-5050-5050-5050-505050505050';

select throws_ok(
  $$insert into public.work_orders (tenant_id, service_request_id, customer_id, vehicle_id)
    values ('88888888-8888-8888-8888-888888888888', 'bbbbbbbb-0000-0000-0000-000000000002',
            '70707070-7070-7070-7070-707070707070', 'aaaaaaaa-0000-0000-0000-000000000003')$$,
  'service_request bbbbbbbb-0000-0000-0000-000000000002 has no approved estimate yet',
  'criar OS a partir de um chamado sem orçamento aprovado é rejeitado (RN-EST-002)'
);

reset role;

-- ── cliente aprova a v2 ─────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '70707070-7070-7070-7070-707070707070';

-- Mesmo raciocínio: a v1 já está SUPERSEDED, então o USING (status = 'SENT') não bate — 0
-- linhas afetadas, sem exceção.
update public.estimates set status = 'APPROVED'
where id = 'eeeeeeee-0000-0000-0000-000000000001';

select is(
  (select status from public.estimates where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  'SUPERSEDED',
  'cliente não consegue aprovar uma versão já SUPERSEDED, só a que está SENT'
);

update public.estimates set status = 'APPROVED' where id = 'eeeeeeee-0000-0000-0000-000000000002';

select isnt(
  (select decided_at from public.estimates where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  null,
  'aprovar o orçamento carimba decided_at automaticamente'
);

select is(
  (select decided_by from public.estimates where id = 'eeeeeeee-0000-0000-0000-000000000002'),
  '70707070-7070-7070-7070-707070707070'::uuid,
  'aprovar o orçamento carimba decided_by com o próprio cliente'
);

reset role;

-- ── com orçamento aprovado, staff cria a OS normalmente ────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '50505050-5050-5050-5050-505050505050';

insert into public.work_orders (id, tenant_id, service_request_id, customer_id, vehicle_id, estimate_id)
values ('cccccccc-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
        'bbbbbbbb-0000-0000-0000-000000000002', '70707070-7070-7070-7070-707070707070',
        'aaaaaaaa-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000002');

select is(
  (select count(*) from public.work_orders where id = 'cccccccc-0000-0000-0000-000000000002')::int,
  1,
  'com o orçamento aprovado, a OS é criada normalmente e referencia esse orçamento'
);

reset role;

select * from finish();
rollback;
