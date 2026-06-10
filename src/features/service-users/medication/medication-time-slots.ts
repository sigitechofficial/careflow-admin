/** Five MAR administration rounds — spec §5 / settings defaults. */
export const DEFAULT_ADMINISTRATION_ROUNDS = [
  { name: 'Morning', code: 'MORNING', time: '08:00', windowStart: '07:00', windowEnd: '10:00' },
  { name: 'Midday', code: 'MIDDAY', time: '12:00', windowStart: '11:00', windowEnd: '14:00' },
  { name: 'Afternoon', code: 'AFTERNOON', time: '15:00', windowStart: '14:00', windowEnd: '17:00' },
  { name: 'Evening', code: 'EVENING', time: '18:00', windowStart: '17:00', windowEnd: '20:00' },
  { name: 'Night', code: 'NIGHT', time: '22:00', windowStart: '20:00', windowEnd: '23:59' },
] as const

const ROUND_EMOJI: Record<string, string> = {
  Morning: '🌅',
  Midday: '☀',
  Afternoon: '☀',
  Evening: '🌆',
  Night: '🌙',
}

export type MedicationRoundLookup = {
  id: string
  name: string
  code: string
  time?: string | null
  windowStart?: string | null
  windowEnd?: string | null
  sortOrder?: number | null
}

export type MedicationTimeSlot = {
  id: string
  roundId?: string
  roundName?: string
  dueTime: string
  /** Dose at this administration time; empty = use medication default dose */
  dose: string
  carePlanAction: string
}

export function formatRoundLabel(name: string): string {
  const emoji = ROUND_EMOJI[name] ?? ''
  return emoji ? `${emoji} ${name}` : name
}

export function newTimeSlot(partial?: Partial<MedicationTimeSlot>): MedicationTimeSlot {
  return {
    id: crypto.randomUUID(),
    roundId: partial?.roundId,
    roundName: partial?.roundName,
    dueTime: partial?.dueTime ?? '',
    dose: partial?.dose ?? '',
    carePlanAction: partial?.carePlanAction ?? '',
  }
}

export function timeSlotsFromRounds(rounds: MedicationRoundLookup[]): MedicationTimeSlot[] {
  const sorted = sortMedicationRounds(rounds)
  if (sorted.length === 0) {
    return DEFAULT_ADMINISTRATION_ROUNDS.map(r =>
      newTimeSlot({ roundName: r.name, dueTime: r.time }),
    )
  }
  return sorted.map(r =>
    newTimeSlot({
      roundId: r.id,
      roundName: r.name,
      dueTime: (r.time ?? '').slice(0, 5),
    }),
  )
}

export function normalizeDueTimeHm(dueTime: string | null | undefined): string | null {
  if (!dueTime) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(dueTime.trim())
  if (!m?.[1] || !m[2]) return null
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function isHmLabel(value: string | null | undefined): boolean {
  if (!value?.trim()) return false
  return /^\d{1,2}:\d{2}$/.test(value.trim())
}

/** Match due time to round by window when not an exact round anchor time (e.g. 07:00 → Morning). */
export function roundNameFromDueTime(dueTime: string | null | undefined): string | null {
  const hm = normalizeDueTimeHm(dueTime)
  if (!hm) return null
  const exact = DEFAULT_ADMINISTRATION_ROUNDS.find(r => r.time === hm)
  if (exact) return exact.name
  const dueM = hmToMinutes(hm)
  for (const r of DEFAULT_ADMINISTRATION_ROUNDS) {
    const ws = normalizeDueTimeHm(r.windowStart)
    const we = normalizeDueTimeHm(r.windowEnd)
    if (!ws || !we) continue
    if (dueM >= hmToMinutes(ws) && dueM <= hmToMinutes(we)) return r.name
  }
  return null
}

export const CUSTOM_ROUND_VALUE = '__custom__'

export function sortMedicationRounds(rounds: MedicationRoundLookup[]): MedicationRoundLookup[] {
  return [...rounds].sort(
    (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || a.name.localeCompare(b.name),
  )
}

export function findMedicationRound(
  rounds: MedicationRoundLookup[],
  roundId: string | undefined,
): MedicationRoundLookup | undefined {
  if (!roundId) return undefined
  return rounds.find(r => r.id === roundId)
}

export function nextUnusedMedicationRound(
  rounds: MedicationRoundLookup[],
  usedRoundIds: Iterable<string>,
): MedicationRoundLookup | undefined {
  const used = new Set(usedRoundIds)
  return sortMedicationRounds(rounds).find(r => !used.has(r.id))
}

export function slotFromRound(round: MedicationRoundLookup): MedicationTimeSlot {
  return newTimeSlot({
    roundId: round.id,
    roundName: round.name,
    dueTime: normalizeDueTimeHm(round.time) ?? '',
  })
}

export function matchRoundIdByTime(
  rounds: MedicationRoundLookup[],
  dueTime: string,
): string | undefined {
  const hm = normalizeDueTimeHm(dueTime)
  if (!hm) return undefined
  const exact = rounds.find(r => normalizeDueTimeHm(r.time) === hm)
  if (exact) return exact.id
  const defaults = DEFAULT_ADMINISTRATION_ROUNDS.find(r => r.time === hm)
  if (!defaults) return undefined
  return rounds.find(r => r.code === defaults.code || r.name === defaults.name)?.id
}
