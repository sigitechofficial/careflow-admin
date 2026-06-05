import type { TherapyAideMemoireMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

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
      'Is the person choking or coughing?',
      'On foods, liquids, medication or saliva?',
    ],
    recommendation: 'Consider nursing and/or SLT',
  },
  {
    key: 'chestInfections',
    number: 2,
    questions: ['Have they had recent chest infections?', 'Are they short of breath?'],
    recommendation: 'Consider SLT, Respiratory team',
  },
  {
    key: 'speechConcern',
    number: 3,
    questions: [
      'Is there concern regarding speech?',
      'Is this a new or long-standing problem? (Details)',
    ],
    recommendation: 'Consider SLT',
    detailsPlaceholder: 'Details',
  },
  {
    key: 'mobilityChange',
    number: 4,
    questions: [
      'Has there been a recent change to mobility?',
      'Has there been a recent change to stairs mobility?',
      'Has there been a recent change to transfers?',
      'What triggered this change?',
    ],
    recommendation: 'Consider OT, PT Starrs team, Enablement team',
    detailsPlaceholder: 'What triggered this change?',
  },
  {
    key: 'selfCareChange',
    number: 5,
    questions: [
      'Has there been a recent change to personal self-care?',
      'Has there been a recent change to meal preparation ability?',
      'Has there been a recent change in accessing community?',
      'What triggered this change?',
    ],
    recommendation: 'Consider OT, PT, Starrs team, Enablement team',
    detailsPlaceholder: 'What triggered this change?',
  },
  {
    key: 'carePackageConcern',
    number: 6,
    questions: [
      'Do they have a care package?',
      'Is there a concern that this needs increased?',
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
  if (!boolAnswered(meta.furtherReferralRequired)) return false
  if (!boolAnswered(meta.referralCompleted)) return false
  if (meta.referralCompleted === true && !meta.referralDate?.trim()) return false
  return true
}
