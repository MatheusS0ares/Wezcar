# ADR 0005 — Landing page pública (`/`) como peça de marketing, não parte do shell

**Status:** Aceito — Agosto/2026

## Contexto

A rota `/` (antes do login) era um placeholder: logo, título, dois botões,
sem nada que comunicasse o que o produto faz. O pedido foi explícito: a
primeira tela que um visitante vê precisa passar a impressão de um produto
premium — "que o site custou vinte mil reais pra ser feito" — pesquisando
antes as táticas atuais de marketing digital e design de landing page.

Pesquisa feita antes de implementar (fontes no fim deste documento):

- **Bento grids** dominam layouts de feature de SaaS em 2026 (67% dos top
  100 do ProductHunt), substituindo blocos de texto por unidades modulares.
- **Glassmorphism** sobreviveu de forma restrita — em navbars, modais e
  cards — não como tratamento dominante de hero.
- **Motion com contenção**: scroll-reveal aumenta tempo de sessão em ~30%
  *quando tem propósito* (revelar uma seção, guiar atenção pro CTA); motion
  decorativo sem função é ruído, não converte.
- **Hero com visual real do produto** converte mais que arte genérica —
  mas um screenshot literal fica desatualizado a cada mudança de UI.
- **Prova social específica** (nome real, resultado real) converte;
  genérica ou inventada não converte — e inventar depoimento/cliente/nota
  seria simplesmente falso, o que não é uma opção aqui.
- **CTA com contraste forte + redutor de objeção logo abaixo** ("sem
  cartão de crédito", "leva menos de 1 minuto") reduz a barreira
  psicológica de conversão.

## Decisão

- **`/` é a única rota com tratamento de marketing.** Todo o resto do app
  (shell autenticado, ADR 0003) continua deliberadamente minimalista
  (Linear/Vercel/Stripe) — gradiente, blur e animação de entrada ficam
  restritos à landing pública; não migram pro `AppShell`.
- **Sem prova social inventada.** Como o produto ainda não tem clientes
  reais publicáveis, a landing não tem depoimentos, nem contador de
  clientes, nem logos de empresa. No lugar, uma faixa de confiança com
  fatos técnicos reais e verificáveis (isolamento multi-tenant, Row-Level
  Security, pagamentos idempotentes, trilha de auditoria) — tudo já
  implementado e testado neste repositório, não promessa.
- **Visual do produto construído, não fotografado.** O mockup no hero
  (`components/landing-hero-visual.tsx`) usa a mesma linguagem visual
  (Card, Badge, ícones) da tela real de Vida do Carro, mas é composição
  estática — não um screenshot que quebra a cada mudança de layout.
- **Bento grid** (seção de features em `app/page.tsx`) para os 6
  módulos já entregues (Vida do Carro, Diagnóstico & Orçamento, Agenda &
  SLA, Financeiro, Estoque & Compras, Notificações), 2 células maiores
  pros dois módulos mais diferenciadores.
- **`Reveal`** (`components/reveal.tsx`) — fade/slide-in via
  `IntersectionObserver`, aplicado com moderação (por seção, não por
  elemento) e com `<noscript>` forçando visibilidade total sem JS —
  motion que guia, não decora, e nunca deixa conteúdo permanentemente
  invisível se o JS falhar/atrasar.
- **Glassmorphism restrito à navbar** (`components/landing-navbar.tsx`):
  transparente sobre o hero, `backdrop-blur` só depois que o usuário rola
  a página — não usado em nenhuma outra seção.
- **Gradientes on-brand**: só azul (`--wz-primary`) e ciano (`--wz-cyan`),
  os tokens já existentes — nunca roxo/rosa genérico de template de SaaS.

## Round 2 — mais impacto, sem imagem real de carro

Pedido de acompanhamento: usar fotos reais de carro pra mais impacto, e
deixar a tela de login parecida com a de uma locadora tipo Movida (painel
de marca com foto + form ao lado, padrão comum de conta de aluguel de
carro/frota).

Duas restrições concretas descobertas ao tentar atender isso:

- **Este ambiente de execução não tem acesso à internet aberta** — o
  proxy de rede da sessão bloqueia qualquer domínio fora de uma lista
  curada (registries de pacote, APIs internas). Tentativas de acessar
  `movida.com.br` e bancos de imagem (Unsplash, Wikimedia) pra estudar o
  layout real ou baixar fotos retornaram bloqueio de rede — não foi
  possível nem visualizar a página real da Movida, nem baixar uma foto.
- **Fabricar uma URL de imagem não é uma opção** — instrução permanente
  deste agente. Então "foto real" ficou fora de alcance nesta sessão por
  restrição de ambiente, não por escolha de design.

Decisão (confirmada com o usuário via pergunta direta): seguir com
ilustração/gráfico construído — sem imagem externa nenhuma — em vez de
placeholder vazio ou imagem fabricada.

- **`components/car-illustration.tsx`** — SVG de carro desenhado à mão
  (gradiente `--wz-primary`/`--wz-cyan`, rodas, brilho de farol, linhas de
  velocidade), substitui a Wezcar em toda peça de marketing que precisar
  de um "hero visual" de carro — landing e `AuthShell`.
- **`components/hero-tilt.tsx`** — tilt 3D por `pointermove`, só pra
  mouse (`pointerType === "mouse"`, sem listener nenhum em touch) — a
  interatividade pedida, sem custo de performance em mobile, onde o
  usuário real testa (ADR 0003).
- **`components/stat-counter.tsx`** — contador animado (scroll → conta
  até o valor) com números **reais e verificáveis neste repositório**
  (6 módulos, 150+ testes pgTAP, 100% do histórico pertence ao motorista,
  0 chance de vazamento entre tenants) — não métrica de negócio inventada.
- **`components/floating-chip.tsx`** — chips flutuantes tipo notificação
  sobre o carro, pra composição em camadas (mais dinâmico que uma imagem
  plana única).
- **`components/auth-shell.tsx`** — layout split-screen (painel de marca
  com gradiente + `CarIllustration` + tagline de um lado, formulário do
  outro) usado por `/entrar` e `/cadastro` — o padrão "conta de locadora"
  pedido, sem depender de foto. Mobile empilha em coluna única (banner
  compacto em cima, form embaixo) — não é a metade opcional.
- Nova seção **"Veja como fica no seu bolso"** na landing reaproveita o
  mockup de produto (`LandingHeroVisual`) que antes vivia só no hero,
  agora com espaço próprio.

Se no futuro o usuário fornecer fotos reais (upload direto, já que
buscar/baixar por conta própria não é possível nesta sessão), elas podem
substituir `CarIllustration` sem mudar o resto da composição — os
componentes que a usam (`app/page.tsx`, `AuthShell`) recebem qualquer
visual do mesmo tamanho no lugar.

## Consequências

- A landing pública e o app autenticado agora têm dois vocabulários
  visuais conscientemente diferentes — documentado aqui pra não virar
  inconsistência acidental quando alguém for mexer num dos dois achando
  que é o mesmo padrão do outro.
- Cada novo módulo entregue deveria, no mesmo PR ou logo em seguida,
  ganhar uma célula no bento grid da landing — senão a landing começa a
  ficar desatualizada em relação ao produto real.
- Quando o produto tiver clientes reais dispostos a serem citados, a
  faixa de confiança pode evoluir pra depoimento nomeado — não antes.

## Fontes da pesquisa

- [Web Design Trends 2026: The Definitive Guide](https://line25.com/articles/web-design-trends-2026/)
- [10 SaaS Landing Page Trends for 2026 (with Real Examples)](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples)
- [Bento Grids & Beyond: 7 UI Trends Dominating Web Design 2026](https://writerdock.in/blog/bento-grids-and-beyond-7-ui-trends-dominating-web-design-2026)
- [What Makes a Great SaaS Landing Page in 2026 (20+ Real Examples)](https://framiq.app/blog/best-saas-landing-pages-2026)
- [How Micro-Interactions & Motion Design Improve UX in 2026](https://acodez.in/micro-interactions-motion-design/)
- [Top Web Design Trends for 2026 — Figma](https://www.figma.com/resource-library/web-design-trends/)
- [Landing Page Optimization: 12 Proven Tactics to Increase Conversions in 2026](https://shorten.is/blog/landing-page-optimization-tactics-increase-conversions/)
- [Landing Page Conversion: 2,000 Pages Tested in 2026](https://www.digitalapplied.com/blog/landing-page-conversion-study-2000-pages-tested-2026)
