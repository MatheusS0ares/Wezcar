-- NOTIFICATIONS — hoje o app não avisa ninguém: cliente e oficina só descobrem que algo
-- mudou se entrarem e olharem. Uma notificação é gerada automaticamente por trigger em cada
-- evento-chave do fluxo já existente (chamado aberto, orçamento enviado/decidido, OS pronta/
-- entregue, agendamento confirmado) — nenhum evento novo, só um aviso sobre os que já existem.
--
-- Uma linha por destinatário (não por evento): um "chamado aberto" notifica CADA membro do
-- staff da oficina (fan-out), um "orçamento enviado" notifica só o cliente daquele chamado.
-- App nunca insere direto — só os triggers (SECURITY DEFINER) escrevem; app só lê e marca
-- como lida (UPDATE restrito a read_at da própria notificação, via RLS).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade,
  type varchar(40) not null,
  title varchar(150) not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in (
    'SERVICE_REQUEST_OPENED', 'ESTIMATE_SENT', 'ESTIMATE_DECIDED',
    'WORK_ORDER_READY', 'WORK_ORDER_DELIVERED', 'APPOINTMENT_CONFIRMED'
  ))
);

comment on table public.notifications is 'NOTIFICATIONS from the data dictionary. One row per recipient, written exclusively by domain triggers (SECURITY DEFINER) below — never by the app directly. App only reads its own rows and marks read_at.';

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index notifications_user_id_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public.notify_user(
  p_user_id uuid, p_tenant_id uuid, p_type text, p_title text, p_body text, p_link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, tenant_id, type, title, body, link)
  values (p_user_id, p_tenant_id, p_type, p_title, p_body, p_link);
end;
$$;

-- Um chamado/orçamento/agendamento é da oficina, não de uma pessoa — "staff da oficina" é
-- todo usuário com tenant_id = essa oficina e o papel WORKSHOP_ADMIN, daí o fan-out.
create or replace function public.notify_tenant_staff(
  p_tenant_id uuid, p_type text, p_title text, p_body text, p_link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, tenant_id, type, title, body, link)
  select u.id, p_tenant_id, p_type, p_title, p_body, p_link
  from public.users u
  join public.user_roles ur on ur.user_id = u.id
  join public.roles r on r.id = ur.role_id
  where u.tenant_id = p_tenant_id and r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;
end;
$$;

-- ── trigger: chamado aberto → notifica staff da oficina ────────────────────
create or replace function public.notify_staff_on_service_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_tenant_staff(
    new.tenant_id, 'SERVICE_REQUEST_OPENED', 'Novo chamado recebido',
    new.description, '/oficina/chamados/' || new.id
  );
  return new;
end;
$$;

create trigger service_requests_notify_staff
  after insert on public.service_requests
  for each row execute function public.notify_staff_on_service_request();

-- ── trigger: orçamento enviado (toda inserção já nasce SENT) → notifica cliente ─
create or replace function public.notify_customer_on_estimate_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(
    new.customer_id, new.tenant_id, 'ESTIMATE_SENT',
    'Novo orçamento disponível (v' || new.version || ')', new.notes,
    '/chamados/' || new.service_request_id
  );
  return new;
end;
$$;

create trigger estimates_notify_customer_sent
  after insert on public.estimates
  for each row execute function public.notify_customer_on_estimate_sent();

-- ── trigger: orçamento aprovado/rejeitado → notifica staff da oficina ──────
create or replace function public.notify_staff_on_estimate_decided()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('APPROVED', 'REJECTED') and old.status is distinct from new.status then
    perform public.notify_tenant_staff(
      new.tenant_id, 'ESTIMATE_DECIDED',
      case when new.status = 'APPROVED' then 'Orçamento aprovado pelo cliente' else 'Orçamento rejeitado pelo cliente' end,
      null, '/oficina/chamados/' || new.service_request_id
    );
  end if;
  return new;
end;
$$;

create trigger estimates_notify_staff_decided
  after update on public.estimates
  for each row execute function public.notify_staff_on_estimate_decided();

-- ── trigger: OS pronta/entregue → notifica cliente ──────────────────────────
create or replace function public.notify_customer_on_work_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'READY' and old.status is distinct from 'READY' then
    perform public.notify_user(
      new.customer_id, new.tenant_id, 'WORK_ORDER_READY',
      'Seu veículo está pronto', null, '/chamados/' || new.service_request_id
    );
  elsif new.status = 'DELIVERED' and old.status is distinct from 'DELIVERED' then
    perform public.notify_user(
      new.customer_id, new.tenant_id, 'WORK_ORDER_DELIVERED',
      'Serviço concluído e entregue', null, '/chamados/' || new.service_request_id
    );
  end if;
  return new;
end;
$$;

create trigger work_orders_notify_customer_status
  after update on public.work_orders
  for each row execute function public.notify_customer_on_work_order_status();

-- ── trigger: cliente confirma agendamento → notifica staff da oficina ───────
create or replace function public.notify_staff_on_appointment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'CONFIRMED' and old.status is distinct from 'CONFIRMED' then
    perform public.notify_tenant_staff(
      new.tenant_id, 'APPOINTMENT_CONFIRMED', 'Cliente confirmou o agendamento',
      null, '/oficina/os'
    );
  end if;
  return new;
end;
$$;

create trigger appointments_notify_staff_confirmed
  after update on public.appointments
  for each row execute function public.notify_staff_on_appointment_confirmed();

-- ── grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.notifications to service_role;

-- Sem INSERT/DELETE pra authenticated — só os triggers (SECURITY DEFINER) escrevem;
-- UPDATE só pra marcar a própria notificação como lida (RLS abaixo restringe a linha,
-- não a coluna — o app só chama isso pra setar read_at).
grant select, update on public.notifications to authenticated;

-- ── RLS: notifications ──────────────────────────────────────────────────────
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
