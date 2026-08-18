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
- **`vehicles.customer_id` referencia `public.users` diretamente**, e não uma
  tabela `CUSTOMERS` separada. Ainda não existe nenhum dado exclusivo de
  cliente (cpf, data de nascimento) sendo coletado — quando existir, criar
  `CUSTOMERS` (conforme o dicionário original) e migrar a referência.
- **Um `tenant` É a oficina** (não existe uma hierarquia separada
  tenant → organization → company → branch/workshop, como sugere a
  Especificação Técnica mais recente). Simplificação deliberada enquanto só
  existe um nível operacional; revisitar se surgir a necessidade real de
  redes com múltiplas filiais dentro do mesmo grupo empresarial.
- **Qualquer usuário autenticado pode listar tenants ativos** (policy
  `tenants_select_active_directory`), não só o próprio. Necessário para o
  cliente escolher uma oficina ao abrir um chamado — não há ainda busca por
  proximidade (PostGIS/geolocalização é trabalho futuro). Nome/slug de um
  tenant não é informação sensível.

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

Catálogo até agora: `tenant.manage`, `user.manage`, `vehicle.create`,
`vehicle.update`, `work_order.update`, `estimate.approve`,
`platform.super_admin`, `service_request.manage`. Cada feature nova adiciona
seus próprios códigos numa migration própria.

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

## VEHICLES

RN-VEH-001: cliente só visualiza/altera veículos associados à sua conta
(`customer_id = auth.uid()`, via RLS).

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| customer_id | UUID | Sim | FK → `users` (ver desvio do dicionário acima) |
| plate | VARCHAR(10) | Não | Placa |
| brand | VARCHAR(100) | Sim | Marca |
| model | VARCHAR(100) | Sim | Modelo |
| version | VARCHAR(100) | Não | Versão |
| manufacture_year | INT | Não | Ano de fabricação |
| model_year | INT | Não | Ano modelo |
| engine | VARCHAR(100) | Não | Motor |
| fuel_type | VARCHAR(30) | Não | Combustível |
| color | VARCHAR(50) | Não | Cor |
| mileage | INT | Não | Quilometragem atual (só muda via `vehicle_mileage_history`, nunca por UPDATE direto — coluna sem GRANT de update para `authenticated`) |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

## VEHICLE_MILEAGE_HISTORY

Histórico de quilometragem, somente inserção (sem policy de UPDATE/DELETE —
histórico não é editado nem apagado).

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| vehicle_id | UUID | Sim | FK → vehicles |
| mileage | INT | Sim | Quilometragem registrada |
| source | VARCHAR(30) | Sim | `INITIAL` (criada junto com o veículo) ou `MANUAL` (atualização do cliente) |
| recorded_at | TIMESTAMPTZ | Sim | Data do registro |
| recorded_by | UUID | Não | Usuário que registrou |

Um trigger (`sync_vehicle_mileage`) mantém `vehicles.mileage` sempre igual à
última entrada do histórico, e **rejeita** uma nova quilometragem menor que a
atual (o odômetro não regride). Outro trigger
(`seed_initial_mileage_history`) cria a primeira entrada (`source = INITIAL`)
automaticamente quando o veículo é cadastrado com uma quilometragem inicial.

## PLATFORM_ADMIN *(papel — "Wezcar Admin")*

Não é uma tabela nova, mas um registro em `roles` (`tenant_id` nulo, como
`CUSTOMER`) com a permissão `platform.super_admin` — enxerga todos os tenants
e usuários, e pode criar/administrar tenants (via `tenant.manage`). Ver
`docs/seguranca/rls-e-autenticacao.md` para como esse papel é concedido (não
há fluxo de autoatendimento — é sempre uma ação manual via SQL).

## SERVICE_REQUESTS *("chamados")*

Primeira fatia do módulo Wezcar Oficina. RN-VEH-001-like: cliente só vê os
próprios chamados; oficina só vê chamados endereçados a ela.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina (tenant) para quem o chamado foi aberto |
| customer_id | UUID | Sim | FK → users (dono do veículo) |
| vehicle_id | UUID | Sim | FK → vehicles (validado por trigger: precisa pertencer a customer_id) |
| description | TEXT | Sim | Problema relatado |
| priority | VARCHAR(20) | Sim | `LOW` \| `NORMAL` \| `HIGH` \| `URGENT` |
| status | VARCHAR(30) | Sim | `OPEN` → `ACCEPTED`/`REJECTED`/`CANCELED` |
| requested_at | TIMESTAMPTZ | Sim | Abertura |
| accepted_at | TIMESTAMPTZ | Não | Carimbado automaticamente ao aceitar |
| closed_at | TIMESTAMPTZ | Não | Carimbado automaticamente ao recusar/cancelar |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

Cliente pode cancelar o próprio chamado só enquanto `OPEN`. Só staff da
oficina (permissão `service_request.manage`) aceita/recusa.

## WORK_ORDERS *("OS")*

Versão simplificada do dicionário original: sem diagnóstico/orçamento ainda
(entram quando esses módulos forem construídos). Só staff da própria oficina
cria/altera; o cliente só lê a própria OS.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina responsável |
| service_request_id | UUID | Não | Chamado de origem |
| customer_id | UUID | Sim | FK → users |
| vehicle_id | UUID | Sim | FK → vehicles (mesmo trigger de ownership de service_requests) |
| status | VARCHAR(30) | Sim | `OPEN` → `IN_PROGRESS` → `READY` → `DELIVERED` (ou `CANCELED`) |
| notes | TEXT | Não | Observações |
| opened_at | TIMESTAMPTZ | Sim | Abertura |
| completed_at | TIMESTAMPTZ | Não | Carimbado automaticamente ao chegar em `DELIVERED` |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

## WORK_ORDER_EVENTS *(timeline)*

Somente inserção — nunca via app, só pelos triggers `log_work_order_created`
e `log_work_order_status_change` (sem GRANT de INSERT para `authenticated`).

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| work_order_id | UUID | Sim | FK → work_orders |
| event_type | VARCHAR(50) | Sim | `CREATED` \| `STATUS_CHANGE` |
| old_status / new_status | VARCHAR(30) | Não | Estado antes/depois |
| description | TEXT | Não | — |
| created_by | UUID | Não | `auth.uid()` de quem disparou a mudança |
| created_at | TIMESTAMPTZ | Sim | — |

## WORKSHOP_ADMIN *(papel)*

Papel de sistema (`tenant_id` nulo, mesmo padrão de `CUSTOMER` e
`PLATFORM_ADMIN`) com as permissões `service_request.manage` e
`work_order.update`. Atribuído manualmente via SQL a um usuário com
`tenant_id` já definido (ver `docs/seguranca/rls-e-autenticacao.md`).

## Funções auxiliares de RLS

| Função | Retorno | Uso |
| --- | --- | --- |
| `public.current_tenant_id()` | `uuid \| null` | Tenant do usuário autenticado atual |
| `public.has_permission(code text)` | `boolean` | Se o usuário atual tem uma permissão, via `user_roles` → `role_permissions` → `permissions` |

## Próximas tabelas

`CUSTOMERS`, `diagnostics`, `estimates`/`estimate_items`, `appointments`
(agenda), `sla_definitions`/`sla_instances` etc. entram quando as respectivas
etapas do roadmap forem implementadas — ver a Especificação Técnica para o
dicionário-alvo completo.
