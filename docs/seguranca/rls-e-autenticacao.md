# Segurança: autenticação e RLS

## Autenticação

Supabase Auth (GoTrue) cuida de cadastro, login, hash de senha, refresh
token e expiração de sessão (RN-AUTH-001, requisitos de segurança mínima do
documento original, item 80).

- `apps/web/src/lib/supabase/client.ts` — cliente para Client Components.
- `apps/web/src/lib/supabase/server.ts` — cliente para Server Components,
  Server Actions e Route Handlers (usa cookies via `next/headers`).
- `apps/web/src/proxy.ts` — roda em toda request, renova o cookie de sessão
  e redireciona visitantes não autenticados para `/entrar` em rotas
  protegidas (hoje: `/painel`, `/veiculos`, `/admin`, `/chamados`, `/oficina`).
- Cadastro público (`/cadastro`) cria **apenas contas de cliente** (sem
  `tenant_id`). Contas de funcionário de oficina não têm fluxo de
  autoatendimento ainda — isso é proposital: criação de tenant/convite de
  equipe é um fluxo administrativo (Wezcar Admin), fora do escopo desta fase.

## Isolamento multi-tenant (RLS)

Regra de negócio RN-TENANT-001: *"Usuário de um tenant não pode acessar
registros de outro tenant."* Nesta fase isso é garantido inteiramente por
Row-Level Security no Postgres, não por filtros no código do app — um bug no
frontend não consegue vazar dados entre tenants.

- `public.current_tenant_id()` (SECURITY DEFINER) resolve o tenant do usuário
  autenticado atual, evitando recursão de RLS ao consultar `public.users`
  dentro de uma policy da própria `public.users`.
- `public.has_permission(code)` (SECURITY DEFINER) resolve se o usuário atual
  tem uma permissão, para uso em policies futuras mais granulares.
- Cada tabela tem uma policy de `SELECT` (e, quando aplicável, `UPDATE`)
  filtrando por tenant. Mutações em `tenants`, `roles`, `permissions`,
  `role_permissions` e `user_roles` não são permitidas para o papel
  `authenticated` nesta fase — só `service_role` (chave de serviço, uso
  server-side apenas) ou diretamente via migration/seed. Isso é deliberado:
  não existe ainda uma tela de administração dessas entidades.

### Armadilha do Supabase: GRANT explícito é obrigatório

Versões recentes do Supabase **não expõem automaticamente** tabelas novas
para `anon`/`authenticated`/`service_role` (era o padrão antigo). RLS sozinho
não é suficiente — sem um `GRANT SELECT/INSERT/UPDATE/DELETE` explícito para
o papel certo, a tabela simplesmente não aparece pela API, mesmo para
`service_role`. Toda migration de tabela nova neste projeto já inclui os
grants necessários (ver `20260818010500_rls_policies_and_grants.sql`) — não
esqueça isso ao criar tabelas novas.

## Wezcar Admin (papel `PLATFORM_ADMIN`)

Papel de sistema (`tenant_id` nulo) com a permissão `platform.super_admin`,
que faz as policies de `SELECT` em `tenants`, `users`, `roles`,
`role_permissions` e `user_roles` ignorarem o filtro de tenant (ver
`20260818020100_platform_admin.sql`). Também recebe `tenant.manage`, que
libera `INSERT`/`UPDATE`/`DELETE` em `tenants` (tela `/admin`).

**Não existe fluxo de autoatendimento para virar `PLATFORM_ADMIN`** — nenhum
botão no app concede esse papel. É sempre uma ação manual, rodada como
`postgres` (SQL Editor do Supabase) ou `service_role`:

```sql
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from public.users u, public.roles r
where u.email = 'seu-email@exemplo.com'
  and r.name = 'PLATFORM_ADMIN' and r.tenant_id is null;
```

`/painel` mostra um link para `/admin` só para quem tem essa permissão
(checado via `supabase.rpc('has_permission', { permission_code: '...' })`);
`/admin` também revalida isso no servidor antes de renderizar.

## Wezcar Oficina (papel `WORKSHOP_ADMIN`)

Papel de sistema (mesmo padrão de `CUSTOMER`/`PLATFORM_ADMIN`: `tenant_id`
nulo) com as permissões `service_request.manage`, `work_order.update`,
`diagnostic.manage`, `estimate.manage`, `appointment.manage` e `sla.manage`. Ao
contrário de `PLATFORM_ADMIN`, esse papel só faz sentido combinado com um
`tenant_id` — o próprio usuário precisa pertencer a um tenant para que as
policies de `service_requests`/`work_orders` (que exigem
`tenant_id = current_tenant_id()`) deixem algo visível.

Também não há autoatendimento: um cliente não vira staff de oficina sozinho.
Para transformar um usuário existente em staff de uma oficina:

```sql
-- 1. Definir o tenant_id do usuário (se ainda não tiver)
update public.users set tenant_id = '<TENANT_ID_DA_OFICINA>' where email = 'staff@exemplo.com';

-- 2. Conceder o papel WORKSHOP_ADMIN
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from public.users u, public.roles r
where u.email = 'staff@exemplo.com'
  and r.name = 'WORKSHOP_ADMIN' and r.tenant_id is null;
```

`/painel` mostra o atalho para `/oficina` só para quem tem
`work_order.update`; `/oficina`, `/oficina/chamados` e `/oficina/os`
revalidam isso no servidor.

### Diretório de tenants ativos

Qualquer usuário autenticado (cliente ou staff) pode listar tenants com
`status = 'ACTIVE'` (policy `tenants_select_active_directory`) — é assim que
o cliente escolhe uma oficina ao abrir um chamado em `/chamados`. Isso não
enfraquece o isolamento de tenant: o que continua isolado são os *dados
operacionais* de cada tenant (`users`, `service_requests`, `work_orders`
etc.), não a existência/nome público da oficina.

## Testes

Testes pgTAP em `supabase/tests/database/`:

- `0001_multitenancy_isolation.test.sql` — com dois tenants e um cliente,
  prova que: o trigger de signup copia `tenant_id` do metadata para
  `public.users`; signup sem `tenant_id` vira cliente e recebe o papel
  `CUSTOMER`; um funcionário só enxerga o próprio tenant em `tenants` e
  `users`; um funcionário não consegue escrever no perfil de um funcionário
  de outro tenant; um cliente não enxerga nenhum tenant.
- `0002_vehicles_isolation.test.sql` — RN-VEH-001 e RN-VEH-002: um cliente
  não enxerga nem altera veículo/histórico de outro cliente; quilometragem
  não pode regredir; `UPDATE` direto em `vehicles.mileage` é rejeitado
  (sem GRANT na coluna); inserir no histórico sincroniza `vehicles.mileage`.
- `0003_platform_admin.test.sql` — RN-ADMIN-001: um `PLATFORM_ADMIN` enxerga
  todos os tenants/usuários e consegue criar tenant; um cliente comum vê o
  diretório de tenants ativos mas não consegue criar um.
- `0004_service_requests_and_work_orders.test.sql` — RN-CHAM-001/002 e
  RN-OS-002: o trigger de ownership rejeita um chamado com veículo de outro
  cliente; um cliente só vê os próprios chamados/OS; staff de outra oficina
  não vê nem consegue aceitar/alterar; aceitar um chamado carimba
  `accepted_at`; criar uma OS gera o evento `CREATED`; mudar o status gera
  `STATUS_CHANGE`; o cliente não consegue alterar a própria OS (só ler).
  Desde `20260823010000_diagnostics_and_estimates.sql`, criar a OS neste
  teste também exige um orçamento aprovado primeiro (RN-EST-002).
- `0005_diagnostics_and_estimates.test.sql` — RN-EST-001/002: staff de outra
  oficina não consegue diagnosticar nem orçar um chamado alheio; cliente lê o
  diagnóstico mas não altera; criar uma segunda versão do orçamento marca a
  primeira como `SUPERSEDED` automaticamente e não existe forma de editar o
  conteúdo de uma versão já enviada; cliente só decide (`APPROVED`/
  `REJECTED`) a versão que está `SENT`, nunca uma já superada; criar OS sem
  orçamento aprovado é rejeitado pelo trigger; com o orçamento aprovado, a OS
  é criada normalmente e referencia essa versão.
- `0006_appointments_and_sla.test.sql` — RN-SLA-001: criar uma OS gera
  automaticamente `sla_instances` com `due_at` calculado (fallback de 48h sem
  `sla_definitions`, ou o valor configurado pelo tenant); `due_at` nunca é
  recalculado depois; `work_orders_sla_status()` deriva `ON_TRACK`/
  `AT_RISK`/`BREACHED`/`MET`/`MISSED` corretamente; app não escreve em
  `sla_instances` diretamente; staff agenda a execução, trigger rejeita
  agendamento com `customer_id` que não bate com o da OS; cliente vê e
  confirma o próprio agendamento mas não consegue mudar o horário; staff de
  outra oficina não vê nada.

Rode com `pnpm supabase:test` (requer Docker com acesso normal à internet
para baixar a imagem oficial `supabase/postgres`). Nesta sessão de
desenvolvimento a validação foi feita contra um PostgreSQL local com um
schema `auth` mínimo simulando `auth.users`/`auth.uid()`, já que o pull da
imagem Docker oficial foi bloqueado pela política de rede do ambiente —
rode a suíte oficial antes do primeiro deploy real.

## LGPD

Os itens do documento original (PARTE XV, item 81 — consentimentos,
finalidade do tratamento, exclusão, exportação, anonimização) **ainda não
foram implementados**. Ficam para quando o cadastro de cliente/veículo
existir de verdade (há dados pessoais reais para tratar).
