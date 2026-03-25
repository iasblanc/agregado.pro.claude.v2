# Changelog — Agregado.Pro

> Registro de checkpoints. Cada versão = code + database + env + deploy estáveis.

---

## v1.0.0 — 🚀 Public Launch

**Data:** 2026-08-01 | **Status:** ✅ Pronto para produção

### Números do produto

| Métrica | Valor |
|---|---|
| Arquivos em src/ | 94 |
| Migrations SQL | 14 |
| Testes unitários | 205 |
| Serviços server-only | 14 |
| Componentes UI | 23 |
| Páginas | 20 |

### Stack

Next.js 14 · Supabase · Vercel · Claude Haiku (IA) · AllYouCan DS

### Migrations (ordem de aplicação)

```
20260401_create_profiles.sql
20260401_add_profiles_rls.sql
20260402_create_vehicles.sql
20260403_create_dre_entries.sql
20260403_create_audit_events.sql
20260501_create_contracts.sql
20260501_create_candidatures.sql
20260502_create_banking_transactions.sql
20260601_create_credit_scores.sql
20260601_create_financial_infrastructure.sql
20260701_create_credit_cards.sql
20260701_create_credit_transactions.sql
20260801_create_loyalty_program.sql
20260801_create_partners_and_bank_transition.sql
```

### Variáveis de ambiente necessárias

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_URL
NEXTAUTH_SECRET
ANTHROPIC_API_KEY
BAAS_API_URL + BAAS_API_KEY + BAAS_WEBHOOK_SECRET
CRON_SECRET
APP_URL
```

**Rollback:** `git checkout v0.7.0`

---

## v0.7.0 — Phase 4: Credit Engine

Phase 4 completa — cartão de crédito, limite dinâmico, antecipação de recebíveis.

**Migrations:** `20260701_create_credit_cards.sql`, `20260701_create_credit_transactions.sql`

---

## v0.6.0 — Phase 3: Score Proprietário

Score 300–1000 com 6 drivers sobre DRE real. Open Finance. Snapshots mensais.

**Migrations:** `20260601_create_credit_scores.sql`, `20260601_create_financial_infrastructure.sql`

---

## v0.5.0 — Phase 2: BaaS + IA

Webhook BaaS com HMAC. IA de classificação MCC → Claude Haiku. Alerta de margem realtime.

**Migrations:** `20260502_create_banking_transactions.sql`

---

## v0.4.0 — Phase 2: Marketplace

Contratos com viabilidade por custo/km real. Fechamento bilateral. Avaliações imutáveis.

**Migrations:** `20260501_create_contracts.sql`, `20260501_create_candidatures.sql`

---

## v0.3.0 — Phase 1: DRE Core

DRE completo + custo/km + veículos + formulário de lançamento.

**Migrations:** `20260402_create_vehicles.sql`, `20260403_create_dre_entries.sql`, `20260403_create_audit_events.sql`

---

## v0.2.0 — Auth

Login + cadastro + RLS base + roles + rate limiting.

**Migrations:** `20260401_create_profiles.sql`, `20260401_add_profiles_rls.sql`

---

## v0.1.0 — Foundation

Next.js + Supabase + Design System AllYouCan + CLAUDE.md

---

*Agregado.Pro v1.0.0 — Agosto 2026*
