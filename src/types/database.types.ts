/**
 * database.types.ts
 *
 * ⚠️ ESTE ARQUIVO É GERADO AUTOMATICAMENTE pelo Supabase CLI.
 * NÃO EDITAR MANUALMENTE.
 *
 * Para regenerar após migrations:
 * $ npx supabase gen types typescript --linked > src/types/database.types.ts
 *
 * Placeholder inicial — será substituído após primeira migration.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          role: 'caminhoneiro' | 'transportadora' | 'admin' | 'credit_analyst' | 'compliance'
          full_name: string
          email: string
          phone: string | null
          cpf: string | null
          cnpj: string | null
          company_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'caminhoneiro' | 'transportadora' | 'admin' | 'credit_analyst' | 'compliance'
          full_name: string
          email: string
          phone?: string | null
          cpf?: string | null
          cnpj?: string | null
          company_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'caminhoneiro' | 'transportadora' | 'admin' | 'credit_analyst' | 'compliance'
          full_name?: string
          email?: string
          phone?: string | null
          cpf?: string | null
          cnpj?: string | null
          company_name?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          owner_id: string
          type: string
          brand: string
          model: string
          year: number
          plate: string
          equipment_type: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          type: string
          brand: string
          model: string
          year: number
          plate: string
          equipment_type?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          brand?: string
          model?: string
          year?: number
          plate?: string
          equipment_type?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      dre_entries: {
        Row: {
          id: string
          owner_id: string
          vehicle_id: string | null
          period: string
          entry_type: 'receita' | 'custo_fixo' | 'custo_variavel'
          category: string
          description: string
          amount: number
          km_reference: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          vehicle_id?: string | null
          period: string
          entry_type: 'receita' | 'custo_fixo' | 'custo_variavel'
          category: string
          description: string
          amount: number
          km_reference?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string | null
          period?: string
          entry_type?: 'receita' | 'custo_fixo' | 'custo_variavel'
          category?: string
          description?: string
          amount?: number
          km_reference?: number | null
          notes?: string | null
          updated_at?: string
        }
      }
      audit_events: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: never // Tabela insert-only — sem updates
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'caminhoneiro' | 'transportadora' | 'admin' | 'credit_analyst' | 'compliance'
      entry_type: 'receita' | 'custo_fixo' | 'custo_variavel'
    }
  }
}

// Helpers de tipo para conveniência
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Tipos de domínio derivados
export type Profile   = Tables<'profiles'>
export type Vehicle   = Tables<'vehicles'>
export type DreEntry  = Tables<'dre_entries'>
export type AuditEvent = Tables<'audit_events'>
