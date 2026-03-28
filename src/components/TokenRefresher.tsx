'use client'

/**
 * TokenRefresher — renova o sb-access-token antes de expirar.
 * O JWT do Supabase expira em 1 hora. Renovamos a cada 50 min.
 * Montado no DashboardLayout.
 */
import { useEffect } from 'react'

const REFRESH_INTERVAL = 50 * 60 * 1000 // 50 minutos

export function TokenRefresher() {
  useEffect(() => {
    async function refresh() {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
      })
      // Se retornar 401, sessão expirou — redirecionar para login
      if (res.status === 401) {
        window.location.href = '/login'
      }
    }

    // Renovar imediatamente ao montar (garante token fresco)
    refresh()

    // Renovar periodicamente
    const timer = setInterval(refresh, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  return null
}
