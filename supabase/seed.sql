-- =====================================================================
-- seed.sql — Dados de desenvolvimento
-- Agregado.Pro v0.3.0+
-- ⚠️ Apenas para ambiente local — NUNCA rodar em produção
-- =====================================================================

-- Limpar dados existentes
TRUNCATE TABLE evaluations, candidatures, contracts, dre_entries, vehicles, profiles CASCADE;

-- ─── Usuários (auth.users criados via Supabase Auth em dev) ───────
-- Os profiles são criados automaticamente pelo trigger handle_new_user.
-- Use o Dashboard do Supabase ou a CLI para criar os usuários de teste:
--
-- supabase auth users create --email caminhoneiro@teste.com --password Teste123!
-- supabase auth users create --email transportadora@teste.com --password Teste123!
-- supabase auth users create --email admin@teste.com --password Teste123!
--
-- Após criar, rode este seed para popular os profiles com dados corretos.

-- ─── Atualizar profiles com dados de domínio ──────────────────────

UPDATE profiles
SET
  full_name    = 'João da Silva',
  role         = 'caminhoneiro',
  cpf          = '52998224725',
  phone        = '(11) 99999-1234'
WHERE email = 'caminhoneiro@teste.com';

UPDATE profiles
SET
  full_name    = 'Transportes ABC Ltda',
  role         = 'transportadora',
  cnpj         = '11222333000181',
  company_name = 'Transportes ABC Ltda',
  phone        = '(11) 3333-4444'
WHERE email = 'transportadora@teste.com';

UPDATE profiles
SET
  full_name = 'Admin Sistema',
  role      = 'admin'
WHERE email = 'admin@teste.com';

-- ─── Veículo do caminhoneiro ──────────────────────────────────────

INSERT INTO vehicles (owner_id, type, brand, model, year, plate, equipment_type)
SELECT
  p.id,
  'Cavalo 6x2',
  'Volvo',
  'FH 460',
  2021,
  'ABC1D23',
  'Semi-reboque 15 mts'
FROM profiles p
WHERE p.email = 'caminhoneiro@teste.com';

-- ─── DRE do mês atual (cenário saudável) ──────────────────────────

WITH prof AS (
  SELECT id FROM profiles WHERE email = 'caminhoneiro@teste.com'
),
veic AS (
  SELECT id FROM vehicles WHERE plate = 'ABC1D23'
)
INSERT INTO dre_entries (owner_id, vehicle_id, period, entry_type, category, description, amount, km_reference)
VALUES
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'receita',        'frete',             'Frete SP → CWB (01/05)',        8000.00, 400),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'receita',        'frete',             'Frete CWB → SP (10/05)',        7500.00, 380),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'custo_fixo',     'parcela_caminhao',  'Parcela Volvo — mai/2026',      2500.00, null),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'custo_fixo',     'seguro',            'Seguro caminhão — mai/2026',    800.00,  null),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'custo_fixo',     'rastreador',        'Rastreador mensal',             180.00,  null),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'custo_variavel', 'diesel',            'Abastecimento — viagem 01',     1600.00, null),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'custo_variavel', 'diesel',            'Abastecimento — viagem 02',     1520.00, null),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'custo_variavel', 'pedagio',           'Pedágio SP → CWB',             280.00,  null),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'custo_variavel', 'pedagio',           'Pedágio CWB → SP',             270.00,  null),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'custo_variavel', 'alimentacao_viagem','Refeições — viagem 01',        120.00,  null),
  ((SELECT id FROM prof), (SELECT id FROM veic), to_char(now(), 'YYYY-MM'), 'custo_variavel', 'alimentacao_viagem','Refeições — viagem 02',        110.00,  null);

-- ─── Contratos da transportadora ──────────────────────────────────

INSERT INTO contracts (
  publisher_id, title, description,
  route_origin, route_destination, route_km,
  vehicle_type, equipment_type,
  contract_value, payment_type, duration_months,
  status, published_at,
  sensitive_contact, sensitive_address
)
SELECT
  p.id,
  'Rota SP → CWB — Agregado regular',
  'Operação semanal São Paulo — Curitiba. Carga seca, sem restrição de horário. Pagamento em até 5 dias úteis após entrega.',
  'São Paulo, SP',
  'Curitiba, PR',
  400,
  'Cavalo 6x2',
  'Semi-reboque 15 mts',
  8500.00,
  'por_viagem',
  12,
  'publicado',
  now(),
  '(11) 99999-0001',
  'Av. das Indústrias, 1234 — Guarulhos, SP'
FROM profiles p WHERE p.email = 'transportadora@teste.com';

INSERT INTO contracts (
  publisher_id, title,
  route_origin, route_destination, route_km,
  vehicle_type, equipment_type,
  contract_value, payment_type, duration_months,
  status, published_at,
  sensitive_contact
)
SELECT
  p.id,
  'Rota SP → SSA — Frigorífico dedicado',
  'São Paulo, SP',
  'Salvador, BA',
  1950,
  'Cavalo 6x4',
  'Semi-reboque Frigorífico',
  22000.00,
  'por_viagem',
  6,
  'publicado',
  now(),
  '(11) 99999-0002'
FROM profiles p WHERE p.email = 'transportadora@teste.com';

INSERT INTO contracts (
  publisher_id, title,
  route_origin, route_destination, route_km,
  vehicle_type,
  contract_value, payment_type,
  status, published_at,
  sensitive_contact
)
SELECT
  p.id,
  'Distribuição regional — Grande SP',
  'São Paulo, SP',
  'Região Metropolitana SP',
  80,
  'Truck',
  2800.00,
  'por_viagem',
  'publicado',
  now(),
  '(11) 99999-0003'
FROM profiles p WHERE p.email = 'transportadora@teste.com';

-- ─── Verificação ──────────────────────────────────────────────────

DO $$
DECLARE
  profile_count  INTEGER;
  vehicle_count  INTEGER;
  dre_count      INTEGER;
  contract_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count  FROM profiles;
  SELECT COUNT(*) INTO vehicle_count  FROM vehicles;
  SELECT COUNT(*) INTO dre_count      FROM dre_entries;
  SELECT COUNT(*) INTO contract_count FROM contracts WHERE status = 'publicado';

  RAISE NOTICE 'Seed concluído: % profiles, % veículos, % lançamentos DRE, % contratos publicados',
    profile_count, vehicle_count, dre_count, contract_count;
END $$;
