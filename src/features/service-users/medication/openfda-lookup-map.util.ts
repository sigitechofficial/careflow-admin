import type { MedicationLookupsBundle } from '@/features/service-users/api/service-users.api'
import type { OpenFdaDrugLabelHit } from '@/features/service-users/api/medication-openfda.api'

export type MedicationOpenFdaAutofill = {
  medicationName: string
  reasonForMedication?: string
  medicationTypeId?: string
  routeId?: string
  dose?: string
  isControlledMedication?: boolean
}

const ROUTE_CODE_MAP: Record<string, string> = {
  ORAL: 'ORAL',
  TOPICAL: 'TOPICAL',
  TRANSDERMAL: 'TRANSDERMAL',
  TRANSDERMAL_PATCH: 'TRANSDERMAL',
  INHALATION: 'INHALATION',
  RESPIRATORY_INHALATION: 'INHALATION',
  INJECTION: 'ROUTE_INJECTION',
  INTRAVENOUS: 'ROUTE_INJECTION',
  INTRAMUSCULAR: 'ROUTE_INJECTION',
  SUBCUTANEOUS: 'ROUTE_INJECTION',
  OPHTHALMIC: 'EYE',
  OTIC: 'EAR',
  NASAL: 'NASAL',
  RECTAL: 'RECTAL',
  SUBLINGUAL: 'SUBLINGUAL',
  BUCCAL: 'SUBLINGUAL',
}

function lookupIdByCode(
  rows: { id: string; code: string }[] | undefined,
  code: string | undefined,
): string | undefined {
  if (!code || !rows?.length) return undefined
  const upper = code.toUpperCase()
  return rows.find(r => r.code.toUpperCase() === upper)?.id
}

function resolveRouteId(
  hit: OpenFdaDrugLabelHit,
  lookups: MedicationLookupsBundle | undefined,
): string | undefined {
  for (const route of hit.routes) {
    const normalized = route.toUpperCase().replace(/\s+/g, '_')
    const code = ROUTE_CODE_MAP[normalized] ?? ROUTE_CODE_MAP[normalized.split('/')[0] ?? '']
    const id = lookupIdByCode(lookups?.routes, code)
    if (id) return id
  }
  const oral = lookupIdByCode(lookups?.routes, 'ORAL')
  if (hit.routes.some(r => /oral/i.test(r)) && oral) return oral
  return undefined
}

function resolveTypeId(
  hit: OpenFdaDrugLabelHit,
  lookups: MedicationLookupsBundle | undefined,
): string | undefined {
  if (hit.dosageFormHint) {
    const id = lookupIdByCode(lookups?.types, hit.dosageFormHint)
    if (id) return id
  }
  const blob = `${hit.displayName} ${hit.activeIngredient ?? ''}`.toLowerCase()
  if (/\btablet\b/.test(blob)) return lookupIdByCode(lookups?.types, 'TABLET')
  if (/\bcapsule\b/.test(blob)) return lookupIdByCode(lookups?.types, 'CAPSULE')
  if (/\bpatch\b/.test(blob)) return lookupIdByCode(lookups?.types, 'PATCH')
  if (/\bcream\b/.test(blob)) return lookupIdByCode(lookups?.types, 'CREAM')
  if (/\binjection\b/.test(blob)) return lookupIdByCode(lookups?.types, 'INJECTION')
  return undefined
}

function buildReason(hit: OpenFdaDrugLabelHit): string | undefined {
  const purpose = hit.purpose?.trim()
  if (purpose) return purpose
  const indications = hit.indications?.trim()
  if (indications) {
    const firstSentence = indications.split(/(?<=[.!?])\s+/)[0]?.trim()
    return firstSentence && firstSentence.length <= 320 ? firstSentence : indications.slice(0, 320)
  }
  return undefined
}

export function openFdaHitToAutofill(
  hit: OpenFdaDrugLabelHit,
  lookups: MedicationLookupsBundle | undefined,
): MedicationOpenFdaAutofill {
  const medicationName = hit.brandName ?? hit.displayName
  return {
    medicationName,
    reasonForMedication: buildReason(hit),
    medicationTypeId: resolveTypeId(hit, lookups),
    routeId: resolveRouteId(hit, lookups),
    dose: hit.doseHint,
    isControlledMedication: hit.isControlledHint || undefined,
  }
}
