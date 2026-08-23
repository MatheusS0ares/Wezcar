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
`estimate.manage`, `appointment.manage`, `sla.manage`, `warranty.manage`,
`product.manage`, `purchase.manage`, `financial.manage`. Cada feature nova
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

`product_id` (desde `20260826010000_inventory_and_purchases.sql`) é um link
opcional pro catálogo — quando preenchido, entregar a OS que nasce desse
orçamento desconta a quantidade do estoque automaticamente (ver
`consume_stock_on_work_order_delivered()` em INVENTORY_MOVEMENTS). Um
trigger garante que o produto pertence à mesma oficina do orçamento.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| estimate_id | UUID | Sim | FK → estimates |
| kind | VARCHAR(20) | Sim | `PART` \| `LABOR` |
| description | VARCHAR(200) | Sim | Ex. "Pastilha de freio dianteira" |
| quantity | NUMERIC(10,2) | Sim | — |
| unit_price | NUMERIC(12,2) | Sim | — |
| product_id | UUID | Não | FK → products (peça do catálogo, opcional) |
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

## MAINTENANCE_RECORDS *(Vida do Carro)*

Fato imutável do veículo (ADR 0004, princípio 2) — mesmo padrão de
`vehicle_mileage_history`/`work_order_events`: só inserção, nunca editado ou
apagado. Pertence ao **veículo** (`vehicle_id`), não a um tenant — `tenant_id`
só existe como metadado de quem prestou o serviço numa linha `WORK_ORDER`. Se
o motorista trocar de oficina, o histórico continua com ele.

Duas origens:
- `WORK_ORDER` — criada automaticamente por
  `create_maintenance_record_from_work_order()` quando uma OS chega a
  `DELIVERED` (descrição composta a partir dos itens do orçamento, custo =
  soma dos itens, quilometragem = a do veículo no momento). Nunca inserida
  direto pelo app.
- `MANUAL` — o próprio dono do veículo registra uma manutenção feita fora da
  Wezcar. RLS garante `tenant_id`/`work_order_id` nulos nesse caso — um
  cliente não consegue forjar uma linha `WORK_ORDER` "verificada".

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| vehicle_id | UUID | Sim | FK → vehicles |
| tenant_id | UUID | Não | Oficina que prestou o serviço (nulo em registros `MANUAL`) |
| work_order_id | UUID | Não | FK → work_orders (nulo em registros `MANUAL`) |
| source | VARCHAR(20) | Sim | `WORK_ORDER` \| `MANUAL` |
| description | TEXT | Sim | — |
| mileage | INT | Não | Quilometragem no momento do serviço |
| cost | NUMERIC(12,2) | Não | — |
| performed_at | TIMESTAMPTZ | Sim | Quando o serviço foi feito |
| created_by | UUID | Não | Quem registrou (nulo em registros automáticos) |
| created_at | TIMESTAMPTZ | Sim | — |

## WARRANTY_DEFINITIONS

Uma linha por tenant (`tenant_id` é `UNIQUE`): prazo padrão de garantia, em
meses, pra uma OS entregue. Sem linha configurada, o trigger que cria
`warranties` usa 3 meses de fallback. Configurável pelo staff
(`warranty.manage`).

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina (único) |
| default_months | INT | Sim | Prazo padrão, em meses (`> 0`) |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

## WARRANTIES

Uma linha por OS (`work_order_id` é `UNIQUE`), criada automaticamente por
`create_warranty_from_work_order()` no mesmo momento que o registro de
manutenção (`DELIVERED`) — `expires_at` é carimbado uma única vez e nunca
recalculado; sem `INSERT`/`UPDATE` para `authenticated`.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| vehicle_id | UUID | Sim | FK → vehicles |
| tenant_id | UUID | Sim | Oficina responsável |
| work_order_id | UUID | Sim | FK → work_orders (único) |
| maintenance_record_id | UUID | Não | Registro de manutenção correspondente |
| description | TEXT | Sim | — |
| expires_at | TIMESTAMPTZ | Sim | `now() + default_months` no momento da entrega |
| created_at | TIMESTAMPTZ | Sim | — |

`public.warranties_status(w warranties) returns text` é uma **computed
column** (mesmo padrão de `work_orders_sla_status`), exposta via
`select=*,warranties_status`: `ACTIVE` ou `EXPIRED`, derivado de
`expires_at` na leitura.

## PRODUCTS

Catálogo de peças/produtos da oficina. `stock_on_hand` é uma coluna cache
mantida por trigger (`sync_product_stock`) a partir de
`inventory_movements` — nunca escrita direto pelo app (RN-STK-001), mesmo
padrão de `vehicles.mileage`.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina dona do produto |
| sku | VARCHAR(50) | Não | Código interno (único por tenant quando preenchido) |
| name | VARCHAR(200) | Sim | — |
| unit | VARCHAR(10) | Sim | Unidade (`UN`, `L` etc.) — padrão `UN` |
| unit_cost | NUMERIC(12,2) | Não | Último custo de compra (atualizado ao receber uma compra) |
| unit_price | NUMERIC(12,2) | Não | Preço de venda sugerido — usado pra pré-preencher item de orçamento |
| min_stock | INT | Sim | Ponto de reposição (`>= 0`) |
| stock_on_hand | INT | Sim | Saldo atual — cache, só muda via `inventory_movements` |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

## INVENTORY_MOVEMENTS

RN-STK-001: saldo de estoque só muda por movimentação auditável. Fato
imutável — só inserção, `quantity` assinada (positiva = entrada, negativa =
saída). App só consegue inserir diretamente `type = 'ADJUSTMENT'` (correção
manual, ex. contagem física); `PURCHASE` nasce só de `receive_purchase()` e
`USAGE` só de `consume_stock_on_work_order_delivered()` (quando uma OS com
item de orçamento vinculado a um produto chega em `DELIVERED`) — ambos
`SECURITY DEFINER`, não dependem de policy de INSERT pra escrever.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina |
| product_id | UUID | Sim | FK → products |
| type | VARCHAR(20) | Sim | `PURCHASE` \| `USAGE` \| `ADJUSTMENT` \| `RETURN` |
| quantity | INT | Sim | Assinada, `<> 0` |
| work_order_id | UUID | Não | OS que consumiu a peça (só em `USAGE`) |
| purchase_id | UUID | Não | Compra que gerou a entrada (só em `PURCHASE`) |
| notes | TEXT | Não | — |
| created_by | UUID | Não | — |
| created_at | TIMESTAMPTZ | Sim | — |

Esta fatia deliberadamente não reserva estoque na aprovação do orçamento
(só desconta na entrega) e não bloqueia saldo negativo — ver comentário na
migration `20260826010000_inventory_and_purchases.sql`.

## SUPPLIERS

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina |
| name | VARCHAR(200) | Sim | — |
| phone | VARCHAR(30) | Não | — |
| notes | TEXT | Não | — |
| created_at / updated_at | TIMESTAMPTZ | Sim | — |

## PURCHASES / PURCHASE_ITEMS

Uma compra de peças de um fornecedor. Itens só podem ser inseridos enquanto
a compra está `DRAFT`/`ORDERED`. Mudar o status pra `RECEIVED`
(`receive_purchase()`) gera uma `inventory_movements` (`type PURCHASE`) por
item e atualiza `products.unit_cost` com o custo pago — e carimba
`received_at` automaticamente.

**PURCHASES**

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina |
| supplier_id | UUID | Não | FK → suppliers |
| status | VARCHAR(20) | Sim | `DRAFT` → `ORDERED`/`RECEIVED`/`CANCELED` |
| notes | TEXT | Não | — |
| created_by | UUID | Não | — |
| created_at | TIMESTAMPTZ | Sim | — |
| received_at | TIMESTAMPTZ | Não | Carimbado automaticamente ao receber |

**PURCHASE_ITEMS**

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| purchase_id | UUID | Sim | FK → purchases |
| product_id | UUID | Sim | FK → products |
| quantity | INT | Sim | `> 0` |
| unit_cost | NUMERIC(12,2) | Sim | `>= 0` |

## ACCOUNTS_RECEIVABLE / ACCOUNTS_PAYABLE

Uma conta a receber por OS entregue (`create_receivable_from_work_order()`,
valor = soma dos itens do orçamento) e uma conta a pagar por compra
recebida (`create_payable_from_purchase()`, valor = soma dos itens da
compra) — nunca criadas direto pelo app. `paid_amount`/`status` são caches
mantidos por `sync_payment_balance()` a partir de `payments`; sem `UPDATE`
para `authenticated` nas duas tabelas.

**ACCOUNTS_RECEIVABLE**

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina |
| customer_id | UUID | Sim | FK → users (cliente que deve) |
| work_order_id | UUID | Sim | FK → work_orders (único) |
| amount | NUMERIC(12,2) | Sim | Valor total (soma dos itens do orçamento) |
| paid_amount | NUMERIC(12,2) | Sim | Cache — soma dos `payments` |
| status | VARCHAR(20) | Sim | `OPEN` → `PAID`/`CANCELED` |
| created_at | TIMESTAMPTZ | Sim | — |

**ACCOUNTS_PAYABLE**

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina |
| supplier_id | UUID | Não | FK → suppliers |
| purchase_id | UUID | Sim | FK → purchases (único) |
| amount | NUMERIC(12,2) | Sim | Valor total (soma dos itens da compra) |
| paid_amount | NUMERIC(12,2) | Sim | Cache — soma dos `payments` |
| status | VARCHAR(20) | Sim | `OPEN` → `PAID`/`CANCELED` |
| created_at | TIMESTAMPTZ | Sim | — |

Cliente enxerga a própria `accounts_receivable` (e os `payments` ligados a
ela) — mas nunca `accounts_payable`, que é informação interna da oficina.

## PAYMENTS

RN-FIN-001: pagamentos precisam ser idempotentes pra evitar baixa
duplicada. Livro-razão append-only — `idempotency_key` é único por tenant
(`payments_tenant_idempotency_key_unique`); o app gera essa chave uma vez
por carregamento da tela de Financeiro (`crypto.randomUUID()` no Server
Component), não por clique, então reenviar o mesmo formulário (duplo-clique,
retry de rede) esbarra na unique constraint em vez de registrar uma segunda
baixa. Só staff com `financial.manage` insere, e só contra uma conta da
própria oficina — cliente nunca registra pagamento diretamente.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Sim | Oficina |
| receivable_id | UUID | Não | FK → accounts_receivable (exatamente um dos dois é preenchido) |
| payable_id | UUID | Não | FK → accounts_payable |
| amount | NUMERIC(12,2) | Sim | `> 0` |
| method | VARCHAR(20) | Sim | `PIX` \| `CARD` \| `CASH` \| `TRANSFER` \| `OTHER` |
| idempotency_key | TEXT | Sim | Único por tenant |
| notes | TEXT | Não | — |
| created_by | UUID | Não | — |
| created_at | TIMESTAMPTZ | Sim | — |

## AUDIT_LOGS

RN-AUD-001: operações críticas devem registrar usuário, data, antes e
depois. Tabela genérica, append-only, escrita exclusivamente pela trigger
`audit_log_change()` (`SECURITY DEFINER`) — `authenticated` só tem
`GRANT SELECT`. `tenant_id`/`record_id` são best-effort, extraídos da linha
via `to_jsonb(...)->>'...'`, então ficam `null` em tabelas sem essas colunas
(ex.: `tenants`, `user_roles`, que usa chave composta `user_id`+`role_id`
sem coluna `id`). Hoje anexada a `tenants`, `user_roles`, `sla_definitions`
e `warranty_definitions` — ver `docs/seguranca/rls-e-autenticacao.md` para o
racional de quais tabelas e por quê.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| id | UUID | Sim | ID |
| tenant_id | UUID | Não | Extraído da linha auditada; `null` se a tabela não tiver essa coluna |
| actor_id | UUID | Não | `auth.uid()` no momento da operação |
| action | VARCHAR(10) | Sim | `INSERT` \| `UPDATE` \| `DELETE` |
| table_name | VARCHAR(100) | Sim | `TG_TABLE_NAME` |
| record_id | TEXT | Não | Extraído de `->>'id'`; `null` em tabela com chave composta |
| before | JSONB | Não | Linha antes da mudança (`null` em `INSERT`) |
| after | JSONB | Não | Linha depois da mudança (`null` em `DELETE`) |
| created_at | TIMESTAMPTZ | Sim | — |

## WORKSHOP_ADMIN *(papel)*

Papel de sistema (`tenant_id` nulo, mesmo padrão de `CUSTOMER` e
`PLATFORM_ADMIN`) com as permissões `service_request.manage`,
`work_order.update`, `diagnostic.manage`, `estimate.manage`,
`appointment.manage`, `sla.manage`, `warranty.manage`, `product.manage`,
`purchase.manage` e `financial.manage`. Atribuído manualmente via SQL a um
usuário com `tenant_id` já definido (ver `docs/seguranca/rls-e-autenticacao.md`).

## Funções auxiliares de RLS

| Função | Retorno | Uso |
| --- | --- | --- |
| `public.current_tenant_id()` | `uuid \| null` | Tenant do usuário autenticado atual |
| `public.has_permission(code text)` | `boolean` | Se o usuário atual tem uma permissão, via `user_roles` → `role_permissions` → `permissions` |
| `public.work_orders_sla_status(wo work_orders)` | `text` | Computed column — status do SLA de uma OS, derivado na leitura (ver SLA_INSTANCES acima) |
| `public.warranties_status(w warranties)` | `text` | Computed column — `ACTIVE`/`EXPIRED`, derivado de `expires_at` na leitura |

## Próximas tabelas

`CUSTOMERS`, documentos/fotos da Vida do Carro (dependem de Supabase
Storage), fiscal, DRE/controladoria etc. entram quando as respectivas
etapas do roadmap forem implementadas — ver a Especificação Técnica para o
dicionário-alvo completo.
