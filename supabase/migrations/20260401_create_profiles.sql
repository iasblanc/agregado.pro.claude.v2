-- =====================================================================
-- Migration: 20260401_create_profiles.sql
-- Descrição: Tabela de perfis de usuários (caminhoneiros e transportadoras)
-- Phase: 1 — Core Management
-- Rollback: DROP TABLE IF EXISTS profiles CASCADE;
-- =====================================================================

-- Enum de roles
CREATE TYPE user_role AS ENUM (
  'caminhoneiro',
  'transportadora',
  'admin',
  'credit_analyst',
  'compliance'
);

-- Tabela principal de perfis
-- Estende o auth.users do Supabase com dados de negócio
CREATE TABLE profiles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'caminhoneiro',
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  -- Caminhoneiro
  cpf           TEXT,
  -- Transportadora
  cnpj          TEXT,
  company_name  TEXT,
  -- Status
  is_active     BOOLEAN NOT NULL DEFAULT true,
  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garantias
  CONSTRAINT profiles_user_id_unique UNIQUE (user_id),
  CONSTRAINT profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT profiles_cpf_cnpj_check CHECK (
    (role = 'caminhoneiro' AND cpf IS NOT NULL) OR
    (role = 'transportadora' AND cnpj IS NOT NULL) OR
    (role NOT IN ('caminhoneiro', 'transportadora'))
  )
);

-- Índices para performance
CREATE INDEX idx_profiles_user_id  ON profiles(user_id);
CREATE INDEX idx_profiles_role     ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_email    ON profiles(email);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: cria perfil automaticamente após registro no Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'caminhoneiro')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Comentários
COMMENT ON TABLE profiles IS 'Perfis de usuários — caminhoneiros, transportadoras e operadores internos';
COMMENT ON COLUMN profiles.user_id IS 'Referência ao auth.users do Supabase';
COMMENT ON COLUMN profiles.role IS 'Role do usuário: caminhoneiro | transportadora | admin | credit_analyst | compliance';
COMMENT ON COLUMN profiles.cpf IS 'CPF — obrigatório para caminhoneiros';
COMMENT ON COLUMN profiles.cnpj IS 'CNPJ — obrigatório para transportadoras';
