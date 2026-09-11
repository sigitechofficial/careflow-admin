import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_DEFAULT_DURATION_MS, useToastStore } from './toast.store'

describe('toast store auto-dismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.getState().toasts.forEach(t => useToastStore.getState().dismiss(t.id))
  })

  afterEach(() => {
    useToastStore.getState().toasts.forEach(t => useToastStore.getState().dismiss(t.id))
    vi.useRealTimers()
  })

  it('removes a toast after 5 seconds even if the UI keeps it open', () => {
    useToastStore.getState().push({ title: 'Carer SOS', variant: 'destructive' })
    expect(useToastStore.getState().toasts).toHaveLength(1)

    vi.advanceTimersByTime(TOAST_DEFAULT_DURATION_MS - 1)
    expect(useToastStore.getState().toasts).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('does not stay after the close button would have been ignored', () => {
    const id = useToastStore.getState().push({
      title: 'Carer SOS',
      variant: 'destructive',
      duration: 5000,
      href: '/ecm/live',
    })
    useToastStore.getState().dismiss(id)
    vi.advanceTimersByTime(5000)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
