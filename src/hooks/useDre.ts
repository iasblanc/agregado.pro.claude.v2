'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateDre } from '@/services/dre/calculator'
import { getCurrentPeriod } from '@/lib/utils'
import type { DreResult } from '@/services/dre/calculator'
import type { DreEntry } from '@/types/database.types'

// ─── Tipos ────────────────────────────────────────────────────────

interface UseDreOptions {
  period?:    string
  vehicleId?: string
  realtime?:  boolean
}

interface UseDreReturn {
  dre:       DreResult | null
  entries:   DreEntry[]
  isLoading: boolean
  error:     string | null
  refresh:   () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useDre({
  period    = getCurrentPeriod(),
  vehicleId,
  realtime  = false,
}: UseDreOptions = {}): UseDreReturn {
  const [entries,   setEntries]   = useState<DreEntry[]>([])
  const [dre,       setDre]       = useState<DreResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    let query = supabase
      .from('dre_entries')
      .select('*')
      .eq('period', period)
      .order('created_at', { ascending: false })

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    const result = data ?? []
    setEntries(result)
    setDre(calculateDre(result, period, vehicleId))
    setIsLoading(false)
  }, [period, vehicleId])

  // Fetch inicial
  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Realtime: escuta insert/update/delete na tabela dre_entries
  useEffect(() => {
    if (!realtime) return

    const supabase = createClient()

    const channel = supabase
      .channel(`dre_entries_${period}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'dre_entries',
          filter: `period=eq.${period}`,
        },
        () => {
          // Re-fetch quando qualquer lançamento do período muda
          fetchEntries()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [period, realtime, fetchEntries])

  return { dre, entries, isLoading, error, refresh: fetchEntries }
}
