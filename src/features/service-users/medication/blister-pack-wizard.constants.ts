import type { MedicationPackTypeValue } from '@/features/service-users/types'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const WIZARD_STEPS: { id: WizardStep; label: string; short: string }[] = [
  { id: 1, label: 'About this pack', short: 'About' },
  { id: 2, label: 'Compartments', short: 'Compartments' },
  { id: 3, label: 'Medicines', short: 'Medicines' },
  { id: 4, label: 'Review contents', short: 'Review' },
  { id: 5, label: 'Safety rules', short: 'Safety' },
  { id: 6, label: 'MAR generation', short: 'Generation' },
  { id: 7, label: 'Preview & publish', short: 'Preview' },
]

export const PACK_TYPES: { value: MedicationPackTypeValue; label: string }[] = [
  { value: 'BLISTER', label: 'Blister pack / MCA' },
  { value: 'DOSSETTE', label: 'Dossette box' },
  { value: 'NOMAD', label: 'Nomad tray' },
  { value: 'OTHER', label: 'Other' },
]

export const PACK_TYPE_HINTS: Record<
  MedicationPackTypeValue,
  { title: string; body: string; when: string }
> = {
  BLISTER: {
    title: 'Blister Pack / MCA',
    body: 'Sealed pharmacy blister strips with one dose per compartment, organised by day and time slot.',
    when: 'Pharmacy label says blister, MCA, or monitored dosage system — most common in UK home care (often 28-day cycles).',
  },
  DOSSETTE: {
    title: 'Dossette Box',
    body: 'A reusable compartment box (often weekly) with separate slots for each dose.',
    when: 'The tray is a plastic dosette with flip lids, not sealed blister foils.',
  },
  NOMAD: {
    title: 'Nomad Tray',
    body: 'A specific branded monitored dosage tray system used by some UK pharmacies.',
    when: 'Pharmacy label or tray is explicitly branded Nomad.',
  },
  OTHER: {
    title: 'Other',
    body: 'Any non-standard or locally named multi-compartment tray.',
    when: 'Use for custom pharmacy formats — add detail in pack notes.',
  },
}

export type AdministrationRound = {
  code: string
  name: string
  emoji: string
  time: string
  windowStart: string
  windowEnd: string
}

export const ADMINISTRATION_ROUNDS: AdministrationRound[] = [
  { code: 'MORNING', name: 'Morning', emoji: '🌅', time: '08:00', windowStart: '07:00', windowEnd: '10:00' },
  { code: 'MIDDAY', name: 'Midday', emoji: '☀', time: '12:00', windowStart: '11:00', windowEnd: '14:00' },
  { code: 'AFTERNOON', name: 'Afternoon', emoji: '☀', time: '15:00', windowStart: '14:00', windowEnd: '17:00' },
  { code: 'EVENING', name: 'Evening', emoji: '🌆', time: '18:00', windowStart: '17:00', windowEnd: '20:00' },
  { code: 'NIGHT', name: 'Night', emoji: '🌙', time: '22:00', windowStart: '20:00', windowEnd: '23:59' },
]

export const DEFAULT_SELECTED_ROUNDS = new Set<string>()

export type PackAdminRules = {
  mcaCapacity: boolean
  mcaBestInterests: boolean
  mcaPrescriberList: boolean
  witnessRound: string
  covert: 'no' | 'yes'
  prnOverride: 'no' | 'yes'
  lateAllowed: 'yes' | 'no'
  lateHours: number
  reviewMode: 'exceptions' | 'always'
  riskNotes: string
}

export const DEFAULT_ADMIN_RULES: PackAdminRules = {
  mcaCapacity: true,
  mcaBestInterests: true,
  mcaPrescriberList: true,
  witnessRound: '',
  covert: 'no',
  prnOverride: 'no',
  lateAllowed: 'yes',
  lateHours: 4,
  reviewMode: 'exceptions',
  riskNotes: '',
}

export type PackWizardDetails = {
  name: string
  packType: MedicationPackTypeValue
  pharmacyName: string
  pharmacyPhone: string
  gpName: string
  gpSurgery: string
  nhsNumber: string
  startDate: string
  cycleDurationDays: number
  reviewDate: string
  prescriptionChecked: boolean
  prescriptionCheckedBy: string
  prescriptionCheckedAt: string
  packNotes: string
  generateAheadDays: number
  adminRules: PackAdminRules
}

export function emptyPackWizardDetails(
  overrides?: Partial<PackWizardDetails>,
): PackWizardDetails {
  const today = operationalTodayIso()
  return {
    name: 'Pharmacy Prepared Blister Pack',
    packType: 'BLISTER',
    pharmacyName: '',
    pharmacyPhone: '',
    gpName: '',
    gpSurgery: '',
    nhsNumber: '',
    startDate: today,
    cycleDurationDays: 28,
    reviewDate: '',
    prescriptionChecked: false,
    prescriptionCheckedBy: '',
    prescriptionCheckedAt: today,
    packNotes: '',
    generateAheadDays: 28,
    adminRules: { ...DEFAULT_ADMIN_RULES },
    ...overrides,
  }
}
