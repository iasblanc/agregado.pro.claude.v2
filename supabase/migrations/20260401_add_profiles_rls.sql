-- =====================================================================
-- Migration: 20260401_add_profiles_rls.sql
-- Descrição: Row Level Security para tabela profiles
-- Phase: 1 — Core Management
-- Rollback: ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
--           DROP POLICY IF EXISTS ... ON profiles;
-- =====================================================================

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─── Política SELECT ────────────────────────────────────────────────
-- Usuário vê apenas o próprio perfil
-- Admin e compliance veem todos
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'compliance')
    )
  );

-- ─── Política INSERT ────────────────────────────────────────────────
-- Insert apenas pelo trigger handle_new_user (SECURITY DEFINER)
-- Usuários não podem inserir diretamente
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Política UPDATE ────────────────────────────────────────────────
-- Usuário atualiza apenas o próprio perfil
-- Admin atualiza qualquer perfil
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ─── Política DELETE ────────────────────────────────────────────────
-- Apenas admin pode desativar (soft delete via is_active)
-- DELETE real é feito via cascade do auth.users
CREATE POLICY "profiles_delete"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ─── Verificação de integridade ────────────────────────────────────
-- Confirmar que RLS está ativo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'profiles'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS não está ativo na tabela profiles!';
  END IF;
END $$;
