import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'warning' | 'destructive'

export type ToastRecord = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration?: number
}

type ToastState = {
  toasts: ToastRecord[]
  push: (t: Omit<ToastRecord, 'id'> & { id?: string }) => string
  dismiss: (id: string) => void
}

const MAX_VISIBLE = 6

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = t.id ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `toast-${Date.now()}`)
    set((s) => ({
      toasts: [...s.toasts, { ...t, id }].slice(-MAX_VISIBLE),
    }))
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))
