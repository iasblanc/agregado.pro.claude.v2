-- =====================================================================
-- Migration: 20260801_create_partners_and_bank_transition.sql
-- Descrição: Parceiros do ecossistema + controle da transição BaaS → Banco Próprio
-- Phase: 5 — Ecosystem Expansion
-- Rollback: DROP TABLE IF EXISTS bank_transition_log, partner_usage_events,
--                                partner_integrations CASCADE;
-- =====================================================================

-- ─── Parceiros integrados ─────────────────────────────────────────

CREATE TABLE partner_integrations (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,   -- Ex: 'br-posto', 'oficina-randon'
  name              TEXT NOT NULL,
  category          TEXT NOT NULL,          -- combustivel | manutencao | seguro | pneus | alimentacao
  logo_url          TEXT,
  website_url       TEXT,
  description       TEXT,

  -- Benefício
  discount_type     TEXT NOT NULL DEFAULT 'percentual',  -- percentual | fixo | cashback
  discount_value    NUMERIC(8,4) NOT NULL DEFAULT 0,     -- Ex: 0.05 = 5%
  min_tier_required loyalty_tier NOT NULL DEFAULT 'bronze',

  -- Cobertura geográfica
  states_covered    TEXT[],   -- ['SP', 'RJ', ...] ou NULL = nacional
  is_nationwide     BOOLEAN NOT NULL DEFAULT true,

  -- Status
  is_active         BOOLEAN NOT NULL DEFAULT true,
  priority          INTEGER NOT NULL DEFAULT 0,   -- Ordem de exibição

  -- Metadados
  contact_email     TEXT,
  integration_type  TEXT DEFAULT 'desconto_codigo',  -- desconto_codigo | cashback | api_direta

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partners_category  ON partner_integrations(category);
CREATE INDEX idx_partners_is_active ON partner_integrations(is_active);
CREATE INDEX idx_partners_tier      ON partner_integrations(min_tier_required);

CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partner_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Todos podem ver parceiros ativos
ALTER TABLE partner_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select"
  ON partner_integrations FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'
  ));

-- ─── Eventos de uso de parceiros ──────────────────────────────────

CREATE TABLE partner_usage_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id    UUID NOT NULL REFERENCES partner_integrations(id),
  redemption_id UUID REFERENCES loyalty_redemptions(id),

  amount_saved  NUMERIC(12,2),   -- Valor economizado nesta interação
  notes         TEXT,
  used_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_usage_owner_id   ON partner_usage_events(owner_id);
CREATE INDEX idx_partner_usage_partner_id ON partner_usage_events(partner_id);

ALTER TABLE partner_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_usage_select"
  ON partner_usage_events FOR SELECT
  USING (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "partner_usage_insert"
  ON partner_usage_events FOR INSERT
  WITH CHECK (owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ─── Controle da transição BaaS → Banco Próprio ───────────────────
-- Rastreia o processo de licença BC e migração dos usuários

CREATE TABLE bank_transition_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Fase da transição
  phase           TEXT NOT NULL,    -- 'baas' | 'pre_transicao' | 'migracao' | 'banco_proprio'
  milestone       TEXT NOT NULL,    -- Ex: 'threshold_atingido', 'dossie_bc_enviado', etc.
  description     TEXT,

  -- Métricas no momento do evento
  active_users    INTEGER,
  monthly_revenue NUMERIC(12,2),
  card_volume     NUMERIC(12,2),

  -- Threshold para avançar de fase (conforme master.md: 50K–100K usuários)
  threshold_target INTEGER DEFAULT 50000,
  threshold_reached BOOLEAN NOT NULL DEFAULT false,

  -- Decisão e responsável
  decided_by      TEXT,
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Apenas admins leem e inserem
ALTER TABLE bank_transition_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_transition_select"
  ON bank_transition_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'compliance')));

CREATE POLICY "bank_transition_insert"
  ON bank_transition_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- Registro inicial: sistema em fase BaaS
INSERT INTO bank_transition_log (phase, milestone, description, threshold_target)
VALUES (
  'baas',
  'sistema_lancado',
  'Agregado.Pro operando via BaaS (Celcoin). Monitorar threshold para avaliação do Banco Próprio.',
  50000
);

-- ─── Seed de parceiros iniciais ───────────────────────────────────

INSERT INTO partner_integrations (slug, name, category, discount_type, discount_value, min_tier_required, is_nationwide, priority, description) VALUES
  ('br-distribuidora',  'BR Distribuidora',  'combustivel',  'percentual', 0.04, 'bronze', true, 10,
   '4% de desconto no abastecimento em postos BR conveniados com pagamento pelo cartão Agregado.Pro'),
  ('randon-pecas',      'Randon Implementos', 'manutencao',  'percentual', 0.07, 'prata',  true, 9,
   '7% de desconto em peças e implementos Randon para membros Prata ou superior'),
  ('porto-seguro-carga','Porto Seguro Carga', 'seguro',      'percentual', 0.10, 'bronze', true, 8,
   '10% no seguro de carga contratado via plataforma'),
  ('pneustore',         'PneuStore',         'pneus',       'percentual', 0.08, 'bronze', true, 7,
   '8% de desconto na compra de pneus para caminhão'),
  ('giraffas-estrada',  'Giraffas Estrada',  'alimentacao', 'fixo',       15.0, 'bronze', true, 6,
   'R$ 15 de desconto em refeições nos restaurantes Giraffas em rodovias federais'),
  ('oficina-itinerante','Oficina Itinerante', 'manutencao',  'cashback',   0.05, 'ouro',   true, 5,
   '5% de cashback em serviços de manutenção preventiva para membros Ouro'),
  ('ipiranga-frotas',   'Ipiranga Frotas',   'combustivel',  'percentual', 0.05, 'prata',  true, 8,
   '5% em postos Ipiranga conveniados com cartão Agregado.Pro'),
  ('shell-select',      'Shell Select',      'combustivel',  'percentual', 0.045,'ouro',   true, 7,
   '4.5% em postos Shell para membros Ouro e Platina'),
  ('michelin-agro',     'Michelin BR',       'pneus',       'percentual', 0.12, 'platina', false, 6,
   '12% exclusivo para membros Platina em pneus Michelin — apenas regiões Sul e Sudeste');

COMMENT ON TABLE partner_integrations   IS 'Parceiros do ecossistema Agregado.Pro — combustível, manutenção, seguro, pneus';
COMMENT ON TABLE bank_transition_log    IS 'Log da transição BaaS → Banco Próprio — threshold: 50K–100K usuários ativos (master.md)';
