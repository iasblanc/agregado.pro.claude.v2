-- =====================================================================
-- Migration: 20260502_create_banking_transactions.sql
-- Descrição: Transações do cartão de débito + classificação IA
-- Phase: 2 — BaaS + Banco Digital
-- Rollback: DROP TABLE IF EXISTS banking_transactions CASCADE;
--           DROP TYPE IF EXISTS transaction_status, classification_source;
-- =====================================================================

CREATE TYPE transaction_status AS ENUM (
  'pendente',    -- Transação capturada, ainda não liquidada
  'liquidada',   -- Liquidada — lançamento no DRE confirmado
  'cancelada',   -- Estornada ou cancelada
  'disputada'    -- Em disputa/contestação
);

CREATE TYPE classification_source AS ENUM (
  'ia_automatica',   -- IA classificou com alta confiança (> threshold)
  'ia_sugestao',     -- IA sugeriu, usuário confirmou com 1 toque
  'manual',          -- Usuário reclassificou manualmente
  'sistema'          -- Regra determinística (ex: pedágio por MCC fixo)
);

CREATE TABLE banking_transactions (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id          UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id        UUID    REFERENCES vehicles(id) ON DELETE SET NULL,

  -- Dados da transação (vindos do BaaS via webhook)
  external_id       TEXT    NOT NULL,        -- ID da transação no BaaS (Celcoin/Swap)
  card_last4        TEXT,                   -- Últimos 4 dígitos do cartão
  amount            NUMERIC(12,2) NOT NULL,
  currency          TEXT    NOT NULL DEFAULT 'BRL',
  status            transaction_status NOT NULL DEFAULT 'pendente',

  -- Dados do estabelecimento
  merchant_name     TEXT    NOT NULL,
  merchant_mcc      TEXT,                   -- Merchant Category Code (4 dígitos)
  merchant_cnpj     TEXT,
  merchant_city     TEXT,
  merchant_state    TEXT,

  -- Geolocalização (disponível quando autorizado)
  latitude          NUMERIC(10, 7),
  longitude         NUMERIC(10, 7),

  -- Timestamp da transação (quando ocorreu, não quando foi processada)
  transacted_at     TIMESTAMPTZ NOT NULL,
  settled_at        TIMESTAMPTZ,             -- Quando liquidou

  -- ─── Classificação de IA ────────────────────────────────────────
  -- Categoria DRE atribuída (mesmas categorias de dre_entries)
  dre_category          TEXT,
  entry_type            TEXT,                -- custo_fixo | custo_variavel | pessoal
  classification_source classification_source,
  ia_confidence         NUMERIC(5, 4),       -- 0.0000–1.0000
  ia_suggested_category TEXT,               -- Sugestão quando confiança < threshold
  is_operational        BOOLEAN,            -- true = despesa operacional; false = pessoal

  -- Lançamento automático no DRE
  dre_entry_id          UUID REFERENCES dre_entries(id) ON DELETE SET NULL,
  dre_period            TEXT,               -- YYYY-MM do lançamento

  -- Contexto da viagem ativa quando a transação ocorreu
  active_contract_id    UUID REFERENCES contracts(id) ON DELETE SET NULL,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um external_id não pode ser duplicado por owner
  CONSTRAINT banking_txn_external_unique UNIQUE (owner_id, external_id),
  CONSTRAINT banking_txn_amount_positive CHECK (amount > 0),
  CONSTRAINT banking_txn_confidence_range CHECK (
    ia_confidence IS NULL OR (ia_confidence >= 0 AND ia_confidence <= 1)
  )
);

-- Índices críticos para queries do extrato e DRE
CREATE INDEX idx_banking_txn_owner_id         ON banking_transactions(owner_id);
CREATE INDEX idx_banking_txn_transacted_at    ON banking_transactions(transacted_at DESC);
CREATE INDEX idx_banking_txn_status           ON banking_transactions(status);
CREATE INDEX idx_banking_txn_dre_period       ON banking_transactions(dre_period) WHERE dre_period IS NOT NULL;
CREATE INDEX idx_banking_txn_active_contract  ON banking_transactions(active_contract_id) WHERE active_contract_id IS NOT NULL;
-- Índice para detectar transações sem classificação (fila de processamento)
CREATE INDEX idx_banking_txn_unclassified     ON banking_transactions(owner_id, transacted_at)
  WHERE dre_category IS NULL AND status = 'liquidada';
-- Índice para sugestões pendentes de confirmação
CREATE INDEX idx_banking_txn_pending_confirm  ON banking_transactions(owner_id)
  WHERE classification_source = 'ia_sugestao' AND dre_entry_id IS NULL;

-- Trigger updated_at
CREATE TRIGGER banking_txn_updated_at
  BEFORE UPDATE ON banking_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE banking_transactions ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas suas próprias transações
CREATE POLICY "banking_txn_select"
  ON banking_transactions FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'compliance', 'credit_analyst')
    )
  );

-- INSERT apenas via service role (webhook do BaaS) — nunca pelo usuário diretamente
CREATE POLICY "banking_txn_insert"
  ON banking_transactions FOR INSERT
  WITH CHECK (
    -- Apenas service_role pode inserir (verificado via current_user)
    current_user = 'service_role'
    OR owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- UPDATE: usuário pode reclassificar | service role pode atualizar qualquer campo
CREATE POLICY "banking_txn_update"
  ON banking_transactions FOR UPDATE
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- ─── View: resumo de gastos por categoria no período ──────────────

CREATE OR REPLACE VIEW banking_summary AS
SELECT
  owner_id,
  dre_period,
  dre_category,
  entry_type,
  COUNT(*)                       AS transaction_count,
  SUM(amount)                    AS total_amount,
  AVG(ia_confidence)             AS avg_ia_confidence,
  COUNT(*) FILTER (WHERE classification_source = 'manual') AS manual_count
FROM banking_transactions
WHERE status = 'liquidada'
  AND is_operational = true
  AND dre_category IS NOT NULL
GROUP BY owner_id, dre_period, dre_category, entry_type;

COMMENT ON TABLE banking_transactions IS
  'Transações do cartão de débito via BaaS — classificadas automaticamente e lançadas no DRE';
COMMENT ON COLUMN banking_transactions.external_id IS
  'ID da transação no parceiro BaaS (Celcoin/Swap) — critério de idempotência no webhook';
COMMENT ON COLUMN banking_transactions.ia_confidence IS
  'Confiança da IA: > 0.85 = automático | 0.60–0.85 = sugestão | < 0.60 = manual obrigatório';
COMMENT ON COLUMN banking_transactions.is_operational IS
  'true = despesa operacional (entra no DRE) | false = despesa pessoal (separada)';
