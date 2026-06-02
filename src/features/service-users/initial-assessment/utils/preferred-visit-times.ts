import type { MedicationRoundLookup } from '@/features/service-users/medication/medication-time-slots'
import {
  resolveVisitTimeSlotOptions,
  type VisitTimeSlotOption,
} from '@/features/service-users/initial-assessment/utils/visit-time-slot-options'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'

export type PreferredVisitTimeSlotState = {
  selected: boolean
  from?: string
  to?: string
  roundName?: string
}

export type PreferredVisitTimesValue = Record<string, PreferredVisitTimeSlotState>

/** Legacy IA seed values → medication administration round codes. */
const LEGACY_SLOT_TO_ROUND_CODE: Record<string, string> = {
  early_morning: 'MORNING',
  morning: 'MORNING',
  lunch_time: 'MIDDAY',
  afternoon: 'AFTERNOON',
  early_evening: 'EVENING',
  night: 'NIGHT',
  flexible: 'FLEXIBLE',
}

function normalizeSlotKey(key: string, options: VisitTimeSlotOption[]): string {
  const upper = key.toUpperCase()
  if (options.some((o) => o.value === upper)) return upper
  if (options.some((o) => o.value === key)) return key
  const mapped = LEGACY_SLOT_TO_ROUND_CODE[key.toLowerCase()]
  if (mapped && options.some((o) => o.value === mapped)) return mapped
  return key
}

export function preferredVisitTimesQuestion(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion | undefined {
  return questions.find(isPreferredVisitTimesQuestion)
}

export function questionsWithoutPreferredVisitTimes(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter((q) => !isPreferredVisitTimesQuestion(q))
}

export function isPreferredVisitTimesQuestion(question: InitialAssessmentQuestion): boolean {
  const fieldKey = question.metadata?.fieldKey
  if (fieldKey === 'preferredVisitTimes') return true
  return question.questionText.toLowerCase().includes('preferred visit times')
}

export function isFlexibleVisitSlot(value: string, options: VisitTimeSlotOption[]): boolean {
  return value === 'FLEXIBLE' || (options.length === 0 && value.toLowerCase() === 'flexible')
}

function defaultsForOption(opt: VisitTimeSlotOption): { from?: string; to?: string } {
  return { from: opt.defaultFrom, to: opt.defaultTo }
}

export function parsePreferredVisitTimesValue(
  raw: unknown,
  options: VisitTimeSlotOption[],
): PreferredVisitTimesValue {
  const byValue = new Map(options.map((o) => [o.value, o]))
  const emptyState = (): PreferredVisitTimesValue => {
    const next: PreferredVisitTimesValue = {}
    for (const opt of options) {
      next[opt.value] = {
        selected: false,
        ...defaultsForOption(opt),
        roundName: opt.label,
      }
    }
    return next
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const base = emptyState()
    for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
      const slotKey = normalizeSlotKey(key, options)
      const opt = byValue.get(slotKey)
      if (!opt) continue
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const row = entry as Record<string, unknown>
        const defaults = defaultsForOption(opt)
        base[slotKey] = {
          selected: row.selected === true,
          from: typeof row.from === 'string' ? row.from : defaults.from,
          to: typeof row.to === 'string' ? row.to : defaults.to,
          roundName: typeof row.roundName === 'string' ? row.roundName : opt.label,
        }
      } else if (entry === true) {
        base[slotKey] = { selected: true, ...defaultsForOption(opt), roundName: opt.label }
      }
    }
    return base
  }

  const selectedKeys = new Set<string>()
  if (Array.isArray(raw)) {
    for (const item of raw) selectedKeys.add(normalizeSlotKey(String(item), options))
  } else if (typeof raw === 'string' && raw.trim()) {
    selectedKeys.add(normalizeSlotKey(raw.trim(), options))
  }

  const base = emptyState()
  for (const key of selectedKeys) {
    const opt = byValue.get(key)
    if (!opt || !base[key]) continue
    base[key] = { selected: true, ...defaultsForOption(opt), roundName: opt.label }
  }
  return base
}

export function serializePreferredVisitTimesValue(
  state: PreferredVisitTimesValue,
  options: VisitTimeSlotOption[],
): PreferredVisitTimesValue {
  const next: PreferredVisitTimesValue = {}
  for (const [key, slot] of Object.entries(state)) {
    if (!slot.selected) continue
    const opt = options.find((o) => o.value === key)
    if (isFlexibleVisitSlot(key, options)) {
      next[key] = { selected: true, roundName: opt?.label ?? 'Flexible' }
    } else {
      next[key] = {
        selected: true,
        from: slot.from?.trim() || undefined,
        to: slot.to?.trim() || undefined,
        roundName: slot.roundName ?? opt?.label,
      }
    }
  }
  return next
}

export function hasPreferredVisitTimesAnswer(
  value: InitialAssessmentAnswerInput | undefined,
  question: InitialAssessmentQuestion,
  rounds?: MedicationRoundLookup[],
): boolean {
  if (!value?.selectedOptions) return false
  const options = resolveVisitTimeSlotOptions(question, rounds)
  const parsed = parsePreferredVisitTimesValue(value.selectedOptions, options)
  return Object.values(parsed).some((slot) => slot.selected)
}

export function formatPreferredVisitTimesAnswer(
  value: InitialAssessmentAnswerInput | undefined,
  question: InitialAssessmentQuestion,
  rounds?: MedicationRoundLookup[],
): string {
  const options = resolveVisitTimeSlotOptions(question, rounds)
  const parsed = parsePreferredVisitTimesValue(value?.selectedOptions, options)
  const parts: string[] = []
  for (const opt of options) {
    const slot = parsed[opt.value]
    if (!slot?.selected) continue
    if (isFlexibleVisitSlot(opt.value, options)) {
      parts.push(opt.displayLabel)
      continue
    }
    const name = slot.roundName ?? opt.label
    const from = slot.from?.trim()
    const to = slot.to?.trim()
    if (from && to) parts.push(`${name} (${from}–${to})`)
    else parts.push(opt.displayLabel)
  }
  return parts.length ? parts.join('; ') : '—'
}

export function multiSelectHasAnswer(
  value: InitialAssessmentAnswerInput | undefined,
  question: InitialAssessmentQuestion,
): boolean {
  if (isPreferredVisitTimesQuestion(question)) {
    return hasPreferredVisitTimesAnswer(value, question)
  }
  const opts = value?.selectedOptions
  if (Array.isArray(opts)) return opts.length > 0
  if (typeof opts === 'string') return opts.length > 0
  if (opts && typeof opts === 'object') return Object.keys(opts as object).length > 0
  return false
}
