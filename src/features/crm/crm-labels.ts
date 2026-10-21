import type {
  EnquiryLostReason,
  EnquiryReceivedVia,
  EnquirySource,
  EnquiryStage,
  EnquiryType,
  EnquiryUrgency,
} from '@/features/crm/types/crm.types'

export const STAGE_LABELS: Record<EnquiryStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  ASSESSMENT: 'Assessment',
  OFFER: 'Quote sent',
  WON: 'Won',
  LOST: 'Lost',
}

/** Board columns in order. */
export const BOARD_STAGES: EnquiryStage[] = [
  'NEW',
  'CONTACTED',
  'ASSESSMENT',
  'OFFER',
  'WON',
  'LOST',
]

/** Open pipeline stages (reachable via move). */
export const OPEN_STAGES: EnquiryStage[] = ['NEW', 'CONTACTED', 'ASSESSMENT', 'OFFER']

export const STAGE_CLASS: Record<EnquiryStage, string> = {
  NEW: 'bg-sky-100 text-sky-800',
  CONTACTED: 'bg-indigo-100 text-indigo-800',
  ASSESSMENT: 'bg-amber-100 text-amber-800',
  OFFER: 'bg-violet-100 text-violet-800',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-red-100 text-red-800',
}

export const SOURCE_LABELS: Record<EnquirySource, string> = {
  SELF: 'Self',
  FAMILY: 'Family',
  GP: 'GP',
  HOSPITAL: 'Hospital',
  LOCAL_AUTHORITY: 'Local Authority',
  NHS: 'NHS',
  SOCIAL_WORKER: 'Social Worker',
  WEBSITE: 'Website',
  WORD_OF_MOUTH: 'Word of mouth',
  OTHER: 'Other',
}

export const URGENCY_LABELS: Record<EnquiryUrgency, string> = {
  ROUTINE: 'Routine',
  URGENT: 'Urgent',
}

export const RECEIVED_VIA_LABELS: Record<EnquiryReceivedVia, string> = {
  PHONE: 'Phone',
  EMAIL: 'Email',
  WEBSITE: 'Website',
  IN_PERSON: 'In person',
  LETTER: 'Letter',
  FAX: 'Fax',
  OTHER: 'Other',
}

export const LOST_REASON_LABELS: Record<EnquiryLostReason, string> = {
  PRICE: 'Price / cost',
  CHOSE_ANOTHER_PROVIDER: 'Chose another provider',
  NO_CAPACITY: 'We had no capacity',
  OUT_OF_AREA: 'Outside our area',
  NEEDS_NOT_MET: 'We could not meet the care needs',
  MOVED_TO_CARE_HOME: 'Moved to a care home',
  NO_LONGER_NEEDED: 'Care no longer needed',
  DECEASED: 'Person passed away',
  NO_RESPONSE: 'No response from enquirer',
  FUNDING_DECLINED: 'Funding declined',
  OTHER: 'Other',
}

export const LOST_REASON_OPTIONS = Object.keys(LOST_REASON_LABELS) as EnquiryLostReason[]

/** Suggested places for the assessment visit. */
export const ASSESSMENT_PLACES = ['Home', 'Hospital', 'Care home', 'Video call', 'Office', 'Other'] as const

export const ENQUIRY_TYPE_LABELS: Record<EnquiryType, string> = {
  PRIVATE: 'Private client',
  LOCAL_AUTHORITY: 'Local Authority',
  NHS: 'NHS',
  HOSPITAL: 'Hospital discharge',
}

/** True when the follow-up date has passed on an enquiry that is still open. */
export function isFollowUpOverdue(e: { stage: EnquiryStage; nextFollowUpAt: string | null }): boolean {
  if (!e.nextFollowUpAt || e.stage === 'WON' || e.stage === 'LOST') return false
  return new Date(e.nextFollowUpAt).getTime() <= Date.now()
}

export const ENQUIRY_TYPE_OPTIONS = Object.keys(ENQUIRY_TYPE_LABELS) as EnquiryType[]
export const SOURCE_OPTIONS = Object.keys(SOURCE_LABELS) as EnquirySource[]
export const URGENCY_OPTIONS = Object.keys(URGENCY_LABELS) as EnquiryUrgency[]
export const RECEIVED_VIA_OPTIONS = Object.keys(RECEIVED_VIA_LABELS) as EnquiryReceivedVia[]
