import type { AuditEvent } from '@/features/auth/types'

const MAX = 400

let buffer: AuditEvent[] = []

export function getAuditBuffer(): AuditEvent[] {
  return [...buffer]
}

export function appendAuditEvent(e: Omit<AuditEvent, 'id'>): AuditEvent {
  const full: AuditEvent = { ...e, id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }
  buffer = [full, ...buffer].slice(0, MAX)
  try {
    localStorage.setItem('care-admin-audit', JSON.stringify(buffer))
  } catch {
    /* ignore quota */
  }
  return full
}

export function loadAuditFromStorage(): void {
  try {
    const raw = localStorage.getItem('care-admin-audit')
    if (raw) buffer = JSON.parse(raw) as AuditEvent[]
  } catch {
    buffer = []
  }
}
