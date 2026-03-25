-- =====================================================================
-- Migration: 20260501_create_contracts.sql
-- Descrição: Marketplace de contratos de agregado
-- Phase: 2 — Marketplace
-- Rollback: DROP TABLE IF EXISTS contracts CASCADE;
--           DROP TYPE IF EXISTS contract_status;
-- =====================================================================

CREATE TYPE contract_status AS ENUM (
  'rascunho',       -- Transportadora salvou mas não publicou
  'publicado',      -- Visível para caminhoneiros candidatarem
  'em_negociacao',  -- Candidatura aceita pela transportadora, aguardando caminhoneiro
  'fechado',        -- Aceito por ambas as partes — dados sensíveis liberados
  'cancelado',      -- Cancelado por qualquer parte antes do fechamento
  'encerrado'       -- Contrato executado e finalizado
);

CREATE TABLE contracts (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Quem publicou (transportadora)
  publisher_id      UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Dados públicos (visíveis antes do fechamento)
  title             TEXT    NOT NULL,
  description       TEXT,
  route_origin      TEXT    NOT NULL,   -- Ex: "São Paulo, SP"
  route_destination TEXT    NOT NULL,   -- Ex: "Curitiba, PR"
  route_km          NUMERIC(8,1) NOT NULL,
  vehicle_type      TEXT    NOT NULL,   -- enum VehicleType
  equipment_type    TEXT,              -- enum EquipmentType (opcional)
  contract_value    NUMERIC(12,2) NOT NULL,
  payment_type      TEXT    NOT NULL DEFAULT 'por_viagem',  -- por_viagem | por_km | por_tonelada
  start_date        DATE,
  duration_months   INTEGER,           -- Duração esperada do contrato

  -- Características da operação
  requires_own_truck      BOOLEAN NOT NULL DEFAULT true,
  requires_own_equipment  BOOLEAN NOT NULL DEFAULT false,
  has_risk_management     BOOLEAN NOT NULL DEFAULT false,

  -- Status
  status            contract_status NOT NULL DEFAULT 'rascunho',

  -- Dados sensíveis — visíveis APENAS após fechamento (campo criptografado no futuro)
  sensitive_contact TEXT,    -- WhatsApp/telefone direto
  sensitive_address TEXT,    -- Endereço completo de coleta

  -- Contagem de candidatos
  candidates_count  INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  published_at      TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garantias
  CONSTRAINT contracts_value_positive   CHECK (contract_value > 0),
  CONSTRAINT contracts_km_positive      CHECK (route_km > 0),
  CONSTRAINT contracts_duration_valid   CHECK (duration_months IS NULL OR duration_months BETWEEN 1 AND 60),
  CONSTRAINT contracts_dates_valid      CHECK (
    status != 'fechado' OR (closed_at IS NOT NULL)
  )
);

-- Índices para performance das queries do marketplace
CREATE INDEX idx_contracts_publisher_id ON contracts(publisher_id);
CREATE INDEX idx_contracts_status       ON contracts(status);
CREATE INDEX idx_contracts_vehicle_type ON contracts(vehicle_type);
CREATE INDEX idx_contracts_published_at ON contracts(published_at DESC) WHERE status = 'publicado';
-- Full-text search na rota
CREATE INDEX idx_contracts_route ON contracts USING gin(
  to_tsvector('portuguese', route_origin || ' ' || route_destination)
);

-- Trigger updated_at
CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- SELECT: publicados → todos autenticados | outros → apenas o publisher + admin
CREATE POLICY "contracts_select"
  ON contracts FOR SELECT
  USING (
    status = 'publicado'
    OR publisher_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'compliance')
    )
  );

-- INSERT: apenas transportadoras
CREATE POLICY "contracts_insert"
  ON contracts FOR INSERT
  WITH CHECK (
    publisher_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'transportadora'
    )
  );

-- UPDATE: publisher pode atualizar | admin pode tudo
CREATE POLICY "contracts_update"
  ON contracts FOR UPDATE
  USING (
    publisher_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- DELETE: apenas rascunhos pelo publisher, ou admin
CREATE POLICY "contracts_delete"
  ON contracts FOR DELETE
  USING (
    (publisher_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND status = 'rascunho')
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

COMMENT ON TABLE contracts IS 'Marketplace de contratos de agregado — transportadoras publicam, caminhoneiros se candidatam';
COMMENT ON COLUMN contracts.sensitive_contact IS 'Dados sensíveis — visíveis APENAS após fechamento bilateral. Nunca retornar em queries públicas.';
COMMENT ON COLUMN contracts.sensitive_address IS 'Dados sensíveis — idem ao sensitive_contact.';
