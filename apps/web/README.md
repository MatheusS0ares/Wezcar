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
| `/painel` | Área autenticada (protegida por `src/proxy.ts`) |
| `/veiculos` | Cadastro de veículos + atualização de quilometragem |
| `/admin` | Wezcar Admin — só para quem tem o papel `PLATFORM_ADMIN` |
| `/api/health` | Healthcheck (verifica conexão com o Supabase) |

## Estrutura

```
src/
├── app/                 # rotas (App Router)
├── lib/supabase/        # clientes Supabase (browser/server)
└── proxy.ts              # renova sessão + protege rotas (era middleware.ts)
```
