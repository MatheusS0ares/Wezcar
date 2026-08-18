# Dicionário de dados

Documento vivo. Toda nova tabela/coluna entra aqui na mesma PR que a
migration correspondente (ver `docs/decisoes/0001-arquitetura-nextjs-supabase.md`
e a seção de convenções no README). Migrations em `supabase/migrations/`.

## Diferenças em relação ao dicionário original do projeto

- **Não existe coluna `password_hash`.** O Supabase Auth (`auth.users`) é
  quem guarda e faz hash da senha (RN-AUTH-001 continua valendo — só que
  aplicada pela plataforma, não por código nosso). `public.users` é um
  perfil de aplicação, ligado 1:1 a `auth.users` pelo mesmo `id`.
- **`role_permissions` e `user_roles` foram adicionadas.** O dicionário
  original lista `ROLES` e `PERMISSIONS` como tabelas separadas, mas alguma
  tabela de ligação é necessária para RBAC funcionar. São consideradas parte
  do mesmo grupo "ROLES / PERMISSIONS" do documento original.

## TENANTS

Uma oficina/organização. Toda tabela tenant-scoped tem `tenant_id` e é
isolada por RLS via `public.current_tenant_id()`.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | Identificador |
| name | VARCHAR(150) | Sim | Nome do tenant |
| slug | VARCHAR(100) | Sim | Identificador amigável (único) |
| status | VARCHAR(30) | Sim | `ACTIVE` \| `SUSPENDED` \| `CANCELED` |
| created_at | TIMESTAMPTZ | Sim | Criação |
| updated_at | TIMESTAMPTZ | Sim | Alteração |

## USERS

Perfil de aplicação para cada usuário do Supabase Auth. `tenant_id` nulo =
cliente (Wezcar App); `tenant_id` preenchido = funcionário de uma oficina.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | Mesmo id de `auth.users` |
| tenant_id | UUID | Não | Tenant, quando aplicável |
| name | VARCHAR(150) | Sim | Nome |
| email | VARCHAR(150) | Sim | E-mail (único) |
| phone | VARCHAR(30) | Não | Telefone |
| status | VARCHAR(30) | Sim | `ACTIVE` \| `INACTIVE` \| `BLOCKED` |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

Criada automaticamente por um trigger em `auth.users` (signup). O `tenant_id`
vem do metadata do signup (`raw_user_meta_data->>'tenant_id'`); signup sem
`tenant_id` é tratado como cliente e recebe o papel `CUSTOMER` automaticamente.

## ROLES

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Não | Nulo = papel global (ex. `CUSTOMER`); preenchido = papel específico do tenant |
| name | VARCHAR(100) | Sim | Nome do papel (único por tenant) |
| description | TEXT | Não | Descrição |
| created_at | TIMESTAMPTZ | Sim | — |

## PERMISSIONS

Catálogo global, formato de código `<módulo>.<ação>`.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| code | VARCHAR(120) | Sim | Código único, ex. `vehicle.create` |
| description | TEXT | Não | Descrição |

Catálogo inicial (`20260818010600_seed_permissions_and_roles.sql`):
`tenant.manage`, `user.manage`, `vehicle.create`, `vehicle.update`,
`work_order.update`, `estimate.approve`. Cada feature nova adiciona seus
próprios códigos numa migration própria.

## ROLE_PERMISSIONS *(adição sobre o dicionário original)*

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| role_id | UUID | Sim | FK → roles |
| permission_id | UUID | Sim | FK → permissions |

Chave primária composta `(role_id, permission_id)`.

## USER_ROLES *(adição sobre o dicionário original)*

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| user_id | UUID | Sim | FK → users |
| role_id | UUID | Sim | FK → roles |
| created_at | TIMESTAMPTZ | Sim | — |

Chave primária composta `(user_id, role_id)`. Um trigger
(`enforce_user_role_tenant_match`) impede atribuir a um usuário um papel de
um tenant diferente do seu.

## Funções auxiliares de RLS

| Função | Retorno | Uso |
| --- | --- | --- |
| `public.current_tenant_id()` | `uuid \| null` | Tenant do usuário autenticado atual |
| `public.has_permission(code text)` | `boolean` | Se o usuário atual tem uma permissão, via `user_roles` → `role_permissions` → `permissions` |

## Próximas tabelas

`CUSTOMERS`, `VEHICLES`, `VEHICLE_MILEAGE_HISTORY`, `WORKSHOPS`,
`SERVICE_REQUESTS` etc. entram quando as respectivas etapas do roadmap forem
implementadas — ver o documento original do projeto, PARTE XIII, para o
dicionário-alvo completo.
