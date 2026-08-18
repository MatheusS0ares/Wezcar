# @wezcar/web

Frontend + backend da Wezcar (Next.js App Router). Ver o
[README raiz](../../README.md) para como rodar o monorepo, configurar o
Supabase local e fazer deploy.

## Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Landing page |
| `/cadastro` | Criar conta (cliente) |
| `/entrar` | Login |
| `/painel` | Visão geral da conta |
| `/veiculos` | Cadastro de veículos + atualização de quilometragem |
| `/chamados` | Cliente abre e acompanha chamados |
| `/oficina` | Dashboard da oficina — só para quem tem o papel `WORKSHOP_ADMIN` |
| `/oficina/chamados` | Aceitar/recusar chamados, criar OS |
| `/oficina/os` | Ordens de serviço + timeline + transições de status |
| `/admin` | Wezcar Admin — só para quem tem o papel `PLATFORM_ADMIN` |
| `/api/health` | Healthcheck (verifica conexão com o Supabase) |

Todas as rotas autenticadas ficam dentro do route group `(app)`, que
compartilha um único shell de navegação — ver
`docs/decisoes/0003-design-system-shell.md`.

## Estrutura

```
src/
├── app/
│   ├── (app)/            # rotas autenticadas — layout compartilhado (AppShell)
│   │   ├── painel/
│   │   ├── veiculos/
│   │   ├── chamados/
│   │   ├── oficina/
│   │   │   ├── chamados/
│   │   │   └── os/
│   │   └── admin/
│   ├── cadastro/ entrar/  # públicas
│   └── api/health/
├── components/
│   ├── ui/                # Button, Card, Badge, Field, EmptyState, PageHeader
│   └── app-shell.tsx      # sidebar (desktop) / bottom tabs (mobile)
├── lib/
│   ├── supabase/          # clientes Supabase (browser/server)
│   └── nav.ts             # resolve usuário + permissões para o AppShell
└── proxy.ts               # renova sessão + protege rotas (era middleware.ts)
```
