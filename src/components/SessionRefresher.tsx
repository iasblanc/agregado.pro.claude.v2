'use client'

/**
 * SessionRefresher — mantém a sessão Supabase viva sem middleware.
 *
 * O problema sem middleware: quando o access token expira, o Server Component
 * chama getUser() e recebe null, redirecionando para /login.
 *
 * Este componente roda no browser e garante que os tokens sejam renovados
 * antes de expirar, mantendo os cookies atualizados.
 */

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SessionRefresher() {
  useEffect(() => {
    const supabase = createClient()

    // Renovar sessão imediatamente ao montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Sessão ativa — nada a fazer, cookies já estão válidos
      }
    })

    // Escutar mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session) {
          // Token renovado pelo Supabase — cookies atualizados automaticamente
          // pelo createBrowserClient
        }
        if (event === 'SIGNED_OUT') {
          // Sessão encerrada — redirecionar para login
          if (!window.location.pathname.startsWith('/login') &&
              !window.location.pathname.startsWith('/cadastro') &&
              !window.location.pathname.startsWith('/recuperar-senha')) {
            window.location.href = '/login'
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return null
}
