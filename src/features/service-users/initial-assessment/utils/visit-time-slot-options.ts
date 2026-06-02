import {
  DEFAULT_ADMINISTRATION_ROUNDS,
  formatRoundLabel,
  type MedicationRoundLookup,
} from '@/features/service-users/medication/medication-time-slots'
import { resolveQuestionOptions, type QuestionOption } from '@/features/service-users/initial-assessment/utils/question-options'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

export type VisitTimeSlotOption = {
  value: string
  label: string
  displayLabel: string
  defaultFrom?: string
  defaultTo?: string
  roundId?: string
  sortOrder: number
}

function hm(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim())
  if (!m?.[1] || !m[2]) return undefined
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

/** Same catalogue as medication “at times” slots (settings / medication-lookups rounds). */
export function visitTimeSlotOptionsFromRounds(rounds: MedicationRoundLookup[]): VisitTimeSlotOption[] {
  const sorted = [...rounds].sort(
    (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99) || a.name.localeCompare(b.name),
  )
  const source =
    sorted.length > 0
      ? sorted
      : DEFAULT_ADMINISTRATION_ROUNDS.map((r, i) => ({
          id: r.code,
          name: r.name,
          code: r.code,
          time: r.time,
          windowStart: r.windowStart,
          windowEnd: r.windowEnd,
          sortOrder: i + 1,
        }))

  return source.map((r) => ({
    value: r.code,
    label: r.name,
    displayLabel: formatRoundLabel(r.name),
    defaultFrom: hm(r.windowStart),
    defaultTo: hm(r.windowEnd),
    roundId: r.id,
    sortOrder: r.sortOrder ?? 99,
  }))
}

function questionOptionsToVisitSlots(options: QuestionOption[]): VisitTimeSlotOption[] {
  return options.map((o, i) => {
    const range = o.label.match(/\((\d{2}:\d{2})-(\d{2}:\d{2})\)/)
    const open = o.label.match(/\((\d{2}:\d{2})\+\)/)
    return {
      value: o.value,
      label: o.label.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      displayLabel: o.label,
      defaultFrom: range?.[1] ?? open?.[1],
      defaultTo: range?.[2] ?? (open ? '23:59' : undefined),
      sortOrder: i + 1,
    }
  })
}

export function resolveVisitTimeSlotOptions(
  question: InitialAssessmentQuestion,
  rounds?: MedicationRoundLookup[],
): VisitTimeSlotOption[] {
  if (rounds && rounds.length > 0) {
    return visitTimeSlotOptionsFromRounds(rounds)
  }
  const fromQuestion = questionOptionsToVisitSlots(resolveQuestionOptions(question))
  if (fromQuestion.length > 0) return fromQuestion
  return visitTimeSlotOptionsFromRounds([])
}
