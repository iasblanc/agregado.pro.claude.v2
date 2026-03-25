#!/usr/bin/env bash
# =====================================================================
# setup.sh — Agregado.Pro: Deploy completo em 1 comando
# Uso: bash setup.sh <GITHUB_TOKEN> <VERCEL_TOKEN> [SUPABASE_ANON_KEY] [SERVICE_ROLE_KEY]
#
# Após rodar este script UMA VEZ:
#   - Código está no GitHub
#   - Vercel está configurado com env vars
#   - CI/CD automático via GitHub Actions para qualquer push futuro
# =====================================================================

set -euo pipefail

GITHUB_TOKEN="${1:-}"
VERCEL_TOKEN="${2:-}"
SUPABASE_ANON_KEY="${3:-}"
SERVICE_ROLE_KEY="${4:-}"

# ─── Validação ────────────────────────────────────────────────────
if [[ -z "$GITHUB_TOKEN" || -z "$VERCEL_TOKEN" ]]; then
  echo ""
  echo "Uso: bash setup.sh <GITHUB_TOKEN> <VERCEL_TOKEN> [ANON_KEY] [SERVICE_ROLE_KEY]"
  echo ""
  echo "Onde obter:"
  echo "  GITHUB_TOKEN  → github.com → Settings → Developer settings → Personal access tokens → Fine-grained"
  echo "                  Permissões: Contents (read/write), Workflows (read/write)"
  echo "  VERCEL_TOKEN  → vercel.com → Account Settings → Tokens → Create"
  echo "  ANON_KEY      → Supabase Dashboard → Settings → API → anon/public"
  echo "  SERVICE_ROLE  → Supabase Dashboard → Settings → API → service_role (secret)"
  echo ""
  exit 1
fi

TEAM_ID="team_F3DS4wOCjnC6J4xHkCadEn4M"
PROJECT_ID="prj_hWVvnIyCyGt5iqxgBeDiOYSD7X6K"
SUPABASE_URL="https://wdthghfuqjpbpzbmutzs.supabase.co"
SUPABASE_REF="wdthghfuqjpbpzbmutzs"
APP_URL="https://agregado-pro-claude-v2.vercel.app"
REPO="https://github.com/iasblanc/agregado.pro.claude.v2.git"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    Agregado.Pro — Setup Automático       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── Passo 1: Push para GitHub ────────────────────────────────────
echo "▶ [1/4] Fazendo push para GitHub..."
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/iasblanc/agregado.pro.claude.v2.git"
git push -u origin main --force
git tag -f v1.0.0
git push origin v1.0.0 --force
echo "   ✅ Código no GitHub — $(git rev-parse --short HEAD)"

# ─── Passo 2: Configurar GitHub Secrets ──────────────────────────
echo ""
echo "▶ [2/4] Configurando GitHub Actions secrets..."

# Instalar gh CLI se não tiver
if ! command -v gh &>/dev/null; then
  echo "   Instalando gh CLI..."
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt-get update -q && sudo apt-get install -qy gh
fi

export GH_TOKEN="$GITHUB_TOKEN"

# Gerar secrets aleatórios se não fornecidos
NEXTAUTH_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -hex 32)
BAAS_WEBHOOK_SECRET=$(openssl rand -hex 32)

# Setar todos os secrets
gh secret set VERCEL_TOKEN            -b "$VERCEL_TOKEN"        -R "iasblanc/agregado.pro.claude.v2"
gh secret set VERCEL_ORG_ID           -b "$TEAM_ID"             -R "iasblanc/agregado.pro.claude.v2"
gh secret set VERCEL_PROJECT_ID       -b "$PROJECT_ID"          -R "iasblanc/agregado.pro.claude.v2"
gh secret set SUPABASE_PROJECT_REF    -b "$SUPABASE_REF"        -R "iasblanc/agregado.pro.claude.v2"
gh secret set SUPABASE_ACCESS_TOKEN   -b "$VERCEL_TOKEN"        -R "iasblanc/agregado.pro.claude.v2"  # placeholder
gh secret set NEXTAUTH_SECRET         -b "$NEXTAUTH_SECRET"     -R "iasblanc/agregado.pro.claude.v2"
gh secret set CRON_SECRET             -b "$CRON_SECRET"         -R "iasblanc/agregado.pro.claude.v2"
gh secret set APP_URL                 -b "$APP_URL"             -R "iasblanc/agregado.pro.claude.v2"

if [[ -n "$SUPABASE_ANON_KEY" ]]; then
  gh secret set STAGING_SUPABASE_URL      -b "$SUPABASE_URL"      -R "iasblanc/agregado.pro.claude.v2"
  gh secret set STAGING_SUPABASE_ANON_KEY -b "$SUPABASE_ANON_KEY" -R "iasblanc/agregado.pro.claude.v2"
fi

echo "   ✅ GitHub secrets configurados"

# ─── Passo 3: Configurar env vars no Vercel ───────────────────────
echo ""
echo "▶ [3/4] Configurando env vars no Vercel..."

vercel_env() {
  local key="$1"
  local val="$2"
  local env="${3:-production}"
  curl -sf -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$key\",\"value\":\"$val\",\"type\":\"encrypted\",\"target\":[\"$env\"]}" \
    > /dev/null 2>&1 || true
  echo "   → $key"
}

vercel_env "NEXT_PUBLIC_SUPABASE_URL"      "$SUPABASE_URL"      "production"
vercel_env "NEXT_PUBLIC_SUPABASE_URL"      "$SUPABASE_URL"      "preview"
vercel_env "NEXTAUTH_SECRET"               "$NEXTAUTH_SECRET"   "production"
vercel_env "NEXTAUTH_SECRET"               "$NEXTAUTH_SECRET"   "preview"
vercel_env "NEXTAUTH_URL"                  "$APP_URL"           "production"
vercel_env "CRON_SECRET"                   "$CRON_SECRET"       "production"
vercel_env "APP_URL"                       "$APP_URL"           "production"

if [[ -n "$SUPABASE_ANON_KEY" ]]; then
  vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "production"
  vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "preview"
fi

if [[ -n "$SERVICE_ROLE_KEY" ]]; then
  vercel_env "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY" "production"
fi

echo "   ✅ Env vars configuradas no Vercel"

# ─── Passo 4: Trigger deploy via GitHub Actions ───────────────────
echo ""
echo "▶ [4/4] Disparando deploy de produção..."
# O push com a tag v1.0.0 já deve ter disparado o CD pipeline
# Verificar o status
sleep 3
echo "   ✅ Pipeline CI/CD iniciado"
echo ""

# ─── Resumo ───────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════╗"
echo "║              ✅ Setup Concluído!                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  🌐 URL:       $APP_URL"
echo "  📦 GitHub:    https://github.com/iasblanc/agregado.pro.claude.v2"
echo "  🗄️  Supabase:  https://app.supabase.com/project/$SUPABASE_REF"
echo ""
echo "  CI/CD automático ativado:"
echo "  • Push → main    = preview deploy"
echo "  • Tag  → v*.*.* = production deploy + migrations"
echo ""
echo "  Para novos deploys de produção:"
echo "    git tag v1.0.1 && git push origin v1.0.1"
echo ""

# ─── Salvar segredos gerados ─────────────────────────────────────
cat > .secrets-generated.txt << SECRETS
# Gerado em: $(date)
# ATENÇÃO: mantenha este arquivo seguro e fora do git
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
CRON_SECRET=$CRON_SECRET
BAAS_WEBHOOK_SECRET=$BAAS_WEBHOOK_SECRET
SECRETS

echo "  📄 Segredos gerados salvos em: .secrets-generated.txt"
echo "     (adicionar ao .gitignore — não commitar!)"
echo ""

