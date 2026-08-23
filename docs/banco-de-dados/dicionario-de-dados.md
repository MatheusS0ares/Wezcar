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
`platform.super_admin`, `service_request.manage`, `diagnostic.manage`,
`estimate.manage`, `appointment.manage`, `sla.manage`. Cada feature nova
adiciona seus próprios códigos numa migration própria.

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

Só staff da própria oficina cria/altera; o cliente só lê a própria OS. Desde
`20260823010000_diagnostics_and_estimates.sql`, uma OS que vem de um chamado
(`service_request_id` preenchido) exige um orçamento `APPROVED` para esse
chamado — reforçado por trigger, não só pela UI (RN-EST-002).

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina responsável |
| service_request_id | UUID | Não | Chamado de origem |
| customer_id | UUID | Sim | FK → users |
| vehicle_id | UUID | Sim | FK → vehicles (mesmo trigger de ownership de service_requests) |
| estimate_id | UUID | Não | Orçamento aprovado que originou a OS (rastreabilidade; nulo numa OS manual/sem chamado) |
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

## DIAGNOSTICS

Um diagnóstico mutável por chamado (`service_request_id` é `UNIQUE`) — nota
de trabalho do staff, não um compromisso versionado como o orçamento. Cliente
só lê; staff da oficina cria e atualiza.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina responsável |
| service_request_id | UUID | Sim | FK → service_requests (único — um diagnóstico por chamado) |
| customer_id | UUID | Sim | FK → users (dono do veículo; validado por trigger contra o chamado) |
| summary | TEXT | Sim | O que foi encontrado no veículo |
| created_by | UUID | Não | Staff que registrou |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

## ESTIMATES

RN-EST-001: orçamento é imutável uma vez enviado — não existe policy de
`UPDATE` para staff alterar o conteúdo, só `INSERT` de uma nova versão. Um
trigger (`version_and_supersede_estimate`) calcula `version` automaticamente
e marca a versão anterior `SENT` como `SUPERSEDED`. Cliente decide (via
`UPDATE` restrito a `SENT` → `APPROVED`/`REJECTED`, permissão
`estimate.approve`); staff cria (`estimate.manage`).

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina responsável |
| service_request_id | UUID | Sim | FK → service_requests |
| customer_id | UUID | Sim | FK → users |
| version | INT | Sim | Calculado pelo trigger — nunca enviado pelo app |
| status | VARCHAR(20) | Sim | `SENT` → `APPROVED`/`REJECTED` (ou `SUPERSEDED`, automático ao criar a próxima versão) |
| notes | TEXT | Não | Observação da oficina para o cliente |
| created_by | UUID | Não | Staff que criou esta versão |
| created_at | TIMESTAMPTZ | Sim | — |
| decided_at / decided_by | TIMESTAMPTZ / UUID | Não | Carimbados automaticamente quando o cliente decide |

## ESTIMATE_ITEMS

Itens (peça ou mão de obra) de uma versão do orçamento. O total é a soma de
`quantity * unit_price` calculada na consulta — não existe coluna de total
redundante em `estimates`. Só inseridos junto com a criação do orçamento
(RLS exige que o orçamento pai ainda esteja `SENT`); sem `UPDATE`/`DELETE`
para `authenticated`.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| estimate_id | UUID | Sim | FK → estimates |
| kind | VARCHAR(20) | Sim | `PART` \| `LABOR` |
| description | VARCHAR(200) | Sim | Ex. "Pastilha de freio dianteira" |
| quantity | NUMERIC(10,2) | Sim | — |
| unit_price | NUMERIC(12,2) | Sim | — |
| created_at | TIMESTAMPTZ | Sim | — |

## SLA_DEFINITIONS

Uma linha por tenant (`tenant_id` é `UNIQUE`): prazo padrão, em horas, que a
oficina promete pra uma OS, contado a partir de `opened_at`. Sem linha
configurada, o trigger que cria `sla_instances` usa 48h de fallback.
Configurável pelo próprio staff (`sla.manage`) em `/oficina`.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina (único — uma configuração por tenant) |
| default_hours | INT | Sim | Prazo padrão, em horas (`> 0`) |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

## SLA_INSTANCES

RN-SLA-001: cálculo do SLA é responsabilidade do backend. Uma linha por OS
(`work_order_id` é `UNIQUE`), criada automaticamente pelo trigger
`create_sla_instance_for_work_order` ao inserir a OS — `due_at` é carimbado
uma única vez ali (lendo `sla_definitions` do tenant) e nunca mais alterado;
sem `INSERT`/`UPDATE` para `authenticated`, só leitura.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina responsável |
| work_order_id | UUID | Sim | FK → work_orders (único) |
| due_at | TIMESTAMPTZ | Sim | Prazo prometido — `opened_at + default_hours` no momento da criação da OS |
| created_at | TIMESTAMPTZ | Sim | — |

`public.work_orders_sla_status(wo work_orders) returns text` é uma
**computed column** (convenção do PostgREST: função que recebe o tipo linha
da própria tabela) exposta via `select=*,work_orders_sla_status` em
`work_orders`. Deriva o status na leitura, sem guardar nada redundante:
`NONE` (sem `sla_instances` — ex. OS criada antes deste módulo existir),
`CANCELED`, `MET`/`MISSED` (já `DELIVERED`, comparando `completed_at` com
`due_at`), `BREACHED` (`now() > due_at`), `AT_RISK` (`due_at` a menos de 4h)
ou `ON_TRACK`.

## APPOINTMENTS *(agenda)*

Uma linha por OS (`work_order_id` é `UNIQUE`) — quando o veículo é esperado
pra execução. Staff agenda (`appointment.manage`); cliente só pode confirmar
a própria (`SCHEDULED` → `CONFIRMED`), nunca mudar o horário.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina responsável |
| work_order_id | UUID | Sim | FK → work_orders (único) |
| customer_id | UUID | Sim | FK → users (validado por trigger contra a OS) |
| scheduled_at | TIMESTAMPTZ | Sim | Horário agendado |
| status | VARCHAR(20) | Sim | `SCHEDULED` → `CONFIRMED`/`DONE`/`CANCELED`/`NO_SHOW` |
| notes | TEXT | Não | — |
| created_by | UUID | Não | Staff que agendou |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

## WORKSHOP_ADMIN *(papel)*

Papel de sistema (`tenant_id` nulo, mesmo padrão de `CUSTOMER` e
`PLATFORM_ADMIN`) com as permissões `service_request.manage`,
`work_order.update`, `diagnostic.manage`, `estimate.manage`,
`appointment.manage` e `sla.manage`. Atribuído manualmente via SQL a um
usuário com `tenant_id` já definido (ver `docs/seguranca/rls-e-autenticacao.md`).

## Funções auxiliares de RLS

| Função | Retorno | Uso |
| --- | --- | --- |
| `public.current_tenant_id()` | `uuid \| null` | Tenant do usuário autenticado atual |
| `public.has_permission(code text)` | `boolean` | Se o usuário atual tem uma permissão, via `user_roles` → `role_permissions` → `permissions` |
| `public.work_orders_sla_status(wo work_orders)` | `text` | Computed column — status do SLA de uma OS, derivado na leitura (ver SLA_INSTANCES acima) |

## Próximas tabelas

`CUSTOMERS`, manutenções/documentos/fotos/garantias da Vida do Carro,
estoque/compras/financeiro etc. entram quando as respectivas etapas do
roadmap forem implementadas — ver a Especificação Técnica para o
dicionário-alvo completo.
