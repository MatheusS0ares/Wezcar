-- pgTAP suite for accounts_receivable/accounts_payable/payments — RN-FIN-001: pagamentos
-- precisam ser idempotentes. Confere OS entregue -> conta a receber automática, compra
-- recebida -> conta a pagar automática, pagamento parcial/total atualiza saldo e status, chave
-- de idempotência repetida é rejeitada, e isolamento entre oficinas/clientes.

begin;
select plan(19);

-- ── fixtures ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('33331111-3333-3333-3333-333333333333', 'Oficina Delta Fin', 'oficina-delta-fin'),
  ('33332222-3333-3333-3333-333333333333', 'Oficina Epsilon Fin', 'oficina-epsilon-fin');

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1010101-3333-3333-3333-333333333333', 'staff-delta@wezcar.test',
   jsonb_build_object('name', 'Staff Delta', 'tenant_id', '33331111-3333-3333-3333-333333333333')),
  ('a2020202-3333-3333-3333-333333333333', 'staff-epsilon@wezcar.test',
   jsonb_build_object('name', 'Staff Epsilon', 'tenant_id', '33332222-3333-3333-3333-333333333333')),
  ('a3030303-3333-3333-3333-333333333333', 'cliente-t@wezcar.test', jsonb_build_object('name', 'Cliente T'));

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from (values
  ('a1010101-3333-3333-3333-333333333333'::uuid),
  ('a2020202-3333-3333-3333-333333333333'::uuid)
) as staff(user_id)
join public.users u on u.id = staff.user_id
join public.roles r on r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

-- ── OS entregue gera conta a receber automaticamente ───────────────────────
set local role authenticated;
set local request.jwt.claim.sub = 'a3030303-3333-3333-3333-333333333333';

insert into public.vehicles (id, customer_id, brand, model)
values ('a4040404-3333-3333-3333-333333333333', 'a3030303-3333-3333-3333-333333333333', 'Renault', 'Kwid');

insert into public.service_requests (id, tenant_id, customer_id, vehicle_id, description)
values ('a5050505-3333-3333-3333-333333333333', '33331111-3333-3333-3333-333333333333',
        'a3030303-3333-3333-3333-333333333333', 'a4040404-3333-3333-3333-333333333333', 'Revisão');

reset role;

update public.service_requests set status = 'ACCEPTED'
where id = 'a5050505-3333-3333-3333-333333333333';

set local role authenticated;
set local request.jwt.claim.sub = 'a1010101-3333-3333-3333-333333333333';

insert into public.estimates (id, tenant_id, service_request_id, customer_id)
values ('a6060606-3333-3333-3333-333333333333', '33331111-3333-3333-3333-333333333333',
        'a5050505-3333-3333-3333-333333333333', 'a3030303-3333-3333-3333-333333333333');

insert into public.estimate_items (estimate_id, kind, description, quantity, unit_price) values
  ('a6060606-3333-3333-3333-333333333333', 'PART', 'Filtro de ar', 1, 60.00),
  ('a6060606-3333-3333-3333-333333333333', 'LABOR', 'Mão de obra', 1, 140.00);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'a3030303-3333-3333-3333-333333333333';

update public.estimates set status = 'APPROVED' where id = 'a6060606-3333-3333-3333-333333333333';

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'a1010101-3333-3333-3333-333333333333';

insert into public.work_orders (id, tenant_id, service_request_id, customer_id, vehicle_id, estimate_id)
values ('a7070707-3333-3333-3333-333333333333', '33331111-3333-3333-3333-333333333333',
        'a5050505-3333-3333-3333-333333333333', 'a3030303-3333-3333-3333-333333333333',
        'a4040404-3333-3333-3333-333333333333', 'a6060606-3333-3333-3333-333333333333');

select is(
  (select count(*) from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333')::int,
  0,
  'OS ainda aberta não gera conta a receber'
);

update public.work_orders set status = 'IN_PROGRESS' where id = 'a7070707-3333-3333-3333-333333333333';
update public.work_orders set status = 'READY' where id = 'a7070707-3333-3333-3333-333333333333';
update public.work_orders set status = 'DELIVERED' where id = 'a7070707-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333')::int,
  1,
  'entregar a OS gera automaticamente 1 conta a receber'
);

select is(
  (select amount from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333')::numeric,
  200.00::numeric,
  'o valor da conta a receber é a soma dos itens do orçamento (R$ 200,00)'
);

select is(
  (select status from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333'),
  'OPEN',
  'a conta nasce como OPEN'
);

-- ── pagamento parcial, depois total ─────────────────────────────────────────
insert into public.payments (tenant_id, receivable_id, amount, method, idempotency_key)
select '33331111-3333-3333-3333-333333333333', id, 80.00, 'PIX', 'pay-key-partial-001'
from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333';

select is(
  (select paid_amount from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333')::numeric,
  80.00::numeric,
  'pagamento parcial atualiza paid_amount'
);

select is(
  (select status from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333'),
  'OPEN',
  'ainda falta pagar — status continua OPEN'
);

-- ── mesma idempotency_key não gera baixa duplicada (RN-FIN-001) ────────────
select throws_ok(
  $$insert into public.payments (tenant_id, receivable_id, amount, method, idempotency_key)
    select '33331111-3333-3333-3333-333333333333', id, 80.00, 'PIX', 'pay-key-partial-001'
    from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333'$$,
  'duplicate key value violates unique constraint "payments_tenant_idempotency_key_unique"',
  'reenviar o mesmo idempotency_key é rejeitado — não duplica a baixa'
);

select is(
  (select paid_amount from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333')::numeric,
  80.00::numeric,
  'paid_amount continua 80,00 depois da tentativa duplicada rejeitada'
);

insert into public.payments (tenant_id, receivable_id, amount, method, idempotency_key)
select '33331111-3333-3333-3333-333333333333', id, 120.00, 'CARD', 'pay-key-final-002'
from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333';

select is(
  (select paid_amount from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333')::numeric,
  200.00::numeric,
  'segundo pagamento (chave diferente) completa o valor: 80 + 120 = 200'
);

select is(
  (select status from public.accounts_receivable where work_order_id = 'a7070707-3333-3333-3333-333333333333'),
  'PAID',
  'com paid_amount >= amount, o status vira PAID automaticamente'
);

reset role;

-- ── compra recebida gera conta a pagar automaticamente ─────────────────────
set local role authenticated;
set local request.jwt.claim.sub = 'a1010101-3333-3333-3333-333333333333';

insert into public.products (id, tenant_id, name)
values ('a8080808-3333-3333-3333-333333333333', '33331111-3333-3333-3333-333333333333', 'Filtro de ar');

insert into public.suppliers (id, tenant_id, name)
values ('a9090909-3333-3333-3333-333333333333', '33331111-3333-3333-3333-333333333333', 'Distribuidora ABC');

insert into public.purchases (id, tenant_id, supplier_id)
values ('aa0a0a0a-3333-3333-3333-333333333333', '33331111-3333-3333-3333-333333333333',
        'a9090909-3333-3333-3333-333333333333');

insert into public.purchase_items (purchase_id, product_id, quantity, unit_cost)
values ('aa0a0a0a-3333-3333-3333-333333333333', 'a8080808-3333-3333-3333-333333333333', 5, 30.00);

select is(
  (select count(*) from public.accounts_payable)::int, 0,
  'compra ainda não recebida não gera conta a pagar'
);

update public.purchases set status = 'RECEIVED' where id = 'aa0a0a0a-3333-3333-3333-333333333333';

select is(
  (select amount from public.accounts_payable where purchase_id = 'aa0a0a0a-3333-3333-3333-333333333333')::numeric,
  150.00::numeric,
  'receber a compra gera conta a pagar com o valor dos itens (5 x R$ 30,00 = R$ 150,00)'
);

insert into public.payments (tenant_id, payable_id, amount, method, idempotency_key)
select '33331111-3333-3333-3333-333333333333', id, 150.00, 'TRANSFER', 'pay-key-supplier-001'
from public.accounts_payable where purchase_id = 'aa0a0a0a-3333-3333-3333-333333333333';

select is(
  (select status from public.accounts_payable where purchase_id = 'aa0a0a0a-3333-3333-3333-333333333333'),
  'PAID',
  'pagar o fornecedor à vista já marca a conta como PAID'
);

reset role;

-- ── cliente vê a própria conta a receber e os pagamentos, mas não insere ───
set local role authenticated;
set local request.jwt.claim.sub = 'a3030303-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.accounts_receivable)::int, 1,
  'cliente vê a própria conta a receber'
);

select is(
  (select count(*) from public.payments)::int, 2,
  'cliente vê os pagamentos da própria conta'
);

select throws_ok(
  $$insert into public.payments (tenant_id, receivable_id, amount, method, idempotency_key)
    select '33331111-3333-3333-3333-333333333333', id, 999.00, 'CASH', 'cliente-tentando-pagar'
    from public.accounts_receivable limit 1$$,
  'new row violates row-level security policy for table "payments"',
  'cliente não consegue registrar pagamento diretamente (só staff com financial.manage)'
);

select is(
  (select count(*) from public.accounts_payable)::int, 0,
  'cliente não vê contas a pagar (são internas da oficina)'
);

reset role;

-- ── staff de outra oficina não vê nada disso ────────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = 'a2020202-3333-3333-3333-333333333333';

select is(
  (select count(*) from public.accounts_receivable)::int, 0,
  'staff de outra oficina não vê a conta a receber da Delta'
);

select is(
  (select count(*) from public.accounts_payable)::int, 0,
  'staff de outra oficina não vê a conta a pagar da Delta'
);

reset role;

select * from finish();
rollback;
