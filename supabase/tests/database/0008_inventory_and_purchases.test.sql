-- pgTAP suite for products/inventory_movements/suppliers/purchases — RN-STK-001: saldo de
-- estoque só muda por movimentação auditável. Confere compra recebida -> entrada de estoque,
-- OS entregue com item de catálogo -> saída automática, e isolamento entre oficinas.

begin;
select plan(20);

-- ── fixtures ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('22221111-2222-2222-2222-222222222222', 'Oficina Ômega', 'oficina-omega'),
  ('22223333-2222-2222-2222-222222222222', 'Oficina Psi', 'oficina-psi');

insert into auth.users (id, email, raw_user_meta_data) values
  ('91919191-2222-2222-2222-222222222222', 'staff-omega@wezcar.test',
   jsonb_build_object('name', 'Staff Ômega', 'tenant_id', '22221111-2222-2222-2222-222222222222')),
  ('92929292-2222-2222-2222-222222222222', 'staff-psi@wezcar.test',
   jsonb_build_object('name', 'Staff Psi', 'tenant_id', '22223333-2222-2222-2222-222222222222')),
  ('93939393-2222-2222-2222-222222222222', 'cliente-u@wezcar.test', jsonb_build_object('name', 'Cliente U'));

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from (values
  ('91919191-2222-2222-2222-222222222222'::uuid),
  ('92929292-2222-2222-2222-222222222222'::uuid)
) as staff(user_id)
join public.users u on u.id = staff.user_id
join public.roles r on r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

set local role authenticated;
set local request.jwt.claim.sub = '91919191-2222-2222-2222-222222222222';

insert into public.products (id, tenant_id, sku, name, unit_price, min_stock)
values ('94949494-2222-2222-2222-222222222222', '22221111-2222-2222-2222-222222222222',
        'PAST-DIANT', 'Pastilha de freio dianteira (jogo)', 180.00, 3);

select is(
  (select stock_on_hand from public.products where id = '94949494-2222-2222-2222-222222222222'),
  0,
  'produto cadastrado nasce com estoque zerado'
);

select throws_ok(
  $$insert into public.inventory_movements (tenant_id, product_id, type, quantity)
    values ('22221111-2222-2222-2222-222222222222', '94949494-2222-2222-2222-222222222222', 'PURCHASE', 10)$$,
  'new row violates row-level security policy for table "inventory_movements"',
  'app não consegue forjar uma entrada type PURCHASE direto — só nasce de uma compra recebida'
);

select throws_ok(
  $$insert into public.inventory_movements (tenant_id, product_id, type, quantity)
    values ('22221111-2222-2222-2222-222222222222', '94949494-2222-2222-2222-222222222222', 'USAGE', -1)$$,
  'new row violates row-level security policy for table "inventory_movements"',
  'app não consegue forjar uma saída type USAGE direto — só nasce da entrega de uma OS'
);

insert into public.inventory_movements (tenant_id, product_id, type, quantity, notes)
values ('22221111-2222-2222-2222-222222222222', '94949494-2222-2222-2222-222222222222', 'ADJUSTMENT', 5,
        'contagem física encontrou 5 unidades a mais');

select is(
  (select stock_on_hand from public.products where id = '94949494-2222-2222-2222-222222222222'),
  5,
  'ajuste manual (type ADJUSTMENT) é permitido direto pelo app e atualiza o estoque'
);

-- ── compra: rascunho, itens, recebimento gera entrada de estoque ──────────
insert into public.suppliers (id, tenant_id, name) values
  ('95959595-2222-2222-2222-222222222222', '22221111-2222-2222-2222-222222222222', 'Autopeças Central');

insert into public.purchases (id, tenant_id, supplier_id)
values ('96969696-2222-2222-2222-222222222222', '22221111-2222-2222-2222-222222222222',
        '95959595-2222-2222-2222-222222222222');

insert into public.purchase_items (purchase_id, product_id, quantity, unit_cost)
values ('96969696-2222-2222-2222-222222222222', '94949494-2222-2222-2222-222222222222', 10, 90.00);

select is(
  (select stock_on_hand from public.products where id = '94949494-2222-2222-2222-222222222222'),
  5,
  'itens na compra ainda não mexem no estoque enquanto ela não é recebida'
);

update public.purchases set status = 'RECEIVED' where id = '96969696-2222-2222-2222-222222222222';

select is(
  (select stock_on_hand from public.products where id = '94949494-2222-2222-2222-222222222222'),
  15,
  'receber a compra gera a movimentação de entrada e atualiza o estoque'
);

select is(
  (select count(*) from public.inventory_movements
     where product_id = '94949494-2222-2222-2222-222222222222' and type = 'PURCHASE')::int,
  1,
  'a movimentação de entrada foi registrada com type PURCHASE'
);

select is(
  (select unit_cost from public.products where id = '94949494-2222-2222-2222-222222222222')::numeric,
  90.00::numeric,
  'o custo do produto é atualizado com o custo da compra recebida'
);

select isnt(
  (select received_at from public.purchases where id = '96969696-2222-2222-2222-222222222222'),
  null,
  'receber a compra carimba received_at automaticamente'
);

-- ── vincular produto a um item de orçamento e entregar a OS consome estoque ──
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '93939393-2222-2222-2222-222222222222';

insert into public.vehicles (id, customer_id, brand, model)
values ('97979797-2222-2222-2222-222222222222', '93939393-2222-2222-2222-222222222222', 'Ford', 'Ka');

insert into public.service_requests (id, tenant_id, customer_id, vehicle_id, description)
values ('98989898-2222-2222-2222-222222222222', '22221111-2222-2222-2222-222222222222',
        '93939393-2222-2222-2222-222222222222', '97979797-2222-2222-2222-222222222222', 'Freio rangendo');

reset role;

update public.service_requests set status = 'ACCEPTED'
where id = '98989898-2222-2222-2222-222222222222';

set local role authenticated;
set local request.jwt.claim.sub = '91919191-2222-2222-2222-222222222222';

insert into public.estimates (id, tenant_id, service_request_id, customer_id)
values ('99999999-2222-2222-2222-222222222222', '22221111-2222-2222-2222-222222222222',
        '98989898-2222-2222-2222-222222222222', '93939393-2222-2222-2222-222222222222');

insert into public.estimate_items (estimate_id, kind, description, quantity, unit_price, product_id)
values ('99999999-2222-2222-2222-222222222222', 'PART', 'Pastilha de freio dianteira (jogo)', 2, 180.00,
        '94949494-2222-2222-2222-222222222222');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '93939393-2222-2222-2222-222222222222';

update public.estimates set status = 'APPROVED' where id = '99999999-2222-2222-2222-222222222222';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '91919191-2222-2222-2222-222222222222';

insert into public.work_orders (id, tenant_id, service_request_id, customer_id, vehicle_id, estimate_id)
values ('9a9a9a9a-2222-2222-2222-222222222222', '22221111-2222-2222-2222-222222222222',
        '98989898-2222-2222-2222-222222222222', '93939393-2222-2222-2222-222222222222',
        '97979797-2222-2222-2222-222222222222', '99999999-2222-2222-2222-222222222222');

update public.work_orders set status = 'IN_PROGRESS' where id = '9a9a9a9a-2222-2222-2222-222222222222';

select is(
  (select stock_on_hand from public.products where id = '94949494-2222-2222-2222-222222222222'),
  15,
  'OS em execução ainda não consome estoque'
);

update public.work_orders set status = 'READY' where id = '9a9a9a9a-2222-2222-2222-222222222222';
update public.work_orders set status = 'DELIVERED' where id = '9a9a9a9a-2222-2222-2222-222222222222';

select is(
  (select stock_on_hand from public.products where id = '94949494-2222-2222-2222-222222222222'),
  13,
  'entregar a OS consome as 2 unidades do item vinculado ao produto (15 - 2 = 13)'
);

select is(
  (select count(*) from public.inventory_movements
     where product_id = '94949494-2222-2222-2222-222222222222' and type = 'USAGE')::int,
  1,
  'a saída de estoque foi registrada com type USAGE'
);

select is(
  (select quantity from public.inventory_movements where type = 'USAGE'
     and product_id = '94949494-2222-2222-2222-222222222222'),
  -2,
  'a quantidade da saída é negativa (-2)'
);

-- ── produto de outra oficina não pode ser usado num orçamento ─────────────
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '92929292-2222-2222-2222-222222222222';

insert into public.products (id, tenant_id, name)
values ('9b9b9b9b-2222-2222-2222-222222222222', '22223333-2222-2222-2222-222222222222', 'Óleo de motor');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '91919191-2222-2222-2222-222222222222';

select throws_ok(
  $$insert into public.estimate_items (estimate_id, kind, description, quantity, unit_price, product_id)
    values ('99999999-2222-2222-2222-222222222222', 'PART', 'tentando usar produto de outra oficina', 1, 10.00,
            '9b9b9b9b-2222-2222-2222-222222222222')$$,
  'product 9b9b9b9b-2222-2222-2222-222222222222 does not belong to the same tenant as estimate 99999999-2222-2222-2222-222222222222',
  'trigger rejeita item de orçamento com produto de outra oficina'
);

-- ── isolamento entre oficinas ───────────────────────────────────────────────
select is(
  (select count(*) from public.products)::int, 1,
  'staff só vê os produtos da própria oficina'
);

select is(
  (select count(*) from public.suppliers)::int, 1,
  'staff só vê os fornecedores da própria oficina'
);

select is(
  (select count(*) from public.purchases)::int, 1,
  'staff só vê as compras da própria oficina'
);

select is(
  (select count(*) from public.inventory_movements)::int, 3,
  'staff só vê as movimentações da própria oficina (1 ajuste + 1 entrada + 1 saída)'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '92929292-2222-2222-2222-222222222222';

select is(
  (select count(*) from public.products)::int, 1,
  'staff de outra oficina só vê o próprio produto (Óleo de motor), não o da Ômega'
);

select is(
  (select count(*) from public.inventory_movements)::int, 0,
  'staff de outra oficina não vê nenhuma movimentação da Ômega'
);

reset role;

select * from finish();
rollback;
