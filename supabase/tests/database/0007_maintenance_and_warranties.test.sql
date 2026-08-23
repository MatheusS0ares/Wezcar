-- pgTAP suite for maintenance_records/warranties — a Vida do Carro completa. Confere que uma
-- OS entregue gera automaticamente registro de manutenção + garantia, que o dono do veículo
-- consegue registrar manutenção manual (feita fora da Wezcar) mas não consegue forjar uma linha
-- WORK_ORDER, e que o histórico continua sendo do veículo, não da oficina.

begin;
select plan(18);

-- ── fixtures ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('11112222-1111-1111-1111-111111111111', 'Oficina Lambda', 'oficina-lambda'),
  ('11113333-1111-1111-1111-111111111111', 'Oficina Sigma', 'oficina-sigma');

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1a1a1a1-1111-1111-1111-111111111111', 'staff-lambda@wezcar.test',
   jsonb_build_object('name', 'Staff Lambda', 'tenant_id', '11112222-1111-1111-1111-111111111111')),
  ('a2a2a2a2-1111-1111-1111-111111111111', 'staff-sigma@wezcar.test',
   jsonb_build_object('name', 'Staff Sigma', 'tenant_id', '11113333-1111-1111-1111-111111111111')),
  ('b1b1b1b1-1111-1111-1111-111111111111', 'cliente-v@wezcar.test', jsonb_build_object('name', 'Cliente V'));

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from (values
  ('a1a1a1a1-1111-1111-1111-111111111111'::uuid),
  ('a2a2a2a2-1111-1111-1111-111111111111'::uuid)
) as staff(user_id)
join public.users u on u.id = staff.user_id
join public.roles r on r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

set local role authenticated;
set local request.jwt.claim.sub = 'b1b1b1b1-1111-1111-1111-111111111111';

insert into public.vehicles (id, customer_id, brand, model, mileage)
values ('c1c1c1c1-1111-1111-1111-111111111111', 'b1b1b1b1-1111-1111-1111-111111111111', 'Honda', 'HR-V', 15000);

insert into public.service_requests (id, tenant_id, customer_id, vehicle_id, description)
values ('d1d1d1d1-1111-1111-1111-111111111111', '11112222-1111-1111-1111-111111111111',
        'b1b1b1b1-1111-1111-1111-111111111111', 'c1c1c1c1-1111-1111-1111-111111111111', 'Revisão geral');

reset role;

update public.service_requests set status = 'ACCEPTED'
where id = 'd1d1d1d1-1111-1111-1111-111111111111';

set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-1111-1111-1111-111111111111';

insert into public.estimates (id, tenant_id, service_request_id, customer_id)
values ('e1e1e1e1-1111-1111-1111-111111111111', '11112222-1111-1111-1111-111111111111',
        'd1d1d1d1-1111-1111-1111-111111111111', 'b1b1b1b1-1111-1111-1111-111111111111');

insert into public.estimate_items (estimate_id, kind, description, quantity, unit_price) values
  ('e1e1e1e1-1111-1111-1111-111111111111', 'PART', 'Filtro de óleo', 1, 45.00),
  ('e1e1e1e1-1111-1111-1111-111111111111', 'LABOR', 'Troca de óleo', 1, 80.00);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'b1b1b1b1-1111-1111-1111-111111111111';

update public.estimates set status = 'APPROVED' where id = 'e1e1e1e1-1111-1111-1111-111111111111';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-1111-1111-1111-111111111111';

insert into public.work_orders (id, tenant_id, service_request_id, customer_id, vehicle_id, estimate_id)
values ('f1f1f1f1-1111-1111-1111-111111111111', '11112222-1111-1111-1111-111111111111',
        'd1d1d1d1-1111-1111-1111-111111111111', 'b1b1b1b1-1111-1111-1111-111111111111',
        'c1c1c1c1-1111-1111-1111-111111111111', 'e1e1e1e1-1111-1111-1111-111111111111');

-- ── OS em execução ainda não gera manutenção nem garantia ──────────────────
select is(
  (select count(*) from public.maintenance_records where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111')::int,
  0,
  'OS ainda aberta não gera registro de manutenção'
);

update public.work_orders set status = 'IN_PROGRESS' where id = 'f1f1f1f1-1111-1111-1111-111111111111';
update public.work_orders set status = 'READY' where id = 'f1f1f1f1-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.maintenance_records where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111')::int,
  0,
  'passar por IN_PROGRESS/READY ainda não gera manutenção — só DELIVERED'
);

-- ── entregar a OS gera manutenção + garantia automaticamente ───────────────
update public.work_orders set status = 'DELIVERED' where id = 'f1f1f1f1-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.maintenance_records where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111')::int,
  1,
  'entregar a OS gera automaticamente 1 registro de manutenção'
);

select is(
  (select source from public.maintenance_records where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111'),
  'WORK_ORDER',
  'o registro automático nasce com source WORK_ORDER'
);

select is(
  (select description from public.maintenance_records where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111'),
  'Filtro de óleo, Troca de óleo',
  'a descrição é composta a partir dos itens do orçamento'
);

select is(
  (select cost from public.maintenance_records where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111')::numeric,
  125.00::numeric,
  'o custo é a soma dos itens do orçamento: R$ 125,00'
);

select is(
  (select mileage from public.maintenance_records where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111'),
  15000,
  'a quilometragem registrada é a do veículo no momento da entrega'
);

select is(
  (select count(*) from public.warranties where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111')::int,
  1,
  'entregar a OS também gera automaticamente 1 garantia'
);

select ok(
  (select expires_at from public.warranties where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111')
    between now() + interval '2 months 25 days' and now() + interval '3 months 5 days',
  'sem warranty_definitions configurada, a garantia usa o fallback de 3 meses'
);

select is(
  (select public.warranties_status(w) from public.warranties w
     where work_order_id = 'f1f1f1f1-1111-1111-1111-111111111111'),
  'ACTIVE',
  'garantia recém-criada está ACTIVE'
);

reset role;

-- ── dono do veículo vê o histórico e adiciona manutenção manual ────────────
set local role authenticated;
set local request.jwt.claim.sub = 'b1b1b1b1-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.maintenance_records)::int, 1,
  'dono do veículo vê o registro gerado pela OS'
);

insert into public.maintenance_records (vehicle_id, source, description, mileage)
values ('c1c1c1c1-1111-1111-1111-111111111111', 'MANUAL', 'Troca de pneus (feita em outra oficina, sem Wezcar)', 15500);

select is(
  (select count(*) from public.maintenance_records where source = 'MANUAL')::int, 1,
  'dono do veículo consegue registrar manutenção feita fora da Wezcar'
);

select throws_ok(
  $$insert into public.maintenance_records (vehicle_id, tenant_id, work_order_id, source, description)
    values ('c1c1c1c1-1111-1111-1111-111111111111', '11112222-1111-1111-1111-111111111111',
            'f1f1f1f1-1111-1111-1111-111111111111', 'WORK_ORDER', 'tentando forjar um registro verificado')$$,
  'new row violates row-level security policy for table "maintenance_records"',
  'dono do veículo não consegue forjar um registro WORK_ORDER (RLS só libera MANUAL)'
);

select is(
  (select count(*) from public.warranties)::int, 1,
  'dono do veículo vê a própria garantia'
);

reset role;

-- ── staff da própria oficina vê o que fez; staff de outra oficina não vê nada ──
set local role authenticated;
set local request.jwt.claim.sub = 'a1a1a1a1-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.maintenance_records where source = 'WORK_ORDER')::int, 1,
  'staff da oficina que atendeu vê o registro WORK_ORDER'
);

select is(
  (select count(*) from public.maintenance_records where source = 'MANUAL')::int, 0,
  'staff não vê a manutenção MANUAL do cliente (não foi feita nessa oficina)'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'a2a2a2a2-1111-1111-1111-111111111111';

select is(
  (select count(*) from public.maintenance_records)::int, 0,
  'staff de outra oficina não vê nenhum registro deste veículo'
);

select is(
  (select count(*) from public.warranties)::int, 0,
  'staff de outra oficina não vê a garantia'
);

reset role;

select * from finish();
rollback;
