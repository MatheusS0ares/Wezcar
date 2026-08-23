# Visão geral de arquitetura

Ver a decisão completa em
[`docs/decisoes/0001-arquitetura-nextjs-supabase.md`](../decisoes/0001-arquitetura-nextjs-supabase.md).
Resumo:

```
Browser / Vercel Edge
        │
        ▼
  Next.js (apps/web)  ──────────────►  Supabase (Postgres + Auth + Storage)
  App Router:                          - RLS aplica isolamento de tenant
  - Server Components                  - PostgREST expõe as tabelas via API
  - Server Actions                     - GoTrue (Auth) emite/valida JWT
  - Route Handlers (/api/*)            - Triggers SQL (ex.: signup → perfil)
```

Não existe hoje um serviço de API separado. O `proxy.ts` (renomeado de
`middleware.ts` a partir do Next.js 16) roda em toda request para renovar a
sessão e proteger rotas.

## Multi-tenancy

Modelo adotado (documento original, item 57 — "Avaliar Row-Level Security no
PostgreSQL como camada adicional"): cada oficina é um `tenant`; toda tabela
que pertence a uma oficina carrega `tenant_id` e é isolada por RLS via
`public.current_tenant_id()`. Clientes (usuários do Wezcar App) não têm
`tenant_id` — não pertencem a nenhuma oficina.

Detalhes de implementação e testes: `docs/seguranca/rls-e-autenticacao.md`.

## Módulos do backend (documento original, item 56)

O documento original lista os módulos de domínio esperados para o produto
completo. Nesta fase de Fundação, apenas a base de autenticação/tenant/RBAC
existe; os demais nascem como tabelas + RLS + Server Actions/Route Handlers
dentro de `apps/web` conforme cada etapa do roadmap for implementada.

| Módulo | Status |
| --- | --- |
| auth, users, tenants | ✅ Fundação |
| organizations, workshops | ⏳ (tenant simplificado = oficina) |
| vehicles (cadastro + histórico de quilometragem) | ✅ ETAPA 4 |
| service-requests, work-orders (chamados + OS) | ✅ primeira fatia |
| diagnostics, estimates/estimate-items (orçamento versionado) | ✅ segunda fatia |
| appointments, sla (agenda + prazo de entrega) | ✅ terceira fatia |
| vehicle-life, maintenance, warranty (histórico + garantias) | ✅ quarta fatia |
| products, inventory, purchases, suppliers | ✅ quinta fatia |
| financial, accounts-payable, accounts-receivable, payments | ✅ sexta fatia |
| audit (audit_logs) | ✅ sétima fatia |
| customers | ⏳ |
| vehicle-life: documentos, fotos (dependem de Supabase Storage) | ⏳ |
| pickup-delivery | ⏳ |
| marketplace, sales | ⏳ |
| treasury, fiscal, controllership | ⏳ |
| notifications, chat, reviews, reports, analytics | ⏳ |
| customization, workflow, rules, integrations | ⏳ |

## Ecossistema Wezcar

A tabela acima lista módulos técnicos; o mapeamento desses módulos para os
produtos do ecossistema (Vida do Carro, Wezcar Network, Match, AI, Parts,
Pay, Intelligence etc.) está em
[`docs/estrategia/visao-ecossistema.md`](../estrategia/visao-ecossistema.md).
Os princípios de arquitetura que existem para não fechar a porta para essas
camadas futuras estão em
[ADR 0004](../decisoes/0004-motorista-centrico-e-modularidade-do-ecossistema.md)
— por exemplo, por que `vehicles` pertence ao cliente e não ao tenant, e por
que histórico do veículo é sempre só-inserção.

## Estrutura do repositório

Ver o README raiz para a árvore de diretórios completa e os comandos de
desenvolvimento.
