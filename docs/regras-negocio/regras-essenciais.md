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
| RN-MNT-001 | Próxima manutenção considera quilometragem ou tempo, o que ocorrer primeiro. | Alta | ⏳ Histórico de manutenções (base) já existe (`maintenance_records`); falta a lógica de previsão da próxima manutenção |
| RN-VLC-001 *(nova)* | Histórico de manutenção do veículo é imutável e pertence ao veículo, não à oficina; um registro gerado por OS nunca pode ser forjado pelo app. | Alta | ✅ Trigger `create_maintenance_record_from_work_order` (única fonte de linhas `WORK_ORDER`) + RLS restringindo INSERT do cliente a `MANUAL` + teste pgTAP (`0007_maintenance_and_warranties.test.sql`) |
| RN-OS-001 | OS utilizada não deve ser excluída; cancelamento preserva histórico. | Alta | ✅ Não há política de DELETE em `work_orders`; toda mudança de status vira evento em `work_order_events` |
| RN-OS-002 *(nova)* | Criar/alterar OS é exclusivo de staff da própria oficina; cliente só lê a própria OS. | Crítica | ✅ RLS + teste pgTAP |
| RN-EST-001 | Orçamento enviado deve ser versionado quando alterado. | Alta | ✅ Trigger `version_and_supersede_estimate` (nenhuma policy de UPDATE de conteúdo para staff; desde `20260824020000` o próprio trigger também força `status = 'SENT'` no INSERT, fechando a brecha de staff criar um orçamento já `APPROVED`) + teste pgTAP (`0005_diagnostics_and_estimates.test.sql`) |
| RN-EST-002 *(nova)* | Uma OS originada de um chamado só pode ser criada com um orçamento `APPROVED` para esse chamado. | Crítica | ✅ Trigger `enforce_work_order_requires_approved_estimate` + teste pgTAP |
| RN-STK-001 | Saldo de estoque só muda por movimentação auditável. | Crítica | ✅ `products.stock_on_hand` é cache mantido por `sync_product_stock()` a partir de `inventory_movements`; app só insere direto `type=ADJUSTMENT` (staff), `PURCHASE`/`USAGE` só nascem de trigger + teste pgTAP (`0008_inventory_and_purchases.test.sql`) |
| RN-FIN-001 | Pagamentos precisam ser idempotentes para evitar baixa duplicada. | Crítica | ✅ `payments.idempotency_key` único por tenant (`payments_tenant_idempotency_key_unique`); chave gerada uma vez por carregamento da tela, não por clique + teste pgTAP (`0009_financial_accounts.test.sql`) |
| RN-SLA-001 | Cálculo do SLA é responsabilidade do backend. | Alta | ✅ `due_at` carimbado por trigger na criação da OS; status derivado por `work_orders_sla_status()` (computed column) + teste pgTAP (`0006_appointments_and_sla.test.sql`) |
| RN-AUD-001 | Operações críticas devem registrar usuário, data, antes e depois. | Alta | ✅ Trigger genérica `audit_log_change()` em `tenants`, `user_roles`, `sla_definitions`, `warranty_definitions` + teste pgTAP (`0010_audit_logs.test.sql`) |
| RN-NOT-001 *(nova)* | Cliente e oficina devem ser avisados quando um evento-chave do fluxo acontece (chamado aberto, orçamento enviado/decidido, OS pronta/entregue, agendamento confirmado), não só descobrir olhando a tela. | Alta | ✅ Triggers de domínio geram `notifications` automaticamente (fan-out pro staff da oficina ou pro cliente do chamado) + sino no shell + teste pgTAP (`0011_notifications.test.sql`) |

Ao implementar qualquer regra marcada como pendente, siga o template de
feature do documento original (requisito → regra de negócio → dados →
migration → backend → testes → documentação → frontend → teste do fluxo
completo → atualizar documentação → commit → PR) e atualize esta tabela na
mesma mudança.
