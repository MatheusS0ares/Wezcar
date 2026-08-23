-- pgTAP suite for appointments (agenda) and SLA — RN-SLA-001: due_at é sempre calculado pelo
-- trigger de criação da OS, nunca escrito pelo app; work_orders_sla_status() deriva o status
-- na leitura.

begin;
select plan(15);

-- ── fixtures ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('aaaaaaaa-1111-1111-1111-111111111111', 'Oficina Kappa', 'oficina-kappa');

insert into auth.users (id, email, raw_user_meta_data) values
  ('80808080-8080-8080-8080-808080808080', 'staff-kappa@wezcar.test',
   jsonb_build_object('name', 'Staff Kappa', 'tenant_id', 'aaaaaaaa-1111-1111-1111-111111111111')),
  ('90909090-9090-9090-9090-909090909090', 'cliente-w@wezcar.test', jsonb_build_object('name', 'Cliente W'));

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from public.users u, public.roles r
where u.id = '80808080-8080-8080-8080-808080808080' and r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

set local role authenticated;
set local request.jwt.claim.sub = '90909090-9090-9090-9090-909090909090';

insert into public.vehicles (id, customer_id, brand, model)
values ('bbbbbbbb-1111-1111-1111-111111111111', '90909090-9090-9090-9090-909090909090', 'Toyota', 'Yaris');

insert into public.service_requests (id, tenant_id, customer_id, vehicle_id, description)
values ('cccccccc-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111',
        '90909090-9090-9090-9090-909090909090', 'bbbbbbbb-1111-1111-1111-111111111111', 'Troca de óleo');

reset role;

update public.service_requests set status = 'ACCEPTED'
where id = 'cccccccc-1111-1111-1111-111111111111';

set local role authenticated;
set local request.jwt.claim.sub = '80808080-8080-8080-8080-808080808080';

insert into public.estimates (id, tenant_id, service_request_id, customer_id)
values ('dddddddd-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111',
        'cccccccc-1111-1111-1111-111111111111', '90909090-9090-9090-9090-909090909090');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '90909090-9090-9090-9090-909090909090';

update public.estimates set status = 'APPROVED' where id = 'dddddddd-1111-1111-1111-111111111111';

reset role;

-- ── OS sem sla_definitions configurada usa o fallback de 48h ──────────────
set local role authenticated;
set local request.jwt.claim.sub = '80808080-8080-8080-8080-808080808080';

insert into public.work_orders (id, tenant_id, service_request_id, customer_id, vehicle_id, estimate_id, opened_at)
values ('eeeeeeee-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111',
        'cccccccc-1111-1111-1111-111111111111', '90909090-9090-9090-9090-909090909090',
        'bbbbbbbb-1111-1111-1111-111111111111', 'dddddddd-1111-1111-1111-111111111111', now());

select is(
  (select count(*) from public.sla_instances where work_order_id = 'eeeeeeee-1111-1111-1111-111111111111')::int,
  1,
  'criar a OS gera automaticamente uma linha em sla_instances'
);

select ok(
  (select due_at from public.sla_instances where work_order_id = 'eeeeeeee-1111-1111-1111-111111111111')
    between now() + interval '47 hours 55 minutes' and now() + interval '48 hours 5 minutes',
  'sem sla_definitions configurada, due_at usa o fallback de 48h'
);

select throws_ok(
  $$insert into public.sla_instances (tenant_id, work_order_id, due_at)
    values ('aaaaaaaa-1111-1111-1111-111111111111', 'eeeeeeee-1111-1111-1111-111111111111', now())$$,
  'permission denied for table sla_instances',
  'app não consegue inserir em sla_instances diretamente (sem GRANT de INSERT/UPDATE para authenticated)'
);

select is(
  (select public.work_orders_sla_status(wo) from public.work_orders wo
     where id = 'eeeeeeee-1111-1111-1111-111111111111'),
  'ON_TRACK',
  'com due_at 48h no futuro, o status calculado é ON_TRACK'
);

reset role;

-- ── staff configura SLA de 1h pro tenant; próxima OS já nasce apertada ─────
set local role authenticated;
set local request.jwt.claim.sub = '80808080-8080-8080-8080-808080808080';

insert into public.sla_definitions (tenant_id, default_hours)
values ('aaaaaaaa-1111-1111-1111-111111111111', 1);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '90909090-9090-9090-9090-909090909090';

insert into public.service_requests (id, tenant_id, customer_id, vehicle_id, description)
values ('cccccccc-2222-2222-2222-222222222222', 'aaaaaaaa-1111-1111-1111-111111111111',
        '90909090-9090-9090-9090-909090909090', 'bbbbbbbb-1111-1111-1111-111111111111',
        'Barulho na suspensão');

reset role;

update public.service_requests set status = 'ACCEPTED'
where id = 'cccccccc-2222-2222-2222-222222222222';

set local role authenticated;
set local request.jwt.claim.sub = '80808080-8080-8080-8080-808080808080';

-- status não é enviado aqui de propósito: o trigger version_and_supersede_estimate() força
-- SENT na criação (20260824020000) mesmo que o app tente mandar outra coisa.
insert into public.estimates (id, tenant_id, service_request_id, customer_id)
values ('dddddddd-2222-2222-2222-222222222222', 'aaaaaaaa-1111-1111-1111-111111111111',
        'cccccccc-2222-2222-2222-222222222222', '90909090-9090-9090-9090-909090909090');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '90909090-9090-9090-9090-909090909090';

update public.estimates set status = 'APPROVED' where id = 'dddddddd-2222-2222-2222-222222222222';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '80808080-8080-8080-8080-808080808080';

insert into public.work_orders (id, tenant_id, service_request_id, customer_id, vehicle_id, estimate_id, opened_at)
values ('eeeeeeee-2222-2222-2222-222222222222', 'aaaaaaaa-1111-1111-1111-111111111111',
        'cccccccc-2222-2222-2222-222222222222', '90909090-9090-9090-9090-909090909090',
        'bbbbbbbb-1111-1111-1111-111111111111', 'dddddddd-2222-2222-2222-222222222222',
        now() - interval '58 minutes');

select ok(
  (select due_at from public.sla_instances where work_order_id = 'eeeeeeee-2222-2222-2222-222222222222')
    between now() - interval '5 minutes' and now() + interval '10 minutes',
  'com sla_definitions de 1h e OS aberta há 58min, due_at cai perto de agora'
);

select is(
  (select public.work_orders_sla_status(wo) from public.work_orders wo
     where id = 'eeeeeeee-2222-2222-2222-222222222222'),
  'AT_RISK',
  'due_at a menos de 4h de distância -> AT_RISK'
);

-- Segunda OS pro mesmo chamado/orçamento, aberta há 2h com o mesmo SLA de 1h: due_at é
-- carimbado já no passado na criação (não é a mesma linha reaproveitada — due_at nunca muda
-- depois de criado, então pra testar BREACHED precisa nascer assim).
insert into public.work_orders (id, tenant_id, service_request_id, customer_id, vehicle_id, estimate_id, opened_at)
values ('eeeeeeee-3333-3333-3333-333333333333', 'aaaaaaaa-1111-1111-1111-111111111111',
        'cccccccc-2222-2222-2222-222222222222', '90909090-9090-9090-9090-909090909090',
        'bbbbbbbb-1111-1111-1111-111111111111', 'dddddddd-2222-2222-2222-222222222222',
        now() - interval '2 hours');

select ok(
  (select due_at from public.sla_instances where work_order_id = 'eeeeeeee-3333-3333-3333-333333333333')
    < now(),
  'OS aberta há 2h com SLA de 1h nasce com due_at já no passado'
);

select is(
  (select public.work_orders_sla_status(wo) from public.work_orders wo
     where id = 'eeeeeeee-3333-3333-3333-333333333333'),
  'BREACHED',
  'due_at no passado e OS ainda aberta -> BREACHED'
);

update public.work_orders set status = 'DELIVERED'
where id = 'eeeeeeee-3333-3333-3333-333333333333';

select is(
  (select public.work_orders_sla_status(wo) from public.work_orders wo
     where id = 'eeeeeeee-3333-3333-3333-333333333333'),
  'MISSED',
  'entregue depois do due_at -> MISSED'
);

-- ── staff agenda a execução da primeira OS ─────────────────────────────────
insert into public.appointments (id, tenant_id, work_order_id, customer_id, scheduled_at)
values ('ffffffff-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111',
        'eeeeeeee-1111-1111-1111-111111111111', '90909090-9090-9090-9090-909090909090',
        now() + interval '1 day');

select is(
  (select status from public.appointments where id = 'ffffffff-1111-1111-1111-111111111111'),
  'SCHEDULED',
  'agendamento nasce como SCHEDULED'
);

select throws_ok(
  $$insert into public.appointments (tenant_id, work_order_id, customer_id, scheduled_at)
    values ('aaaaaaaa-1111-1111-1111-111111111111', 'eeeeeeee-2222-2222-2222-222222222222',
            '80808080-8080-8080-8080-808080808080', now())$$,
  'appointment tenant/customer does not match work_order eeeeeeee-2222-2222-2222-222222222222',
  'trigger rejeita agendamento com customer_id que não bate com o da OS'
);

reset role;

-- ── cliente vê o agendamento e confirma ────────────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '90909090-9090-9090-9090-909090909090';

select is(
  (select count(*) from public.appointments)::int, 1,
  'cliente vê o próprio agendamento'
);

update public.appointments set status = 'CONFIRMED'
where id = 'ffffffff-1111-1111-1111-111111111111';

select is(
  (select status from public.appointments where id = 'ffffffff-1111-1111-1111-111111111111'),
  'CONFIRMED',
  'cliente consegue confirmar o próprio agendamento (SCHEDULED -> CONFIRMED)'
);

update public.appointments set scheduled_at = now() + interval '3 days'
where id = 'ffffffff-1111-1111-1111-111111111111';

select is(
  (select scheduled_at from public.appointments where id = 'ffffffff-1111-1111-1111-111111111111')
    < now() + interval '2 days',
  true,
  'cliente não consegue mudar o horário do agendamento (RLS só libera a transição de status)'
);

reset role;

-- ── staff de outro tenant não vê nada disso ─────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('aaaaaaaa-9999-9999-9999-999999999999', 'Oficina Outra', 'oficina-outra');

insert into auth.users (id, email, raw_user_meta_data) values
  ('70707070-7070-7070-7070-707070707071', 'staff-outra@wezcar.test',
   jsonb_build_object('name', 'Staff Outra', 'tenant_id', 'aaaaaaaa-9999-9999-9999-999999999999'));

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from public.users u, public.roles r
where u.id = '70707070-7070-7070-7070-707070707071' and r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

set local role authenticated;
set local request.jwt.claim.sub = '70707070-7070-7070-7070-707070707071';

select is(
  (select count(*) from public.appointments)::int, 0,
  'staff de outra oficina não vê nenhum agendamento'
);

reset role;

select * from finish();
rollback;
