-- AUDIT_LOGS — RN-AUD-001: "Operações críticas devem registrar usuário, data, antes e depois."
--
-- Uma única tabela genérica + uma única função de trigger genérica (audit_log_change),
-- reutilizada em qualquer tabela crítica em vez de uma tabela de auditoria por domínio.
-- A trigger lê tenant_id/id da linha via to_jsonb(...)->>'...', o que funciona mesmo em
-- tabelas sem a coluna tenant_id (o operador ->> simplesmente retorna null nesse caso) —
-- então uma tabela COM tenant_id (ex.: sla_definitions) produz auditoria visível para o
-- staff daquele tenant, e uma tabela SEM tenant_id (ex.: tenants, user_roles) produz
-- auditoria visível só para PLATFORM_ADMIN, sem precisar de nenhum código extra.
--
-- Anexada a 4 tabelas: tenants, user_roles, sla_definitions, warranty_definitions — as
-- superfícies de configuração/privilégio críticas que ainda não tinham nenhum histórico
-- (work_order_events, versionamento de orçamento e o livro-razão de payments já cobrem
-- os próprios domínios e ficam de fora). user_roles em particular é a operação mais
-- sensível do app (concessão de papel) e hoje só é feita via SQL manual — a trigger
-- audita isso também, porque dispara independente do papel que executa o INSERT/DELETE.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  actor_id uuid references public.users (id) on delete set null,
  action varchar(10) not null,
  table_name varchar(100) not null,
  record_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_check check (action in ('INSERT', 'UPDATE', 'DELETE'))
);

comment on table public.audit_logs is 'AUDIT_LOGS from the data dictionary (RN-AUD-001). Append-only, written exclusively by audit_log_change() triggers — never by the app directly. tenant_id/record_id are best-effort, extracted generically from the row via ->>, so they are null for tables that lack those columns.';

create index audit_logs_tenant_id_idx on public.audit_logs (tenant_id);
create index audit_logs_table_name_idx on public.audit_logs (table_name);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create or replace function public.audit_log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_tenant_id uuid;
  v_record_id text;
begin
  if tg_op = 'DELETE' then
    v_before := to_jsonb(old);
    v_after := null;
    v_tenant_id := (to_jsonb(old) ->> 'tenant_id')::uuid;
    v_record_id := to_jsonb(old) ->> 'id';
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_tenant_id := (to_jsonb(new) ->> 'tenant_id')::uuid;
    v_record_id := to_jsonb(new) ->> 'id';
  else
    v_before := null;
    v_after := to_jsonb(new);
    v_tenant_id := (to_jsonb(new) ->> 'tenant_id')::uuid;
    v_record_id := to_jsonb(new) ->> 'id';
  end if;

  insert into public.audit_logs (tenant_id, actor_id, action, table_name, record_id, before, after)
  values (v_tenant_id, auth.uid(), tg_op, tg_table_name, v_record_id, v_before, v_after);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger tenants_audit
  after insert or update on public.tenants
  for each row execute function public.audit_log_change();

create trigger user_roles_audit
  after insert or delete on public.user_roles
  for each row execute function public.audit_log_change();

create trigger sla_definitions_audit
  after insert or update on public.sla_definitions
  for each row execute function public.audit_log_change();

create trigger warranty_definitions_audit
  after insert or update on public.warranty_definitions
  for each row execute function public.audit_log_change();

-- ── grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.audit_logs to service_role;

-- Só leitura pra authenticated — nunca INSERT/UPDATE/DELETE direto, só via trigger
-- SECURITY DEFINER (que roda como o dono da função, ignorando esse grant).
grant select on public.audit_logs to authenticated;

-- ── RLS: audit_logs ─────────────────────────────────────────────────────────
create policy "audit_logs_select_tenant_staff_or_platform_admin"
  on public.audit_logs for select
  to authenticated
  using (
    (tenant_id is not null and tenant_id = public.current_tenant_id())
    or public.has_permission('platform.super_admin')
  );
