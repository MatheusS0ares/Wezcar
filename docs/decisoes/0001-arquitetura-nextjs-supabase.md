# ADR 0001 — Next.js + Supabase direto, sem backend NestJS separado

**Status:** Aceito — Agosto/2026 (Fundação, ETAPA 1-3)

## Contexto

O documento original do projeto ("Projeto Funcional, Técnico e Manual de
Construção da Startup") recomenda uma stack com API NestJS separada, Prisma,
PostgreSQL auto-hospedado e Redis (PARTE VIII, item 53). O pedido para esta
fase do projeto foi específico: construir em **Supabase + Vercel**.

Supabase já entrega Postgres gerenciado, autenticação (GoTrue), API REST
automática sobre o schema (PostgREST), Storage e Realtime. Colocar um NestJS
entre o Next.js e o Supabase reintroduziria uma camada de API que o Supabase
já fornece, sem ganho claro nesta fase do produto.

## Decisão

- **Next.js (App Router) é ao mesmo tempo o frontend e o backend.** Consultas
  simples e protegidas por RLS acontecem direto do cliente Supabase
  (browser ou servidor); regras de negócio que não cabem em RLS/Postgres
  (cálculos, orquestração de múltiplas tabelas, chamadas a serviços externos)
  viram Server Actions ou Route Handlers dentro de `apps/web`.
- **Toda regra de autorização crítica vive no banco (RLS), não só no
  frontend** — consistente com a regra RN-TENANT-001 do documento original
  ("Não calcular valores críticos somente no frontend" e "Não esquecer
  filtro de tenant").
- **Não há hoje um pacote `apps/api` separado.** Se um domínio futuro
  precisar de processamento pesado, filas ou algo que não caiba bem em
  Postgres/Edge Functions, ele ganha seu próprio serviço então — não antes.
- Tipos do banco ficam em `packages/types`, gerados a partir do projeto
  Supabase real (`supabase gen types typescript`) assim que ele existir;
  no início da Fundação, o arquivo é escrito à mão espelhando as migrations.

## Consequências

- Menos peças móveis para operar (um único deploy na Vercel, um projeto
  Supabase) — alinhado com a recomendação do documento original de começar
  com "monólito modular" e evitar complexidade de infraestrutura prematura
  (PARTE VIII, item 54; PARTE XXI, item 96).
- O isolamento multi-tenant depende inteiramente de RLS estar correto — por
  isso toda tabela nova precisa de política de RLS + teste pgTAP antes de
  ser considerada pronta (ver `docs/seguranca/rls-e-autenticacao.md`).
- Módulos do documento original que descreviam endpoints REST customizados
  do NestJS (ex. `POST /api/v1/vehicles`) serão implementados como Server
  Actions/Route Handlers do Next.js quando essas features forem construídas,
  não como uma API RESTful separada versionada em `/api/v1`.
- Caso o produto cresça a ponto de justificar um serviço dedicado (ex. motor
  fiscal, processamento assíncrono pesado com filas — PARTE VIII, item 59),
  esta decisão é revisitada; não é definitiva para sempre, só para esta fase.

## Alternativas consideradas

- **Next.js + NestJS separado** (mais fiel ao documento original): mantém a
  API como um serviço à parte, com Supabase usado só como Postgres gerenciado.
  Rejeitada por ora por adicionar uma camada de operação e deploy extra sem
  necessidade concreta ainda nesta fase do produto.
