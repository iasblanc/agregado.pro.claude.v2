-- =====================================================================
-- Migration: 20260601_create_financial_infrastructure.sql
-- Descrição: Histórico financeiro consolidado + Open Finance + Recebíveis
-- Phase: 3 — Financial Data Infrastructure
-- Rollback: DROP TABLE IF EXISTS receivables, open_finance_connections,
--                                financial_snapshots CASCADE;
-- =====================================================================

-- ─── Snapshot financeiro mensal consolidado ───────────────────────
-- Uma linha por usuário por mês — consolidação do DRE + cartão

CREATE TABLE financial_snapshots (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period            TEXT NOT NULL,   -- YYYY-MM

  -- DRE consolidado do período
  receita_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_fixo_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_var_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
  resultado_op      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Resultado operacional
  margem_op         NUMERIC(5,4),                      -- 0–1
  custo_km          NUMERIC(8,2),
  km_total          NUMERIC(10,1),

  -- Dados do cartão (Phase 2)
  total_card_spend  NUMERIC(12,2) NOT NULL DEFAULT 0,
  card_txn_count    INTEGER       NOT NULL DEFAULT 0,

  -- Contratos ativos no período
  contracts_active  INTEGER       NOT NULL DEFAULT 0,

  -- Flags de qualidade dos dados
  has_dre_data      BOOLEAN NOT NULL DEFAULT false,
  has_card_data     BOOLEAN NOT NULL DEFAULT false,
  is_positive       BOOLEAN GENERATED ALWAYS AS (resultado_op > 0) STORED,

  -- Score no fim do período (snapshot)
  score_at_period   INTEGER,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fin_snapshot_unique UNIQUE (owner_id, period),
  CONSTRAINT fin_snapshot_period_format CHECK (period ~ '^\d{4}-\d{2}$')
);

CREATE INDEX idx_fin_snapshots_owner_period ON financial_snapshots(owner_id, period DESC);
CREATE INDEX idx_fin_snapshots_is_positive  ON financial_snapshots(owner_id, is_positive);

CREATE TRIGGER fin_snapshots_updated_at
  BEFORE UPDATE ON financial_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_snapshots_select"
  ON financial_snapshots FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'credit_analyst', 'compliance')
    )
  );

CREATE POLICY "fin_snapshots_insert"
  ON financial_snapshots FOR INSERT
  WITH CHECK (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR current_user = 'service_role'
  );

CREATE POLICY "fin_snapshots_update"
  ON financial_snapshots FOR UPDATE
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR current_user = 'service_role'
  );

-- ─── Open Finance connections ─────────────────────────────────────
-- Conexões com outros bancos via Open Finance (nunca coletamos senhas)

CREATE TABLE open_finance_connections (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Instituição bancária
  institution_id  TEXT NOT NULL,    -- Código BCB da instituição
  institution_name TEXT NOT NULL,
  institution_logo TEXT,

  -- Consentimento (Open Finance exige validade explícita)
  consent_id      TEXT NOT NULL,    -- ID do consentimento no Open Finance
  consent_expires_at TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,

  -- Dados agregados (não armazenamos dados brutos — apenas análises)
  last_sync_at    TIMESTAMPTZ,
  sync_status     TEXT DEFAULT 'pending',   -- pending | synced | error | expired

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT of_connection_unique UNIQUE (owner_id, institution_id, consent_id)
);

CREATE INDEX idx_of_connections_owner_id  ON open_finance_connections(owner_id);
CREATE INDEX idx_of_connections_is_active ON open_finance_connections(owner_id, is_active);

CREATE TRIGGER of_connections_updated_at
  BEFORE UPDATE ON open_finance_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE open_finance_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "of_connections_select"
  ON open_finance_connections FOR SELECT
  USING (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "of_connections_insert"
  ON open_finance_connections FOR INSERT
  WITH CHECK (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "of_connections_update"
  ON open_finance_connections FOR UPDATE
  USING (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ─── Recebíveis de contratos ──────────────────────────────────────
-- Base para antecipação de recebíveis (Phase 4)

CREATE TABLE receivables (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
  candidature_id  UUID REFERENCES candidatures(id) ON DELETE SET NULL,

  -- Valor e status
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pendente',   -- pendente | pago | antecipado | inadimplente

  -- Dados da contraparte (transportadora)
  payer_id        UUID REFERENCES profiles(id),
  payer_name      TEXT,

  -- Antecipação (Phase 4)
  is_anticipated  BOOLEAN NOT NULL DEFAULT false,
  anticipation_fee NUMERIC(5,4),  -- Taxa da antecipação (ex: 0.025 = 2.5%)
  anticipated_amount NUMERIC(12,2),
  anticipated_at  TIMESTAMPTZ,

  -- Timestamps
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receivables_owner_id  ON receivables(owner_id);
CREATE INDEX idx_receivables_due_date  ON receivables(due_date);
CREATE INDEX idx_receivables_status    ON receivables(owner_id, status);

CREATE TRIGGER receivables_updated_at
  BEFORE UPDATE ON receivables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receivables_select"
  ON receivables FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR payer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'credit_analyst')
    )
  );

CREATE POLICY "receivables_insert"
  ON receivables FOR INSERT
  WITH CHECK (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR current_user = 'service_role'
  );

COMMENT ON TABLE financial_snapshots IS
  'Snapshot mensal consolidado — DRE + cartão + contratos. Base para o score proprietário.';
COMMENT ON TABLE open_finance_connections IS
  'Conexões com outras instituições via Open Finance. NUNCA armazenamos credenciais bancárias.';
COMMENT ON TABLE receivables IS
  'Recebíveis de contratos — base para antecipação (Phase 4) e histórico de pagamentos.';
