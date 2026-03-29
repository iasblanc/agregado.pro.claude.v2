'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id:      string
  message: string
  type:    ToastType
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error:   (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

const COLORS: Record<ToastType, { bg: string; color: string; border: string; icon: string }> = {
  success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success-border)', icon: '✓' },
  error:   { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  border: 'var(--color-danger-border)',  icon: '✕' },
  warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning-border)', icon: '⚠' },
  info:    { bg: '#EFF6FF',                 color: '#1D4ED8',              border: '#BFDBFE',                     icon: 'ℹ' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const ctx: ToastCtx = {
    toast,
    success: (m) => toast(m, 'success'),
    error:   (m) => toast(m, 'error'),
    warning: (m) => toast(m, 'warning'),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-[80px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-sm"
          style={{ maxWidth: 'calc(100vw - 32px)', width: 360 }}
          aria-live="polite"
        >
          {toasts.map(t => {
            const c = COLORS[t.type]
            return (
              <div
                key={t.id}
                className="flex items-center gap-sm px-md py-sm rounded-lg shadow-md text-body-sm font-medium animate-in"
                style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
              >
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
                  style={{ background: c.color, color: '#fff' }}>
                  {c.icon}
                </span>
                <span className="flex-1">{t.message}</span>
                <button onClick={() => dismiss(t.id)}
                  className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-[16px]">
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
