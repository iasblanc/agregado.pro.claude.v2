# Agregado.Pro

> Sistema Operacional e Infraestrutura Financeira do Caminhoneiro Agregado

[![CI](https://github.com/iasblanc/agregado.pro.claude.v2/actions/workflows/ci.yml/badge.svg)](https://github.com/iasblanc/agregado.pro.claude.v2/actions/workflows/ci.yml)

---

## O produto

Agregado.Pro é uma **infraestrutura financeira verticalizada** para o caminhoneiro agregado no Brasil — onde o banco, o sistema de gestão e o marketplace são um produto único e indissociável.

```
Gestão (DRE) + Marketplace + Banco Digital + Score + Crédito + Benefícios
```

**Pergunta que o produto responde:**
> "Meu caminhão está dando lucro ou prejuízo?"

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript strict |
| Backend | Route Handlers + Supabase Edge Functions |
| Banco | Supabase (PostgreSQL) com RLS em todas as tabelas |
| Auth | Supabase Auth |
| IA | Anthropic Claude Haiku (classificação de despesas) |
| Deploy | Vercel + Supabase |
| Design | AllYouCan DS — Playfair Display + DM Sans |

---

## Setup local

### 1. Pré-requisitos

```bash
node >= 20
pnpm >= 9
supabase CLI
```

### 2. Clonar e instalar

```bash
git clone https://github.com/iasblanc/agregado.pro.claude.v2.git
cd agregado.pro.claude.v2
pnpm install
```

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
# Preencher com os valores do Supabase Dashboard
```

### 4. Banco de dados

```bash
# Linkar com o projeto Supabase
supabase link --project-ref wdthghfuqjpbpzbmutzs

# Aplicar todas as migrations
supabase db push

# Rodar seed de desenvolvimento
supabase db reset --db-url postgresql://postgres:SUA_SENHA@db.wdthghfuqjpbpzbmutzs.supabase.co:5432/postgres

# Gerar types TypeScript
pnpm db:types
```

### 5. Rodar em desenvolvimento

```bash
pnpm dev
# → http://localhost:3000
```

---

## Testes

```bash
# Unitários + integração
pnpm test

# Com coverage (mínimo 80%)
pnpm test:coverage

# E2E (Playwright)
pnpm test:e2e

# Typecheck
pnpm typecheck
```

---

## Deploy

### Staging (automático)
Push para `develop` → preview deploy no Vercel

### Produção (manual — checkpoint)

```bash
# 1. Merge develop → main
git checkout main && git merge develop

# 2. Tag de versão
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions executa:
# → Migrations no Supabase
# → Build e deploy no Vercel (produção)
# → GitHub Release criado automaticamente
```

---

## Estrutura de branches

```
main      ← produção estável — apenas via PR + tag
develop   ← integração de features
feature/* ← desenvolvimento isolado
```

---

## Faseamento

| Phase | Escopo | Status |
|---|---|---|
| 1 | DRE + Gestão + Auth | ✅ |
| 2 | Marketplace + BaaS + IA | ✅ |
| 3 | Score Proprietário + Open Finance | ✅ |
| 4 | Cartão de Crédito + Antecipação | ✅ |
| 5 | Clube de Benefícios + Banco Próprio | ✅ |

---

## Segurança

- RLS em todas as 14 tabelas do banco
- Audit log imutável (`REVOKE UPDATE/DELETE`)
- Rate limiting no login (5 tentativas / 15 min)
- Validação HMAC-SHA256 no webhook BaaS
- `server-only` em todos os services sensíveis
- Dados sensíveis do marketplace protegidos até fechamento bilateral
- Nunca coleta de senha bancária (Open Finance)

---

## Configuração de secrets

Ver [GITHUB_SECRETS.md](./GITHUB_SECRETS.md) para o guia completo de setup.

---

## Documentação

- [CLAUDE.md](./.claude/CLAUDE.md) — Fonte primária de contexto do projeto
- [CHANGELOG.md](./CHANGELOG.md) — Histórico de checkpoints
- [GITHUB_SECRETS.md](./GITHUB_SECRETS.md) — Setup de secrets e deploy

---

*Agregado.Pro v1.0.0 — Agosto 2026*

<!-- Last deploy: 2026-03-27 14:05 UTC -->
