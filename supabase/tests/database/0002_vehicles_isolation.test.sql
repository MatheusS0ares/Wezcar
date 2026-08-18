-- pgTAP suite for RN-VEH-001: "Cliente só visualiza/altera veículos associados à sua conta."
-- Also covers the mileage-history sync trigger (odometer never regresses, vehicles.mileage
-- always mirrors the latest history row, mileage can't be edited directly).

begin;
select plan(9);

-- ── fixtures: two customers, each with one vehicle ─────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'cliente-a@wezcar.test', jsonb_build_object('name', 'Cliente A')),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cliente-b@wezcar.test', jsonb_build_object('name', 'Cliente B'));

set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

insert into public.vehicles (id, customer_id, brand, model, mileage)
values ('11111111-2222-3333-4444-555555555501', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Fiat', 'Argo', 10000);

reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

insert into public.vehicles (id, customer_id, brand, model, mileage)
values ('11111111-2222-3333-4444-555555555502', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'VW', 'Gol', 20000);

reset role;

-- ── initial mileage history row created automatically ──────────────────────
select is(
  (select mileage from public.vehicle_mileage_history
     where vehicle_id = '11111111-2222-3333-4444-555555555501' and source = 'INITIAL'),
  10000,
  'creating a vehicle with mileage seeds an INITIAL history row with that mileage'
);

-- ── RLS: cliente A só enxerga o próprio veículo ─────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

select is(
  (select count(*) from public.vehicles)::int, 1,
  'cliente A vê exatamente 1 veículo (o próprio)'
);

update public.vehicles set model = 'HACKED' where id = '11111111-2222-3333-4444-555555555502';

select is(
  (select count(*) from public.vehicles where model = 'HACKED')::int, 0,
  'RLS impede cliente A de alterar o veículo do cliente B'
);

-- ── mileage só muda via histórico, nunca por UPDATE direto ──────────────────
select throws_ok(
  $$update public.vehicles set mileage = 99999 where id = '11111111-2222-3333-4444-555555555501'$$,
  'permission denied for table vehicles',
  'UPDATE direto em vehicles.mileage é rejeitado (coluna não tem GRANT de update)'
);

-- ── odômetro não pode regredir ───────────────────────────────────────────────
select throws_ok(
  $$insert into public.vehicle_mileage_history (vehicle_id, mileage) values ('11111111-2222-3333-4444-555555555501', 5000)$$,
  'nova quilometragem (5000) é menor que a atual (10000) para o veículo 11111111-2222-3333-4444-555555555501',
  'inserir quilometragem menor que a atual lança exceção'
);

-- ── quilometragem avança normalmente e sincroniza vehicles.mileage ──────────
insert into public.vehicle_mileage_history (vehicle_id, mileage) values
  ('11111111-2222-3333-4444-555555555501', 12500);

select is(
  (select mileage from public.vehicles where id = '11111111-2222-3333-4444-555555555501'),
  12500,
  'inserir uma quilometragem maior atualiza vehicles.mileage via trigger'
);

select is(
  (select count(*) from public.vehicle_mileage_history where vehicle_id = '11111111-2222-3333-4444-555555555501')::int,
  2,
  'o histórico acumula a entrada INITIAL + a nova entrada, sem sobrescrever'
);

reset role;

-- ── cliente B não enxerga histórico do veículo do cliente A ─────────────────
set local role authenticated;
set local request.jwt.claim.sub = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

select is(
  (select count(*) from public.vehicle_mileage_history
     where vehicle_id = '11111111-2222-3333-4444-555555555501')::int,
  0,
  'cliente B não vê o histórico de quilometragem do veículo do cliente A'
);

select is(
  (select count(*) from public.vehicles)::int, 1,
  'cliente B vê exatamente 1 veículo (o próprio)'
);

reset role;

select * from finish();
rollback;
