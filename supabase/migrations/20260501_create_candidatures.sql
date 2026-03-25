-- =====================================================================
-- Migration: 20260501_create_candidatures.sql
-- Descrição: Candidaturas a contratos e avaliações bilaterais
-- Phase: 2 — Marketplace
-- Rollback: DROP TABLE IF EXISTS evaluations, candidatures CASCADE;
--           DROP TYPE IF EXISTS candidature_status, evaluation_role;
-- =====================================================================

-- ─── Candidaturas ────────────────────────────────────────────────

CREATE TYPE candidature_status AS ENUM (
  'pendente',    -- Aguardando análise da transportadora
  'aceita',      -- Transportadora aceitou — aguardando confirmação do caminhoneiro
  'confirmada',  -- Ambos confirmaram — contrato FECHADO
  'recusada',    -- Transportadora recusou
  'cancelada'   -- Caminhoneiro cancelou antes do fechamento
);

CREATE TABLE candidatures (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id    UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  candidate_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id     UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  -- Status do fluxo bilateral
  status         candidature_status NOT NULL DEFAULT 'pendente',

  -- Mensagem do candidato (opcional)
  message        TEXT,

  -- Custo/km do candidato no momento da candidatura (snapshot)
  -- Fundamental para a classificação de viabilidade
  cost_per_km_snapshot NUMERIC(8,2),

  -- Timestamps do fluxo
  accepted_at    TIMESTAMPTZ,    -- transportadora aceitou
  confirmed_at   TIMESTAMPTZ,   -- caminhoneiro confirmou → fechamento
  rejected_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um caminhoneiro não pode se candidatar duas vezes ao mesmo contrato
  CONSTRAINT candidatures_unique UNIQUE (contract_id, candidate_id)
);

CREATE INDEX idx_candidatures_contract_id  ON candidatures(contract_id);
CREATE INDEX idx_candidatures_candidate_id ON candidatures(candidate_id);
CREATE INDEX idx_candidatures_status       ON candidatures(status);

CREATE TRIGGER candidatures_updated_at
  BEFORE UPDATE ON candidatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS Candidatures ────────────────────────────────────────────

ALTER TABLE candidatures ENABLE ROW LEVEL SECURITY;

-- Candidato vê suas próprias candidaturas
-- Transportadora vê candidaturas dos seus contratos
-- Admin/compliance vê tudo
CREATE POLICY "candidatures_select"
  ON candidatures FOR SELECT
  USING (
    candidate_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id
      AND c.publisher_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'compliance')
    )
  );

-- INSERT: apenas caminhoneiros, em contratos publicados
CREATE POLICY "candidatures_insert"
  ON candidatures FOR INSERT
  WITH CHECK (
    candidate_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'caminhoneiro'
    )
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id AND c.status = 'publicado'
    )
  );

-- UPDATE: candidato cancela | transportadora aceita/recusa | admin tudo
CREATE POLICY "candidatures_update"
  ON candidatures FOR UPDATE
  USING (
    candidate_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id
      AND c.publisher_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- ─── Avaliações (bilaterais e imutáveis) ─────────────────────────

CREATE TYPE evaluation_role AS ENUM (
  'caminhoneiro_avalia_transportadora',
  'transportadora_avalia_caminhoneiro'
);

CREATE TABLE evaluations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id     UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  candidature_id  UUID NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  evaluator_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evaluated_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            evaluation_role NOT NULL,

  -- Score e comentário
  score           INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment         TEXT,

  -- Timestamp imutável — avaliações nunca mudam após publicação
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um avaliador só avalia uma vez por contrato
  CONSTRAINT evaluations_unique UNIQUE (contract_id, evaluator_id, role)
);

CREATE INDEX idx_evaluations_evaluated_id ON evaluations(evaluated_id);
CREATE INDEX idx_evaluations_contract_id  ON evaluations(contract_id);

ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Avaliações são públicas (scores visíveis no perfil)
CREATE POLICY "evaluations_select"
  ON evaluations FOR SELECT USING (true);

-- INSERT: apenas após contrato fechado, pelo avaliador correto
CREATE POLICY "evaluations_insert"
  ON evaluations FOR INSERT
  WITH CHECK (
    evaluator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id AND c.status = 'fechado'
    )
  );

-- SEM UPDATE — avaliações imutáveis após publicação (regra de negócio crítica)
-- SEM DELETE

REVOKE UPDATE ON evaluations FROM PUBLIC;
REVOKE DELETE ON evaluations FROM PUBLIC;

-- ─── View: Score médio por perfil ────────────────────────────────

CREATE OR REPLACE VIEW profile_scores AS
SELECT
  evaluated_id                              AS profile_id,
  COUNT(*)                                  AS total_evaluations,
  ROUND(AVG(score)::numeric, 2)             AS avg_score,
  MIN(score)                                AS min_score,
  MAX(score)                                AS max_score,
  COUNT(*) FILTER (WHERE score = 5)         AS five_stars,
  COUNT(*) FILTER (WHERE score >= 4)        AS four_plus_stars
FROM evaluations
GROUP BY evaluated_id;

COMMENT ON TABLE candidatures IS 'Candidaturas de caminhoneiros a contratos — fluxo bilateral de fechamento';
COMMENT ON TABLE evaluations  IS 'Avaliações bilaterais imutáveis — transportadora avalia caminhoneiro e vice-versa';
COMMENT ON COLUMN candidatures.cost_per_km_snapshot IS 'Snapshot do custo/km no momento da candidatura — base para classificação de viabilidade';
