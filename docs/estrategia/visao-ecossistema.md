# Visão de ecossistema Wezcar

Este documento organiza a reformulação de estratégia de Agosto/2026: a Wezcar
não compete só como "mais um sistema de oficina com OS, estoque e
financeiro" — ela é um ecossistema automotivo. A cadeia deixa de ser

```
Oficina → Sistema → Cliente daquela oficina
```

e passa a ser

```
Motorista → Veículo → Vida do Carro → Necessidade de manutenção
  → Wezcar → Oficina → Serviço → Pagamento → Histórico → Próxima manutenção
```

O motorista e o veículo pertencem ao ecossistema Wezcar, não a uma oficina
específica. Isso já é, em parte, uma decisão de arquitetura tomada na
Fundação (ver ADR
[`0004-motorista-centrico-e-modularidade-do-ecossistema.md`](../decisoes/0004-motorista-centrico-e-modularidade-do-ecossistema.md))
e não só de produto — é por isso que `vehicles.customer_id` referencia o
usuário, nunca o tenant.

Cada produto abaixo mapeia para os módulos já listados em
[`docs/arquitetura/visao-geral.md`](../arquitetura/visao-geral.md). Status:
✅ construído, 🧱 fundação pronta (o dado/decisão que o produto precisa já
existe, falta a feature em si), ⏳ planejado, ainda não iniciado.

## Vida do Carro

Prontuário digital do veículo: quilometragem, manutenções, peças, garantias,
custos, documentos, fotos, oficinas utilizadas, próximas manutenções.

- Status: 🧱. `vehicles` já pertence ao cliente, não ao tenant, e
  `vehicle_mileage_history`/`work_order_events` já implementam o padrão que
  o resto da Vida do Carro vai seguir: tabela só-inserção, presa por
  `vehicle_id`, nunca editada/apagada.
- Falta: `maintenance_records`, `documents`, `photos`, `warranties` seguindo
  o mesmo padrão; uma tela "linha do tempo do veículo" agregando tudo.

## Wezcar Network

Rede de oficinas: `Free` (listada gratuitamente — nome, localização,
contato, especialidades, avaliações) e `Integrada` (fluxo completo pela
plataforma).

- Status: ⏳. Hoje `tenant` = oficina com sistema (login, staff, RLS). Não
  existe ainda um "perfil público de oficina" que não exija ser tenant
  pagante — isso é decisão de modelagem a tomar antes de construir o Free,
  não de código a escrever agora (ver ADR 0004, decisão 3).
- Já ajuda: o diretório de tenants ativos (`tenants_select_active_directory`)
  usado hoje em `/chamados` é o embrião da busca por oficina.

## Wezcar Match

Compatibilidade calculada (veículo + problema + localização + especialidade
+ disponibilidade + avaliação + SLA + capacidade + preço + peças
disponíveis), não só distância.

- Status: ⏳. Depende de Network (ter mais de uma oficina candidata) e de
  dados que ainda não existem (especialidades, SLA, avaliação, capacidade).
  Nenhuma decisão de arquitetura bloqueia isso hoje; é trabalho de produto
  para depois que os dados de origem existirem.

## Pré-orçamento Wezcar

Estimativa inicial a partir de um relato do motorista ("barulho ao frear" →
possíveis serviços + faixa de preço), sempre deixando claro que não
substitui diagnóstico da oficina.

- Status: ⏳. Primeira aplicação natural do Wezcar AI (abaixo). Não depende
  de nenhuma tabela nova complexa — depende de `estimates`/`estimate_items`
  existirem (ainda não existem) e de um ponto de integração com IA.

## Wezcar AI

IA como camada transversal, não só chatbot: pré-diagnóstico para o
motorista, estruturação de itens de orçamento para o mecânico, explicações
de indicadores para o gestor, sinalização de oportunidades para o
comercial.

- Status: ⏳, mas a decisão de **onde** ela entra no código já está tomada
  (ADR 0004, decisão 5): um único ponto de integração, não uma chamada de IA
  espalhada em cada tela. Isso evita reescrever tudo quando o primeiro caso
  de uso (pré-orçamento ou estruturação de OS por voz/texto) for construído.

## Wezcar Oficina (ERP)

CRM → Agenda → Recepção → Checklist → Diagnóstico → Orçamento → Aprovação →
OS → Execução → Controle de qualidade → Entrega → Garantia → Pós-venda, além
de Estoque, Compras, Financeiro, Fiscal, DRE, BI, SLA, Produtividade.

- Status: 🧱/✅ parcial. Chamados (`service_requests`) e OS (`work_orders`)
  já existem com isolamento por tenant e RBAC (`service_request.manage`,
  `work_order.update`). Diagnóstico, orçamento, agenda, SLA, estoque,
  compras, financeiro ainda não — ver a tabela de módulos em
  `docs/arquitetura/visao-geral.md`, coluna Status.
- Este é o módulo que precisa competir de igual para igual com Ultracar,
  Onmotor, Wüst etc. — a diferenciação do ecossistema não substitui um ERP
  bem feito, ela se soma a ele.

## Personalização das oficinas (multi-tenant configurável)

Uma Wezcar, uma base de código, um Design System, vários tenants — cada
oficina com sua identidade (logo, cores, documentos, campos, checklists,
status, workflows, permissões, dashboards) dentro da identidade Wezcar.

- Status: 🧱. Já é o modelo adotado desde a Fundação: RLS por `tenant_id`,
  RBAC via `roles`/`permissions`/`role_permissions` por tenant, e o shell de
  navegação (WDS v0, ADR 0003) já é construído para ser a base visual comum
  de todas as telas. Personalização de logo/cores/checklist/workflow ainda
  não foi construída, mas o princípio (configuração por tenant em
  tabela/JSON, nunca fork de código) já está registrado em ADR 0004.

## Wezcar Parts

Marketplace de peças: OS → necessidade → estoque da oficina → fornecedores
integrados → compra → estoque → aplicação na OS; para o motorista, "comprar
peça" ou "comprar + instalar".

- Status: ⏳. Não construir agora. Guardrail já registrado (ADR 0004,
  decisão 6): o modelo de atores não deve assumir que só existem "tenant" e
  "cliente" — um fornecedor é um terceiro tipo de participante.

## Wezcar Pay

Pagamento integrado ao orçamento/OS: aprovar → escolher forma de pagamento →
pagar → atualizar OS → atualizar financeiro.

- Status: ⏳. Mesma lógica do Parts — depende de orçamento/financeiro
  existirem primeiro. Regra RN-FIN-001 (pagamentos idempotentes) já está
  registrada em `docs/regras-negocio/regras-essenciais.md` para quando esse
  módulo for construído.

## Wezcar Intelligence (BI)

Visão executiva direta (veículos na oficina, OS abertas, orçamentos
aguardando, SLA em risco, contas a receber, estoque mínimo) e, depois, IA
explicando os números.

- Status: ⏳. Depende dos módulos operacionais (OS, orçamento, financeiro,
  estoque, SLA) existirem — BI é uma camada de leitura sobre eles, não uma
  fonte de dados nova. A explicação por IA reaproveita o mesmo ponto de
  integração do Wezcar AI.

## Depois: Passport, Verified, Warranty, Fleet

Camadas que dependem de a Vida do Carro, o Network e o Wezcar Oficina já
estarem maduros:

- **Passport**: exportação/apresentação do histórico do veículo (útil na
  revenda) — consulta sobre a Vida do Carro, não um módulo novo de dados.
- **Verified**: selo de verificação de oficina (CNPJ, identidade, avaliação)
  — estende o perfil público do Network.
- **Warranty**: garantia vinculada a veículo + OS — mais uma tabela
  seguindo o padrão de histórico do veículo (ADR 0004, decisão 2).
- **Fleet**: mesma estrutura aplicada a empresas com frota — reaproveita
  Vida do Carro por veículo, agregada por uma conta empresarial.

## Como isso entra no roadmap

Não muda a ordem do que já estava planejado (diagnóstico → orçamento →
agenda → SLA → estoque → financeiro, conforme
`docs/arquitetura/visao-geral.md`). O que muda é que, a partir de agora,
toda nova tabela/migration é revisada contra os princípios do ADR 0004 antes
de ser considerada pronta — para não tomar uma decisão de dados hoje que
feche a porta para Network, Match, AI, Parts, Pay ou Intelligence amanhã.
Continua valendo "construir pequeno, mas pensar grande desde a
arquitetura".
