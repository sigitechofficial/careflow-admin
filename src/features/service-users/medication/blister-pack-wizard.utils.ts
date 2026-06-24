import type { ServiceUserMedicationRow } from '@/features/service-users/types'
import {
  ADMINISTRATION_ROUNDS,
  type AdministrationRound,
  type PackWizardDetails,
} from './blister-pack-wizard.constants'

export function normalizeTime(value: string | null | undefined): string {
  if (!value) return ''
  const m = value.match(/^(\d{1,2}):(\d{2})/)
  if (!m?.[1] || !m[2]) return value.trim()
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'

export function formatDisplayDate(iso: string): string {
  return formatOrganisationDate(`${iso}T12:00:00`)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days - 1)
  return d.toISOString().slice(0, 10)
}

export function computeCycleEnd(startDate: string, cycleDays: number): string {
  if (!startDate || cycleDays < 1) return ''
  return addDays(startDate, cycleDays)
}

export function computeDurationSummary(startDate: string, cycleDays: number): string {
  if (!startDate || cycleDays < 1) return ''
  const end = computeCycleEnd(startDate, cycleDays)
  return `Pack lasts ${cycleDays} days · ${formatDisplayDate(startDate)} – ${formatDisplayDate(end)}`
}

export function roundLabelFromCodes(codes: Set<string>): string {
  const labels = ADMINISTRATION_ROUNDS.filter(r => codes.has(r.code)).map(r => r.name)
  return labels.join(' & ')
}

export function medScheduleRounds(med: ServiceUserMedicationRow): AdministrationRound[] {
  const times = new Set((med.schedules ?? []).map(s => normalizeTime(s.dueTime)).filter(Boolean))
  return ADMINISTRATION_ROUNDS.filter(r => times.has(r.time))
}

export function medMatchesRound(med: ServiceUserMedicationRow, round: AdministrationRound): boolean {
  const times = (med.schedules ?? []).map(s => normalizeTime(s.dueTime))
  return times.includes(round.time)
}

export function medMatchesCompartmentDueTime(
  schedules: Array<{ dueTime: string | null; dose?: string | null }> | undefined,
  compartmentDueTime: string,
): boolean {
  const target = normalizeTime(compartmentDueTime)
  return (schedules ?? []).some(s => normalizeTime(s.dueTime) === target)
}

export function scheduleForCompartment(
  schedules: Array<{ id?: string; dueTime: string | null; dose?: string | null }> | undefined,
  compartmentDueTime: string,
) {
  const target = normalizeTime(compartmentDueTime)
  return (schedules ?? []).find(s => normalizeTime(s.dueTime) === target)
}

export type GenerationPreviewLine = {
  name: string
  kind: 'ok' | 'warn' | 'prn'
  detail: string
  perDay: number
  events: number
}

export type GenerationPreview = {
  cycleDays: number
  generateDays: number
  lines: GenerationPreviewLine[]
  totalEvents: number
  rowsPerDay: number
  memberCount: number
  compartmentCount: number
  firstRecord: string
  lastRecord: string
  start: string
  end: string
}

export function computeGenerationPreview(
  details: PackWizardDetails,
  selectedRoundCodes: Set<string>,
  members: ServiceUserMedicationRow[],
): GenerationPreview | null {
  const start = details.startDate
  const cycleDays = details.cycleDurationDays
  const end = computeCycleEnd(start, cycleDays)
  if (!start || !cycleDays) return null

  const generateDays = Math.max(1, details.generateAheadDays || cycleDays)
  const packRounds = ADMINISTRATION_ROUNDS.filter(r => selectedRoundCodes.has(r.code))
  const lines: GenerationPreviewLine[] = []
  let totalEvents = 0
  let rowsPerDay = 0

  for (const med of members) {
    if ((med.medicationKind ?? 'REGULAR') === 'PRN') {
      lines.push({
        name: med.medicationName,
        kind: 'prn',
        detail: 'PRN — no pre-generated daily slots',
        perDay: 0,
        events: 0,
      })
      continue
    }

    const inPackSlots = medScheduleRounds(med).filter(r => selectedRoundCodes.has(r.code))
    if (!inPackSlots.length) {
      const outside = medScheduleRounds(med).filter(r => !selectedRoundCodes.has(r.code))
      lines.push({
        name: med.medicationName,
        kind: 'warn',
        detail: outside.length
          ? `Schedule (${outside.map(r => r.name).join(', ')}) does not match pack compartments`
          : 'No administration times — add schedule in step 3',
        perDay: 0,
        events: 0,
      })
      continue
    }

    const slotLabels = inPackSlots.map(r => `${r.emoji} ${r.name}`).join(' · ')
    const events = inPackSlots.length * generateDays
    totalEvents += events
    rowsPerDay += inPackSlots.length
    lines.push({
      name: med.medicationName,
      kind: 'ok',
      detail: slotLabels,
      perDay: inPackSlots.length,
      events,
    })
  }

  const firstRound = packRounds[0]
  const lastRound = packRounds[packRounds.length - 1]

  return {
    cycleDays,
    generateDays,
    lines,
    totalEvents,
    rowsPerDay,
    memberCount: members.length,
    compartmentCount: packRounds.length,
    firstRecord: firstRound ? `${formatDisplayDate(start)}, ${firstRound.time}` : '—',
    lastRecord: lastRound ? `${formatDisplayDate(end)}, ${lastRound.time}` : '—',
    start,
    end,
  }
}
