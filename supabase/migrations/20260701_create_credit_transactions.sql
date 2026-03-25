-- =====================================================================
-- Migration: 20260701_create_credit_transactions.sql
-- Descrição: Transações do cartão de crédito + antecipação de recebíveis
-- Phase: 4 — Credit Engine
-- Rollback: DROP TABLE IF EXISTS anticipations, credit_transactions CASCADE;
-- =====================================================================

-- ─── Transações do cartão de crédito ─────────────────────────────

CREATE TABLE credit_transactions (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id           UUID    NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  owner_id          UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Dados da transação
  external_id       TEXT,             -- ID no BaaS
  amount            NUMERIC(12,2)    NOT NULL CHECK (amount > 0),
  status            TEXT NOT NULL DEFAULT 'pendente',   -- pendente | liquidada | cancelada | disputada

  -- Estabelecimento
  merchant_name     TEXT NOT NULL,
  merchant_mcc      TEXT,
  dre_category      TEXT,             -- Classificação pela IA (mesma do débito)
  is_operational    BOOLEAN NOT NULL DEFAULT true,

  -- Parcelas
  installments      INTEGER NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 12),
  installment_current INTEGER,

  -- Fatura
  billing_period    TEXT,             -- YYYY-MM da fatura
  due_date          DATE,

  -- Impacto no limite
  limite_impactado  NUMERIC(12,2),    -- Quanto do limite foi utilizado

  transacted_at     TIMESTAMPTZ NOT NULL,
  settled_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT credit_txn_external_unique UNIQUE (card_id, external_id)
);

CREATE INDEX idx_credit_txn_card_id      ON credit_transactions(card_id);
CREATE INDEX idx_credit_txn_owner_id     ON credit_transactions(owner_id);
CREATE INDEX idx_credit_txn_billing      ON credit_transactions(billing_period);
CREATE INDEX idx_credit_txn_transacted   ON credit_transactions(transacted_at DESC);

CREATE TRIGGER credit_txn_updated_at
  BEFORE UPDATE ON credit_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_txn_select"
  ON credit_transactions FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'credit_analyst'))
  );

-- ─── Antecipação de recebíveis ────────────────────────────────────

CREATE TABLE anticipations (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id          UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Recebíveis antecipados (pode ser múltiplos)
  receivable_ids    UUID[]  NOT NULL,
  total_receivable  NUMERIC(12,2) NOT NULL CHECK (total_receivable > 0),

  -- Taxas e valores
  fee_rate          NUMERIC(5,4) NOT NULL,    -- Ex: 0.025 = 2.5% ao mês
  fee_amount        NUMERIC(12,2) NOT NULL,   -- Valor cobrado pela antecipação
  net_amount        NUMERIC(12,2) NOT NULL,   -- Valor líquido recebido
  days_anticipated  INTEGER NOT NULL,         -- Dias antecipados

  -- Status
  status            TEXT NOT NULL DEFAULT 'solicitada', -- solicitada | aprovada | liquidada | cancelada

  -- Contexto (para transparência)
  dre_margem_current NUMERIC(5,4),  -- Margem no momento da solicitação
  score_current      INTEGER,        -- Score no momento

  -- Motivo da solicitação (livre, para análise de padrão)
  reason            TEXT,

  -- Timestamps
  solicitada_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovada_at       TIMESTAMPTZ,
  liquidada_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anticipations_owner_id ON anticipations(owner_id);
CREATE INDEX idx_anticipations_status   ON anticipations(status);

CREATE TRIGGER anticipations_updated_at
  BEFORE UPDATE ON anticipations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE anticipations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anticipations_select"
  ON anticipations FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'credit_analyst'))
  );

CREATE POLICY "anticipations_insert"
  ON anticipations FOR INSERT
  WITH CHECK (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ─── View: resumo da fatura atual ────────────────────────────────

CREATE OR REPLACE VIEW current_invoice AS
SELECT
  ct.card_id,
  ct.billing_period,
  ct.due_date,
  COUNT(*)                   AS transaction_count,
  SUM(ct.amount)             AS total_amount,
  SUM(ct.amount) FILTER (WHERE ct.is_operational) AS operational_amount,
  SUM(ct.amount) FILTER (WHERE NOT ct.is_operational) AS personal_amount,
  cc.limite_total,
  cc.limite_disponivel,
  cc.limite_utilizado
FROM credit_transactions ct
JOIN credit_cards cc ON cc.id = ct.card_id
WHERE ct.status IN ('pendente', 'liquidada')
  AND ct.billing_period = to_char(now(), 'YYYY-MM')
GROUP BY ct.card_id, ct.billing_period, ct.due_date,
         cc.limite_total, cc.limite_disponivel, cc.limite_utilizado;

-- ─── Função: atualizar limite_utilizado ao inserir transação ─────

CREATE OR REPLACE FUNCTION update_card_limit_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pendente' THEN
    UPDATE credit_cards
    SET
      limite_utilizado  = limite_utilizado + NEW.amount,
      limite_disponivel = limite_total - (limite_utilizado + NEW.amount)
    WHERE id = NEW.card_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pendente' AND NEW.status = 'cancelada' THEN
    -- Estorno: devolver ao limite disponível
    UPDATE credit_cards
    SET
      limite_utilizado  = GREATEST(0, limite_utilizado - OLD.amount),
      limite_disponivel = limite_total - GREATEST(0, limite_utilizado - OLD.amount)
    WHERE id = OLD.card_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_txn_update_limit
  AFTER INSERT OR UPDATE ON credit_transactions
  FOR EACH ROW EXECUTE FUNCTION update_card_limit_on_transaction();

COMMENT ON TABLE credit_transactions IS
  'Transações do cartão de crédito. Limite atualizado automaticamente via trigger.';
COMMENT ON TABLE anticipations IS
  'Antecipação de recebíveis de contratos. Taxa sobre DRE real — nunca declaratório.';
