import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** Profile → Privacy: how the person needs information, who we may share it with, and sharing without consent. */

export const INFORMATION_FORMATS = {
  LARGE_PRINT: 'Large print',
  EASY_READ: 'Easy read',
  PLAIN_LANGUAGE: 'Plain, simple words',
  BRAILLE: 'Braille',
  AUDIO: 'Audio',
  READ_ALOUD: 'Read it to them',
  BSL: 'British Sign Language interpreter',
} as const
export type InformationFormat = keyof typeof INFORMATION_FORMATS

export const SHARING_CATEGORIES = {
  ALL: 'Everything about their care',
  CARE_UPDATES: 'Day-to-day care updates',
  VISIT_TIMES: 'Visit times and carers',
  HEALTH_MEDICINES: 'Health and medicines',
  INCIDENTS: 'Incidents, falls and concerns',
  FINANCE: 'Money and invoices',
  /** Agreed to be sent our surveys. Separate from "Everything": it is asking them, not sharing with them. */
  SURVEYS: 'Surveys about our care',
} as const
export type SharingCategory = keyof typeof SHARING_CATEGORIES

export const SHARING_CHANNELS = {
  PHONE: 'Phone',
  EMAIL: 'Email',
  PORTAL: 'Family portal',
  LETTER: 'Letter',
  IN_PERSON: 'In person',
} as const
export type SharingChannel = keyof typeof SHARING_CHANNELS

export const SHARING_BASIS = {
  CONSENT: 'They agreed',
  BEST_INTERESTS: 'Best-interests decision (they lack capacity for this)',
  LPA_HEALTH_WELFARE: 'Health and welfare lasting power of attorney',
  DEPUTY: 'Court-appointed deputy',
  OTHER: 'Other',
} as const
export type SharingBasis = keyof typeof SHARING_BASIS

export const RECIPIENT_KINDS = {
  CONTACT: 'Family member or friend',
  PROFESSIONAL: 'Professional',
  ORGANISATION: 'Organisation',
} as const
export type RecipientKind = keyof typeof RECIPIENT_KINDS

export const EXCEPTION_REASONS = {
  SAFEGUARDING: 'Safeguarding: to protect them or someone else from abuse or neglect',
  VITAL_INTERESTS: 'Someone’s life or health was at serious risk',
  LEGAL_DUTY: 'A legal duty (court order, CQC, police with a lawful request)',
  PREVENT_CRIME: 'To prevent or detect a crime',
  OTHER: 'Other',
} as const
export type ExceptionReason = keyof typeof EXCEPTION_REASONS

export type SharingStatus = 'ACTIVE' | 'NOT_STARTED' | 'ENDED' | 'STOPPED' | 'REVIEW_DUE'

export type CommunicationNeeds = {
  interpreterNeeded: boolean
  interpreterLanguage: string
  formats: string[]
  hearing: string
  sight: string
  contactViaContactId: string | null
  notes: string
  source: string
  summary: string
  updatedAt: string
}

export type SharingLine = {
  id: string
  recipientKind: RecipientKind
  contactId: string | null
  recipientName: string
  recipientRole: string
  categories: string[]
  channels: string[]
  basis: SharingBasis
  legalAuthorityId: string | null
  conditions: string
  startsOn: string
  endsOn: string | null
  reviewOn: string | null
  status: SharingStatus
  stoppedAt: string | null
  stopReason: string
  source: string
  createdAt: string
  updatedAt: string
}

export type SharingException = {
  id: string
  sharedOn: string
  sharedWith: string
  whatShared: string
  reason: ExceptionReason
  decidedBy: string
  notes: string
  createdAt: string
}

export type AssessmentPrivacy = {
  submissionId: string
  submittedOn: string
  needs: { interpreterNeeded: boolean; interpreterLanguage: string; easyReadOrLargePrint: boolean; hearing: string; sight: string }
  sharing: { consent: 'YES' | 'NO' | 'NOT_ANSWERED'; with: string[]; limits: string; restrictions: string; conditions: string }
}

export type ConsentAnswer = 'GIVEN' | 'REFUSED' | 'PARTLY' | 'WITHDRAWN' | 'BEST_INTERESTS' | 'HAS_CAPACITY' | 'NOT_ANSWERED' | 'RECORDED'
export type ConsentSource = 'INITIAL_ASSESSMENT' | 'CAPACITY' | 'VISITS' | 'PHOTOS' | 'SURVEYS' | 'SHARING' | 'CHANGE'

export type ConsentRow = {
  key: string
  title: string
  answer: ConsentAnswer
  detail: string
  on: string | null
  source: ConsentSource
  /** Set on consents that can be changed here: the topic a change is recorded under. */
  topic?: string | null
  recordedBy?: string | null
  /** Earlier answers, newest first (the assessment's answer last). */
  history?: Array<{ answer: ConsentAnswer; detail: string; on: string | null; source: ConsentSource; recordedBy?: string | null }>
}

/** Consents that can be recorded or changed on the profile. */
export const CONSENT_TOPICS = {
  CARE: 'Consent to receive care and support',
  INFO_SHARING: 'Sharing information with people and professionals involved in their care',
  FAMILY_INVOLVEMENT: 'Family or representatives involved in the assessment',
  ASSESSMENT: 'Consent to the assessment',
  PHOTOGRAPHY: 'Photographs (body map and observations)',
  MEDICATION_SUPPORT: 'Support with medication',
  KEY_SAFE: 'Key safe and access to the home',
  OTHER: 'Something else',
} as const
export type ConsentTopic = keyof typeof CONSENT_TOPICS

export const CONSENT_CHANGE_ANSWERS = {
  GIVEN: 'Given',
  PARTLY: 'Given, with limits or conditions',
  REFUSED: 'Refused',
  WITHDRAWN: 'Withdrawn',
  BEST_INTERESTS: 'Best-interests decision (they lack capacity for this)',
} as const

export const CONSENT_METHODS = {
  written: 'In writing',
  verbal: 'Verbally',
  non_verbal: 'By gestures or other non-verbal ways',
  representative: 'By their representative',
} as const

export type RecordConsentInput = {
  topic: string
  title?: string
  answer: keyof typeof CONSENT_CHANGE_ANSWERS
  method?: string
  givenBy?: string
  details?: string
  decidedOn: string
}

export type ServiceUserPrivacy = {
  today: string
  /** Personal Details → Language (first language), or null. */
  firstLanguage?: string | null
  needs: CommunicationNeeds | null
  sharing: SharingLine[]
  exceptions: SharingException[]
  contacts: Array<{ id: string; name: string; relationship: string; canReceiveUpdates: boolean }>
  legalAuthorities: Array<{ id: string; category: string; holderName: string; verificationStatus: string }>
  assessment: AssessmentPrivacy | null
  /** Every consent recorded for the person: assessment, capacity decisions, visits, photos, surveys, sharing. */
  consents: ConsentRow[]
}

export type SaveNeedsInput = {
  interpreterNeeded: boolean
  interpreterLanguage?: string
  formats: string[]
  hearing?: string
  sight?: string
  contactViaContactId?: string | null
  notes?: string
  fromAssessmentId?: string
}

export type SaveSharingInput = {
  recipientKind: RecipientKind
  contactId?: string
  recipientName?: string
  recipientRole?: string
  categories: string[]
  channels: string[]
  basis: SharingBasis
  legalAuthorityId?: string
  conditions?: string
  startsOn: string
  endsOn?: string | null
  reviewOn?: string | null
}

export type RecordExceptionInput = {
  sharedOn: string
  sharedWith: string
  whatShared: string
  reason: ExceptionReason
  decidedBy: string
  notes?: string
}

export const privacyKey = (serviceUserId: string) => ['service-users', serviceUserId, 'privacy'] as const

export function useServiceUserPrivacy(serviceUserId: string) {
  return useQuery({
    queryKey: privacyKey(serviceUserId),
    queryFn: async () =>
      (await apiJson<ApiEnvelope<ServiceUserPrivacy>>(`/service-users/${serviceUserId}/privacy`, { method: 'GET' })).data as ServiceUserPrivacy,
    enabled: Boolean(serviceUserId),
  })
}

/** Saving here can change a contact's "Can receive updates", and the survey lists show the needs: refresh those too. */
function useRefresh(serviceUserId: string) {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: privacyKey(serviceUserId) })
    void qc.invalidateQueries({ queryKey: ['service-users'] })
    void qc.invalidateQueries({ queryKey: ['surveys', 'to-collect'] })
    void qc.invalidateQueries({ queryKey: ['surveys', 'person-history'] })
  }
}

export function useSaveCommunicationNeeds(serviceUserId: string) {
  const refresh = useRefresh(serviceUserId)
  return useMutation({
    mutationFn: (input: SaveNeedsInput) =>
      apiJson(`/service-users/${serviceUserId}/privacy/communication-needs`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: refresh,
  })
}

export function useSaveSharing(serviceUserId: string) {
  const refresh = useRefresh(serviceUserId)
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SaveSharingInput }) =>
      apiJson(`/service-users/${serviceUserId}/privacy/sharing${id ? `/${id}` : ''}`, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  })
}

export function useStopSharing(serviceUserId: string) {
  const refresh = useRefresh(serviceUserId)
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiJson(`/service-users/${serviceUserId}/privacy/sharing/${id}/stop`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: refresh,
  })
}

export function useRemoveSharing(serviceUserId: string) {
  const refresh = useRefresh(serviceUserId)
  return useMutation({
    mutationFn: (id: string) => apiJson(`/service-users/${serviceUserId}/privacy/sharing/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })
}

export function useRecordSharingException(serviceUserId: string) {
  const refresh = useRefresh(serviceUserId)
  return useMutation({
    mutationFn: (input: RecordExceptionInput) =>
      apiJson(`/service-users/${serviceUserId}/privacy/exceptions`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: refresh,
  })
}

export function useRecordConsent(serviceUserId: string) {
  const refresh = useRefresh(serviceUserId)
  return useMutation({
    mutationFn: (input: RecordConsentInput) =>
      apiJson(`/service-users/${serviceUserId}/privacy/consents`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: refresh,
  })
}
