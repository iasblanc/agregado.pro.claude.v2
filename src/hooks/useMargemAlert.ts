'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateDre } from '@/services/dre/calculator'
import { formatBRL, formatPercent, getCurrentPeriod } from '@/lib/utils'
import type { DreEntry } from '@/types/database.types'

// ─── Tipos ────────────────────────────────────────────────────────

export interface MargemAlertState {
  // Estado atual da margem
  margem:            number | null   // 0–1
  resultado:         number | null
  custoPerKm:        number | null
  // Alertas
  isAbaixoThreshold: boolean
  isCritica:         boolean         // < 0 (prejuízo real)
  alertMessage:      string | null
  // Última atualização
  lastUpdatedAt:     Date | null
}

interface UseMargemAlertOptions {
  threshold?:   number   // Margem mínima antes de alertar (padrão: 0.05 = 5%)
  period?:      string
  vehicleId?:   string
  enabled?:     boolean
}

// ─── Hook ─────────────────────────────────────────────────────────

/**
 * useMargemAlert — monitoramento em tempo real da margem operacional.
 *
 * Escuta mudanças em dre_entries via Supabase Realtime.
 * Dispara alerta quando a margem cai abaixo do threshold configurável.
 *
 * Regra do master.md:
 * "Sistema deve notificar em tempo real quando despesas da viagem ativa
 *  comprimem a margem do contrato abaixo de threshold configurável."
 */
export function useMargemAlert({
  threshold  = 0.05,   // Alerta quando margem < 5%
  period     = getCurrentPeriod(),
  vehicleId,
  enabled    = true,
}: UseMargemAlertOptions = {}): MargemAlertState {
  const [state, setState] = useState<MargemAlertState>({
    margem:            null,
    resultado:         null,
    custoPerKm:        null,
    isAbaixoThreshold: false,
    isCritica:         false,
    alertMessage:      null,
    lastUpdatedAt:     null,
  })

  const prevMargemRef = useRef<number | null>(null)

  const computeAlert = useCallback((entries: DreEntry[]) => {
    const dre     = calculateDre(entries, period, vehicleId)
    const margem  = dre.totalReceita > 0 ? dre.margemOperacional : null

    let alertMessage: string | null = null
    const isAbaixo  = margem !== null && margem < threshold
    const isCritica = margem !== null && margem < 0

    if (isCritica) {
      alertMessage = `🚨 Resultado negativo: ${formatBRL(dre.resultadoOperacional)}. Revise os custos deste mês.`
    } else if (isAbaixo && margem !== null) {
      alertMessage = `⚠️ Margem em ${formatPercent(margem)} — abaixo do mínimo de ${formatPercent(threshold)}. Fique atento aos próximos gastos.`
    }

    // Notificação browser quando margem cai significativamente
    if (
      enabled &&
      margem !== null &&
      prevMargemRef.current !== null &&
      prevMargemRef.current >= threshold &&
      margem < threshold &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('Agregado.Pro — Alerta de margem', {
        body: alertMessage ?? `Margem caiu para ${formatPercent(margem)}`,
        icon: '/icon-192.png',
      })
    }

    prevMargemRef.current = margem

    setState({
      margem,
      resultado:         dre.resultadoOperacional,
      custoPerKm:        dre.custoPerKm,
      isAbaixoThreshold: isAbaixo,
      isCritica,
      alertMessage,
      lastUpdatedAt:     new Date(),
    })
  }, [period, vehicleId, threshold, enabled])

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    let isMounted  = true

    // Fetch inicial
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('dre_entries')
        .select('*')
        .eq('period', period)

      if (isMounted && data) {
        computeAlert(data as DreEntry[])
      }
    }

    fetchInitial()

    // Realtime: recalcular sempre que DRE mudar
    const channel = supabase
      .channel(`margem_alert_${period}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'dre_entries',
          filter: `period=eq.${period}`,
        },
        async () => {
          if (!isMounted) return
          const { data } = await supabase
            .from('dre_entries')
            .select('*')
            .eq('period', period)
          if (isMounted && data) computeAlert(data as DreEntry[])
        }
      )
      .subscribe()

    // Também escutar banking_transactions (lançamentos automáticos do cartão)
    const bankingChannel = supabase
      .channel(`banking_margem_${period}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'banking_transactions',
          filter: `dre_period=eq.${period}`,
        },
        async () => {
          if (!isMounted) return
          // Re-fetch DRE após novo lançamento bancário
          const { data } = await supabase
            .from('dre_entries')
            .select('*')
            .eq('period', period)
          if (isMounted && data) computeAlert(data as DreEntry[])
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
      supabase.removeChannel(bankingChannel)
    }
  }, [period, vehicleId, enabled, computeAlert])

  return state
}
