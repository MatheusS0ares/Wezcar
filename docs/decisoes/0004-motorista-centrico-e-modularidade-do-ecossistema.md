# ADR 0004 — Princípios de arquitetura para o ecossistema Wezcar

**Status:** Aceito — Agosto/2026

## Contexto

A estratégia do produto foi reorganizada: a Wezcar não quer ser "mais um
sistema de oficina", mas um ecossistema automotivo — motorista e veículo
pertencem à Wezcar, não a uma oficina específica; oficinas se conectam a
esse ecossistema (Wezcar Network), com um ERP forte (Wezcar Oficina) e
camadas futuras de matching (Match), IA (Wezcar AI), marketplace (Parts) e
pagamento (Pay). Detalhe completo em
[`docs/estrategia/visao-ecossistema.md`](../estrategia/visao-ecossistema.md).

Nenhuma dessas camadas futuras precisa ser construída agora — o MVP segue o
roadmap incremental já em andamento (`docs/arquitetura/visao-geral.md`). O
risco não é construir tarde demais, é tomar hoje, por conveniência de curto
prazo, uma decisão de dados ou de código que torne essas camadas caras de
adicionar depois. Esta ADR registra os princípios que já estão parcialmente
em prática desde a Fundação (ex.: `vehicles.customer_id` não referencia
tenant) e os estende de forma explícita, para servir de checklist ao revisar
cada nova migration/feature.

## Decisão

1. **Identidade de motorista e veículo nunca pertence a um tenant.**
   `public.users` (cliente), `vehicles` e qualquer histórico do veículo
   continuam sem `tenant_id`. Um tenant (oficina) é sempre um *participante*
   em um evento da vida do carro (uma OS, um chamado), nunca o dono do dado.
   Nenhuma migration futura deve adicionar `tenant_id` a `vehicles` ou
   duplicar o cadastro do veículo por oficina.

2. **A Vida do Carro é uma sequência de fatos imutáveis, não um registro
   mutável.** Segue o padrão já usado em `vehicle_mileage_history` e
   `work_order_events`: tabela só-inserção, presa por `vehicle_id`, sem
   política de `UPDATE`/`DELETE`, alimentada por trigger ou Server Action —
   nunca por `UPDATE` direto do app. Módulos futuros que registram marcos do
   veículo (`maintenance_records`, `documents`, `photos`, `warranties`)
   seguem esse mesmo padrão.

3. **"Existir na Wezcar Network" é independente de "ser um tenant com
   sistema".** Hoje `tenant` está conflacionado com "oficina que paga e tem
   usuários com login" (ver desvio documentado em
   `docs/banco-de-dados/dicionario-de-dados.md`). Antes de construir a
   Oficina Free (listagem gratuita, sem login/RLS/staff), essa conflação
   precisa ser revisitada — não implementar Free como "tenant grátis" só
   para reaproveitar a tabela `tenants` como está hoje. Fica registrado como
   decisão a tomar no momento de construir o Network, não uma migration a
   fazer agora.

4. **Personalização por oficina é configuração, não fork.** Mesmo princípio
   já aplicado ao RBAC (`roles`/`permissions` por tenant) e ao shell visual
   (WDS v0, ADR 0003): uma Wezcar, uma base de código, um Design System.
   Logo, cores, campos, checklists, workflows e dashboards por oficina viram
   dado configurável (tabela ou coluna JSON) associado a `tenant_id`, nunca
   uma branch de código ou uma tabela duplicada por cliente. Atualizamos a
   Wezcar uma vez; cada tenant lê sua própria configuração.

5. **IA entra atrás de um único ponto de integração.** Pré-diagnóstico do
   motorista, estruturação de OS por voz/texto do mecânico, explicação de
   indicadores para o gestor e sinalização comercial são casos de uso
   diferentes da mesma capacidade. Toda chamada a um provedor de IA passa
   por um módulo de integração dedicado (hoje pode ser um Route
   Handler/Server Action isolado dentro de `apps/web`; se crescer,
   `packages/ai` compartilhado) — nunca uma chamada de IA solta dentro de
   uma tela ou Server Action de outro domínio. Trocar de provedor ou somar
   um novo caso de uso não pode exigir tocar em cada tela existente.

6. **O modelo de atores não se limita a "tenant" e "cliente".** Wezcar
   Parts (fornecedores) e Wezcar Pay (canais de pagamento) introduzem
   participantes que não são nem uma oficina nem um motorista. Ao desenhar
   RLS, RBAC ou enums de papel novos, não assumir implicitamente que só
   esses dois tipos existem (ex.: não fixar um `CHECK` ou enum de "tipo de
   usuário" com exatamente dois valores quando o domínio já sugere um
   terceiro).

7. **ADR 0001 continua valendo.** Nenhum destes princípios exige um serviço
   separado do Next.js/Supabase hoje. Cada novo domínio (diagnóstico,
   orçamento, agenda, estoque, financeiro, Parts, Pay, Match) nasce como
   tabela + RLS + Server Action/Route Handler dentro de `apps/web`, e só
   ganha um serviço próprio quando uma necessidade concreta (processamento
   pesado de IA, filas, motor fiscal) justificar — não antes, e não "porque
   o ecossistema é grande".

## Consequências

- O roadmap de curto prazo não muda: a próxima etapa continua sendo
  diagnóstico/orçamento/agenda/SLA (ver módulos "⏳" em
  `docs/arquitetura/visao-geral.md`).
- Toda nova migration passa a ser revisada contra os 7 princípios acima
  antes de ser considerada pronta, além dos requisitos já existentes
  (migration + RLS/grant + entrada no dicionário de dados).
- `docs/banco-de-dados/dicionario-de-dados.md` já documenta a simplificação
  "tenant = oficina" como deliberada e revisável — a decisão 3 acima é o
  gatilho explícito para revisitá-la quando o Wezcar Network entrar em
  construção.
- Nenhum destes princípios bloqueia o MVP atual; eles existem para que o
  MVP não precise ser refeito quando Network, Match, AI, Parts, Pay e
  Intelligence forem construídos.

## Alternativas consideradas

- **Não registrar nada agora, decidir cada ponto quando o módulo
  correspondente for construído.** Rejeitada: alguns desses módulos tocam
  decisões de modelagem que já afetam tabelas existentes hoje (ex.: onde
  `tenant_id` pode aparecer, como histórico é gravado) — registrar o
  princípio agora evita que a primeira migration de um novo módulo tenha
  que desfazer um atalho tomado antes dele existir.
