'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'

type ToastItem = { id: number; message: string }

type ToastContextValue = { toast: (message: string) => void }

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems((previous) => previous.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (message: string) => {
      const id = ++idRef.current
      setItems((previous) => [...previous, { id, message }])
      window.setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="admin-toast-stack" role="region" aria-label="Notifications">
        {items.map((item) => (
          <div key={item.id} className="admin-toast" role="status">
            <CheckCircle2 size={17} />
            <span>{item.message}</span>
            <button type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}