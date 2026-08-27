/** App-aligned option codes for care observations (same labels as the carer app). */

export type AlignOption = { value: string; label: string }

export type AlignFieldKind = 'select' | 'multi' | 'number' | 'hint'

export type AlignFieldDef = {
  key: string
  label: string
  kind: AlignFieldKind
  required?: boolean
  hint?: string
  options?: readonly AlignOption[]
  visibleWhenKey?: string
  visibleWhenValues?: readonly string[]
}

export type AlignFormDef = {
  hint?: string
  fields: readonly AlignFieldDef[]
}

export const CONTINENCE_STATUS: AlignOption[] = [
  { value: 'CONTINENT', label: 'Continent' },
  { value: 'PAD_CHANGED', label: 'Pad changed' },
  { value: 'CATHETER_CARE', label: 'Catheter care' },
  { value: 'INCONTINENT', label: 'Incontinent' },
]

export const CONTINENCE_CATHETER_ACTION: AlignOption[] = [
  { value: 'BAG_EMPTIED', label: 'Bag emptied' },
  { value: 'BAG_CHANGED', label: 'Bag changed' },
  { value: 'FLUSHED', label: 'Flushed' },
  { value: 'CHECKED_ONLY', label: 'Checked only' },
]

export const CONTINENCE_APPEARANCE: AlignOption[] = [
  { value: 'CLEAR', label: 'Clear' },
  { value: 'CLOUDY', label: 'Cloudy' },
  { value: 'DARK', label: 'Dark' },
  { value: 'BLOOD_STAINED', label: 'Blood-stained' },
  { value: 'ODOUR', label: 'Odour' },
]

export const CONTINENCE_ISSUES: AlignOption[] = [
  { value: 'BYPASSING', label: 'Bypassing' },
  { value: 'DISCOMFORT', label: 'Discomfort' },
  { value: 'SITE_REDNESS', label: 'Site redness' },
]

export const CONTINENCE_SKIN: AlignOption[] = [
  { value: 'SKIN_INTACT', label: 'Skin intact' },
  { value: 'REDNESS', label: 'Redness' },
  { value: 'BARRIER_CREAM', label: 'Barrier cream' },
  { value: 'WASH_AND_DRY', label: 'Wash & dry' },
]

export const PEG_FEED: AlignOption[] = [
  { value: 'YES', label: 'Yes' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'NO', label: 'No' },
  { value: 'NOT_DUE', label: 'Not due' },
]

export const PEG_FLUSH: AlignOption[] = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
]

export const PEG_TUBE: AlignOption[] = [
  { value: 'PATENT', label: 'Patent' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'DISLODGED', label: 'Dislodged' },
  { value: 'NOT_CHECKED', label: 'Not checked' },
]

export const PEG_SITE: AlignOption[] = [
  { value: 'INTACT', label: 'Intact' },
  { value: 'REDNESS', label: 'Redness' },
  { value: 'LEAKAGE', label: 'Leakage' },
  { value: 'DISCHARGE', label: 'Discharge' },
]

export const SKIN_CONDITION: AlignOption[] = [
  { value: 'INTACT', label: 'Intact' },
  { value: 'REDNESS', label: 'Redness' },
  { value: 'BROKEN', label: 'Broken' },
  { value: 'DRY', label: 'Dry' },
  { value: 'RASH', label: 'Rash' },
  { value: 'PRESSURE_MARK', label: 'Pressure mark' },
]

export const BODY_MAP_CONDITION: AlignOption[] = [
  { value: 'INTACT', label: 'Intact' },
  { value: 'REDNESS', label: 'Redness' },
  { value: 'BLISTER', label: 'Blister' },
  { value: 'BROKEN', label: 'Broken' },
  { value: 'PRESSURE_ULCER', label: 'Pressure ulcer' },
]

export const BOWEL_BRISTOL: AlignOption[] = [
  { value: 'TYPE_1', label: 'Type 1 · hard lumps' },
  { value: 'TYPE_2', label: 'Type 2 · lumpy' },
  { value: 'TYPE_3', label: 'Type 3 · cracked' },
  { value: 'TYPE_4', label: 'Type 4 · smooth' },
  { value: 'TYPE_5', label: 'Type 5 · soft blobs' },
  { value: 'TYPE_6', label: 'Type 6 · mushy' },
  { value: 'TYPE_7', label: 'Type 7 · liquid' },
]

export const BOWEL_CONTINENCE: AlignOption[] = [
  { value: 'CONTINENT', label: 'Continent' },
  { value: 'PAD_CHANGED', label: 'Pad changed' },
  { value: 'CATHETER', label: 'Catheter' },
  { value: 'INCONTINENT', label: 'Incontinent' },
]

export const FALL_YES_NO: AlignOption[] = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
]

export const FALL_LOCATION: AlignOption[] = [
  { value: 'BATHROOM', label: 'Bathroom' },
  { value: 'BEDROOM', label: 'Bedroom' },
  { value: 'LOUNGE', label: 'Lounge' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'OUTSIDE', label: 'Outside' },
  { value: 'OTHER', label: 'Other' },
]

export const FALL_WITNESSED: AlignOption[] = [
  { value: 'WITNESSED', label: 'Witnessed' },
  { value: 'UNWITNESSED', label: 'Unwitnessed' },
]

export const FALL_INJURY: AlignOption[] = [
  { value: 'BRUISE', label: 'Bruise' },
  { value: 'SKIN_BREAK', label: 'Skin break' },
  { value: 'PAIN', label: 'Pain' },
  { value: 'HEAD_INJURY', label: 'Head injury' },
]

export const FALL_HELP: AlignOption[] = [
  { value: 'FIRST_AID', label: 'First aid' },
  { value: 'OFFICE', label: 'Office' },
  { value: '999', label: '999' },
]

export const REPOSITION_POSITION: AlignOption[] = [
  { value: 'LEFT', label: 'Left side' },
  { value: 'RIGHT', label: 'Right side' },
  { value: 'BACK', label: 'Back' },
  { value: 'SITTING', label: 'Sitting' },
]

export const REPOSITION_TOLERATED: AlignOption[] = [
  { value: 'YES', label: 'Yes' },
  { value: 'DISCOMFORT', label: 'With discomfort' },
  { value: 'REFUSED', label: 'Refused' },
]

export const REPOSITION_SKIN: AlignOption[] = [
  { value: 'INTACT', label: 'Intact' },
  { value: 'REDNESS', label: 'Redness' },
  { value: 'MARK', label: 'Mark' },
]

export const MEAL_AMOUNT: AlignOption[] = [
  { value: 'ALL', label: 'All' },
  { value: 'MOST', label: 'Most' },
  { value: 'HALF', label: 'Half' },
  { value: 'LITTLE', label: 'Little' },
  { value: 'REFUSED', label: 'Refused' },
]

export const MEAL_REFUSED: AlignOption[] = [
  { value: 'NOT_HUNGRY', label: 'Not hungry' },
  { value: 'UNWELL', label: 'Unwell' },
  { value: 'DISLIKES', label: 'Dislikes' },
  { value: 'TEXTURE', label: 'Texture' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

export const MEAL_TEXTURE: AlignOption[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'SOFT', label: 'Soft' },
  { value: 'PUREED', label: 'Pureed' },
  { value: 'THICKENED_FLUIDS', label: 'Thickened fluids' },
  { value: 'ASSISTED', label: 'Assisted' },
]

export const ALIGN_FORMS: Record<string, AlignFormDef> = {
  continence: {
    hint: 'Record continence care provided this visit.',
    fields: [
      { key: 'status', label: 'Continence', kind: 'select', required: true, options: CONTINENCE_STATUS },
      {
        key: 'catheter_action',
        label: 'Care given',
        kind: 'select',
        options: CONTINENCE_CATHETER_ACTION,
        visibleWhenKey: 'status',
        visibleWhenValues: ['CATHETER_CARE'],
      },
      {
        key: 'catheter_volume',
        label: 'Output (ml)',
        kind: 'number',
        visibleWhenKey: 'status',
        visibleWhenValues: ['CATHETER_CARE'],
      },
      {
        key: 'catheter_appearance',
        label: 'Urine appearance',
        kind: 'multi',
        options: CONTINENCE_APPEARANCE,
        visibleWhenKey: 'status',
        visibleWhenValues: ['CATHETER_CARE'],
      },
      {
        key: 'catheter_issues',
        label: 'Problems',
        kind: 'multi',
        options: CONTINENCE_ISSUES,
        visibleWhenKey: 'status',
        visibleWhenValues: ['CATHETER_CARE'],
      },
      { key: 'skin', label: 'Skin', kind: 'multi', options: CONTINENCE_SKIN },
    ],
  },
  peg_enteral: {
    hint: 'Record the feed, flush and PEG site this visit.',
    fields: [
      { key: 'feed_given', label: 'Feed given', kind: 'select', required: true, options: PEG_FEED },
      {
        key: 'volume_ml',
        label: 'Volume (ml)',
        kind: 'number',
        visibleWhenKey: 'feed_given',
        visibleWhenValues: ['YES', 'PARTIAL'],
      },
      { key: 'flush', label: 'Flush given', kind: 'select', options: PEG_FLUSH },
      { key: 'tube_status', label: 'Tube', kind: 'select', required: true, options: PEG_TUBE },
      { key: 'site', label: 'Site', kind: 'select', required: true, options: PEG_SITE },
    ],
  },
  skin_integrity: {
    hint: 'Check the skin during care and record what you see. A body-map mark is not needed.',
    fields: [{ key: 'condition', label: 'Skin condition', kind: 'select', required: true, options: SKIN_CONDITION }],
  },
  body_map: {
    hint: 'Describe the skin. Body-map pins are recorded on the visit body map.',
    fields: [
      { key: 'condition', label: 'Skin condition', kind: 'select', required: true, options: BODY_MAP_CONDITION },
    ],
  },
  bowel_movement: {
    hint: 'Select the Bristol stool type that best matches.',
    fields: [
      { key: 'bristol', label: 'Bristol type', kind: 'select', required: true, options: BOWEL_BRISTOL },
      { key: 'continence', label: 'Continence', kind: 'select', options: BOWEL_CONTINENCE },
    ],
  },
  falls: {
    hint: 'Record whether a fall happened this visit, then any injury.',
    fields: [
      { key: 'fall_occurred', label: 'Did a fall occur?', kind: 'select', required: true, options: FALL_YES_NO },
      {
        key: 'location',
        label: 'Location',
        kind: 'select',
        options: FALL_LOCATION,
        visibleWhenKey: 'fall_occurred',
        visibleWhenValues: ['YES'],
      },
      {
        key: 'witnessed',
        label: 'Witnessed',
        kind: 'select',
        options: FALL_WITNESSED,
        visibleWhenKey: 'fall_occurred',
        visibleWhenValues: ['YES'],
      },
      {
        key: 'injury',
        label: 'Injury',
        kind: 'multi',
        options: FALL_INJURY,
        visibleWhenKey: 'fall_occurred',
        visibleWhenValues: ['YES'],
      },
      {
        key: 'help',
        label: 'Help given',
        kind: 'multi',
        options: FALL_HELP,
        visibleWhenKey: 'fall_occurred',
        visibleWhenValues: ['YES'],
      },
    ],
  },
  repositioning: {
    hint: 'Record the new position after turning.',
    fields: [
      { key: 'position', label: 'Position', kind: 'select', required: true, options: REPOSITION_POSITION },
      { key: 'tolerated', label: 'Tolerated', kind: 'select', options: REPOSITION_TOLERATED },
      { key: 'skin_glance', label: 'Skin glance', kind: 'select', options: REPOSITION_SKIN },
    ],
  },
  meals: {
    hint: 'Record what the client ate this visit.',
    fields: [
      { key: 'amount', label: 'Amount eaten', kind: 'select', required: true, options: MEAL_AMOUNT },
      {
        key: 'refused_reason',
        label: 'Why refused',
        kind: 'multi',
        options: MEAL_REFUSED,
        visibleWhenKey: 'amount',
        visibleWhenValues: ['REFUSED'],
      },
      { key: 'texture', label: 'Texture / support', kind: 'multi', options: MEAL_TEXTURE },
    ],
  },
}

export function alignOptionLabel(
  options: readonly AlignOption[] | undefined,
  code: string | null | undefined,
): string {
  if (!code?.trim()) return '—'
  return options?.find(o => o.value === code)?.label ?? code.replace(/_/g, ' ')
}

export function parseAlignCsv(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export function joinAlignCsv(codes: string[]): string {
  return codes.join(',')
}

export function isAlignFieldVisible(field: AlignFieldDef, draft: Record<string, string>): boolean {
  if (!field.visibleWhenKey) return true
  const current = draft[field.visibleWhenKey] ?? ''
  return (field.visibleWhenValues ?? []).includes(current)
}
