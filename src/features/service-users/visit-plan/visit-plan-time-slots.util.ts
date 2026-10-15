import type { MedicationRoundRow } from '@/features/settings/api/medication-settings.api'
import {
  normalizeDueTimeHm,
  sortMedicationRounds,
  type MedicationRoundLookup,
} from '@/features/service-users/medication/medication-time-slots'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

const SLOT_OPTION_DEFAULTS: Omit<
  VisitPlanSlot,
  | 'slotCode'
  | 'label'
  | 'daysOfWeek'
  | 'plannedStartTime'
  | 'plannedEndTime'
  | 'requiredCarers'
  | 'isEnabled'
  | 'medicationRoundCode'
  | 'notes'
  | 'sortOrder'
> = {
  scheduleFrequency: 'DAILY',
  repeatEvery: 1,
  repeatUnit: 'DAYS',
  timeCritical: false,
  timeToleranceMinutes: 30,
  durationMinutes: null,
  notesRequired: false,
  photoAllowed: false,
  shareOutcomeWithFamily: false,
  analysisArea: null,
  monthlyDayMode: 'BY_DATE',
  monthlyDaysOfMonth: [],
  monthlyPatternOrdinal: 'FIRST',
  monthlyPatternWeekday: 1,
  linkedCarePlanFormIds: [],
  assignedEmployeeIds: [],
  slotKind: 'STANDARD',
  nightDuty: 'NONE',
  slotEffectiveFrom: null,
  slotEffectiveTo: null,
  oneOffDate: null,
  allowBackfillDays: 0,
  carerAssignments: [],
  exceptions: [],
}

const LEGACY_SLOT_TO_ROUND: Record<string, string> = {
  LUNCH: 'MIDDAY',
  TEA: 'AFTERNOON',
}

export function normalizeVisitPlanSlotCode(code: string): string {
  const upper = code.trim().toUpperCase()
  return LEGACY_SLOT_TO_ROUND[upper] ?? upper
}

/**
 * A time slot can hold several visits. The first one uses the time slot's own code (`MORNING`);
 * each further visit is its own row with code `MORNING__2`, `MORNING__3`, … and stays linked to
 * the time slot through `medicationRoundCode`.
 */
const ADDITIONAL_VISIT_CODE_RE = /^(.+)__(\d+)$/

export function isAdditionalVisitSlotCode(code: string): boolean {
  return ADDITIONAL_VISIT_CODE_RE.test(code.trim().toUpperCase())
}

/** The time slot (round) code a plan row belongs to. */
export function visitPlanSlotRoundCode(slot: Pick<VisitPlanSlot, 'slotCode' | 'medicationRoundCode'>): string {
  const fromRound = slot.medicationRoundCode?.trim()
  if (fromRound) return normalizeVisitPlanSlotCode(fromRound)
  const code = normalizeVisitPlanSlotCode(slot.slotCode)
  return ADDITIONAL_VISIT_CODE_RE.exec(code)?.[1] ?? code
}

/** Next free row code for another visit in a time slot. */
export function nextAdditionalVisitSlotCode(roundCode: string, slots: Pick<VisitPlanSlot, 'slotCode'>[]): string {
  const taken = new Set(slots.map((s) => normalizeVisitPlanSlotCode(s.slotCode)))
  for (let n = 2; ; n += 1) {
    const code = `${roundCode}__${n}`
    if (!taken.has(code)) return code
  }
}

/** A blank, switched-on visit for a time slot, starting from that slot's window. */
export function newVisitPlanSlotForRound(
  round: MedicationRoundLookup | MedicationRoundRow,
  slotCode: string,
  opts?: { defaultRequiredCarers?: number },
): VisitPlanSlot {
  const start = hm(round.windowStart, hm(round.time, '08:00'))
  const end = hm(round.windowEnd, hm(round.time, '09:00'))
  return {
    ...SLOT_OPTION_DEFAULTS,
    slotCode,
    label: round.name,
    medicationRoundCode: round.code,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    plannedStartTime: start,
    plannedEndTime: end,
    requiredCarers: opts?.defaultRequiredCarers ?? 1,
    isEnabled: true,
    notes: '',
    sortOrder: round.sortOrder ?? 0,
  }
}

function hm(value: string | null | undefined, fallback: string): string {
  return normalizeDueTimeHm(value) ?? fallback
}

type RoundInput = MedicationRoundLookup | MedicationRoundRow

function toRoundLookup(rounds: RoundInput[]): MedicationRoundLookup[] {
  return rounds.map(r => ({
    id: r.id,
    name: r.name,
    code: r.code,
    time: r.time,
    windowStart: r.windowStart,
    windowEnd: r.windowEnd,
    sortOrder: r.sortOrder,
  }))
}

export function visitPlanSlotsFromMedicationRounds(
  rounds: RoundInput[],
  existing?: VisitPlanSlot[],
  opts?: { defaultRequiredCarers?: number },
): VisitPlanSlot[] {
  const sorted = sortMedicationRounds(toRoundLookup(rounds))
  const byCode = new Map(
    (existing ?? []).map(slot => [normalizeVisitPlanSlotCode(slot.slotCode), slot]),
  )

  const baseRows = sorted.map((round, index) => {
    const slotCode = round.code
    const prev = byCode.get(slotCode)
    const start = hm(round.windowStart, hm(round.time, '08:00'))
    const end = hm(round.windowEnd, hm(round.time, '09:00'))

    return {
      id: prev?.id,
      slotCode,
      label: round.name,
      medicationRoundCode: round.code,
      daysOfWeek: prev?.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 0],
      plannedStartTime: prev?.plannedStartTime ?? start,
      plannedEndTime: prev?.plannedEndTime ?? end,
      requiredCarers: prev?.requiredCarers ?? opts?.defaultRequiredCarers ?? 1,
      isEnabled: prev?.isEnabled ?? false,
      notes: prev?.notes ?? '',
      sortOrder: round.sortOrder ?? index,
      scheduleFrequency: prev?.scheduleFrequency ?? SLOT_OPTION_DEFAULTS.scheduleFrequency,
      repeatEvery: prev?.repeatEvery ?? SLOT_OPTION_DEFAULTS.repeatEvery,
      repeatUnit: prev?.repeatUnit ?? SLOT_OPTION_DEFAULTS.repeatUnit,
      timeCritical: prev?.timeCritical ?? SLOT_OPTION_DEFAULTS.timeCritical,
      timeToleranceMinutes: prev?.timeToleranceMinutes ?? SLOT_OPTION_DEFAULTS.timeToleranceMinutes,
      durationMinutes: prev?.durationMinutes ?? SLOT_OPTION_DEFAULTS.durationMinutes,
      notesRequired: prev?.notesRequired ?? SLOT_OPTION_DEFAULTS.notesRequired,
      photoAllowed: prev?.photoAllowed ?? SLOT_OPTION_DEFAULTS.photoAllowed,
      shareOutcomeWithFamily:
        prev?.shareOutcomeWithFamily ?? SLOT_OPTION_DEFAULTS.shareOutcomeWithFamily,
      analysisArea: prev?.analysisArea ?? SLOT_OPTION_DEFAULTS.analysisArea,
      monthlyDayMode: prev?.monthlyDayMode ?? SLOT_OPTION_DEFAULTS.monthlyDayMode,
      monthlyDaysOfMonth: prev?.monthlyDaysOfMonth ?? SLOT_OPTION_DEFAULTS.monthlyDaysOfMonth,
      monthlyPatternOrdinal:
        prev?.monthlyPatternOrdinal ?? SLOT_OPTION_DEFAULTS.monthlyPatternOrdinal,
      monthlyPatternWeekday:
        prev?.monthlyPatternWeekday ?? SLOT_OPTION_DEFAULTS.monthlyPatternWeekday,
      linkedCarePlanFormIds: prev?.linkedCarePlanFormIds ?? [],
      assignedEmployeeIds: prev?.assignedEmployeeIds ?? [],
      slotKind: prev?.slotKind ?? SLOT_OPTION_DEFAULTS.slotKind,
      nightDuty: prev?.nightDuty ?? SLOT_OPTION_DEFAULTS.nightDuty,
      slotEffectiveFrom: prev?.slotEffectiveFrom ?? SLOT_OPTION_DEFAULTS.slotEffectiveFrom,
      slotEffectiveTo: prev?.slotEffectiveTo ?? SLOT_OPTION_DEFAULTS.slotEffectiveTo,
      oneOffDate: prev?.oneOffDate ?? SLOT_OPTION_DEFAULTS.oneOffDate,
      allowBackfillDays: prev?.allowBackfillDays ?? SLOT_OPTION_DEFAULTS.allowBackfillDays,
      carerAssignments: prev?.carerAssignments ?? SLOT_OPTION_DEFAULTS.carerAssignments,
      exceptions: prev?.exceptions ?? SLOT_OPTION_DEFAULTS.exceptions,
    }
  })

  // Further visits saved for a time slot keep their own row, right after that slot's first row.
  const roundByCode = new Map(sorted.map((round) => [round.code, round]))
  const additional = (existing ?? [])
    .filter((slot) => isAdditionalVisitSlotCode(slot.slotCode) && roundByCode.has(visitPlanSlotRoundCode(slot)))
    .map((slot) => {
      const round = roundByCode.get(visitPlanSlotRoundCode(slot))!
      return {
        ...SLOT_OPTION_DEFAULTS,
        ...slot,
        slotCode: normalizeVisitPlanSlotCode(slot.slotCode),
        label: round.name,
        medicationRoundCode: round.code,
        sortOrder: round.sortOrder ?? 0,
      }
    })
    .sort((a, b) => a.slotCode.localeCompare(b.slotCode, undefined, { numeric: true }))

  return baseRows.flatMap((row) => [
    row,
    ...additional.filter((slot) => visitPlanSlotRoundCode(slot) === row.slotCode),
  ])
}

export function defaultEditableVisitPlanSlots(rounds: RoundInput[]): VisitPlanSlot[] {
  return visitPlanSlotsFromMedicationRounds(rounds)
}
