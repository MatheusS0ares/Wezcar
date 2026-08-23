# Regras de negócio essenciais

Lista extraída do documento original do projeto (PARTE XIV / dicionário de
regras). Coluna "Status" reflete o que já está implementado neste
repositório. A Especificação Técnica mais recente usa sua própria numeração
(RN-001 a RN-015); os códigos abaixo continuam os já estabelecidos aqui para
não invalidar testes e commits existentes — a regra em si é a mesma.

| Código | Regra | Criticidade | Status |
| --- | --- | --- | --- |
| RN-AUTH-001 | Senha nunca é armazenada em texto puro. | Alta | ✅ Delegado ao Supabase Auth |
| RN-TENANT-001 | Usuário de um tenant não pode acessar registros de outro tenant. | Crítica | ✅ RLS + teste pgTAP (`supabase/tests/database/0001_multitenancy_isolation.test.sql`) |
| RN-VEH-001 | Cliente só visualiza/altera veículos associados à sua conta. | Alta | ✅ RLS + teste pgTAP (`0002_vehicles_isolation.test.sql`) |
| RN-VEH-002 *(nova)* | Quilometragem do veículo nunca regride e só muda por registro no histórico, nunca por UPDATE direto. | Alta | ✅ Trigger `sync_vehicle_mileage` + teste pgTAP |
| RN-ADMIN-001 *(nova)* | Não existe autoatendimento para virar administrador da plataforma (`PLATFORM_ADMIN`) — só concedido manualmente via SQL. | Crítica | ✅ RLS + teste pgTAP (`0003_platform_admin.test.sql`) |
| RN-CHAM-001 *(nova)* | Cliente só vê/altera os próprios chamados; oficina só vê chamados endereçados a ela. | Crítica | ✅ RLS + teste pgTAP (`0004_service_requests_and_work_orders.test.sql`) |
| RN-CHAM-002 *(nova)* | Aceitar/recusar um chamado é ação exclusiva de staff da oficina (`service_request.manage`); cliente só pode cancelar enquanto `OPEN`. | Alta | ✅ RLS + trigger de carimbo de `accepted_at`/`closed_at` |
| RN-MNT-001 | Próxima manutenção considera quilometragem ou tempo, o que ocorrer primeiro. | Alta | ⏳ Depende do módulo de manutenção |
| RN-OS-001 | OS utilizada não deve ser excluída; cancelamento preserva histórico. | Alta | ✅ Não há política de DELETE em `work_orders`; toda mudança de status vira evento em `work_order_events` |
| RN-OS-002 *(nova)* | Criar/alterar OS é exclusivo de staff da própria oficina; cliente só lê a própria OS. | Crítica | ✅ RLS + teste pgTAP |
| RN-EST-001 | Orçamento enviado deve ser versionado quando alterado. | Alta | ✅ Trigger `version_and_supersede_estimate` (nenhuma policy de UPDATE de conteúdo para staff) + teste pgTAP (`0005_diagnostics_and_estimates.test.sql`) |
| RN-EST-002 *(nova)* | Uma OS originada de um chamado só pode ser criada com um orçamento `APPROVED` para esse chamado. | Crítica | ✅ Trigger `enforce_work_order_requires_approved_estimate` + teste pgTAP |
| RN-STK-001 | Saldo de estoque só muda por movimentação auditável. | Crítica | ⏳ Depende do módulo de estoque |
| RN-FIN-001 | Pagamentos precisam ser idempotentes para evitar baixa duplicada. | Crítica | ⏳ Depende do módulo financeiro |
| RN-SLA-001 | Cálculo do SLA é responsabilidade do backend. | Alta | ⏳ Depende do módulo de SLA |
| RN-AUD-001 | Operações críticas devem registrar usuário, data, antes e depois. | Alta | ⏳ Tabela `audit_logs` ainda não criada |

Ao implementar qualquer regra marcada como pendente, siga o template de
feature do documento original (requisito → regra de negócio → dados →
migration → backend → testes → documentação → frontend → teste do fluxo
completo → atualizar documentação → commit → PR) e atualize esta tabela na
mesma mudança.
