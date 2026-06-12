/**
 * Enterprise initial assessment — ADL worksheet (paper §7 / spec §12.2–12.5).
 * Scores 0–4 per activity; total drives dependency band for PDF and validation.
 */

export type AdlWorksheetRow = {
  /** Stable key for persistence and validation */
  id: string
  /** Display label shown in the grid */
  activity: string
  score: number
  notes?: string
}

export type AdlWorksheetGroup = {
  id: string
  specRef: string
  /** Paper form subsection label (e.g. "d. Self care") */
  paperLabel: string
  title: string
  activities: { id: string; label: string }[]
}

/** Paper / spec score meanings (§12.1). */
export const ADL_SCORE_LEGEND = [
  '0 — Performs independently / no support needed',
  '1 — Requires occasional assistance / performs with difficulty',
  '2 — Requires assistance of one person',
  '3 — Requires assistance of two people',
  '4 — Does not or cannot perform / performed by another person',
] as const

export const ADL_SCORE_OPTIONS = ADL_SCORE_LEGEND.map((label, score) => ({ score, label }))

export const ADL_WORKSHEET_GROUPS: AdlWorksheetGroup[] = [
  {
    id: 'selfCare',
    specRef: '12.2',
    paperLabel: 'd. Self care',
    title: 'Self care',
    activities: [
      { id: 'eating_drinking', label: 'Eating / drinking' },
      { id: 'toileting', label: 'Toileting' },
      { id: 'walking', label: 'Walking' },
      { id: 'dressing_undressing', label: 'Dressing / undressing' },
      { id: 'bathing', label: 'Bathing' },
      { id: 'grooming', label: 'Grooming' },
    ],
  },
  {
    id: 'everydayTasks',
    specRef: '12.3',
    paperLabel: 'e. Everyday tasks',
    title: 'Everyday tasks',
    activities: [
      { id: 'preparing_food', label: 'Preparing food' },
      { id: 'laundry', label: 'Laundry' },
      { id: 'housework', label: 'Housework' },
      { id: 'shopping', label: 'Shopping' },
    ],
  },
  {
    id: 'mobilityInside',
    specRef: '12.4',
    paperLabel: 'f. Mobility inside the home',
    title: 'Mobility inside the home',
    activities: [
      { id: 'room_to_room', label: 'Moving from room to room' },
      { id: 'turning_in_bed', label: 'Turning in bed' },
      { id: 'stairs', label: 'Getting up / down stairs' },
      { id: 'lying_to_sitting', label: 'Lying to sitting' },
      { id: 'chair_transfer', label: 'Getting on / off chair' },
      { id: 'toilet_transfer', label: 'Getting on / off toilet' },
      { id: 'bed_transfer', label: 'Getting in / out of bed' },
    ],
  },
  {
    id: 'mobilityOutside',
    specRef: '12.5',
    paperLabel: 'g. Mobility outside the home',
    title: 'Mobility outside the home',
    activities: [
      { id: 'enter_leave_home', label: 'Entering / leaving home' },
      { id: 'public_transport', label: 'Use of public transport' },
      { id: 'short_walks', label: 'Taking short walks' },
      { id: 'long_walks', label: 'Taking longer walks' },
    ],
  },
]

export const ADL_WORKSHEET_ACTIVITY_IDS = ADL_WORKSHEET_GROUPS.flatMap((g) =>
  g.activities.map((a) => a.id),
)

/** @deprecated Replaced by {@link ADL_WORKSHEET_GROUPS} (paper §7 / spec §12.2–12.5). */
export const LEGACY_ADL_ACTIVITIES = [
  'Mobility',
  'Transfer',
  'Personal hygiene',
  'Toilet use',
  'Continence',
  'Feeding',
] as const

const LEGACY_ACTIVITY_TO_ID: Record<string, string> = {
  Mobility: 'walking',
  Transfer: 'chair_transfer',
  'Personal hygiene': 'grooming',
  'Toilet use': 'toileting',
  Continence: 'toileting',
  Feeding: 'eating_drinking',
}

export type AdlWorksheetMetadata = {
  rows?: AdlWorksheetRow[]
  additionalComments?: string
  /** §12.7 — Falls trigger assessment completed */
  fallsAssessmentCompleted?: boolean | null
  fallsAssessmentDate?: string | null
  /** Paper §7 — gate before falls trigger; opens Falls Screening tab when Yes */
  fallsScreeningRequested?: boolean | null
  /** §12.8 — Mobility aids in use or required */
  mobilityAidsRequired?: boolean | null
  mobilityAidsList?: string
}

export function defaultAdlWorksheetRows(): AdlWorksheetRow[] {
  return ADL_WORKSHEET_GROUPS.flatMap((g) =>
    g.activities.map((a) => ({ id: a.id, activity: a.label, score: 0, notes: '' })),
  )
}

export function adlWorksheetTotal(rows: AdlWorksheetRow[]): number {
  return rows.reduce((sum, r) => sum + (typeof r.score === 'number' && !Number.isNaN(r.score) ? r.score : 0), 0)
}

/** Bands tuned for 21 scored activities (max total 84). */
export function adlDependencyBand(total: number): string {
  if (total === 0) return 'Low support'
  if (total <= 15) return 'Low support'
  if (total <= 35) return 'Moderate support'
  if (total <= 55) return 'High support'
  return 'Very high support'
}

export function isAdlScoreValid(score: unknown): score is number {
  return typeof score === 'number' && !Number.isNaN(score) && score >= 0 && score <= 4
}

export function adlMetadataEqual(
  a: AdlWorksheetMetadata | undefined,
  b: AdlWorksheetMetadata | undefined,
): boolean {
  if (a === b) return true
  if ((a?.additionalComments ?? '') !== (b?.additionalComments ?? '')) return false
  if (a?.fallsAssessmentCompleted !== b?.fallsAssessmentCompleted) return false
  if ((a?.fallsAssessmentDate ?? '') !== (b?.fallsAssessmentDate ?? '')) return false
  if (a?.fallsScreeningRequested !== b?.fallsScreeningRequested) return false
  if (a?.mobilityAidsRequired !== b?.mobilityAidsRequired) return false
  if ((a?.mobilityAidsList ?? '') !== (b?.mobilityAidsList ?? '')) return false
  const ar = a?.rows ?? []
  const br = b?.rows ?? []
  if (ar.length !== br.length) return false
  for (let i = 0; i < ar.length; i++) {
    const x = ar[i]!
    const y = br.find((r) => r.id === x.id) ?? br[i]
    if (!y || x.id !== y.id || x.score !== y.score || (x.notes ?? '') !== (y.notes ?? '')) return false
  }
  return true
}

export function isAdlWorksheetComplete(rows: AdlWorksheetRow[] | undefined): boolean {
  if (!rows?.length) return false
  return ADL_WORKSHEET_ACTIVITY_IDS.every((id) => {
    const row = rows.find((r) => r.id === id)
    return row != null && isAdlScoreValid(row.score)
  })
}

/** Merge stored rows with the canonical worksheet shape; migrate legacy 6-item ADL if needed. */
export function normalizeAdlWorksheetRows(existing: AdlWorksheetRow[] | undefined): AdlWorksheetRow[] {
  const defaults = defaultAdlWorksheetRows()
  if (!existing?.length) return defaults

  const hasWorksheetIds = existing.some((r) => r.id && ADL_WORKSHEET_ACTIVITY_IDS.includes(r.id))
  if (hasWorksheetIds) {
    return defaults.map((def) => {
      const row = existing.find((r) => r.id === def.id)
      return row
        ? {
            ...def,
            ...row,
            activity: def.activity,
            score: isAdlScoreValid(row.score) ? row.score : 0,
          }
        : def
    })
  }

  const byLegacyActivity = new Map<string, AdlWorksheetRow>()
  for (const row of existing) {
    const targetId = row.id || (row.activity ? LEGACY_ACTIVITY_TO_ID[row.activity] : undefined)
    if (targetId) byLegacyActivity.set(targetId, row)
  }

  return defaults.map((def) => {
    const legacy = byLegacyActivity.get(def.id)
    if (!legacy) return def
    return {
      ...def,
      score: isAdlScoreValid(legacy.score) ? legacy.score : 0,
      notes: legacy.notes ?? '',
    }
  })
}
