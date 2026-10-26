import type { TherapyAideMemoireMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

export type { TherapyAideMemoireMetadata }

export const THERAPY_AIDE_MEMOIRE_SCREENING_ITEMS: {
  key: keyof Omit<
    TherapyAideMemoireMetadata,
    'furtherReferralRequired' | 'referralCompleted' | 'referralDate' | 'additionalComments'
  >
  number: number
  questions: string[]
  recommendation: string
  detailsPlaceholder?: string
}[] = [
  {
    key: 'choking',
    number: 1,
    questions: [
      'Do I choke or cough?',
      'On food, drinks, medicines or saliva?',
    ],
    recommendation: 'Consider nursing and/or SLT',
  },
  {
    key: 'chestInfections',
    number: 2,
    questions: ['Have I had recent chest infections?', 'Am I short of breath?'],
    recommendation: 'Consider SLT, Respiratory team',
  },
  {
    key: 'speechConcern',
    number: 3,
    questions: [
      'Is there a concern about my speech?',
      'Is this a new or long-standing problem for me? (Details)',
    ],
    recommendation: 'Consider SLT',
    detailsPlaceholder: 'Details',
  },
  {
    key: 'mobilityChange',
    number: 4,
    questions: [
      'Has my mobility changed recently?',
      'Has how I manage stairs changed recently?',
      'Has how I move between bed, chair or toilet changed recently?',
      'What caused this change?',
    ],
    recommendation: 'Consider OT, PT Starrs team, Enablement team',
    detailsPlaceholder: 'What caused this change for me?',
  },
  {
    key: 'selfCareChange',
    number: 5,
    questions: [
      'Has how I manage my own personal care changed recently?',
      'Has my ability to prepare meals changed recently?',
      'Has how I get out into the community changed recently?',
      'What caused this change?',
    ],
    recommendation: 'Consider OT, PT, Starrs team, Enablement team',
    detailsPlaceholder: 'What caused this change for me?',
  },
  {
    key: 'carePackageConcern',
    number: 6,
    questions: [
      'Do I have a care package?',
      'Is there a concern that I need more care than I have now?',
      'Why?',
    ],
    recommendation: 'Starrs team, Enablement team',
    detailsPlaceholder: 'Why?',
  },
]

export function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

export function defaultTherapyAideMemoireMetadata(): TherapyAideMemoireMetadata {
  return {}
}

export function normalizeTherapyAideMemoireMetadata(
  raw: unknown,
): TherapyAideMemoireMetadata {
  if (!raw || typeof raw !== 'object') return defaultTherapyAideMemoireMetadata()
  const row = raw as TherapyAideMemoireMetadata
  return {
    choking: row.choking,
    chestInfections: row.chestInfections,
    speechConcern: row.speechConcern,
    mobilityChange: row.mobilityChange,
    selfCareChange: row.selfCareChange,
    carePackageConcern: row.carePackageConcern,
    furtherReferralRequired: row.furtherReferralRequired ?? undefined,
    referralCompleted: row.referralCompleted ?? undefined,
    referralDate: typeof row.referralDate === 'string' ? row.referralDate : undefined,
    additionalComments:
      typeof row.additionalComments === 'string' ? row.additionalComments : undefined,
  }
}

export function isTherapyAideMemoireComplete(meta: TherapyAideMemoireMetadata | undefined): boolean {
  if (!meta) return false
  for (const item of THERAPY_AIDE_MEMOIRE_SCREENING_ITEMS) {
    const state = meta[item.key]
    if (!boolAnswered(state?.checked)) return false
    if (state?.checked === true && item.detailsPlaceholder && !state.details?.trim()) return false
  }
  if (!boolAnswered(meta.furtherReferralRequired)) return false
  if (meta.furtherReferralRequired === true) {
    if (!boolAnswered(meta.referralCompleted)) return false
    if (meta.referralCompleted === true && !meta.referralDate?.trim()) return false
  }
  return true
}
