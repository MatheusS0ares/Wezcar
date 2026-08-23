-- pgTAP suite for notifications — cada evento-chave já existente (chamado aberto, orçamento
-- enviado/decidido, OS pronta/entregue, agendamento confirmado) gera automaticamente uma
-- notificação pro destinatário certo (staff da oficina via fan-out, ou o cliente do chamado),
-- app nunca insere direto (só os triggers, SECURITY DEFINER), e cada usuário só vê/marca como
-- lida a própria notificação.

begin;
select plan(11);

-- ── fixtures ──────────────────────────────────────────────────────────────
insert into public.tenants (id, name, slug) values
  ('55551111-5555-5555-5555-555555555555', 'Oficina Notif', 'oficina-notif'),
  ('55552222-5555-5555-5555-555555555555', 'Oficina Notif Outra', 'oficina-notif-outra');

insert into auth.users (id, email, raw_user_meta_data) values
  ('5a010101-5555-5555-5555-555555555555', 'staff-notif@wezcar.test',
   jsonb_build_object('name', 'Staff Notif', 'tenant_id', '55551111-5555-5555-5555-555555555555')),
  ('5a020202-5555-5555-5555-555555555555', 'cliente-notif@wezcar.test', jsonb_build_object('name', 'Cliente Notif')),
  ('5a080808-5555-5555-5555-555555555555', 'staff-notif-outra@wezcar.test',
   jsonb_build_object('name', 'Staff Notif Outra', 'tenant_id', '55552222-5555-5555-5555-555555555555'));

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from (values
  ('5a010101-5555-5555-5555-555555555555'::uuid),
  ('5a080808-5555-5555-5555-555555555555'::uuid)
) as staff(user_id)
join public.users u on u.id = staff.user_id
join public.roles r on r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;

-- ── chamado aberto → notifica staff da oficina ──────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '5a020202-5555-5555-5555-555555555555';

insert into public.vehicles (id, customer_id, brand, model)
values ('5a030303-5555-5555-5555-555555555555', '5a020202-5555-5555-5555-555555555555', 'Fiat', 'Argo');

insert into public.service_requests (id, tenant_id, customer_id, vehicle_id, description)
values ('5a040404-5555-5555-5555-555555555555', '55551111-5555-5555-5555-555555555555',
        '5a020202-5555-5555-5555-555555555555', '5a030303-5555-5555-5555-555555555555', 'Revisão dos 20 mil');

reset role;

select is(
  (select count(*) from public.notifications
    where user_id = '5a010101-5555-5555-5555-555555555555' and type = 'SERVICE_REQUEST_OPENED')::int,
  1,
  'abrir um chamado notifica o staff da oficina'
);

select is(
  (select link from public.notifications
    where user_id = '5a010101-5555-5555-5555-555555555555' and type = 'SERVICE_REQUEST_OPENED'),
  '/oficina/chamados/5a040404-5555-5555-5555-555555555555',
  'a notificação linka pra tela de chamado do staff'
);

update public.service_requests set status = 'ACCEPTED'
where id = '5a040404-5555-5555-5555-555555555555';

-- ── orçamento enviado (toda inserção já nasce SENT) → notifica cliente ─────
set local role authenticated;
set local request.jwt.claim.sub = '5a010101-5555-5555-5555-555555555555';

insert into public.estimates (id, tenant_id, service_request_id, customer_id)
values ('5a050505-5555-5555-5555-555555555555', '55551111-5555-5555-5555-555555555555',
        '5a040404-5555-5555-5555-555555555555', '5a020202-5555-5555-5555-555555555555');

reset role;

select is(
  (select count(*) from public.notifications
    where user_id = '5a020202-5555-5555-5555-555555555555' and type = 'ESTIMATE_SENT')::int,
  1,
  'orçamento enviado notifica o cliente'
);

-- ── orçamento aprovado → notifica staff ─────────────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '5a020202-5555-5555-5555-555555555555';

update public.estimates set status = 'APPROVED' where id = '5a050505-5555-5555-5555-555555555555';

reset role;

select is(
  (select count(*) from public.notifications
    where user_id = '5a010101-5555-5555-5555-555555555555' and type = 'ESTIMATE_DECIDED')::int,
  1,
  'cliente aprovar o orçamento notifica o staff'
);

-- ── OS pronta e entregue → notifica cliente ─────────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '5a010101-5555-5555-5555-555555555555';

insert into public.work_orders (id, tenant_id, service_request_id, customer_id, vehicle_id, estimate_id)
values ('5a060606-5555-5555-5555-555555555555', '55551111-5555-5555-5555-555555555555',
        '5a040404-5555-5555-5555-555555555555', '5a020202-5555-5555-5555-555555555555',
        '5a030303-5555-5555-5555-555555555555', '5a050505-5555-5555-5555-555555555555');

update public.work_orders set status = 'IN_PROGRESS' where id = '5a060606-5555-5555-5555-555555555555';
update public.work_orders set status = 'READY' where id = '5a060606-5555-5555-5555-555555555555';

-- RLS só deixa cada usuário ver a própria notificação — a asserção precisa rodar fora do
-- papel do staff pra enxergar a notificação que foi pro cliente.
reset role;

select is(
  (select count(*) from public.notifications
    where user_id = '5a020202-5555-5555-5555-555555555555' and type = 'WORK_ORDER_READY')::int,
  1,
  'OS ficar pronta notifica o cliente'
);

set local role authenticated;
set local request.jwt.claim.sub = '5a010101-5555-5555-5555-555555555555';

update public.work_orders set status = 'DELIVERED' where id = '5a060606-5555-5555-5555-555555555555';

-- ── agendamento confirmado pelo cliente → notifica staff ────────────────────
insert into public.appointments (id, tenant_id, work_order_id, customer_id, scheduled_at)
values ('5a070707-5555-5555-5555-555555555555', '55551111-5555-5555-5555-555555555555',
        '5a060606-5555-5555-5555-555555555555', '5a020202-5555-5555-5555-555555555555', now() + interval '1 day');

reset role;

select is(
  (select count(*) from public.notifications
    where user_id = '5a020202-5555-5555-5555-555555555555' and type = 'WORK_ORDER_DELIVERED')::int,
  1,
  'OS entregue notifica o cliente'
);
set local role authenticated;
set local request.jwt.claim.sub = '5a020202-5555-5555-5555-555555555555';

update public.appointments set status = 'CONFIRMED' where id = '5a070707-5555-5555-5555-555555555555';

reset role;

select is(
  (select count(*) from public.notifications
    where user_id = '5a010101-5555-5555-5555-555555555555' and type = 'APPOINTMENT_CONFIRMED')::int,
  1,
  'cliente confirmar o agendamento notifica o staff'
);

-- ── app não escreve em notifications diretamente (só os triggers) ──────────
set local role authenticated;
set local request.jwt.claim.sub = '5a020202-5555-5555-5555-555555555555';

select throws_ok(
  $$insert into public.notifications (user_id, type, title) values
    ('5a020202-5555-5555-5555-555555555555', 'ESTIMATE_SENT', 'forjado')$$,
  'permission denied for table notifications',
  'authenticated não consegue inserir em notifications diretamente'
);

-- ── cliente marca a própria notificação como lida ───────────────────────────
update public.notifications set read_at = now()
where user_id = '5a020202-5555-5555-5555-555555555555' and type = 'ESTIMATE_SENT';

select ok(
  (select read_at from public.notifications
    where user_id = '5a020202-5555-5555-5555-555555555555' and type = 'ESTIMATE_SENT') is not null,
  'cliente consegue marcar a própria notificação como lida'
);

-- ── cliente não consegue marcar a notificação de outro usuário como lida ───
update public.notifications set read_at = now()
where user_id = '5a010101-5555-5555-5555-555555555555' and type = 'SERVICE_REQUEST_OPENED';

select is(
  (select read_at from public.notifications
    where user_id = '5a010101-5555-5555-5555-555555555555' and type = 'SERVICE_REQUEST_OPENED'),
  null,
  'cliente não consegue marcar como lida a notificação do staff (RLS bloqueia — 0 linhas afetadas)'
);

reset role;

-- ── staff de outra oficina não vê nada disso ────────────────────────────────
set local role authenticated;
set local request.jwt.claim.sub = '5a080808-5555-5555-5555-555555555555';

select is(
  (select count(*) from public.notifications)::int, 0,
  'staff de outra oficina não vê nenhuma notificação alheia'
);

reset role;

select * from finish();
rollback;
