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
): VisitPlanSlot[] {
  const sorted = sortMedicationRounds(toRoundLookup(rounds))
  const byCode = new Map(
    (existing ?? []).map(slot => [normalizeVisitPlanSlotCode(slot.slotCode), slot]),
  )

  return sorted.map((round, index) => {
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
      requiredCarers: prev?.requiredCarers ?? 1,
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
      slotEffectiveFrom: prev?.slotEffectiveFrom ?? SLOT_OPTION_DEFAULTS.slotEffectiveFrom,
      slotEffectiveTo: prev?.slotEffectiveTo ?? SLOT_OPTION_DEFAULTS.slotEffectiveTo,
      oneOffDate: prev?.oneOffDate ?? SLOT_OPTION_DEFAULTS.oneOffDate,
      allowBackfillDays: prev?.allowBackfillDays ?? SLOT_OPTION_DEFAULTS.allowBackfillDays,
      carerAssignments: prev?.carerAssignments ?? SLOT_OPTION_DEFAULTS.carerAssignments,
      exceptions: prev?.exceptions ?? SLOT_OPTION_DEFAULTS.exceptions,
    }
  })
}

export function defaultEditableVisitPlanSlots(rounds: RoundInput[]): VisitPlanSlot[] {
  return visitPlanSlotsFromMedicationRounds(rounds)
}
