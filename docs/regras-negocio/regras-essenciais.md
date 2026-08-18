# Regras de negócio essenciais

Lista extraída do documento original do projeto (PARTE XIV / dicionário de
regras). Coluna "Status" reflete o que já está implementado neste repositório.

| Código | Regra | Criticidade | Status |
| --- | --- | --- | --- |
| RN-AUTH-001 | Senha nunca é armazenada em texto puro. | Alta | ✅ Delegado ao Supabase Auth |
| RN-TENANT-001 | Usuário de um tenant não pode acessar registros de outro tenant. | Crítica | ✅ RLS + teste pgTAP (`supabase/tests/database/0001_multitenancy_isolation.test.sql`) |
| RN-VEH-001 | Cliente só visualiza/altera veículos associados à sua conta. | Alta | ⏳ Depende da tabela `vehicles` (ainda não criada) |
| RN-MNT-001 | Próxima manutenção considera quilometragem ou tempo, o que ocorrer primeiro. | Alta | ⏳ Depende do módulo de manutenção |
| RN-OS-001 | OS utilizada não deve ser excluída; cancelamento preserva histórico. | Alta | ⏳ Depende do módulo de ordens de serviço |
| RN-EST-001 | Orçamento enviado deve ser versionado quando alterado. | Alta | ⏳ Depende do módulo de orçamento |
| RN-STK-001 | Saldo de estoque só muda por movimentação auditável. | Crítica | ⏳ Depende do módulo de estoque |
| RN-FIN-001 | Pagamentos precisam ser idempotentes para evitar baixa duplicada. | Crítica | ⏳ Depende do módulo financeiro |
| RN-SLA-001 | Cálculo do SLA é responsabilidade do backend. | Alta | ⏳ Depende do módulo de SLA |
| RN-AUD-001 | Operações críticas devem registrar usuário, data, antes e depois. | Alta | ⏳ Tabela `audit_logs` ainda não criada |

Ao implementar qualquer regra marcada como pendente, siga o template de
feature do documento original (requisito → regra de negócio → dados →
migration → backend → testes → documentação → frontend → teste do fluxo
completo → atualizar documentação → commit → PR) e atualize esta tabela na
mesma mudança.
