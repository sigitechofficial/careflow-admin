import { DEFAULT_ADMINISTRATION_ROUNDS } from '@/features/service-users/medication/medication-time-slots'
import { normalizeTime } from '@/features/service-users/medication/blister-pack-wizard.utils'
import type { MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import type { MedicationPackCompartmentRow } from '@/features/service-users/types'

export type VisitMedicationRound = {
  code: string
  name: string
  dueTime: string
}

export function resolveVisitMedicationRound(
  medicationRoundCode?: string | null,
  roundLabel?: string | null,
): VisitMedicationRound | null {
  const code = medicationRoundCode?.trim().toUpperCase()
  if (code) {
    const fromDefaults = DEFAULT_ADMINISTRATION_ROUNDS.find(
      r => r.code === code || r.name.toUpperCase() === code,
    )
    if (fromDefaults) {
      return { code: fromDefaults.code, name: fromDefaults.name, dueTime: fromDefaults.time }
    }
    const label = roundLabel?.trim()
    return {
      code,
      name: label || code,
      dueTime: '',
    }
  }

  const label = roundLabel?.trim()
  if (!label) return null

  const fromLabel = DEFAULT_ADMINISTRATION_ROUNDS.find(
    r => r.name.toLowerCase() === label.toLowerCase() || r.code === label.toUpperCase(),
  )
  if (fromLabel) {
    return { code: fromLabel.code, name: fromLabel.name, dueTime: fromLabel.time }
  }

  return { code: label.toUpperCase().replace(/\s+/g, '_'), name: label, dueTime: '' }
}

function labelMatchesRound(label: string, round: VisitMedicationRound): boolean {
  const normalized = label.trim().toLowerCase()
  return (
    normalized === round.name.toLowerCase() ||
    normalized === round.code.toLowerCase() ||
    normalized.includes(round.name.toLowerCase())
  )
}

export function compartmentMatchesVisitRound(
  compartment: Pick<MedicationPackCompartmentRow, 'label' | 'dueTime'>,
  round: VisitMedicationRound,
): boolean {
  const compTime = normalizeTime(compartment.dueTime)
  const roundTime = normalizeTime(round.dueTime)
  if (roundTime && compTime && compTime === roundTime) return true
  if (labelMatchesRound(compartment.label, round)) return true
  return false
}

export function marRowMatchesVisitRound(
  row: Pick<MarChartMedicationRow, 'dueTime' | 'timeSlot'>,
  round: VisitMedicationRound,
): boolean {
  const rowTime = normalizeTime(row.dueTime)
  const roundTime = normalizeTime(round.dueTime)
  if (roundTime && rowTime && rowTime === roundTime) return true

  const slot = row.timeSlot?.trim() ?? ''
  if (slot && labelMatchesRound(slot, round)) return true
  if (roundTime && slot && normalizeTime(slot) === roundTime) return true

  return false
}

export function filterCompartmentsForVisitRound<T extends Pick<MedicationPackCompartmentRow, 'label' | 'dueTime'>>(
  compartments: T[],
  round: VisitMedicationRound | null,
): T[] {
  if (!round) return compartments
  return compartments.filter(c => compartmentMatchesVisitRound(c, round))
}
