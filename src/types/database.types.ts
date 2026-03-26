/**
 * database.types.ts
 * Gerado a partir do schema real do Supabase (wdthghfuqjpbpzbmutzs)
 * Todas as 22 tabelas do projeto Agregado.Pro v1.0.0
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
          id: string; user_id: string
          role: 'caminhoneiro' | 'transportadora' | 'admin' | 'credit_analyst' | 'compliance'
          full_name: string; email: string; phone: string | null
          cpf: string | null; cnpj: string | null; company_name: string | null
          is_active: boolean; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string
          role?: 'caminhoneiro' | 'transportadora' | 'admin' | 'credit_analyst' | 'compliance'
          full_name: string; email: string; phone?: string | null
          cpf?: string | null; cnpj?: string | null; company_name?: string | null
          is_active?: boolean; created_at?: string; updated_at?: string
        }
        Update: {
          role?: 'caminhoneiro' | 'transportadora' | 'admin' | 'credit_analyst' | 'compliance'
          full_name?: string; email?: string; phone?: string | null
          cpf?: string | null; cnpj?: string | null; company_name?: string | null
          is_active?: boolean; updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string; owner_id: string; type: string; brand: string; model: string
          year: number; plate: string; equipment_type: string | null
          photos: string[] | null; is_active: boolean; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; owner_id: string; type: string; brand: string; model: string
          year: number; plate: string; equipment_type?: string | null
          photos?: string[] | null; is_active?: boolean; created_at?: string; updated_at?: string
        }
        Update: {
          type?: string; brand?: string; model?: string; year?: number; plate?: string
          equipment_type?: string | null; photos?: string[] | null
          is_active?: boolean; updated_at?: string
        }
      }
      dre_entries: {
        Row: {
          id: string; owner_id: string; vehicle_id: string | null; period: string
          entry_type: string; category: string; description: string
          amount: number; km_reference: number | null; notes: string | null
          source: string; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; owner_id: string; vehicle_id?: string | null; period: string
          entry_type: string; category: string; description: string
          amount: number; km_reference?: number | null; notes?: string | null
          source?: string; created_at?: string; updated_at?: string
        }
        Update: {
          vehicle_id?: string | null; period?: string; entry_type?: string
          category?: string; description?: string; amount?: number
          km_reference?: number | null; notes?: string | null
          source?: string; updated_at?: string
        }
      }
      audit_events: {
        Row: {
          id: string; user_id: string | null; action: string
          resource_type: string | null; resource_id: string | null
          ip_address: string | null; user_agent: string | null
          metadata: Json | null; created_at: string
        }
        Insert: {
          id?: string; user_id?: string | null; action: string
          resource_type?: string | null; resource_id?: string | null
          ip_address?: string | null; user_agent?: string | null
          metadata?: Json | null; created_at?: string
        }
        Update: never
      }
      contracts: {
        Row: {
          id: string; publisher_id: string; title: string; description: string | null
          route_origin: string; route_destination: string; route_km: number
          vehicle_type: string; equipment_type: string | null
          contract_value: number; payment_type: string; start_date: string | null
          duration_months: number | null; requires_own_truck: boolean
          requires_own_equipment: boolean; has_risk_management: boolean
          status: 'rascunho' | 'publicado' | 'em_negociacao' | 'fechado' | 'cancelado' | 'encerrado'
          sensitive_contact: string | null; sensitive_address: string | null
          candidates_count: number; published_at: string | null; closed_at: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; publisher_id: string; title: string; description?: string | null
          route_origin: string; route_destination: string; route_km: number
          vehicle_type: string; equipment_type?: string | null
          contract_value: number; payment_type?: string; start_date?: string | null
          duration_months?: number | null; requires_own_truck?: boolean
          requires_own_equipment?: boolean; has_risk_management?: boolean
          status?: 'rascunho' | 'publicado' | 'em_negociacao' | 'fechado' | 'cancelado' | 'encerrado'
          sensitive_contact?: string | null; sensitive_address?: string | null
          candidates_count?: number; published_at?: string | null; closed_at?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          title?: string; description?: string | null
          status?: 'rascunho' | 'publicado' | 'em_negociacao' | 'fechado' | 'cancelado' | 'encerrado'
          sensitive_contact?: string | null; sensitive_address?: string | null
          candidates_count?: number; published_at?: string | null; closed_at?: string | null
          updated_at?: string
        }
      }
      candidatures: {
        Row: {
          id: string; contract_id: string; candidate_id: string; vehicle_id: string | null
          status: 'pendente' | 'aceita' | 'confirmada' | 'recusada' | 'cancelada'
          message: string | null; cost_per_km_snapshot: number | null
          accepted_at: string | null; confirmed_at: string | null; rejected_at: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; contract_id: string; candidate_id: string; vehicle_id?: string | null
          status?: 'pendente' | 'aceita' | 'confirmada' | 'recusada' | 'cancelada'
          message?: string | null; cost_per_km_snapshot?: number | null
          accepted_at?: string | null; confirmed_at?: string | null; rejected_at?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          status?: 'pendente' | 'aceita' | 'confirmada' | 'recusada' | 'cancelada'
          accepted_at?: string | null; confirmed_at?: string | null; rejected_at?: string | null
          updated_at?: string
        }
      }
      banking_transactions: {
        Row: {
          id: string; owner_id: string; vehicle_id: string | null; external_id: string
          card_last4: string | null; amount: number; currency: string
          status: 'pendente' | 'liquidada' | 'cancelada' | 'disputada'
          merchant_name: string; merchant_mcc: string | null; merchant_cnpj: string | null
          merchant_city: string | null; merchant_state: string | null
          latitude: number | null; longitude: number | null
          transacted_at: string; settled_at: string | null
          dre_category: string | null; entry_type: string | null
          classification_source: 'ia_automatica' | 'ia_sugestao' | 'manual' | 'sistema' | null
          ia_confidence: number | null; ia_suggested_category: string | null
          is_operational: boolean | null; dre_entry_id: string | null; dre_period: string | null
          active_contract_id: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; owner_id: string; vehicle_id?: string | null; external_id: string
          card_last4?: string | null; amount: number; currency?: string
          status?: 'pendente' | 'liquidada' | 'cancelada' | 'disputada'
          merchant_name: string; merchant_mcc?: string | null; merchant_cnpj?: string | null
          merchant_city?: string | null; merchant_state?: string | null
          latitude?: number | null; longitude?: number | null
          transacted_at: string; settled_at?: string | null
          dre_category?: string | null; entry_type?: string | null
          classification_source?: 'ia_automatica' | 'ia_sugestao' | 'manual' | 'sistema' | null
          ia_confidence?: number | null; ia_suggested_category?: string | null
          is_operational?: boolean | null; dre_entry_id?: string | null; dre_period?: string | null
          active_contract_id?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          status?: 'pendente' | 'liquidada' | 'cancelada' | 'disputada'
          dre_category?: string | null; entry_type?: string | null
          classification_source?: 'ia_automatica' | 'ia_sugestao' | 'manual' | 'sistema' | null
          is_operational?: boolean | null; dre_entry_id?: string | null
          settled_at?: string | null; updated_at?: string
        }
      }
      credit_scores: {
        Row: {
          id: string; owner_id: string; score: number
          tier: 'insuficiente' | 'baixo' | 'regular' | 'bom' | 'muito_bom' | 'excelente'
          is_eligible: boolean; period_start: string; period_end: string; months_of_data: number
          driver_receita_estabilidade: number; driver_margem_operacional: number
          driver_regularidade_contratos: number; driver_historico_pagamentos: number
          driver_custo_km_tendencia: number; driver_sazonalidade: number
          receita_media_mensal: number | null; margem_media_percent: number | null
          custo_km_medio: number | null; contratos_ativos: number | null
          meses_positivos: number | null; limite_sugerido: number | null
          score_anterior: number | null; variacao_score: number | null
          calculated_by: string; calculated_at: string; expires_at: string
          is_current: boolean; created_at: string
        }
        Insert: {
          id?: string; owner_id: string; score: number
          tier: 'insuficiente' | 'baixo' | 'regular' | 'bom' | 'muito_bom' | 'excelente'
          is_eligible?: boolean; period_start: string; period_end: string; months_of_data: number
          driver_receita_estabilidade?: number; driver_margem_operacional?: number
          driver_regularidade_contratos?: number; driver_historico_pagamentos?: number
          driver_custo_km_tendencia?: number; driver_sazonalidade?: number
          receita_media_mensal?: number | null; margem_media_percent?: number | null
          custo_km_medio?: number | null; contratos_ativos?: number | null
          meses_positivos?: number | null; limite_sugerido?: number | null
          score_anterior?: number | null; variacao_score?: number | null
          calculated_by?: string; calculated_at?: string; expires_at?: string
          is_current?: boolean; created_at?: string
        }
        Update: never
      }
      credit_cards: {
        Row: {
          id: string; owner_id: string; active_contract_id: string | null; candidature_id: string | null
          status: 'solicitado' | 'em_analise' | 'aprovado' | 'ativo' | 'bloqueado' | 'cancelado' | 'sem_contrato'
          limite_total: number; limite_disponivel: number; limite_utilizado: number
          score_aprovacao: number | null; score_tier_aprovacao: string | null
          dre_periodo_referencia: string | null; dre_resultado_ref: number | null; dre_margem_ref: number | null
          external_card_id: string | null; card_last4: string | null; card_expiry: string | null
          card_network: string | null; payment_method: string; vencimento_dia: number | null
          solicitado_at: string; aprovado_at: string | null; ativado_at: string | null
          proximo_vencimento: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; owner_id: string; active_contract_id?: string | null; candidature_id?: string | null
          status?: 'solicitado' | 'em_analise' | 'aprovado' | 'ativo' | 'bloqueado' | 'cancelado' | 'sem_contrato'
          limite_total?: number; limite_disponivel?: number; limite_utilizado?: number
          score_aprovacao?: number | null; score_tier_aprovacao?: string | null
          dre_periodo_referencia?: string | null; dre_resultado_ref?: number | null; dre_margem_ref?: number | null
          external_card_id?: string | null; card_last4?: string | null; card_expiry?: string | null
          card_network?: string | null; payment_method?: string; vencimento_dia?: number | null
          solicitado_at?: string; aprovado_at?: string | null; ativado_at?: string | null
          proximo_vencimento?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          active_contract_id?: string | null
          status?: 'solicitado' | 'em_analise' | 'aprovado' | 'ativo' | 'bloqueado' | 'cancelado' | 'sem_contrato'
          limite_total?: number; limite_disponivel?: number; limite_utilizado?: number
          score_aprovacao?: number | null; dre_periodo_referencia?: string | null
          dre_resultado_ref?: number | null; dre_margem_ref?: number | null
          card_last4?: string | null; card_expiry?: string | null; external_card_id?: string | null
          aprovado_at?: string | null; ativado_at?: string | null; updated_at?: string
        }
      }
      loyalty_accounts: {
        Row: {
          id: string; owner_id: string; tier: 'bronze' | 'prata' | 'ouro' | 'platina'
          tier_updated_at: string; points_total: number; points_available: number
          points_used: number; points_expired: number; months_active: number
          months_positive: number; contracts_closed: number; km_total_accumulated: number
          avg_score_last_6m: number | null; total_card_spend: number
          joined_at: string; last_activity_at: string; next_tier_review: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; owner_id: string; tier?: 'bronze' | 'prata' | 'ouro' | 'platina'
          tier_updated_at?: string; points_total?: number; points_available?: number
          points_used?: number; points_expired?: number; months_active?: number
          months_positive?: number; contracts_closed?: number; km_total_accumulated?: number
          avg_score_last_6m?: number | null; total_card_spend?: number
          joined_at?: string; last_activity_at?: string; next_tier_review?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          tier?: 'bronze' | 'prata' | 'ouro' | 'platina'; tier_updated_at?: string
          points_total?: number; points_available?: number; points_used?: number
          points_expired?: number; months_active?: number; months_positive?: number
          contracts_closed?: number; km_total_accumulated?: number
          avg_score_last_6m?: number | null; total_card_spend?: number
          last_activity_at?: string; next_tier_review?: string | null; updated_at?: string
        }
      }
      partner_integrations: {
        Row: {
          id: string; slug: string; name: string; category: string
          logo_url: string | null; website_url: string | null; description: string | null
          discount_type: string; discount_value: number
          min_tier_required: 'bronze' | 'prata' | 'ouro' | 'platina'
          states_covered: string[] | null; is_nationwide: boolean; is_active: boolean
          priority: number; contact_email: string | null; integration_type: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; slug: string; name: string; category: string
          logo_url?: string | null; website_url?: string | null; description?: string | null
          discount_type?: string; discount_value?: number
          min_tier_required?: 'bronze' | 'prata' | 'ouro' | 'platina'
          states_covered?: string[] | null; is_nationwide?: boolean; is_active?: boolean
          priority?: number; contact_email?: string | null; integration_type?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          name?: string; description?: string | null; discount_type?: string
          discount_value?: number; min_tier_required?: 'bronze' | 'prata' | 'ouro' | 'platina'
          is_active?: boolean; priority?: number; updated_at?: string
        }
      }
      financial_snapshots: {
        Row: {
          id: string; owner_id: string; period: string
          receita_total: number; custo_fixo_total: number; custo_var_total: number
          resultado_op: number; margem_op: number | null; custo_km: number | null; km_total: number | null
          total_card_spend: number; card_txn_count: number; contracts_active: number
          has_dre_data: boolean; has_card_data: boolean; is_positive: boolean
          score_at_period: number | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; owner_id: string; period: string
          receita_total?: number; custo_fixo_total?: number; custo_var_total?: number
          resultado_op?: number; margem_op?: number | null; custo_km?: number | null; km_total?: number | null
          total_card_spend?: number; card_txn_count?: number; contracts_active?: number
          has_dre_data?: boolean; has_card_data?: boolean
          score_at_period?: number | null; created_at?: string; updated_at?: string
        }
        Update: {
          receita_total?: number; custo_fixo_total?: number; custo_var_total?: number
          resultado_op?: number; margem_op?: number | null; custo_km?: number | null; km_total?: number | null
          total_card_spend?: number; card_txn_count?: number; contracts_active?: number
          has_dre_data?: boolean; has_card_data?: boolean
          score_at_period?: number | null; updated_at?: string
        }
      }
      open_finance_connections: {
        Row: {
          id: string; owner_id: string; institution_id: string; institution_name: string
          institution_logo: string | null; consent_id: string; consent_expires_at: string
          is_active: boolean; last_sync_at: string | null; sync_status: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; owner_id: string; institution_id: string; institution_name: string
          institution_logo?: string | null; consent_id: string; consent_expires_at: string
          is_active?: boolean; last_sync_at?: string | null; sync_status?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          is_active?: boolean; last_sync_at?: string | null; sync_status?: string | null; updated_at?: string
        }
      }
      receivables: {
        Row: {
          id: string; owner_id: string; contract_id: string | null; candidature_id: string | null
          amount: number; due_date: string; status: string
          payer_id: string | null; payer_name: string | null; is_anticipated: boolean
          anticipation_fee: number | null; anticipated_amount: number | null
          anticipated_at: string | null; paid_at: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; owner_id: string; contract_id?: string | null; candidature_id?: string | null
          amount: number; due_date: string; status?: string
          payer_id?: string | null; payer_name?: string | null; is_anticipated?: boolean
          anticipation_fee?: number | null; anticipated_amount?: number | null
          anticipated_at?: string | null; paid_at?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          status?: string; is_anticipated?: boolean; anticipation_fee?: number | null
          anticipated_amount?: number | null; anticipated_at?: string | null
          paid_at?: string | null; updated_at?: string
        }
      }
      credit_limit_events: {
        Row: {
          id: string; card_id: string; owner_id: string
          limite_anterior: number; limite_novo: number; variacao: number
          reason: 'emissao_inicial' | 'novo_contrato' | 'dre_atualizado' | 'score_atualizado' | 'reducao_manual' | 'aumento_solicitado' | 'contrato_encerrado'
          reason_detail: string | null; dre_resultado: number | null
          dre_margem: number | null; score_atual: number | null; created_at: string
        }
        Insert: {
          id?: string; card_id: string; owner_id: string
          limite_anterior: number; limite_novo: number
          reason: 'emissao_inicial' | 'novo_contrato' | 'dre_atualizado' | 'score_atualizado' | 'reducao_manual' | 'aumento_solicitado' | 'contrato_encerrado'
          reason_detail?: string | null; dre_resultado?: number | null
          dre_margem?: number | null; score_atual?: number | null; created_at?: string
        }
        Update: never
      }
      credit_transactions: {
        Row: {
          id: string; card_id: string; owner_id: string; external_id: string | null
          amount: number; status: string; merchant_name: string; merchant_mcc: string | null
          dre_category: string | null; is_operational: boolean; installments: number
          installment_current: number | null; billing_period: string | null; due_date: string | null
          limite_impactado: number | null; transacted_at: string; settled_at: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; card_id: string; owner_id: string; external_id?: string | null
          amount: number; status?: string; merchant_name: string; merchant_mcc?: string | null
          dre_category?: string | null; is_operational?: boolean; installments?: number
          installment_current?: number | null; billing_period?: string | null; due_date?: string | null
          limite_impactado?: number | null; transacted_at: string; settled_at?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          status?: string; dre_category?: string | null; settled_at?: string | null; updated_at?: string
        }
      }
      anticipations: {
        Row: {
          id: string; owner_id: string; receivable_ids: string[]
          total_receivable: number; fee_rate: number; fee_amount: number
          net_amount: number; days_anticipated: number; status: string
          dre_margem_current: number | null; score_current: number | null; reason: string | null
          solicitada_at: string; aprovada_at: string | null; liquidada_at: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; owner_id: string; receivable_ids: string[]
          total_receivable: number; fee_rate: number; fee_amount: number
          net_amount: number; days_anticipated: number; status?: string
          dre_margem_current?: number | null; score_current?: number | null; reason?: string | null
          solicitada_at?: string; aprovada_at?: string | null; liquidada_at?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          status?: string; aprovada_at?: string | null; liquidada_at?: string | null; updated_at?: string
        }
      }
      loyalty_events: {
        Row: {
          id: string; account_id: string; owner_id: string
          event_type: 'lancamento_dre' | 'transacao_cartao' | 'contrato_fechado' | 'avaliacao_positiva' | 'score_melhorado' | 'meta_km_mensal' | 'pagamento_pontual' | 'indicacao' | 'aniversario_plataforma'
          points_earned: number; reference_id: string | null; reference_type: string | null
          description: string | null; expires_at: string | null; is_expired: boolean; created_at: string
        }
        Insert: {
          id?: string; account_id: string; owner_id: string
          event_type: 'lancamento_dre' | 'transacao_cartao' | 'contrato_fechado' | 'avaliacao_positiva' | 'score_melhorado' | 'meta_km_mensal' | 'pagamento_pontual' | 'indicacao' | 'aniversario_plataforma'
          points_earned: number; reference_id?: string | null; reference_type?: string | null
          description?: string | null; expires_at?: string | null; is_expired?: boolean; created_at?: string
        }
        Update: never
      }
      loyalty_redemptions: {
        Row: {
          id: string; account_id: string; owner_id: string; benefit_id: string; benefit_name: string
          points_cost: number; status: string; code: string | null; expires_at: string | null
          discount_value: number | null; partner_id: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; account_id: string; owner_id: string; benefit_id: string; benefit_name: string
          points_cost: number; status?: string; code?: string | null; expires_at?: string | null
          discount_value?: number | null; partner_id?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          status?: string; code?: string | null; updated_at?: string
        }
      }
      partner_usage_events: {
        Row: {
          id: string; owner_id: string; partner_id: string; redemption_id: string | null
          amount_saved: number | null; notes: string | null; used_at: string
        }
        Insert: {
          id?: string; owner_id: string; partner_id: string; redemption_id?: string | null
          amount_saved?: number | null; notes?: string | null; used_at?: string
        }
        Update: { amount_saved?: number | null; notes?: string | null }
      }
      bank_transition_log: {
        Row: {
          id: string; phase: string; milestone: string; description: string | null
          active_users: number | null; monthly_revenue: number | null; card_volume: number | null
          threshold_target: number | null; threshold_reached: boolean
          decided_by: string | null; notes: string | null; created_at: string
        }
        Insert: {
          id?: string; phase: string; milestone: string; description?: string | null
          active_users?: number | null; monthly_revenue?: number | null; card_volume?: number | null
          threshold_target?: number | null; threshold_reached?: boolean
          decided_by?: string | null; notes?: string | null; created_at?: string
        }
        Update: { description?: string | null; notes?: string | null }
      }
      evaluations: {
        Row: {
          id: string; contract_id: string; candidature_id: string
          evaluator_id: string; evaluated_id: string
          role: 'caminhoneiro_avalia_transportadora' | 'transportadora_avalia_caminhoneiro'
          score: number; comment: string | null; created_at: string
        }
        Insert: {
          id?: string; contract_id: string; candidature_id: string
          evaluator_id: string; evaluated_id: string
          role: 'caminhoneiro_avalia_transportadora' | 'transportadora_avalia_caminhoneiro'
          score: number; comment?: string | null; created_at?: string
        }
        Update: never
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      user_role: 'caminhoneiro' | 'transportadora' | 'admin' | 'credit_analyst' | 'compliance'
      contract_status: 'rascunho' | 'publicado' | 'em_negociacao' | 'fechado' | 'cancelado' | 'encerrado'
      candidature_status: 'pendente' | 'aceita' | 'confirmada' | 'recusada' | 'cancelada'
      transaction_status: 'pendente' | 'liquidada' | 'cancelada' | 'disputada'
      classification_source: 'ia_automatica' | 'ia_sugestao' | 'manual' | 'sistema'
      score_tier: 'insuficiente' | 'baixo' | 'regular' | 'bom' | 'muito_bom' | 'excelente'
      card_status: 'solicitado' | 'em_analise' | 'aprovado' | 'ativo' | 'bloqueado' | 'cancelado' | 'sem_contrato'
      limit_recalc_reason: 'emissao_inicial' | 'novo_contrato' | 'dre_atualizado' | 'score_atualizado' | 'reducao_manual' | 'aumento_solicitado' | 'contrato_encerrado'
      loyalty_tier: 'bronze' | 'prata' | 'ouro' | 'platina'
      loyalty_event_type: 'lancamento_dre' | 'transacao_cartao' | 'contrato_fechado' | 'avaliacao_positiva' | 'score_melhorado' | 'meta_km_mensal' | 'pagamento_pontual' | 'indicacao' | 'aniversario_plataforma'
      evaluation_role: 'caminhoneiro_avalia_transportadora' | 'transportadora_avalia_caminhoneiro'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Profile             = Tables<'profiles'>
export type Vehicle             = Tables<'vehicles'>
export type DreEntry            = Tables<'dre_entries'>
export type AuditEvent          = Tables<'audit_events'>
export type Contract            = Tables<'contracts'>
export type Candidature         = Tables<'candidatures'>
export type BankingTransaction  = Tables<'banking_transactions'>
export type CreditScore         = Tables<'credit_scores'>
export type CreditCard          = Tables<'credit_cards'>
export type CreditLimitEvent    = Tables<'credit_limit_events'>
export type CreditTransaction   = Tables<'credit_transactions'>
export type Anticipation        = Tables<'anticipations'>
export type FinancialSnapshot   = Tables<'financial_snapshots'>
export type OpenFinanceConnection = Tables<'open_finance_connections'>
export type Receivable          = Tables<'receivables'>
export type LoyaltyAccount      = Tables<'loyalty_accounts'>
export type LoyaltyEvent        = Tables<'loyalty_events'>
export type LoyaltyRedemption   = Tables<'loyalty_redemptions'>
export type PartnerIntegration  = Tables<'partner_integrations'>
export type PartnerUsageEvent   = Tables<'partner_usage_events'>
export type BankTransitionLog   = Tables<'bank_transition_log'>
export type Evaluation          = Tables<'evaluations'>
