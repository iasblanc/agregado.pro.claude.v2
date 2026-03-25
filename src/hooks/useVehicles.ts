'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/types/database.types'

interface UseVehiclesReturn {
  vehicles:  Vehicle[]
  isLoading: boolean
  error:     string | null
  refresh:   () => Promise<void>
}

export function useVehicles(): UseVehiclesReturn {
  const [vehicles,  setVehicles]  = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    // RLS filtra automaticamente — só retorna veículos do usuário logado
    const { data, error: fetchErr } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (fetchErr) {
      setError(fetchErr.message)
    } else {
      setVehicles(data ?? [])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  return { vehicles, isLoading, error, refresh: fetchVehicles }
}
