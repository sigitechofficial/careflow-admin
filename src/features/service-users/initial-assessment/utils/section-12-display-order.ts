/**
 * Section 12 display sequence per enterprise spec (initial-assessment-checklist.md §12).
 * §12.8 and §12.8a (clinical equipment) are one assessor-facing block — not split in the UI.
 */

/** Subsections rendered as template question groups, in assessor order. */
export const SECTION_12_GROUP_ORDER = [
  '12.5a',
  '12.5b',
  '12.5d',
  '12.10',
  '12.12',
  '12.13',
] as const

export type Section12PanelBlock =
  | { kind: 'adl-worksheet-scores' }
  | { kind: 'adl-worksheet-total' }
  | { kind: 'falls-panel' }
  | { kind: 'daily-living-aids' }
  | { kind: 'equipment-panel' }
  | { kind: 'transfer-matrix' }
  | { kind: 'finance-support' }
  | { kind: 'practical-care' }
  | { kind: 'questions'; specRef: (typeof SECTION_12_GROUP_ORDER)[number] }

/** Full section 12 UI order: panels + question groups interleaved. */
export const SECTION_12_DISPLAY_BLOCKS: Section12PanelBlock[] = [
  { kind: 'adl-worksheet-scores' },
  { kind: 'questions', specRef: '12.5a' },
  { kind: 'questions', specRef: '12.5b' },
  { kind: 'transfer-matrix' },
  { kind: 'questions', specRef: '12.5d' },
  { kind: 'adl-worksheet-total' },
  { kind: 'falls-panel' },
  { kind: 'daily-living-aids' },
  { kind: 'equipment-panel' },
  { kind: 'questions', specRef: '12.10' },
  { kind: 'practical-care' },
  { kind: 'questions', specRef: '12.12' },
  { kind: 'finance-support' },
]
