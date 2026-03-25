-- =====================================================================
-- Migration: 20260701_create_credit_cards.sql
-- Descrição: Cartão de crédito vinculado ao contrato ativo + DRE real
-- Phase: 4 — Credit Engine
-- Rollback: DROP TABLE IF EXISTS credit_limit_events, credit_cards CASCADE;
--           DROP TYPE IF EXISTS card_status, limit_recalc_reason;
-- =====================================================================

CREATE TYPE card_status AS ENUM (
  'solicitado',    -- Solicitação enviada, aguardando análise
  'em_analise',    -- Análise de score em andamento
  'aprovado',      -- Aprovado, cartão em emissão
  'ativo',         -- Cartão ativo e operacional
  'bloqueado',     -- Bloqueado temporariamente (fraude, solicitação)
  'cancelado',     -- Cancelado permanentemente
  'sem_contrato'   -- Suspenso por falta de contrato ativo
);

CREATE TYPE limit_recalc_reason AS ENUM (
  'emissao_inicial',       -- Primeiro cálculo ao emitir o cartão
  'novo_contrato',         -- Contrato novo fechado → recalcular
  'dre_atualizado',        -- DRE do período atualizado
  'score_atualizado',      -- Score proprietário recalculado
  'reducao_manual',        -- Admin reduziu limite por política
  'aumento_solicitado',    -- Caminhoneiro solicitou revisão
  'contrato_encerrado'     -- Contrato ativo encerrou → revisar
);

-- ─── Cartão de crédito ────────────────────────────────────────────

CREATE TABLE credit_cards (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id          UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Vínculo ao contrato ativo (obrigatório no Phase 4)
  -- Regra crítica: limite calculado sobre DRE real do contrato ativo
  active_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  candidature_id     UUID REFERENCES candidatures(id) ON DELETE SET NULL,

  -- Status
  status            card_status NOT NULL DEFAULT 'solicitado',

  -- Limite dinâmico
  limite_total      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (limite_total >= 0),
  limite_disponivel NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (limite_disponivel >= 0),
  limite_utilizado  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (limite_utilizado >= 0),

  -- Score no momento da aprovação (snapshot)
  score_aprovacao   INTEGER,
  score_tier_aprovacao TEXT,

  -- DRE de referência para o limite
  dre_periodo_referencia TEXT,          -- YYYY-MM
  dre_resultado_ref      NUMERIC(12,2), -- Resultado operacional usado no cálculo
  dre_margem_ref         NUMERIC(5,4),  -- Margem usada

  -- Dados do cartão (vindos do BaaS)
  external_card_id  TEXT,   -- ID no BaaS
  card_last4        TEXT,
  card_expiry       TEXT,   -- MM/AA
  card_network      TEXT DEFAULT 'Visa', -- Visa | Mastercard

  -- Pagamento (consignado empresarial)
  -- Débito automático sobre recebíveis do contrato ativo
  payment_method    TEXT NOT NULL DEFAULT 'retencao_recebivel',
  vencimento_dia    INTEGER DEFAULT 10 CHECK (vencimento_dia BETWEEN 1 AND 28),

  -- Datas
  solicitado_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_at       TIMESTAMPTZ,
  ativado_at        TIMESTAMPTZ,
  proximo_vencimento DATE,

  -- Metadados
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um cartão ativo por usuário
  CONSTRAINT credit_cards_active_unique UNIQUE (owner_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_credit_cards_owner_id         ON credit_cards(owner_id);
CREATE INDEX idx_credit_cards_status           ON credit_cards(status);
CREATE INDEX idx_credit_cards_active_contract  ON credit_cards(active_contract_id);

CREATE TRIGGER credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Eventos de recálculo de limite ──────────────────────────────

CREATE TABLE credit_limit_events (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id          UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  owner_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Mudança de limite
  limite_anterior  NUMERIC(12,2) NOT NULL,
  limite_novo      NUMERIC(12,2) NOT NULL,
  variacao         NUMERIC(12,2) GENERATED ALWAYS AS (limite_novo - limite_anterior) STORED,

  -- Motivo
  reason           limit_recalc_reason NOT NULL,
  reason_detail    TEXT,

  -- Contexto do DRE no momento
  dre_resultado    NUMERIC(12,2),
  dre_margem       NUMERIC(5,4),
  score_atual      INTEGER,

  -- Imutável
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_limit_events_card_id    ON credit_limit_events(card_id);
CREATE INDEX idx_limit_events_owner_id   ON credit_limit_events(owner_id);
CREATE INDEX idx_limit_events_created_at ON credit_limit_events(created_at DESC);

ALTER TABLE credit_limit_events ENABLE ROW LEVEL SECURITY;

-- Só o dono e admin leem
CREATE POLICY "limit_events_select"
  ON credit_limit_events FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'credit_analyst'))
  );

-- Insert apenas via service_role
CREATE POLICY "limit_events_insert"
  ON credit_limit_events FOR INSERT
  WITH CHECK (current_user = 'service_role');

REVOKE UPDATE ON credit_limit_events FROM PUBLIC;
REVOKE DELETE ON credit_limit_events FROM PUBLIC;

-- ─── RLS credit_cards ─────────────────────────────────────────────

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_cards_select"
  ON credit_cards FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'credit_analyst'))
  );

CREATE POLICY "credit_cards_insert"
  ON credit_cards FOR INSERT
  WITH CHECK (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR current_user = 'service_role'
  );

CREATE POLICY "credit_cards_update"
  ON credit_cards FOR UPDATE
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR current_user = 'service_role'
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

-- ─── Trigger: suspender cartão ao encerrar contrato ───────────────

CREATE OR REPLACE FUNCTION suspend_card_on_contract_end()
RETURNS TRIGGER AS $$
BEGIN
  -- Se contrato passou para encerrado/cancelado, suspender cartão vinculado
  IF NEW.status IN ('encerrado', 'cancelado') AND OLD.status NOT IN ('encerrado', 'cancelado') THEN
    UPDATE credit_cards
    SET status = 'sem_contrato'
    WHERE active_contract_id = NEW.id
      AND status = 'ativo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contract_end_suspend_card
  AFTER UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION suspend_card_on_contract_end();

COMMENT ON TABLE credit_cards IS
  'Cartão de crédito vinculado ao contrato ativo — limite calculado sobre DRE real, nunca declaratório.';
COMMENT ON COLUMN credit_cards.active_contract_id IS
  'Contrato ativo obrigatório. Cartão suspenso automaticamente ao encerrar o contrato.';
COMMENT ON COLUMN credit_cards.limite_total IS
  'Limite calculado pelo limit-calculator.ts com base no DRE real × multiplicador do score.';
COMMENT ON TABLE credit_limit_events IS
  'Log imutável de mudanças de limite — auditabilidade total. Sem UPDATE/DELETE.';
