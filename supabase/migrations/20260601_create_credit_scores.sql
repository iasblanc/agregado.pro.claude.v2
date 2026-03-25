-- =====================================================================
-- Migration: 20260601_create_credit_scores.sql
-- Descrição: Score proprietário de crédito + histórico de snapshots
-- Phase: 3 — Financial Data Infrastructure
-- Rollback: DROP TABLE IF EXISTS credit_score_factors, credit_scores CASCADE;
--           DROP TYPE IF EXISTS score_tier;
-- =====================================================================

-- Tier do score (para exibição ao usuário)
CREATE TYPE score_tier AS ENUM (
  'insuficiente',   -- < 90 dias de histórico — não elegível
  'baixo',          -- 300–499
  'regular',        -- 500–649
  'bom',            -- 650–749
  'muito_bom',      -- 750–849
  'excelente'       -- 850–1000
);

-- Tabela principal de scores (snapshot por cálculo)
CREATE TABLE credit_scores (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id        UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Score calculado (300–1000, como FICO-BR adaptado)
  score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 1000),
  tier            score_tier NOT NULL,
  is_eligible     BOOLEAN NOT NULL DEFAULT false,

  -- Período de referência do cálculo (últimos N meses de dados)
  period_start    TEXT    NOT NULL,  -- YYYY-MM
  period_end      TEXT    NOT NULL,  -- YYYY-MM
  months_of_data  INTEGER NOT NULL,  -- Quantos meses de dados existem

  -- Drivers do score (0–100 cada, para transparência)
  driver_receita_estabilidade    INTEGER NOT NULL DEFAULT 0,  -- Estabilidade da receita
  driver_margem_operacional      INTEGER NOT NULL DEFAULT 0,  -- Margem média
  driver_regularidade_contratos  INTEGER NOT NULL DEFAULT 0,  -- Contratos ativos vs período
  driver_historico_pagamentos    INTEGER NOT NULL DEFAULT 0,  -- Histórico no marketplace
  driver_custo_km_tendencia      INTEGER NOT NULL DEFAULT 0,  -- Tendência do custo/km
  driver_sazonalidade            INTEGER NOT NULL DEFAULT 0,  -- Estabilidade sazonal

  -- Contexto financeiro no momento do cálculo
  receita_media_mensal    NUMERIC(12,2),
  margem_media_percent    NUMERIC(5,4),
  custo_km_medio          NUMERIC(8,2),
  contratos_ativos        INTEGER,
  meses_positivos         INTEGER,   -- Meses com resultado operacional positivo

  -- Limite de crédito sugerido (calculado pelo limit-calculator)
  limite_sugerido         NUMERIC(12,2),

  -- Score anterior para mostrar variação
  score_anterior          INTEGER,
  variacao_score          INTEGER,   -- score - score_anterior

  -- Metadados do cálculo
  calculated_by           TEXT NOT NULL DEFAULT 'score_engine_v1',
  calculated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at              TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),

  -- Um score ativo por usuário (histórico fica preservado)
  is_current              BOOLEAN NOT NULL DEFAULT true,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_credit_scores_owner_id     ON credit_scores(owner_id);
CREATE INDEX idx_credit_scores_calculated_at ON credit_scores(calculated_at DESC);
CREATE INDEX idx_credit_scores_current      ON credit_scores(owner_id, is_current) WHERE is_current = true;
CREATE INDEX idx_credit_scores_tier         ON credit_scores(tier);

-- ─── Função: marcar score anterior como não-current ao inserir novo ──

CREATE OR REPLACE FUNCTION set_previous_score_not_current()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE credit_scores
  SET is_current = false
  WHERE owner_id = NEW.owner_id
    AND is_current = true
    AND id != NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_score_set_previous
  AFTER INSERT ON credit_scores
  FOR EACH ROW EXECUTE FUNCTION set_previous_score_not_current();

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas seu score
CREATE POLICY "credit_scores_select"
  ON credit_scores FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'credit_analyst', 'compliance')
    )
  );

-- INSERT apenas via service_role (engine de score no backend)
CREATE POLICY "credit_scores_insert"
  ON credit_scores FOR INSERT
  WITH CHECK (current_user = 'service_role');

-- Sem UPDATE ou DELETE — scores são imutáveis (auditabilidade)
REVOKE UPDATE ON credit_scores FROM PUBLIC;
REVOKE DELETE ON credit_scores FROM PUBLIC;

-- ─── View: score atual do usuário ────────────────────────────────

CREATE OR REPLACE VIEW current_credit_score AS
SELECT
  cs.*,
  p.full_name,
  p.email
FROM credit_scores cs
JOIN profiles p ON p.id = cs.owner_id
WHERE cs.is_current = true;

COMMENT ON TABLE credit_scores IS
  'Score proprietário de crédito — calculado sobre dados reais do DRE e transações do cartão';
COMMENT ON COLUMN credit_scores.score IS
  'Score 300–1000. Mínimo de 90 dias de dados para elegibilidade (is_eligible).';
COMMENT ON COLUMN credit_scores.driver_receita_estabilidade IS
  'Peso 0–100: desvio padrão da receita mensal nos últimos meses. Maior estabilidade = score maior.';
COMMENT ON COLUMN credit_scores.limite_sugerido IS
  'Limite de crédito sugerido baseado no DRE real — nunca em score de bureau.';
