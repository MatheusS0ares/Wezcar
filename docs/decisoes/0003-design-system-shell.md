# ADR 0003 — Shell de navegação e componentes base (WDS v0)

**Status:** Aceito — Agosto/2026

## Contexto

As primeiras telas (Painel, Veículos, Admin) tinham cada uma seu próprio
cabeçalho, botão de sair e estilos de formulário repetidos inline — funcional,
mas nada parecido com o "app revolucionário" que o produto precisa ser, e
difícil de manter conforme mais telas (Chamados, Oficina) foram entrando.
O usuário testa exclusivamente pelo celular (Safari iOS), então o shell
precisa ser mobile-first de verdade, não uma versão desktop encolhida.

## Decisão

- **Route group `(app)`** (`apps/web/src/app/(app)/`) agrupa todas as telas
  autenticadas sob um único `layout.tsx`, que busca o usuário/permissões uma
  vez (`lib/nav.ts`) e renderiza o `<AppShell>` — elimina a duplicação de
  header/logout que existia em cada página.
- **`AppShell`** (`components/app-shell.tsx`) é responsivo por breakpoint,
  não por media query de JS:
  - **Mobile (< md):** barra superior simples (logo + menu do usuário) e uma
    barra de abas fixa na parte inferior com os itens de navegação — padrão
    nativo de app, não de site.
  - **Desktop (≥ md):** sidebar lateral fixa com navegação vertical e o
    usuário/logout no rodapé; a barra inferior some.
  - Os itens de navegação mudam por permissão: `Oficina` só aparece para
    quem tem `work_order.update`; `Admin` só para `platform.super_admin`.
- **Componentes base** em `components/ui/`: `Button`, `Card`/`CardHeader`/
  `CardBody`, `Badge`/`StatusBadge` (mapeia qualquer status conhecido — `OPEN`,
  `IN_PROGRESS`, `DELIVERED` etc. — para uma cor consistente), `Field`/`Input`/
  `Select`/`Textarea`, `EmptyState`, `PageHeader`. Nenhuma página deve mais
  escrever `className` de card/input do zero.
- **Estilo**: SaaS moderno e limpo (referência Linear/Vercel/Stripe) — muito
  espaço em branco, tipografia forte (Inter), sem gradientes ou cores
  chamativas fora dos tokens já definidos em
  `docs/decisoes/0002-design-tokens.md`.
- Ícones via `lucide-react` (leve, tree-shakeable) em vez de SVGs à mão ou um
  set de ícones maior.
- **Logo oficial** (`apps/web/public/wezcar-logo.png` — lockup completo — e
  `wezcar-icon.png` — só a marca "W"/chave de boca, recortados com fundo
  transparente a partir da arte 3D fornecida) substitui o wordmark de texto
  provisório na landing (`/`), no shell (`AppShell`) e no favicon
  (`apps/web/src/app/favicon.ico`, gerado a partir do ícone). Os tokens de
  cor do WDS (ADR 0002) continuam provisórios — ainda não foram atualizados
  para bater com a paleta real da marca (azul/prata/vermelho).

## Consequências

- Toda tela nova só precisa importar os componentes de `components/ui/` e
  ficar dentro de `(app)/` para herdar navegação, autenticação e visual
  consistentes — sem repetir header/logout/estilo de novo.
- Isso ainda **não é** o WDS completo do documento original (item 94/32 —
  modais, tabelas com paginação, toasts, gráficos). É a base mínima que as
  telas atuais (Painel, Veículos, Chamados, Oficina, Admin) precisam; cresce
  conforme cada nova tela expuser uma necessidade real.
- `AppShell` decide os itens de navegação lendo permissões no servidor
  (`getNavContext()`), não no cliente — evita mostrar/esconder um link via CSS
  enquanto os dados por trás dele já estão protegidos por RLS de qualquer
  forma (defesa em profundidade, não a única camada).
