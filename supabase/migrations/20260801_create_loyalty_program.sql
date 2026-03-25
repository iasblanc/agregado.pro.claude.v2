-- =====================================================================
-- Migration: 20260801_create_loyalty_program.sql
-- Descrição: Clube de benefícios e fidelidade — pontos, tiers, resgates
-- Phase: 5 — Ecosystem Expansion
-- Rollback: DROP TABLE IF EXISTS loyalty_redemptions, loyalty_events,
--                                loyalty_accounts CASCADE;
--           DROP TYPE IF EXISTS loyalty_tier, loyalty_event_type;
-- =====================================================================

-- Tiers do clube (espelham o flywheel econômico do master.md)
CREATE TYPE loyalty_tier AS ENUM (
  'bronze',    -- Entrada — primeiros 3 meses
  'prata',     -- Operação regular — 6+ meses positivos
  'ouro',      -- Operação saudável — 12+ meses, score bom+
  'platina'    -- Top performers — score muito_bom+, contratos recorrentes
);

-- Tipos de eventos que geram pontos
CREATE TYPE loyalty_event_type AS ENUM (
  'lancamento_dre',        -- Lançamento manual no DRE
  'transacao_cartao',      -- Uso do cartão de débito
  'contrato_fechado',      -- Contrato fechado no marketplace
  'avaliacao_positiva',    -- Avaliação 4+ estrelas recebida
  'score_melhorado',       -- Score subiu de tier
  'meta_km_mensal',        -- Atingiu meta de km no mês
  'pagamento_pontual',     -- Fatura do cartão paga no vencimento
  'indicacao',             -- Indicou novo usuário ativo
  'aniversario_plataforma' -- Aniversário de uso da plataforma
);

-- ─── Conta de fidelidade ──────────────────────────────────────────

CREATE TABLE loyalty_accounts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Tier atual
  tier             loyalty_tier NOT NULL DEFAULT 'bronze',
  tier_updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Pontos
  points_total     INTEGER NOT NULL DEFAULT 0 CHECK (points_total >= 0),
  points_available INTEGER NOT NULL DEFAULT 0 CHECK (points_available >= 0),
  points_used      INTEGER NOT NULL DEFAULT 0 CHECK (points_used >= 0),
  points_expired   INTEGER NOT NULL DEFAULT 0 CHECK (points_expired >= 0),

  -- Métricas acumuladas (para cálculo de tier)
  months_active         INTEGER NOT NULL DEFAULT 0,
  months_positive       INTEGER NOT NULL DEFAULT 0,  -- Meses com resultado positivo
  contracts_closed      INTEGER NOT NULL DEFAULT 0,
  km_total_accumulated  NUMERIC(12,1) NOT NULL DEFAULT 0,
  avg_score_last_6m     INTEGER,
  total_card_spend      NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Datas
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_tier_review TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT loyalty_accounts_owner_unique UNIQUE (owner_id)
);

CREATE INDEX idx_loyalty_accounts_owner_id ON loyalty_accounts(owner_id);
CREATE INDEX idx_loyalty_accounts_tier     ON loyalty_accounts(tier);

CREATE TRIGGER loyalty_accounts_updated_at
  BEFORE UPDATE ON loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Eventos de pontuação (imutável) ─────────────────────────────

CREATE TABLE loyalty_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  event_type      loyalty_event_type NOT NULL,
  points_earned   INTEGER NOT NULL CHECK (points_earned >= 0),

  -- Contexto do evento
  reference_id    UUID,     -- ID do recurso relacionado (contrato, transação, etc.)
  reference_type  TEXT,     -- Tipo do recurso
  description     TEXT,

  -- Expiração dos pontos (12 meses por padrão)
  expires_at      TIMESTAMPTZ DEFAULT (now() + INTERVAL '12 months'),
  is_expired      BOOLEAN NOT NULL DEFAULT false,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_events_account_id  ON loyalty_events(account_id);
CREATE INDEX idx_loyalty_events_owner_id    ON loyalty_events(owner_id);
CREATE INDEX idx_loyalty_events_created_at  ON loyalty_events(created_at DESC);
CREATE INDEX idx_loyalty_events_expires_at  ON loyalty_events(expires_at) WHERE is_expired = false;

-- Imutável após criação
REVOKE UPDATE ON loyalty_events FROM PUBLIC;
REVOKE DELETE ON loyalty_events FROM PUBLIC;

-- ─── Resgates de benefícios ───────────────────────────────────────

CREATE TABLE loyalty_redemptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  benefit_id      TEXT NOT NULL,    -- ID do benefício (enum definido na aplicação)
  benefit_name    TEXT NOT NULL,
  points_cost     INTEGER NOT NULL CHECK (points_cost > 0),

  -- Status do resgate
  status          TEXT NOT NULL DEFAULT 'pendente',  -- pendente | aprovado | utilizado | expirado
  code            TEXT,             -- Código de resgate gerado (para parceiros)
  expires_at      TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),

  -- Impacto financeiro (para relatório)
  discount_value  NUMERIC(12,2),
  partner_id      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_redemptions_account_id ON loyalty_redemptions(account_id);
CREATE INDEX idx_redemptions_status     ON loyalty_redemptions(status);

CREATE TRIGGER redemptions_updated_at
  BEFORE UPDATE ON loyalty_redemptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────

ALTER TABLE loyalty_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- loyalty_accounts
CREATE POLICY "loyalty_accounts_select"
  ON loyalty_accounts FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'compliance'))
  );

CREATE POLICY "loyalty_accounts_insert"
  ON loyalty_accounts FOR INSERT
  WITH CHECK (current_user = 'service_role');

CREATE POLICY "loyalty_accounts_update"
  ON loyalty_accounts FOR UPDATE
  USING (current_user = 'service_role'
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- loyalty_events
ALTER TABLE loyalty_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_events_select"
  ON loyalty_events FOR SELECT
  USING (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'compliance')));

CREATE POLICY "loyalty_events_insert"
  ON loyalty_events FOR INSERT
  WITH CHECK (current_user = 'service_role');

-- loyalty_redemptions
CREATE POLICY "redemptions_select"
  ON loyalty_redemptions FOR SELECT
  USING (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "redemptions_insert"
  ON loyalty_redemptions FOR INSERT
  WITH CHECK (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "redemptions_update"
  ON loyalty_redemptions FOR UPDATE
  USING (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR current_user = 'service_role');

-- ─── View: resumo da conta de fidelidade ─────────────────────────

CREATE OR REPLACE VIEW loyalty_summary AS
SELECT
  la.*,
  p.full_name,
  p.email,
  (SELECT COUNT(*) FROM loyalty_events le WHERE le.account_id = la.id AND le.is_expired = false) AS active_events_count,
  (SELECT COUNT(*) FROM loyalty_redemptions lr WHERE lr.account_id = la.id AND lr.status = 'aprovado') AS pending_redemptions
FROM loyalty_accounts la
JOIN profiles p ON p.id = la.owner_id;

COMMENT ON TABLE loyalty_accounts IS 'Conta de fidelidade — pontos, tier e métricas acumuladas do caminhoneiro';
COMMENT ON TABLE loyalty_events   IS 'Eventos que geram pontos — imutável. Pontos expiram em 12 meses.';
COMMENT ON TABLE loyalty_redemptions IS 'Resgates de benefícios com código de uso para parceiros';
