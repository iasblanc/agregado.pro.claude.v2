-- =====================================================================
-- Migration: 20260403_create_audit_events.sql
-- Descrição: Tabela de auditoria imutável — insert-only, sem UPDATE/DELETE
-- Phase: 1 — Core Management (segurança obrigatória desde o início)
-- Rollback: DROP TABLE IF EXISTS audit_events CASCADE;
-- =====================================================================

CREATE TABLE audit_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Quem executou (nullable — ações de sistema)
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- O que aconteceu
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  -- Contexto da request
  ip_address    INET,
  user_agent    TEXT,
  -- Dados adicionais (JSON livre)
  metadata      JSONB,
  -- Timestamp imutável
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garantias
  CONSTRAINT audit_events_action_not_empty CHECK (char_length(action) > 0),
  CONSTRAINT audit_events_resource_not_empty CHECK (char_length(resource_type) > 0)
);

-- Índices para queries de auditoria
CREATE INDEX idx_audit_events_user_id       ON audit_events(user_id);
CREATE INDEX idx_audit_events_action        ON audit_events(action);
CREATE INDEX idx_audit_events_resource_type ON audit_events(resource_type);
CREATE INDEX idx_audit_events_resource_id   ON audit_events(resource_id);
CREATE INDEX idx_audit_events_created_at    ON audit_events(created_at DESC);
-- Índice composto — audit trail de um recurso específico
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id, created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Apenas admin e compliance podem ler
CREATE POLICY "audit_events_select"
  ON audit_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'compliance')
    )
  );

-- INSERT permitido via service role (backend) e usuários autenticados
-- A política é permissiva no insert — a restrição está no UPDATE/DELETE
CREATE POLICY "audit_events_insert"
  ON audit_events FOR INSERT
  WITH CHECK (true); -- Service role e usuários autenticados podem registrar eventos

-- ⚠️ SEM POLÍTICA DE UPDATE — tabela imutável
-- ⚠️ SEM POLÍTICA DE DELETE  — tabela imutável
-- Ausência de política = operação BLOQUEADA pelo RLS

-- ─── Proteção extra: revogar UPDATE/DELETE diretamente ─────────────
REVOKE UPDATE ON audit_events FROM PUBLIC;
REVOKE DELETE ON audit_events FROM PUBLIC;

-- Função helper: registrar evento de auditoria
-- Chamada pelo service layer do backend
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id       UUID,
  p_action        TEXT,
  p_resource_type TEXT,
  p_resource_id   UUID DEFAULT NULL,
  p_metadata      JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO audit_events (user_id, action, resource_type, resource_id, metadata)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE audit_events IS 'Log de auditoria imutável — insert-only. UPDATE e DELETE bloqueados por RLS e REVOKE.';
COMMENT ON COLUMN audit_events.action IS 'Ex: login_success, login_failure, contract_closed, credit_approved, admin_action';
COMMENT ON COLUMN audit_events.resource_type IS 'Ex: profile, vehicle, dre_entry, contract, credit_decision';
COMMENT ON COLUMN audit_events.metadata IS 'Dados contextuais da ação — nunca incluir dados sensíveis (senhas, tokens)';
COMMENT ON FUNCTION log_audit_event IS 'Helper SECURITY DEFINER para registrar eventos de auditoria do service layer';
