import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'warning' | 'destructive'

export const TOAST_DEFAULT_DURATION_MS = 5000

export type ToastRecord = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration?: number
  href?: string
}

type ToastState = {
  toasts: ToastRecord[]
  push: (t: Omit<ToastRecord, 'id'> & { id?: string }) => string
  dismiss: (id: string) => void
}

const MAX_VISIBLE = 6
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearDismissTimer(id: string) {
  const timer = dismissTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    dismissTimers.delete(id)
  }
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = t.id ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `toast-${Date.now()}`)
    const duration = t.duration ?? TOAST_DEFAULT_DURATION_MS
    set((s) => ({
      toasts: [...s.toasts, { ...t, id, duration }].slice(-MAX_VISIBLE),
    }))
    clearDismissTimer(id)
    if (duration > 0 && Number.isFinite(duration)) {
      dismissTimers.set(
        id,
        setTimeout(() => {
          dismissTimers.delete(id)
          get().dismiss(id)
        }, duration),
      )
    }
    return id
  },
  dismiss: (id) => {
    clearDismissTimer(id)
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
  },
}))
