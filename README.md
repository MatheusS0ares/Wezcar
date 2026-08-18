# Wezcar

> A vida do seu carro em um só lugar.

Monorepo da Wezcar — plataforma que conecta clientes, oficinas e autopeças,
acompanhando a vida do veículo e a gestão da oficina. Este README cobre a
**Fundação** do projeto (ETAPA 1-3 do roadmap): repositório, banco de dados
multi-tenant no Supabase e autenticação no Next.js/Vercel.

O plano completo do produto (visão de negócio, todos os módulos, dicionário de
dados alvo, roadmap por etapas) está no documento original do projeto; este
repositório implementa o que já foi construído, de forma incremental.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend + backend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Banco de dados, Auth, Storage | Supabase (PostgreSQL + PostgREST + GoTrue) |
| Isolamento multi-tenant | Row-Level Security (RLS) no Postgres |
| Hospedagem | Vercel (app) + Supabase (banco/plataforma) |
| Testes de banco | pgTAP |
| Gerenciador de pacotes | pnpm workspaces |

Ver a decisão de arquitetura completa em
[`docs/decisoes/0001-arquitetura-nextjs-supabase.md`](docs/decisoes/0001-arquitetura-nextjs-supabase.md).

Diferente do backend NestJS separado sugerido no plano original, o Next.js
fala diretamente com o Supabase (client no browser para o que RLS já protege,
Server Actions/Route Handlers para o resto). Não há hoje um serviço de API
dedicado — se um domínio precisar de lógica que não cabe em RLS/Postgres, ele
ganha suas próprias rotas dentro de `apps/web`.

## Estrutura do repositório

```
wezcar/
├── apps/
│   └── web/              # Next.js (App Router) — frontend + backend
├── packages/
│   └── types/             # Tipos TypeScript compartilhados (Database do Supabase)
├── supabase/
│   ├── migrations/        # Schema versionado (SQL)
│   ├── tests/database/    # Testes pgTAP (RLS, isolamento de tenant)
│   ├── seed.sql            # Dados de exemplo para desenvolvimento local
│   └── config.toml
└── docs/
    ├── arquitetura/
    ├── banco-de-dados/     # Dicionário de dados vivo
    ├── regras-negocio/     # Regras de negócio (RN-*)
    ├── seguranca/
    └── decisoes/           # ADRs
```

## Pré-requisitos

- Node.js 20+
- pnpm (`corepack enable` já habilita a versão fixada em `package.json`)
- Docker (para rodar o Supabase localmente)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (via `npx supabase`, não precisa instalar global)

## Rodando localmente

```bash
pnpm install

# 1. Sobe Postgres/Auth/Storage/Studio locais em Docker e aplica as migrations + seed
pnpm supabase:start
# Anote os valores impressos: API URL e anon key

# 2. Configure o app
cp apps/web/.env.example apps/web/.env.local
# Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY com os valores acima

# 3. Rode o app
pnpm dev
```

Abra http://localhost:3000. `/cadastro` cria uma conta de cliente, `/entrar`
faz login, `/painel` é a área autenticada e `/api/health` verifica a conexão
com o banco.

### Rodando os testes de banco (RLS / isolamento de tenant)

```bash
pnpm supabase:test
```

Isso reseta o banco local, aplica todas as migrations + `seed.sql`, e roda os
testes pgTAP em `supabase/tests/database/`. O teste principal
(`0001_multitenancy_isolation.test.sql`) prova a regra crítica **RN-TENANT-001**:
um usuário de um tenant não consegue ler nem escrever registros de outro tenant.

> Nesta sessão de desenvolvimento o `supabase start` (Docker) não pôde ser
> executado por restrição de rede do ambiente, então a validação foi feita
> rodando as migrations e os mesmos testes pgTAP contra um PostgreSQL local
> com um schema `auth` mínimo simulando o Supabase. Rode `pnpm supabase:start`
> e `pnpm supabase:test` num ambiente com acesso normal à internet para a
> validação oficial antes do primeiro deploy.

### Outros comandos úteis

```bash
pnpm supabase:reset    # recria o banco local do zero (migrations + seed)
pnpm supabase:stop     # para os containers do Supabase local
pnpm lint              # eslint no app web
pnpm build             # build de produção do app web
```

## Deploy

### Supabase (banco de dados)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. `npx supabase link --project-ref <seu-project-ref>`
3. `npx supabase db push` — aplica todas as migrations de `supabase/migrations/` no projeto remoto.
4. Gere os tipos TypeScript reais a partir do projeto vinculado:
   `npx supabase gen types typescript --linked > packages/types/src/database.ts`
   (substitui o arquivo escrito à mão para o desenvolvimento inicial).

### Vercel (app)

1. Importe o repositório na Vercel apontando o **Root Directory** para `apps/web`.
2. Configure as variáveis de ambiente do projeto Supabase criado acima:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (e, quando algum
   fluxo server-side precisar, `SUPABASE_SERVICE_ROLE_KEY` — nunca com prefixo
   `NEXT_PUBLIC_`).
3. Deploy. A Vercel detecta o Next.js automaticamente.

## Convenções de Git

Branches: `main`, `develop`, `feature/*`, `fix/*`.

Commits ([Conventional Commits](https://www.conventionalcommits.org/)):

```
feat: add vehicle registration
fix: prevent cross-tenant access
docs: update data dictionary
refactor: extract estimate calculator
test: add work order authorization tests
chore: update dependencies
```

Toda mudança de schema deve vir como uma nova migration em
`supabase/migrations/`, nunca como alteração manual no banco. Toda nova tabela
ou coluna precisa: (1) uma migration, (2) política de RLS + grant
correspondente, (3) uma entrada em `docs/banco-de-dados/dicionario-de-dados.md`.

## Documentação

- [`docs/decisoes/`](docs/decisoes) — decisões de arquitetura (ADRs)
- [`docs/banco-de-dados/dicionario-de-dados.md`](docs/banco-de-dados/dicionario-de-dados.md) — dicionário de dados vivo
- [`docs/seguranca/rls-e-autenticacao.md`](docs/seguranca/rls-e-autenticacao.md) — modelo de segurança, RLS e autenticação
- [`docs/regras-negocio/regras-essenciais.md`](docs/regras-negocio/regras-essenciais.md) — regras de negócio (RN-*)
