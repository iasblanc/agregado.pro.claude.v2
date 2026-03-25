# GitHub Secrets — Setup Guide

Configure em: **Settings → Secrets and variables → Actions → New repository secret**

## Secrets obrigatórios

| Secret | Descrição | Como obter |
|---|---|---|
| `VERCEL_TOKEN` | Token de API do Vercel | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | ID da organização no Vercel | `vercel env ls` ou dashboard |
| `VERCEL_PROJECT_ID` | ID do projeto Vercel | `prj_hWVvn...` — já disponível |
| `SUPABASE_PROJECT_REF` | Ref do projeto Supabase | `wdthghfuqjpbpzbmutzs` |
| `SUPABASE_ACCESS_TOKEN` | Token de acesso CLI | supabase.com → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | Senha do banco | **ROTACIONAR após vazamento** |
| `NEXTAUTH_SECRET` | Segredo JWT | `openssl rand -base64 32` |
| `CRON_SECRET` | Auth dos cron jobs | `openssl rand -hex 32` |
| `APP_URL` | URL da aplicação em produção | `https://agregado-pro.vercel.app` |

## Secrets por ambiente

### Ambiente: `staging`
| Secret | Valor |
|---|---|
| `STAGING_SUPABASE_URL` | URL do projeto Supabase staging |
| `STAGING_SUPABASE_ANON_KEY` | Anon key do staging |

### Ambiente: `production`
| Secret | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wdthghfuqjpbpzbmutzs.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de produção |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (nunca expor publicamente) |

## Vercel Environment Variables

Configure também no Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL        → Production + Preview
NEXT_PUBLIC_SUPABASE_ANON_KEY   → Production + Preview
SUPABASE_SERVICE_ROLE_KEY       → Production only (Server-side)
NEXTAUTH_URL                    → Production: https://seu-dominio.com
NEXTAUTH_SECRET                 → Production + Preview
ANTHROPIC_API_KEY               → Production + Preview
BAAS_WEBHOOK_SECRET             → Production only
CRON_SECRET                     → Production only
```

## Supabase CLI — Setup local

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Linkar com o projeto
supabase link --project-ref wdthghfuqjpbpzbmutzs

# Aplicar migrations localmente primeiro
supabase db push

# Gerar types após migrations
npx supabase gen types typescript --linked > src/types/database.types.ts
```

## ⚠️ Segurança

- **ROTACIONAR** qualquer senha/token que tenha sido exposto em chat/logs
- `.env.local` no `.gitignore` — nunca commitar
- `settings.local.json` (Claude Code) no `.gitignore`
- Service Role Key NUNCA no frontend ou em variáveis `NEXT_PUBLIC_`
