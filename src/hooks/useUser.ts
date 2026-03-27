'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database.types'
import type { UserRole } from '@/lib/constants'

interface UseUserReturn {
  profile:          Profile | null
  role:             UserRole | null
  isLoading:        boolean
  isAdmin:          boolean
  isCaminhoneiro:   boolean
  isTransportadora: boolean
  refresh:          () => Promise<void>
}

export function useUser(): UseUserReturn {
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const supabase = createClient()

    // getSession() lê do storage local — não faz chamada de rede
    // Não dispara SIGNED_OUT indevidamente ao montar
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    setProfile(data ?? null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchProfile()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          fetchProfile()
        } else if (event === 'SIGNED_OUT') {
          // Só limpar estado local — NÃO redirecionar
          // O DashboardLayout cuida do redirect via SSR
          setProfile(null)
          setIsLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const role = profile?.role as UserRole | null

  return {
    profile,
    role,
    isLoading,
    isAdmin:          role === 'admin',
    isCaminhoneiro:   role === 'caminhoneiro',
    isTransportadora: role === 'transportadora',
    refresh:          fetchProfile,
  }
}
