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
  protegidas (hoje: `/painel`).
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

## Testes

`supabase/tests/database/0001_multitenancy_isolation.test.sql` (pgTAP) prova,
com dois tenants e um cliente:

1. o trigger de signup copia `tenant_id` do metadata para `public.users`;
2. signup sem `tenant_id` vira cliente e recebe o papel `CUSTOMER`;
3. um funcionário só enxerga o próprio tenant em `tenants` e `users`;
4. um funcionário **não consegue escrever** no perfil de um funcionário de
   outro tenant (a `UPDATE` afeta 0 linhas);
5. um cliente não enxerga nenhum tenant e só o próprio perfil em `users`.

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
