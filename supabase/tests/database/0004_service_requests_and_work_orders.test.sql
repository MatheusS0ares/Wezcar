-- pgTAP suite for the first slice of Wezcar Oficina: service_requests ("chamados") and
-- work_orders ("OS"), including the auto timeline (work_order_events) and tenant isolation
-- between two workshops.

begin;
select plan(14);

-- ── fixtures ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('66666666-6666-6666-6666-666666666666', 'Oficina Zeta', 'oficina-zeta'),
  ('77777777-7777-7777-7777-777777777777', 'Oficina Eta', 'oficina-eta');

insert into auth.users (id, email, raw_user_meta_data) values
  ('10101010-1010-1010-1010-101010101010', 'staff-zeta@wezcar.test',
   jsonb_build_object('name', 'Staff Zeta', 'tenant_id', '66666666-6666-6666-6666-666666666666')),
  ('20202020-2020-2020-2020-202020202020', 'staff-eta@wezcar.test',
   jsonb_build_object('name', 'Staff Eta', 'tenant_id', '77777777-7777-7777-7777-777777777777')),
  ('30303030-3030-3030-3030-303030303030', 'cliente-x@wezcar.test', jsonb_build_object('name', 'Cliente X')),
  ('40404040-4040-4040-4040-404040404040', 'cliente-y@wezcar.test', jsonb_build_object('name', 'Cliente Y'));

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from (values
  ('10101010-1010-1010-1010-101010101010'::uuid),
  ('20202020-2020-2020-2020-202020202020'::uuid)
) as staff(user_id)
join public.users u on u.id = staff.user_id
join public.roles r on r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

set local role authenticated;
set local request.jwt.claim.sub = '30303030-3030-3030-3030-303030303030';

insert into public.vehicles (id, customer_id, brand, model)
values ('aaaaaaaa-0000-0000-0000-000000000001', '30303030-3030-3030-3030-303030303030', 'Toyota', 'Corolla');

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '40404040-4040-4040-4040-404040404040';

insert into public.vehicles (id, customer_id, brand, model)
values ('aaaaaaaa-0000-0000-0000-000000000002', '40404040-4040-4040-4040-404040404040', 'Chevrolet', 'Onix');

reset role;

-- ── trigger rejeita chamado com veículo de outro cliente ────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '30303030-3030-3030-3030-303030303030';

select throws_ok(
  $$insert into public.service_requests (tenant_id, customer_id, vehicle_id, description)
    values ('66666666-6666-6666-6666-666666666666', '30303030-3030-3030-3030-303030303030',
            'aaaaaaaa-0000-0000-0000-000000000002', 'tentando usar carro de outro cliente')$$,
  'vehicle aaaaaaaa-0000-0000-0000-000000000002 does not belong to customer 30303030-3030-3030-3030-303030303030',
  'chamado com veículo de outro cliente é rejeitado pelo trigger de ownership'
);

-- ── cliente X abre um chamado na Oficina Zeta ───────────────────────────────
insert into public.service_requests (id, tenant_id, customer_id, vehicle_id, description)
values ('bbbbbbbb-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666',
        '30303030-3030-3030-3030-303030303030', 'aaaaaaaa-0000-0000-0000-000000000001',
        'Barulho no motor');

select is(
  (select count(*) from public.service_requests)::int, 1,
  'cliente X vê exatamente o próprio chamado'
);

reset role;

-- ── cliente Y (sem chamados) não vê o chamado do cliente X ─────────────────
set local role authenticated;
set local request.jwt.claim.sub = '40404040-4040-4040-4040-404040404040';

select is(
  (select count(*) from public.service_requests)::int, 0,
  'cliente Y não vê chamado de outro cliente'
);

reset role;

-- ── staff da Oficina Eta (outro tenant) não vê o chamado ───────────────────
set local role authenticated;
set local request.jwt.claim.sub = '20202020-2020-2020-2020-202020202020';

select is(
  (select count(*) from public.service_requests)::int, 0,
  'staff de outra oficina não vê o chamado'
);

update public.service_requests set status = 'ACCEPTED'
where id = 'bbbbbbbb-0000-0000-0000-000000000001';

reset role;

-- checked as postgres (bypasses RLS) since staff-eta can't even SELECT this row to begin with
select is(
  (select status from public.service_requests where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'OPEN',
  'staff de outra oficina não consegue aceitar o chamado (RLS bloqueia o UPDATE)'
);

-- ── staff da Oficina Zeta vê e aceita o chamado ─────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '10101010-1010-1010-1010-101010101010';

select is(
  (select count(*) from public.service_requests)::int, 1,
  'staff da própria oficina vê o chamado'
);

update public.service_requests set status = 'ACCEPTED'
where id = 'bbbbbbbb-0000-0000-0000-000000000001';

select isnt(
  (select accepted_at from public.service_requests where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  null,
  'aceitar o chamado carimba accepted_at automaticamente'
);

-- ── orçamento aprovado é pré-requisito pra OS desde 20260823010000 (RN-EST-002) ─────────────
insert into public.estimates (id, tenant_id, service_request_id, customer_id)
values ('eeeeeeee-0000-0000-0000-000000000099', '66666666-6666-6666-6666-666666666666',
        'bbbbbbbb-0000-0000-0000-000000000001', '30303030-3030-3030-3030-303030303030');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '30303030-3030-3030-3030-303030303030';

update public.estimates set status = 'APPROVED'
where id = 'eeeeeeee-0000-0000-0000-000000000099';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10101010-1010-1010-1010-101010101010';

-- ── staff cria a OS a partir do chamado aceito (agora com orçamento aprovado) ───────────────
insert into public.work_orders (id, tenant_id, service_request_id, customer_id, vehicle_id)
values ('cccccccc-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666',
        'bbbbbbbb-0000-0000-0000-000000000001', '30303030-3030-3030-3030-303030303030',
        'aaaaaaaa-0000-0000-0000-000000000001');

select is(
  (select event_type from public.work_order_events
     where work_order_id = 'cccccccc-0000-0000-0000-000000000001' order by created_at limit 1),
  'CREATED',
  'criar a OS gera automaticamente o evento CREATED na timeline'
);

update public.work_orders set status = 'IN_PROGRESS'
where id = 'cccccccc-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.work_order_events
     where work_order_id = 'cccccccc-0000-0000-0000-000000000001' and event_type = 'STATUS_CHANGE')::int,
  1,
  'mudar o status da OS gera um evento STATUS_CHANGE na timeline'
);

select is(
  (select new_status from public.work_order_events
     where work_order_id = 'cccccccc-0000-0000-0000-000000000001' and event_type = 'STATUS_CHANGE'),
  'IN_PROGRESS',
  'o evento de mudança de status registra o novo status corretamente'
);

reset role;

-- ── cliente X enxerga a própria OS mas não consegue alterá-la ──────────────
set local role authenticated;
set local request.jwt.claim.sub = '30303030-3030-3030-3030-303030303030';

select is(
  (select count(*) from public.work_orders)::int, 1,
  'cliente vê a própria OS (somente leitura)'
);

update public.work_orders set status = 'DELIVERED' where id = 'cccccccc-0000-0000-0000-000000000001';

select is(
  (select status from public.work_orders where id = 'cccccccc-0000-0000-0000-000000000001'),
  'IN_PROGRESS',
  'cliente não consegue alterar o status da própria OS (RLS bloqueia)'
);

select is(
  (select count(*) from public.work_order_events where work_order_id = 'cccccccc-0000-0000-0000-000000000001')::int,
  2,
  'a timeline continua com só 2 eventos (a tentativa bloqueada do cliente não gerou evento)'
);

reset role;

-- ── staff de outra oficina não enxerga a OS ─────────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '20202020-2020-2020-2020-202020202020';

select is(
  (select count(*) from public.work_orders)::int, 0,
  'staff de outra oficina não vê a OS'
);

reset role;

select * from finish();
rollback;
