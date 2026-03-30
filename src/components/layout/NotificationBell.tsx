'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Notification {
  id: string; type: string; message: string; href: string; created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open,         setOpen]           = useState(false)
  const [loading,      setLoading]        = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  async function fetchNotifs() {
    try {
      const res  = await fetch('/api/notifications', { credentials: 'same-origin' })
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchNotifs()
    const timer = setInterval(fetchNotifs, 60_000) // polling 1min
    return () => clearInterval(timer)
  }, [])

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const count = notifications.length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors"
        style={{ background: open ? 'var(--color-surface)' : 'transparent', border: '1px solid transparent', borderColor: open ? 'var(--color-border)' : 'transparent' }}
        aria-label={`${count} notificações`}
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#DC2626', color: '#fff',
            borderRadius: '50%', width: 16, height: 16,
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid var(--color-bg)',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 300, maxHeight: 400, overflowY: 'auto',
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 100,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Notificações {count > 0 && `(${count})`}
            </p>
          </div>

          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>🔕</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhuma notificação</p>
            </div>
          ) : (
            <div>
              {notifications.map(n => (
                <Link key={n.id} href={n.href} onClick={() => setOpen(false)}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <p style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
