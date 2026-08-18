# ADR 0002 — Tokens de design iniciais (WDS)

**Status:** Aceito — Agosto/2026

## Contexto

O documento original (PARTE XX) define a paleta oficial da Wezcar (claro e
escuro) e recomenda a fonte Inter como tipografia principal do futuro Wezcar
Design System (WDS). Nesta fase de Fundação não há ainda um design system
implementado, mas o app já precisa de alguma aparência.

## Decisão

Os tokens de cor do documento original foram portados como CSS custom
properties em `apps/web/src/app/globals.css` (prefixo `--wz-*`), com o tema
escuro ativado via `prefers-color-scheme: dark`:

| Token | Claro | Escuro |
| --- | --- | --- |
| `--wz-primary` | `#2563EB` | `#3B82F6` |
| `--wz-primary-dark` | `#1E40AF` | — |
| `--wz-cyan` | `#06B6D4` | `#22D3EE` |
| `--wz-background` | `#F8FAFC` | `#0B1120` |
| `--wz-surface` | `#FFFFFF` | `#111827` |
| `--wz-text-primary` | `#0F172A` | `#F8FAFC` |
| `--wz-text-secondary` | `#64748B` | `#94A3B8` (ajustado p/ contraste no escuro) |
| `--wz-border` | `#E2E8F0` | `#1E293B` |
| `--wz-success` / `--wz-warning` / `--wz-danger` / `--wz-info` | `#16A34A` / `#F59E0B` / `#DC2626` / `#0284C7` | mesmos valores |

A tipografia principal é **Inter** (`next/font/google`), conforme o
documento original. Uma fonte monoespaçada (Geist Mono) fica disponível via
`var(--font-mono)` para trechos de código.

## Consequências

- Isso **não é o WDS completo** (item 94 do documento: botões, inputs,
  cards, modais, tabelas, badges, gráficos, ícones, espaçamentos como
  componentes reutilizáveis). É só a base de cor/tipografia para as telas
  de autenticação e painel construídas na Fundação.
- Quando o WDS virar um pacote de componentes de verdade, ele deve nascer em
  `packages/ui` consumindo estes mesmos tokens — não recriar a paleta.
- Os tokens estão hoje só em CSS puro (não conectados ao tema do Tailwind via
  `@theme`), porque as poucas telas atuais não precisam de utilities Tailwind
  geradas a partir deles. Conectar ao `@theme` do Tailwind 4 é trabalho futuro
  natural quando o WDS ganhar mais componentes.
