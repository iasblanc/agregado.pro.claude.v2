'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database.types'
import type { UserRole } from '@/lib/constants'

// ─── Tipos ────────────────────────────────────────────────────────

interface UseUserReturn {
  profile:   Profile | null
  role:      UserRole | null
  isLoading: boolean
  isAdmin:   boolean
  isCaminhoneiro: boolean
  isTransportadora: boolean
  refresh:   () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useUser(): UseUserReturn {
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setProfile(data ?? null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchProfile()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setProfile(null)
          setIsLoading(false)
        } else {
          fetchProfile()
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
