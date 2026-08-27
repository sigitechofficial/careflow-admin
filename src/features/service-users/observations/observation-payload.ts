import type { ServiceUserObservationRow } from '@/features/service-users/api/observations-api'
import {
  abcOptionLabel,
  ABC_BEHAVIOUR_TYPES,
  ABC_LOCATIONS,
  ABC_PRESENTATIONS,
  ABC_RISK_LEVELS,
} from '@/features/service-users/observations/observation-abc-catalog'
import {
  seizureOptionLabel,
  SEIZURE_AFTER,
  SEIZURE_DURING,
  SEIZURE_INTERVENTIONS,
  SEIZURE_PRE_WARNING,
  SEIZURE_TRIGGERS,
} from '@/features/service-users/observations/observation-seizure-catalog'
import {
  infectionTypeLabel,
  yesNoLabel,
} from '@/features/service-users/observations/observation-infection-catalog'
import { calculateNews2Score, type News2Payload } from '@/features/service-users/observations/news2-score'

export type { News2Payload }
import {
  dipstickLabel,
  urinalysisOptionLabel,
  URINE_OBSERVATIONS,
} from '@/features/service-users/observations/observation-urinalysis-catalog'
import {
  parseSleepReasonCodes,
  SLEEP_QUALITY_OPTIONS,
  SLEEP_REASON_OPTIONS,
  sleepOptionLabel,
  sleepQualityNeedsReasons,
} from '@/features/service-users/observations/observation-sleep-catalog'
import {
  ALIGN_FORMS,
  alignOptionLabel,
  isAlignFieldVisible,
  parseAlignCsv,
} from '@/features/service-users/observations/observation-align-catalog'

export type InfectionPayload = {
  infectionType: string
  infectionCleared?: boolean
  hospitalisation?: boolean
  isolationRequired?: boolean
}

export type UrinalysisPayload = {
  observationOfUrine?: string
  observationOfUrineOther?: string
  dipstick: string
  actionTaken?: string
  furtherTestingResult?: string
  furtherTestingDate?: string
}

export type SeizureChartPayload = {
  otherLocation?: string
  description: string
  triggers?: string
  triggersOther?: string
  preSeizure?: string
  preSeizureOther?: string
  feltIfAble?: string
  during?: string
  duringOther?: string
  lengthOfSeizure?: string
  after?: string
  afterOther?: string
  recoveryPeriod?: string
  interventions?: string
  interventionsOther?: string
  actionTaken?: string
}

export type AbcPatternsPayload = {
  location?: string
  antecedent: string
  behaviour: string
  consequences: string
  actionTaken: string
  riskLevel: string
  behaviourType?: string
  presentation?: string
  appearanceDetails?: string
  othersPresent?: string
  personSaid?: string
  behaviourDuration?: string
  situationDurationMinutes?: number | null
}

export const BP_SITUATION_OPTIONS = [
  { value: 'NONE_RECORDED', label: 'None recorded' },
  { value: 'SITTING', label: 'Sitting' },
  { value: 'STANDING', label: 'Standing' },
  { value: 'LYING', label: 'Lying' },
  { value: 'LEFT_ARM', label: 'Left arm' },
  { value: 'RIGHT_ARM', label: 'Right arm' },
] as const

export type BloodPressurePayload = {
  systolic: number
  diastolic: number
  situation: string
}

export type FluidMonitorPayload = {
  fluidOutMl: number | null
  fluidInMl: number | null
}

export type ObservationFormVariant =
  | 'numeric'
  | 'wellbeing'
  | 'blood_pressure'
  | 'fluid_monitor'
  | 'falls'
  | 'bowel_movement'
  | 'meals'
  | 'repositioning'
  | 'abc_patterns'
  | 'seizure_chart'
  | 'urinalysis'
  | 'infection'
  | 'news2'
  | 'sleep'
  | 'continence'
  | 'peg_enteral'
  | 'skin_integrity'
  | 'body_map'

export function getObservationFormVariant(typeCode: string): ObservationFormVariant {
  switch (typeCode) {
    case 'WELLBEING':
      return 'wellbeing'
    case 'BLOOD_PRESSURE':
      return 'blood_pressure'
    case 'FLUID_MONITOR':
      return 'fluid_monitor'
    case 'FALLS':
      return 'falls'
    case 'BOWEL_MOVEMENT':
      return 'bowel_movement'
    case 'MEALS':
      return 'meals'
    case 'REPOSITIONING':
      return 'repositioning'
    case 'ABC_PATTERNS':
      return 'abc_patterns'
    case 'SEIZURE_CHART':
      return 'seizure_chart'
    case 'URINALYSIS':
      return 'urinalysis'
    case 'INFECTION':
      return 'infection'
    case 'SKIN_INTEGRITY':
      return 'skin_integrity'
    case 'BODY_MAP':
      return 'body_map'
    case 'CONTINENCE':
      return 'continence'
    case 'PEG_ENTERAL':
      return 'peg_enteral'
    case 'NEWS2':
      return 'news2'
    case 'SLEEP':
      return 'sleep'
    default:
      return 'numeric'
  }
}

export function payloadRecord(row: ServiceUserObservationRow): Record<string, unknown> {
  if (!row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload)) return {}
  return row.payload as Record<string, unknown>
}

export function bpSituationLabel(code: string): string {
  return BP_SITUATION_OPTIONS.find(o => o.value === code)?.label ?? code.replace(/_/g, ' ')
}

export function formatBloodPressureHistory(row: ServiceUserObservationRow): string {
  const p = payloadRecord(row) as Partial<BloodPressurePayload>
  if (p.systolic != null && p.diastolic != null) {
    return `${p.systolic}/${p.diastolic}`
  }
  return '—'
}

export function formatBloodPressureSituation(row: ServiceUserObservationRow): string {
  const p = payloadRecord(row) as Partial<BloodPressurePayload>
  if (!p.situation) return '—'
  return bpSituationLabel(String(p.situation))
}

export function formatFluidHistory(row: ServiceUserObservationRow): string {
  const p = payloadRecord(row) as Partial<FluidMonitorPayload>
  const out = p.fluidOutMl
  const inn = p.fluidInMl
  const parts: string[] = []
  if (out != null && out > 0) parts.push(`Out ${out}`)
  if (inn != null && inn > 0) parts.push(`In ${inn}`)
  if (!parts.length) return '—'
  return parts.join(' · ')
}

export function formatNumericHistory(row: ServiceUserObservationRow, unitSuffix?: string): string {
  if (row.numericValue == null) return '—'
  const unit = unitSuffix ?? row.unit ?? ''
  return `${row.numericValue}${unit ? ` ${unit}` : ''}`
}

export function formatGenericPayloadHistory(row: ServiceUserObservationRow, keys: string[]): string {
  const p = payloadRecord(row)
  const parts = keys
    .map(k => {
      const v = p[k]
      if (v == null || v === '') return null
      return String(v)
    })
    .filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

export type HistoryColumn = { key: string; label: string }

export function historyColumnsForType(typeCode: string): HistoryColumn[] {
  const base = [
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
  ]
  switch (typeCode) {
    case 'BLOOD_PRESSURE':
      return [
        ...base,
        { key: 'bp', label: 'BP (Systolic/Diastolic)' },
        { key: 'situation', label: 'Situation' },
        { key: 'carer', label: 'Carer' },
        { key: 'notes', label: 'Notes' },
      ]
    case 'FLUID_MONITOR':
      return [
        ...base,
        { key: 'fluid', label: 'Fluid (ml)' },
        { key: 'carer', label: 'Carer' },
        { key: 'notes', label: 'Notes' },
      ]
    case 'RESPIRATION':
      return [...base, { key: 'value', label: 'RPM' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'TEMPERATURE':
      return [...base, { key: 'value', label: 'Temp °C' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'OXYGEN_SATURATION':
      return [
        ...base,
        { key: 'value', label: 'Oxygen Saturation %' },
        { key: 'carer', label: 'Carer' },
        { key: 'notes', label: 'Notes' },
      ]
    case 'PULSE':
      return [...base, { key: 'value', label: 'Pulse Rate' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'WEIGHT':
      return [...base, { key: 'value', label: 'KG' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'FALLS':
      return [...base, { key: 'value', label: 'Fall' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'BOWEL_MOVEMENT':
      return [...base, { key: 'value', label: 'Bowel' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'MEALS':
      return [...base, { key: 'value', label: 'Meal' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'REPOSITIONING':
      return [...base, { key: 'value', label: 'Position' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'CONTINENCE':
      return [...base, { key: 'value', label: 'Continence' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'PEG_ENTERAL':
      return [...base, { key: 'value', label: 'PEG' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'SKIN_INTEGRITY':
    case 'BODY_MAP':
      return [...base, { key: 'value', label: 'Skin' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
    case 'ABC_PATTERNS':
      return [
        ...base,
        { key: 'location', label: 'Location' },
        { key: 'risk', label: 'Risk' },
        { key: 'behaviourType', label: 'Behaviour type' },
        { key: 'abcSummary', label: 'ABC summary' },
        { key: 'carer', label: 'Carer' },
      ]
    case 'SEIZURE_CHART':
      return [
        ...base,
        { key: 'description', label: 'Description' },
        { key: 'length', label: 'Length' },
        { key: 'triggers', label: 'Triggers' },
        { key: 'during', label: 'During' },
        { key: 'after', label: 'After' },
        { key: 'carer', label: 'Carer' },
      ]
    case 'URINALYSIS':
      return [
        ...base,
        { key: 'observation', label: 'Observation' },
        { key: 'dipstick', label: 'Dipstick' },
        { key: 'actionTaken', label: 'Action taken' },
        { key: 'furtherTesting', label: 'Further testing' },
        { key: 'carer', label: 'Carer' },
      ]
    case 'INFECTION':
      return [
        ...base,
        { key: 'infectionType', label: 'Infection type' },
        { key: 'cleared', label: 'Cleared' },
        { key: 'hospitalisation', label: 'Hospitalisation' },
        { key: 'isolation', label: 'Isolation' },
        { key: 'carer', label: 'Carer' },
        { key: 'notes', label: 'Notes' },
      ]
    case 'NEWS2':
      return [
        ...base,
        { key: 'score', label: 'Score' },
        { key: 'carer', label: 'Employee Name' },
        { key: 'notes', label: 'Notes' },
      ]
    case 'SLEEP':
      return [
        ...base,
        { key: 'sleepQuality', label: 'Sleep' },
        { key: 'sleepReasons', label: 'Likely reason' },
        { key: 'carer', label: 'Carer' },
        { key: 'notes', label: 'Notes' },
      ]
    default:
      return [...base, { key: 'value', label: 'Value' }, { key: 'carer', label: 'Carer' }, { key: 'notes', label: 'Notes' }]
  }
}

export function historyCellValue(row: ServiceUserObservationRow, columnKey: string): string {
  switch (columnKey) {
    case 'date':
      return formatDmyLocal(row.recordedAt)
    case 'time':
      return formatTimeLocal(row.recordedAt)
    case 'bp':
      return formatBloodPressureHistory(row)
    case 'situation':
      return formatBloodPressureSituation(row)
    case 'fluid':
      return formatFluidHistory(row)
    case 'carer':
      return row.carerName ?? '—'
    case 'notes':
      return row.notes?.trim() || '—'
    case 'location':
      return abcOptionLabel(ABC_LOCATIONS, String(payloadRecord(row).location ?? ''))
    case 'risk':
      return abcOptionLabel(ABC_RISK_LEVELS, String(payloadRecord(row).riskLevel ?? ''))
    case 'behaviourType':
      return abcOptionLabel(ABC_BEHAVIOUR_TYPES, String(payloadRecord(row).behaviourType ?? ''))
    case 'abcSummary':
      return formatAbcSummary(row)
    case 'description':
      return formatSeizureDescription(row)
    case 'length':
      return String((payloadRecord(row) as Partial<SeizureChartPayload>).lengthOfSeizure ?? '—')
    case 'triggers': {
      const p = payloadRecord(row) as Partial<SeizureChartPayload>
      const label = seizureOptionLabel(SEIZURE_TRIGGERS, p.triggers)
      return p.triggersOther?.trim() ? `${label} (${p.triggersOther})` : label
    }
    case 'during': {
      const p = payloadRecord(row) as Partial<SeizureChartPayload>
      const label = seizureOptionLabel(SEIZURE_DURING, p.during)
      return p.duringOther?.trim() ? `${label} (${p.duringOther})` : label
    }
    case 'after': {
      const p = payloadRecord(row) as Partial<SeizureChartPayload>
      const label = seizureOptionLabel(SEIZURE_AFTER, p.after)
      return p.afterOther?.trim() ? `${label} (${p.afterOther})` : label
    }
    case 'observation':
      return formatUrinalysisObservation(row)
    case 'dipstick':
      return dipstickLabel(String((payloadRecord(row) as Partial<UrinalysisPayload>).dipstick ?? ''))
    case 'actionTaken':
      return String((payloadRecord(row) as Partial<UrinalysisPayload>).actionTaken ?? '—') || '—'
    case 'furtherTesting': {
      const p = payloadRecord(row) as Partial<UrinalysisPayload>
      const parts: string[] = []
      if (p.furtherTestingResult?.trim()) parts.push(p.furtherTestingResult.trim())
      if (p.furtherTestingDate?.trim()) parts.push(p.furtherTestingDate.trim())
      return parts.length ? parts.join(' · ') : '—'
    }
    case 'infectionType':
      return infectionTypeLabel(
        String((payloadRecord(row) as Partial<InfectionPayload>).infectionType ?? ''),
      )
    case 'cleared':
      return yesNoLabel((payloadRecord(row) as Partial<InfectionPayload>).infectionCleared)
    case 'hospitalisation':
      return yesNoLabel((payloadRecord(row) as Partial<InfectionPayload>).hospitalisation)
    case 'isolation':
      return yesNoLabel((payloadRecord(row) as Partial<InfectionPayload>).isolationRequired)
    case 'score':
      return row.numericValue != null ? String(row.numericValue) : '—'
    case 'sleepQuality':
      return formatSleepQualityHistory(row)
    case 'sleepReasons':
      return formatSleepReasonsHistory(row)
    case 'value':
      return historyValueForRow(row)
    default:
      return '—'
  }
}

export function formatAbcSummary(row: ServiceUserObservationRow): string {
  const p = payloadRecord(row) as Partial<AbcPatternsPayload>
  const parts: string[] = []
  if (p.antecedent) parts.push(`A: ${truncate(p.antecedent, 40)}`)
  if (p.behaviour || (p as { behavior?: string }).behavior) {
    parts.push(`B: ${truncate(String(p.behaviour ?? (p as { behavior?: string }).behavior), 40)}`)
  }
  if (p.consequences || (p as { consequence?: string }).consequence) {
    parts.push(`C: ${truncate(String(p.consequences ?? (p as { consequence?: string }).consequence), 40)}`)
  }
  return parts.length ? parts.join(' · ') : '—'
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

export function formatUrinalysisObservation(row: ServiceUserObservationRow): string {
  const p = payloadRecord(row) as Partial<UrinalysisPayload>
  const label = urinalysisOptionLabel(URINE_OBSERVATIONS, p.observationOfUrine)
  if (p.observationOfUrine === 'OTHER' && p.observationOfUrineOther?.trim()) {
    return p.observationOfUrineOther.trim()
  }
  return label
}

export function formatInfectionHistory(row: ServiceUserObservationRow): string {
  const p = payloadRecord(row) as Partial<InfectionPayload>
  return infectionTypeLabel(p.infectionType)
}

function sleepReasonsFromPayload(p: Record<string, unknown>): string[] {
  if (Array.isArray(p.reasons)) {
    return p.reasons.map(item => String(item).trim()).filter(Boolean)
  }
  if (typeof p.reasons === 'string' && p.reasons.trim()) {
    return parseSleepReasonCodes(p.reasons)
  }
  if (typeof p.reason === 'string' && p.reason.trim()) {
    return parseSleepReasonCodes(p.reason)
  }
  return []
}

export function formatSleepQualityHistory(row: ServiceUserObservationRow): string {
  const p = payloadRecord(row)
  return sleepOptionLabel(SLEEP_QUALITY_OPTIONS, typeof p.quality === 'string' ? p.quality : '')
}

export function formatSleepReasonsHistory(row: ServiceUserObservationRow): string {
  const p = payloadRecord(row)
  const quality = typeof p.quality === 'string' ? p.quality : ''
  if (!sleepQualityNeedsReasons(quality)) return '—'
  const labels = sleepReasonsFromPayload(p).map(code => sleepOptionLabel(SLEEP_REASON_OPTIONS, code))
  return labels.length ? labels.join(', ') : '—'
}

export function formatSleepSummaryHistory(row: ServiceUserObservationRow): string {
  const quality = formatSleepQualityHistory(row)
  if (quality === '—') return formatNumericHistory(row)
  const reasons = formatSleepReasonsHistory(row)
  return reasons === '—' ? quality : `${quality} · ${reasons}`
}

const ALIGN_VARIANT_BY_TYPE: Record<string, string> = {
  CONTINENCE: 'continence',
  PEG_ENTERAL: 'peg_enteral',
  SKIN_INTEGRITY: 'skin_integrity',
  BODY_MAP: 'body_map',
  BOWEL_MOVEMENT: 'bowel_movement',
  FALLS: 'falls',
  REPOSITIONING: 'repositioning',
  MEALS: 'meals',
}

function alignCodesFromPayload(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(item => String(item).trim()).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) return parseAlignCsv(raw)
  return []
}

export function formatAlignHistorySummary(row: ServiceUserObservationRow, typeCode: string): string {
  const variant = ALIGN_VARIANT_BY_TYPE[typeCode]
  const def = variant ? ALIGN_FORMS[variant] : undefined
  const p = payloadRecord(row)
  if (!def) {
    return formatGenericPayloadHistory(row, Object.keys(p).slice(0, 4))
  }
  const parts: string[] = []
  for (const field of def.fields) {
    if (field.kind === 'hint') continue
    const raw = p[field.key]
    if (raw == null || raw === '') continue
    if (field.kind === 'number') {
      parts.push(String(raw))
      continue
    }
    if (field.kind === 'multi') {
      const labels = alignCodesFromPayload(raw).map(code => alignOptionLabel(field.options, code))
      if (labels.length) parts.push(labels.join(', '))
      continue
    }
    parts.push(alignOptionLabel(field.options, String(raw)))
  }
  if (parts.length) return parts.join(' · ')
  if (p.hadFall === true || p.hadFall === 'true') return 'Yes'
  if (p.hadFall === false || p.hadFall === 'false') return 'No'
  if (typeof p.bowelType === 'string') return String(p.bowelType)
  if (typeof p.mealType === 'string') {
    return [p.mealType, p.intakeLevel].filter(Boolean).join(' · ')
  }
  if (typeof p.position === 'string') return String(p.position)
  return '—'
}

export function buildAlignCreatePayload(
  variant: string,
  draft: CompositeDraft,
): { payload?: Record<string, unknown>; error?: string } {
  const def = ALIGN_FORMS[variant]
  if (!def) return { error: 'Unsupported observation type.' }
  const payload: Record<string, unknown> = {}
  for (const field of def.fields) {
    if (field.kind === 'hint') continue
    if (!isAlignFieldVisible(field, draft)) continue
    const raw = draft[field.key]?.trim() ?? ''
    if (field.required && !raw) {
      return { error: `Select ${field.label.toLowerCase()}.` }
    }
    if (!raw) continue
    if (field.kind === 'number') {
      const n = Number(raw)
      if (Number.isNaN(n)) return { error: `Enter a valid ${field.label.toLowerCase()}.` }
      payload[field.key] = n
      continue
    }
    if (field.kind === 'multi') {
      payload[field.key] = parseAlignCsv(raw)
      continue
    }
    payload[field.key] = raw
  }
  return { payload }
}

export function compositeDraftFromNews2Row(row: ServiceUserObservationRow): CompositeDraft {
  const p = payloadRecord(row) as Partial<News2Payload>
  return {
    respirationRate: p.respirationRate != null ? String(p.respirationRate) : '',
    oxygenSaturation: p.oxygenSaturation != null ? String(p.oxygenSaturation) : '',
    airOrOxygen: String(p.airOrOxygen ?? 'AIR'),
    systolic: p.systolic != null ? String(p.systolic) : '',
    diastolic: p.diastolic != null ? String(p.diastolic) : '',
    pulse: p.pulse != null ? String(p.pulse) : '',
    consciousness: String(p.consciousness ?? ''),
    temperature: p.temperature != null ? String(p.temperature) : '',
  }
}

export function compositeDraftFromInfectionRow(row: ServiceUserObservationRow): CompositeDraft {
  const p = payloadRecord(row) as Partial<InfectionPayload>
  return {
    infectionType: String(p.infectionType ?? ''),
    infectionCleared: p.infectionCleared === true ? 'true' : 'false',
    hospitalisation: p.hospitalisation === true ? 'true' : 'false',
    isolationRequired: p.isolationRequired === true ? 'true' : 'false',
  }
}

export function compositeDraftFromUrinalysisRow(row: ServiceUserObservationRow): CompositeDraft {
  const p = payloadRecord(row) as Partial<UrinalysisPayload>
  return {
    observationOfUrine: String(p.observationOfUrine ?? ''),
    observationOfUrineOther: String(p.observationOfUrineOther ?? ''),
    dipstick: String(p.dipstick ?? 'NOT_TAKEN'),
    actionTaken: String(p.actionTaken ?? ''),
    furtherTestingResult: String(p.furtherTestingResult ?? ''),
    furtherTestingDate: String(p.furtherTestingDate ?? ''),
  }
}

export function formatSeizureDescription(row: ServiceUserObservationRow): string {
  const p = payloadRecord(row) as Partial<SeizureChartPayload>
  return p.description?.trim() || '—'
}

export function compositeDraftFromSeizureRow(row: ServiceUserObservationRow): CompositeDraft {
  const p = payloadRecord(row) as Partial<SeizureChartPayload>
  return {
    otherLocation: String(p.otherLocation ?? ''),
    description: String(p.description ?? ''),
    triggers: String(p.triggers ?? ''),
    triggersOther: String(p.triggersOther ?? ''),
    preSeizure: String(p.preSeizure ?? ''),
    preSeizureOther: String(p.preSeizureOther ?? ''),
    feltIfAble: String(p.feltIfAble ?? ''),
    during: String(p.during ?? ''),
    duringOther: String(p.duringOther ?? ''),
    lengthOfSeizure: String(p.lengthOfSeizure ?? ''),
    after: String(p.after ?? ''),
    afterOther: String(p.afterOther ?? ''),
    recoveryPeriod: String(p.recoveryPeriod ?? ''),
    interventions: String(p.interventions ?? ''),
    interventionsOther: String(p.interventionsOther ?? ''),
    actionTaken: String(p.actionTaken ?? ''),
  }
}

export function compositeDraftFromAbcRow(row: ServiceUserObservationRow): CompositeDraft {
  const p = payloadRecord(row) as Partial<AbcPatternsPayload & { behavior?: string; consequence?: string }>
  return {
    location: String(p.location ?? ''),
    antecedent: String(p.antecedent ?? ''),
    behaviour: String(p.behaviour ?? p.behavior ?? ''),
    consequences: String(p.consequences ?? p.consequence ?? ''),
    actionTaken: String(p.actionTaken ?? ''),
    riskLevel: String(p.riskLevel ?? 'LOW'),
    behaviourType: String(p.behaviourType ?? ''),
    presentation: String(p.presentation ?? ''),
    appearanceDetails: String(p.appearanceDetails ?? ''),
    othersPresent: String(p.othersPresent ?? ''),
    personSaid: String(p.personSaid ?? ''),
    behaviourDuration: String(p.behaviourDuration ?? ''),
    situationDurationMinutes:
      p.situationDurationMinutes != null ? String(p.situationDurationMinutes) : '',
  }
}

function historyValueForRow(row: ServiceUserObservationRow): string {
  const code = row.observationType.code
  switch (code) {
    case 'FALLS':
    case 'BOWEL_MOVEMENT':
    case 'MEALS':
    case 'REPOSITIONING':
    case 'CONTINENCE':
    case 'PEG_ENTERAL':
      return formatAlignHistorySummary(row, code)
    case 'ABC_PATTERNS':
      return formatAbcSummary(row)
    case 'SEIZURE_CHART':
      return formatSeizureDescription(row)
    case 'URINALYSIS':
      return formatUrinalysisObservation(row)
    case 'INFECTION':
      return formatInfectionHistory(row)
    case 'SKIN_INTEGRITY':
    case 'BODY_MAP':
      return formatAlignHistorySummary(row, code)
    case 'NEWS2':
      return row.numericValue != null ? `Score ${row.numericValue}` : '—'
    case 'SLEEP':
      return formatSleepSummaryHistory(row)
    default:
      return formatNumericHistory(row)
  }
}

function formatDmyLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatTimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}

/** Daily fluid balance (ml in − ml out) for records on the given calendar day. */
export function computeDailyFluidBalance(rows: ServiceUserObservationRow[], day: Date = new Date()): number {
  const y = day.getFullYear()
  const m = day.getMonth()
  const d = day.getDate()
  let balance = 0
  for (const row of rows) {
    const recorded = new Date(row.recordedAt)
    if (
      recorded.getFullYear() !== y ||
      recorded.getMonth() !== m ||
      recorded.getDate() !== d
    ) {
      continue
    }
    const p = payloadRecord(row) as Partial<FluidMonitorPayload>
    balance += (p.fluidInMl ?? 0) - (p.fluidOutMl ?? 0)
  }
  return balance
}

export type CompositeDraft = Record<string, string>

export function emptyCompositeDraft(variant: ObservationFormVariant): CompositeDraft {
  switch (variant) {
    case 'blood_pressure':
      return { systolic: '', diastolic: '', situation: 'NONE_RECORDED' }
    case 'fluid_monitor':
      return { fluidOutMl: '', fluidInMl: '' }
    case 'falls':
    case 'bowel_movement':
    case 'meals':
    case 'repositioning':
    case 'continence':
    case 'peg_enteral':
    case 'skin_integrity':
    case 'body_map':
      return {}
    case 'abc_patterns':
      return {
        location: '',
        antecedent: '',
        behaviour: '',
        consequences: '',
        actionTaken: '',
        riskLevel: 'LOW',
        behaviourType: '',
        presentation: '',
        appearanceDetails: '',
        othersPresent: '',
        personSaid: '',
        behaviourDuration: '',
        situationDurationMinutes: '',
      }
    case 'seizure_chart':
      return {
        otherLocation: '',
        description: '',
        triggers: '',
        triggersOther: '',
        preSeizure: '',
        preSeizureOther: '',
        feltIfAble: '',
        during: '',
        duringOther: '',
        lengthOfSeizure: '',
        after: '',
        afterOther: '',
        recoveryPeriod: '',
        interventions: '',
        interventionsOther: '',
        actionTaken: '',
      }
    case 'urinalysis':
      return {
        observationOfUrine: '',
        observationOfUrineOther: '',
        dipstick: 'NOT_TAKEN',
        actionTaken: '',
        furtherTestingResult: '',
        furtherTestingDate: '',
      }
    case 'infection':
      return {
        infectionType: '',
        infectionCleared: 'false',
        hospitalisation: 'false',
        isolationRequired: 'false',
      }
    case 'news2':
      return {
        respirationRate: '',
        oxygenSaturation: '',
        airOrOxygen: 'AIR',
        systolic: '',
        diastolic: '',
        pulse: '',
        consciousness: '',
        temperature: '',
      }
    case 'sleep':
      return { quality: '', reasons: '' }
    default:
      return {}
  }
}

export function buildCreatePayload(
  typeCode: string,
  variant: ObservationFormVariant,
  draft: CompositeDraft,
  numericValue: string,
): { payload?: Record<string, unknown>; numericValue?: number; error?: string } {
  if (variant === 'numeric') {
    const num = Number(numericValue)
    if (!numericValue.trim() || Number.isNaN(num)) {
      return { error: 'Enter a value.' }
    }
    return { numericValue: num }
  }

  if (variant === 'blood_pressure') {
    const systolic = Number(draft.systolic)
    const diastolic = Number(draft.diastolic)
    if (!draft.systolic?.trim() || Number.isNaN(systolic)) {
      return { error: 'Enter systolic blood pressure.' }
    }
    if (!draft.diastolic?.trim() || Number.isNaN(diastolic)) {
      return { error: 'Enter diastolic blood pressure.' }
    }
    if (!draft.situation?.trim()) {
      return { error: 'Select a situation.' }
    }
    const payload: BloodPressurePayload = {
      systolic,
      diastolic,
      situation: draft.situation,
    }
    return { payload, numericValue: systolic }
  }

  if (variant === 'fluid_monitor') {
    const outRaw = draft.fluidOutMl?.trim()
    const inRaw = draft.fluidInMl?.trim()
    const fluidOutMl = outRaw ? Number(outRaw) : null
    const fluidInMl = inRaw ? Number(inRaw) : null
    if (outRaw && Number.isNaN(fluidOutMl)) return { error: 'Enter a valid fluid out amount.' }
    if (inRaw && Number.isNaN(fluidInMl)) return { error: 'Enter a valid fluid in amount.' }
    if (!fluidOutMl && !fluidInMl) {
      return { error: 'Enter fluid out and/or fluid in (ml).' }
    }
    const payload: FluidMonitorPayload = { fluidOutMl, fluidInMl }
    const net = (fluidInMl ?? 0) - (fluidOutMl ?? 0)
    return { payload, numericValue: net }
  }

  if (
    variant === 'falls' ||
    variant === 'bowel_movement' ||
    variant === 'meals' ||
    variant === 'repositioning' ||
    variant === 'continence' ||
    variant === 'peg_enteral' ||
    variant === 'skin_integrity' ||
    variant === 'body_map'
  ) {
    return buildAlignCreatePayload(variant, draft)
  }

  if (variant === 'abc_patterns') {
    if (!draft.antecedent?.trim()) return { error: 'Enter antecedent (A).' }
    if (!draft.behaviour?.trim() && !draft.behavior?.trim()) return { error: 'Enter behaviour (B).' }
    if (!draft.consequences?.trim() && !draft.consequence?.trim()) {
      return { error: 'Enter consequences (C).' }
    }
    if (!draft.actionTaken?.trim()) return { error: 'Enter action taken.' }
    const situationRaw = draft.situationDurationMinutes?.trim()
    let situationDurationMinutes: number | null = null
    if (situationRaw) {
      situationDurationMinutes = Number(situationRaw)
      if (Number.isNaN(situationDurationMinutes)) {
        return { error: 'Enter a valid situation duration in minutes.' }
      }
    }
    const payload: AbcPatternsPayload = {
      location: draft.location?.trim() || undefined,
      antecedent: draft.antecedent.trim(),
      behaviour: (draft.behaviour ?? draft.behavior ?? '').trim(),
      consequences: (draft.consequences ?? draft.consequence ?? '').trim(),
      actionTaken: draft.actionTaken.trim(),
      riskLevel: draft.riskLevel?.trim() || 'LOW',
      behaviourType: draft.behaviourType?.trim() || undefined,
      presentation: draft.presentation?.trim() || undefined,
      appearanceDetails: draft.appearanceDetails?.trim() || undefined,
      othersPresent: draft.othersPresent?.trim() || undefined,
      personSaid: draft.personSaid?.trim() || undefined,
      behaviourDuration: draft.behaviourDuration?.trim() || undefined,
      situationDurationMinutes,
    }
    return { payload }
  }

  if (variant === 'seizure_chart') {
    if (!draft.description?.trim()) {
      return { error: 'Description (or type) of seizure is required.' }
    }
    const payload: SeizureChartPayload = {
      otherLocation: draft.otherLocation?.trim() || undefined,
      description: draft.description.trim(),
      triggers: draft.triggers?.trim() || undefined,
      triggersOther: draft.triggersOther?.trim() || undefined,
      preSeizure: draft.preSeizure?.trim() || undefined,
      preSeizureOther: draft.preSeizureOther?.trim() || undefined,
      feltIfAble: draft.feltIfAble?.trim() || undefined,
      during: draft.during?.trim() || undefined,
      duringOther: draft.duringOther?.trim() || undefined,
      lengthOfSeizure: draft.lengthOfSeizure?.trim() || undefined,
      after: draft.after?.trim() || undefined,
      afterOther: draft.afterOther?.trim() || undefined,
      recoveryPeriod: draft.recoveryPeriod?.trim() || undefined,
      interventions: draft.interventions?.trim() || undefined,
      interventionsOther: draft.interventionsOther?.trim() || undefined,
      actionTaken: draft.actionTaken?.trim() || undefined,
    }
    return { payload }
  }

  if (variant === 'urinalysis') {
    if (!draft.observationOfUrine?.trim()) {
      return { error: 'Select an observation of urine.' }
    }
    if (draft.observationOfUrine === 'OTHER' && !draft.observationOfUrineOther?.trim()) {
      return { error: 'Enter other observation details.' }
    }
    const payload: UrinalysisPayload = {
      observationOfUrine: draft.observationOfUrine.trim(),
      observationOfUrineOther:
        draft.observationOfUrine === 'OTHER' ? draft.observationOfUrineOther?.trim() : undefined,
      dipstick: draft.dipstick?.trim() || 'NOT_TAKEN',
      actionTaken: draft.actionTaken?.trim() || undefined,
      furtherTestingResult: draft.furtherTestingResult?.trim() || undefined,
      furtherTestingDate: draft.furtherTestingDate?.trim() || undefined,
    }
    return { payload }
  }

  if (variant === 'infection') {
    if (!draft.infectionType?.trim()) {
      return { error: 'Select an infection type.' }
    }
    const payload: InfectionPayload = {
      infectionType: draft.infectionType.trim(),
      infectionCleared: draft.infectionCleared === 'true',
      hospitalisation: draft.hospitalisation === 'true',
      isolationRequired: draft.isolationRequired === 'true',
    }
    return { payload }
  }

  if (variant === 'news2') {
    const respirationRate = Number(draft.respirationRate)
    const oxygenSaturation = Number(draft.oxygenSaturation)
    const systolic = Number(draft.systolic)
    const diastolic = Number(draft.diastolic)
    const pulse = Number(draft.pulse)
    const temperature = Number(draft.temperature)
    const airOrOxygen = draft.airOrOxygen === 'OXYGEN' ? 'OXYGEN' : 'AIR'
    const consciousness = draft.consciousness?.trim()

    if (!draft.respirationRate?.trim() || Number.isNaN(respirationRate)) {
      return { error: 'Enter respiration rate (rpm).' }
    }
    if (!draft.oxygenSaturation?.trim() || Number.isNaN(oxygenSaturation)) {
      return { error: 'Enter oxygen saturation (%).' }
    }
    if (!draft.systolic?.trim() || Number.isNaN(systolic)) {
      return { error: 'Enter systolic blood pressure.' }
    }
    if (!draft.diastolic?.trim() || Number.isNaN(diastolic)) {
      return { error: 'Enter diastolic blood pressure.' }
    }
    if (!draft.pulse?.trim() || Number.isNaN(pulse)) {
      return { error: 'Enter pulse rate (bpm).' }
    }
    if (!consciousness) {
      return { error: 'Select level of consciousness (ACVPU).' }
    }
    if (!draft.temperature?.trim() || Number.isNaN(temperature)) {
      return { error: 'Enter temperature (°C).' }
    }

    const payload: News2Payload = {
      respirationRate,
      oxygenSaturation,
      oxygenSaturationScale: 1,
      airOrOxygen,
      systolic,
      diastolic,
      pulse,
      consciousness,
      temperature,
    }
    const score = calculateNews2Score(payload)
    if (score == null) {
      return { error: 'Could not calculate NEWS2 score.' }
    }
    return { payload, numericValue: score }
  }

  if (variant === 'sleep') {
    const quality = draft.quality?.trim()
    if (!quality) return { error: 'Select how the person slept.' }
    if (!SLEEP_QUALITY_OPTIONS.some(o => o.value === quality)) {
      return { error: 'Select a valid sleep quality.' }
    }
    const reasons = sleepQualityNeedsReasons(quality)
      ? parseSleepReasonCodes(draft.reasons).filter(code =>
          SLEEP_REASON_OPTIONS.some(o => o.value === code),
        )
      : []
    return {
      payload: {
        quality,
        ...(reasons.length ? { reasons } : {}),
      },
    }
  }

  return { error: 'Unsupported observation type.' }
}

export function showsHistoryTable(variant: ObservationFormVariant): boolean {
  return variant !== 'wellbeing'
}
