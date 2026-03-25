-- =====================================================================
-- Migration: 20260403_create_dre_entries.sql
-- Descrição: Tabela de lançamentos do DRE (receitas + custos fixos + variáveis)
-- Phase: 1 — Core Management
-- Rollback: DROP TABLE IF EXISTS dre_entries CASCADE;
--           DROP TYPE IF EXISTS entry_type;
-- =====================================================================

-- Enum de tipo de lançamento
CREATE TYPE entry_type AS ENUM ('receita', 'custo_fixo', 'custo_variavel');

CREATE TABLE dre_entries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Proprietário do lançamento
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Veículo relacionado (opcional — caminhoneiro pode ter mais de um)
  vehicle_id    UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  -- Período de referência (formato YYYY-MM)
  period        TEXT NOT NULL,
  -- Classificação
  entry_type    entry_type NOT NULL,
  category      TEXT NOT NULL,       -- FK para constantes de constants.ts
  description   TEXT NOT NULL,
  -- Valor (sempre positivo — o entry_type define se é entrada ou saída)
  amount        NUMERIC(12, 2) NOT NULL,
  -- km de referência (para cálculo de custo/km)
  km_reference  NUMERIC(10, 1),
  -- Observações livres
  notes         TEXT,
  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garantias
  CONSTRAINT dre_entries_amount_positive CHECK (amount > 0),
  CONSTRAINT dre_entries_period_format CHECK (period ~ '^\d{4}-\d{2}$'),
  CONSTRAINT dre_entries_km_positive CHECK (km_reference IS NULL OR km_reference > 0)
);

-- Índices críticos para performance das queries DRE
CREATE INDEX idx_dre_entries_owner_id   ON dre_entries(owner_id);
CREATE INDEX idx_dre_entries_period     ON dre_entries(period);
CREATE INDEX idx_dre_entries_vehicle_id ON dre_entries(vehicle_id);
CREATE INDEX idx_dre_entries_entry_type ON dre_entries(entry_type);
-- Índice composto — query mais comum: owner + period
CREATE INDEX idx_dre_entries_owner_period ON dre_entries(owner_id, period);
-- Índice composto — DRE por veículo e período
CREATE INDEX idx_dre_entries_vehicle_period ON dre_entries(vehicle_id, period);

-- Trigger updated_at
CREATE TRIGGER dre_entries_updated_at
  BEFORE UPDATE ON dre_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE dre_entries ENABLE ROW LEVEL SECURITY;

-- Caminhoneiro vê apenas seus próprios lançamentos
CREATE POLICY "dre_entries_select"
  ON dre_entries FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'compliance', 'credit_analyst')
    )
  );

-- Insert apenas no próprio registro
CREATE POLICY "dre_entries_insert"
  ON dre_entries FOR INSERT
  WITH CHECK (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Update apenas no próprio registro
CREATE POLICY "dre_entries_update"
  ON dre_entries FOR UPDATE
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Delete permitido pelo próprio — lançamentos incorretos podem ser removidos
-- Histórico financeiro: dados financeiros anteriores a 90 dias ficam protegidos
-- (Regra de negócio implementada no service layer — não aqui)
CREATE POLICY "dre_entries_delete"
  ON dre_entries FOR DELETE
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ─── View materializada: DRE resumido por período ──────────────────
-- Evita N queries no frontend — calcula DRE no banco
CREATE OR REPLACE VIEW dre_summary AS
SELECT
  owner_id,
  vehicle_id,
  period,
  -- Receita
  SUM(CASE WHEN entry_type = 'receita' THEN amount ELSE 0 END)        AS total_receita,
  -- Custos
  SUM(CASE WHEN entry_type = 'custo_fixo' THEN amount ELSE 0 END)     AS total_fixo,
  SUM(CASE WHEN entry_type = 'custo_variavel' THEN amount ELSE 0 END) AS total_variavel,
  SUM(CASE WHEN entry_type != 'receita' THEN amount ELSE 0 END)       AS total_custo,
  -- Resultado
  SUM(CASE WHEN entry_type = 'receita' THEN amount ELSE -amount END)  AS resultado_operacional,
  -- KM (máximo do período — caminhoneiro lança km total)
  MAX(km_reference) AS km_total,
  -- Custo/km
  CASE
    WHEN MAX(km_reference) > 0 THEN
      SUM(CASE WHEN entry_type != 'receita' THEN amount ELSE 0 END) / MAX(km_reference)
    ELSE NULL
  END AS custo_por_km,
  -- Margem (%)
  CASE
    WHEN SUM(CASE WHEN entry_type = 'receita' THEN amount ELSE 0 END) > 0 THEN
      SUM(CASE WHEN entry_type = 'receita' THEN amount ELSE -amount END) /
      SUM(CASE WHEN entry_type = 'receita' THEN amount ELSE 0 END)
    ELSE NULL
  END AS margem_operacional,
  -- Contagem de lançamentos
  COUNT(*) AS total_lancamentos
FROM dre_entries
GROUP BY owner_id, vehicle_id, period;

COMMENT ON VIEW dre_summary IS 'DRE resumido por owner + vehicle + período. RLS aplicado via tabela base.';

-- Comentários
COMMENT ON TABLE dre_entries IS 'Lançamentos do DRE — receitas, custos fixos e variáveis do caminhoneiro';
COMMENT ON COLUMN dre_entries.period IS 'Período de referência no formato YYYY-MM (ex: 2026-03)';
COMMENT ON COLUMN dre_entries.entry_type IS 'receita | custo_fixo | custo_variavel';
COMMENT ON COLUMN dre_entries.category IS 'Categoria de constants.ts — FIXED_COST_CATEGORIES ou VARIABLE_COST_CATEGORIES';
COMMENT ON COLUMN dre_entries.amount IS 'Valor sempre positivo. O entry_type define crédito ou débito no DRE.';
COMMENT ON COLUMN dre_entries.km_reference IS 'Quilometragem rodada no período — base para cálculo de custo/km';
