-- =====================================================================
-- Migration: 20260402_create_vehicles.sql
-- Descrição: Tabela de veículos dos caminhoneiros
-- Phase: 1 — Core Management
-- Rollback: DROP TABLE IF EXISTS vehicles CASCADE;
-- =====================================================================

CREATE TABLE vehicles (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Identificação
  type           TEXT NOT NULL,      -- VehicleType de constants.ts
  brand          TEXT NOT NULL,
  model          TEXT NOT NULL,
  year           INTEGER NOT NULL,
  plate          TEXT NOT NULL,
  -- Equipamento acoplado (opcional)
  equipment_type TEXT,               -- EquipmentType de constants.ts
  -- Fotos (URLs do Supabase Storage)
  photos         TEXT[],
  -- Status
  is_active      BOOLEAN NOT NULL DEFAULT true,
  -- Timestamps
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garantias
  CONSTRAINT vehicles_plate_unique UNIQUE (plate),
  CONSTRAINT vehicles_year_check CHECK (year BETWEEN 1950 AND date_part('year', now()) + 1),
  CONSTRAINT vehicles_type_check CHECK (type IN (
    'Automóvel', 'Van', '3/4', 'Toco', 'Truck',
    'Cavalo 4x2', 'Cavalo 6x2', 'Cavalo 6x4'
  ))
);

-- Índices
CREATE INDEX idx_vehicles_owner_id  ON vehicles(owner_id);
CREATE INDEX idx_vehicles_is_active ON vehicles(is_active);
CREATE INDEX idx_vehicles_plate     ON vehicles(plate);

-- Trigger updated_at
CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Caminhoneiro vê apenas seus veículos
CREATE POLICY "vehicles_select"
  ON vehicles FOR SELECT
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'compliance')
    )
  );

CREATE POLICY "vehicles_insert"
  ON vehicles FOR INSERT
  WITH CHECK (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "vehicles_update"
  ON vehicles FOR UPDATE
  USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Soft delete apenas — sem delete real de veículos
CREATE POLICY "vehicles_delete"
  ON vehicles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Comentários
COMMENT ON TABLE vehicles IS 'Veículos dos caminhoneiros — frota própria ou financiada';
COMMENT ON COLUMN vehicles.type IS 'Tipo do veículo — enum VehicleType de constants.ts';
COMMENT ON COLUMN vehicles.equipment_type IS 'Equipamento acoplado — enum EquipmentType de constants.ts (opcional)';
COMMENT ON COLUMN vehicles.photos IS 'Array de URLs do Supabase Storage para fotos do veículo';
