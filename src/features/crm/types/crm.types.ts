export type EnquiryStage =
  | 'NEW'
  | 'CONTACTED'
  | 'ASSESSMENT'
  | 'OFFER'
  | 'WON'
  | 'LOST'

export type EnquirySource =
  | 'SELF'
  | 'FAMILY'
  | 'GP'
  | 'HOSPITAL'
  | 'LOCAL_AUTHORITY'
  | 'NHS'
  | 'SOCIAL_WORKER'
  | 'WEBSITE'
  | 'WORD_OF_MOUTH'
  | 'OTHER'

export type EnquiryType = 'PRIVATE' | 'LOCAL_AUTHORITY' | 'NHS' | 'HOSPITAL'
export type EnquiryUrgency = 'ROUTINE' | 'URGENT' | 'EMERGENCY'
/** An enquiry from the person or family, or a referral from a professional; both follow the same pipeline. */
export type EnquiryKind = 'ENQUIRY' | 'REFERRAL'
export type EnquiryReceivedVia =
  | 'PHONE'
  | 'EMAIL'
  | 'WEBSITE'
  | 'IN_PERSON'
  | 'LETTER'
  | 'FAX'
  | 'OTHER'

export type EnquiryOwner = { id: string; name: string }

export type EnquiryLostReason =
  | 'PRICE'
  | 'CHOSE_ANOTHER_PROVIDER'
  | 'NO_CAPACITY'
  | 'OUT_OF_AREA'
  | 'NEEDS_NOT_MET'
  | 'MOVED_TO_CARE_HOME'
  | 'NO_LONGER_NEEDED'
  | 'DECEASED'
  | 'NO_RESPONSE'
  | 'FUNDING_DECLINED'
  | 'OTHER'

export type EnquiryDuplicates = {
  enquiries: { id: string; referenceNumber: string; name: string; stage: EnquiryStage }[]
  serviceUsers: { id: string; name: string; dateOfBirth: string | null }[]
}

/** A published care plan (Settings → Care pathway) that an enquiry can list under care needs. */
export type CarePlanOption = { id: string; name: string }

/** Row from the shared funding-type lookup (Settings → Funding types). */
export type FundingTypeOption = { id: string; name: string; code: string }

/** A funder from Settings → Funders, with the quote payer type its funding type maps to. */
export type QuoteFunderOption = {
  id: string
  name: string
  fundingTypeName: string | null
  payerType: 'PRIVATE_CLIENT' | 'LOCAL_AUTHORITY' | 'NHS' | 'OTHER'
}

export type EnquiryEvent = {
  id: string
  action: string
  note: string | null
  userId: string | null
  at: string
}

export type Enquiry = {
  id: string
  referenceNumber: string
  stage: EnquiryStage
  kind: EnquiryKind
  /** Referral only. */
  referringOrganisation: string | null
  referrerRole: string | null
  referralReference: string | null
  referralDate: string | null
  firstName: string
  lastName: string
  dateOfBirth: string | null
  contactName: string | null
  contactRelationship: string | null
  contactPhone: string | null
  contactEmail: string | null
  source: EnquirySource
  sourceDetail: string | null
  enquiryType: EnquiryType | null
  urgency: EnquiryUrgency
  needs: string | null
  carePlanFormIds: string[]
  /** The chosen care plans that still exist, with their names. */
  carePlans: CarePlanOption[]
  ownerId: string | null
  ownerName: string | null
  receivedVia: EnquiryReceivedVia | null
  sentAt: string | null
  receivedAt: string | null
  addressLine: string | null
  postcode: string | null
  /** Map position of the address (from Google Places). */
  latitude: number | null
  longitude: number | null
  fundingTypeId: string | null
  fundingTypeName: string | null
  funderName: string | null
  hoursPerWeek: number | null
  visitsPerDay: number | null
  requestedStartDate: string | null
  nextFollowUpAt: string | null
  nextAction: string | null
  locationId: string | null
  locationName: string | null
  assessmentAt: string | null
  assessorId: string | null
  assessorName: string | null
  assessmentLocation: string | null
  quoteWeeklyAmount: number | null
  quoteHourlyRate: number | null
  quoteSentAt: string | null
  quoteNotes: string | null
  lostReasonCode: EnquiryLostReason | null
  lostReason: string | null
  convertedServiceUserId: string | null
  /** Latest full initial assessment of the linked service user (archived and cancelled ones left out). */
  initialAssessment: {
    id: string
    status: 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVIEWED'
    updatedAt: string
  } | null
  recordedById: string | null
  recordedByName: string | null
  stageChangedAt: string
  /** Files that came with the referral email(s), kept in storage (0 when none). */
  attachmentCount?: number
  createdAt: string
  updatedAt: string
  events: EnquiryEvent[]
}

export type EnquirySummary = {
  total: number
  open: number
  won: number
  lost: number
  winRate: number
  followUpsDue: number
  byStage: Record<string, number>
  lostByReason: Record<string, number>
}

export type ListEnquiriesParams = {
  stage?: EnquiryStage
  kind?: EnquiryKind
  source?: EnquirySource
  ownerId?: string
  /** Header branch filter. */
  locationId?: string
  /** Reference, name, contact or postcode. */
  search?: string
}

/**
 * Write payload. Optional fields may be `null` on update to clear them
 * (the API treats `null` as "clear", `undefined` as "leave as is").
 */
export type EnquiryWriteInput = {
  kind?: EnquiryKind
  referringOrganisation?: string | null
  referrerRole?: string | null
  referralReference?: string | null
  referralDate?: string | null
  firstName: string
  lastName: string
  dateOfBirth?: string | null
  addressLine?: string | null
  postcode?: string | null
  latitude?: number | null
  longitude?: number | null
  contactName?: string | null
  contactRelationship?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  source?: EnquirySource
  sourceDetail?: string | null
  enquiryType?: EnquiryType | null
  urgency?: EnquiryUrgency
  needs?: string | null
  carePlanFormIds?: string[]
  receivedVia?: EnquiryReceivedVia | null
  sentAt?: string | null
  receivedAt?: string | null
  fundingTypeId?: string | null
  funderName?: string | null
  hoursPerWeek?: number | null
  visitsPerDay?: number | null
  requestedStartDate?: string | null
  ownerId?: string | null
  nextFollowUpAt?: string | null
  nextAction?: string | null
  locationId?: string | null
  assessmentAt?: string | null
  assessorId?: string | null
  assessmentLocation?: string | null
  quoteWeeklyAmount?: number | null
  quoteHourlyRate?: number | null
  quoteSentAt?: string | null
  quoteNotes?: string | null
}

export type CreateEnquiryInput = EnquiryWriteInput
export type UpdateEnquiryInput = Partial<EnquiryWriteInput>

export type MoveEnquiryInput = {
  stage: EnquiryStage
  note?: string
  lostReasonCode?: EnquiryLostReason
  lostReason?: string
}
