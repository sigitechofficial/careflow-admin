import { allBodyPartNames } from '@/features/service-users/body-map/catalog/body-part-options'

export type BodyMapRecordTypeCode =
  | 'INJURY'
  | 'WOUND'
  | 'PRESSURE'
  | 'MEDICATION'
  | 'PAIN'
  | 'SKIN'
  | 'DEVICE'
  | 'SAFEGUARDING'

export const BODY_MAP_RECORD_TYPES: {
  value: BodyMapRecordTypeCode
  label: string
  subTypes: string[]
}[] = [
  {
    value: 'INJURY',
    label: 'Injury or Mark',
    subTypes: ['Bruise', 'Cut', 'Scratch', 'Burn', 'Bite mark', 'Unexplained mark', 'Swelling'],
  },
  {
    value: 'WOUND',
    label: 'Wound',
    subTypes: [
      'Skin tear',
      'Open wound',
      'Surgical wound',
      'Infected wound',
      'Dressing required',
    ],
  },
  {
    value: 'PRESSURE',
    label: 'Pressure Area',
    subTypes: [
      'Redness',
      'Non-blanching redness',
      'Suspected pressure damage',
      'Heel concern',
      'Sacral concern',
    ],
  },
  {
    value: 'MEDICATION',
    label: 'Medication Site',
    subTypes: ['Cream application', 'Patch site', 'Injection site', 'Spray site'],
  },
  { value: 'PAIN', label: 'Pain', subTypes: ['Acute', 'Chronic', 'Intermittent'] },
  {
    value: 'SKIN',
    label: 'Skin Condition',
    subTypes: ['Rash', 'Dry skin', 'Moisture lesion', 'Infection concern'],
  },
  {
    value: 'DEVICE',
    label: 'Medical Device Mark',
    subTypes: ['Catheter mark', 'Wheelchair pressure', 'Hoist sling mark'],
  },
  {
    value: 'SAFEGUARDING',
    label: 'Safeguarding Concern',
    subTypes: ['Unexplained injury', 'Pattern of marks', 'Other concern'],
  },
]

/** Full clinical taxonomy including leaning/sitting posture sites */
export const BODY_PART_OPTIONS: string[] = allBodyPartNames()

export function markerClassForType(type: BodyMapRecordTypeCode): string {
  switch (type) {
    case 'INJURY':
      return 'bg-red-600'
    case 'WOUND':
      return 'bg-violet-600'
    case 'PRESSURE':
      return 'bg-orange-600'
    case 'MEDICATION':
      return 'bg-blue-600'
    case 'PAIN':
      return 'bg-pink-600'
    case 'SKIN':
      return 'bg-yellow-600'
    case 'SAFEGUARDING':
      return 'bg-red-900 animate-pulse'
    case 'DEVICE':
    default:
      return 'bg-slate-600'
  }
}

export function recordTypeLabel(type: BodyMapRecordTypeCode): string {
  return BODY_MAP_RECORD_TYPES.find(t => t.value === type)?.label ?? type
}

export type BodyMapRecordTypeCatalogEntry = {
  value: BodyMapRecordTypeCode
  label: string
  subTypes: string[]
}

/** Build record-type list from API catalogue (falls back to static constants). */
export function recordTypesFromLookups(
  lookups: { recordTypes: { code: string; label: string; subTypes: string[] }[] } | undefined,
): BodyMapRecordTypeCatalogEntry[] {
  if (!lookups?.recordTypes?.length) return BODY_MAP_RECORD_TYPES
  return lookups.recordTypes.map((r) => ({
    value: r.code as BodyMapRecordTypeCode,
    label: r.label,
    subTypes: r.subTypes,
  }))
}
