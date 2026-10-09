import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type ReferralSourceType =
  | 'LOCAL_AUTHORITY'
  | 'NHS'
  | 'HOSPITAL'
  | 'SOCIAL_WORKER'
  | 'GP'
  | 'PRIVATE'
  | 'FAMILY'
  | 'SELF_REFERRAL'
  | 'OTHER'
export type ReferralReceivedVia = 'EMAIL' | 'PHONE' | 'PORTAL' | 'IN_PERSON' | 'LETTER' | 'OTHER'
export type ReferralPriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY'
export type ReferralStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'ASSESSMENT_BOOKED'
  | 'ON_HOLD'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'WITHDRAWN'
export type CareQuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'SUPERSEDED'
export type QuotationPayerType = 'SERVICE_USER' | 'FAMILY' | 'REPRESENTATIVE' | 'OTHER'
export type QuotationChargeFrequency = 'ONE_OFF' | 'WEEKLY' | 'MONTHLY'
export type QuotationAction = 'SEND' | 'ACCEPT' | 'DECLINE' | 'WITHDRAW'

export type RefName = { id: string; name: string }

export type ReferralChange = { field: string; from: string | null; to: string | null }

export type ReferralEvent = {
  id: string
  action: string
  fromStatus: string | null
  toStatus: string | null
  note: string | null
  changes: ReferralChange[]
  userName: string | null
  referralId: string | null
  quotationId: string | null
  createdAt: string
  referralReference?: string | null
  quotationReference?: string | null
}

export type LinkedDocument = {
  id: string
  title: string
  fileName: string | null
  documentType: string
  documentDate: string
  uploadedAt: string
  status: string
}

export type ReferralRow = {
  id: string
  referenceNumber: string
  serviceUserId: string
  status: ReferralStatus
  priority: ReferralPriority
  sourceType: ReferralSourceType
  referringOrganisation: string | null
  referrerName: string | null
  referrerRole: string | null
  referrerPhone: string | null
  referrerEmail: string | null
  referralDate: string | null
  receivedAt: string
  receivedVia: ReferralReceivedVia
  receivedBy: RefName | null
  location: RefName | null
  responsibleEmployee: RefName | null
  careRequirements: string | null
  expectedStartDate: string | null
  requestedHoursPerWeek: number | null
  fundingType: (RefName & { code: string }) | null
  funder: RefName | null
  fundingNotes: string | null
  nextFollowUpAt: string | null
  followUpOverdue: boolean
  decisionAt: string | null
  decisionByName: string | null
  decisionReason: string | null
  notes: string | null
  recordedByName: string | null
  updatedByName: string | null
  createdAt: string
  updatedAt: string
  quotationCount?: number
}

export type ReferralDetail = ReferralRow & {
  events: ReferralEvent[]
  quotations: {
    id: string
    referenceNumber: string
    revision: number
    status: CareQuotationStatus
    weeklyTotal: number
    validUntil: string | null
    createdAt: string
  }[]
  documents: LinkedDocument[]
}

export type ReferralPayload = {
  sourceType: ReferralSourceType
  referringOrganisation?: string
  referrerName?: string
  referrerRole?: string
  referrerPhone?: string
  referrerEmail?: string
  referralDate?: string | null
  receivedAt: string
  receivedVia?: ReferralReceivedVia
  receivedByEmployeeId?: string | null
  locationId?: string | null
  responsibleEmployeeId?: string | null
  priority?: ReferralPriority
  careRequirements?: string
  expectedStartDate?: string | null
  requestedHoursPerWeek?: number | null
  fundingTypeId?: string | null
  funderId?: string | null
  fundingNotes?: string
  nextFollowUpAt?: string | null
  notes?: string
}

export type QuotationLine = {
  id?: string
  description: string
  daysOfWeek: string[]
  visitsPerWeek: number
  durationMinutes: number
  numberOfCarers: number
  hourlyRate: number
  weeklyHours?: number
  weeklyCost?: number
}

export type QuotationCharge = {
  id?: string
  description: string
  amount: number
  frequency: QuotationChargeFrequency
}

export type QuotationRow = {
  id: string
  referenceNumber: string
  revision: number
  rootQuotationId: string | null
  serviceUserId: string
  referral: { id: string; referenceNumber: string } | null
  visitPlanId: string | null
  status: CareQuotationStatus
  expired: boolean
  responsibleEmployee: RefName | null
  payerType: QuotationPayerType
  payerName: string | null
  payerRelationship: string | null
  payerEmail: string | null
  payerPhone: string | null
  payerAddress: string | null
  validUntil: string | null
  startDate: string | null
  currency: string
  notes: string | null
  terms: string | null
  weeklyHours: number
  weeklyCareCost: number
  weeklyChargesCost: number
  monthlyChargesCost: number
  oneOffChargesCost: number
  weeklyTotal: number
  monthlyTotal: number
  lines: QuotationLine[]
  charges: QuotationCharge[]
  sentAt: string | null
  acceptedAt: string | null
  acceptedByName: string | null
  acceptanceMethod: string | null
  declinedAt: string | null
  declineReason: string | null
  supersededAt: string | null
  createdAt: string
  updatedAt: string
}

export type QuotationDetail = QuotationRow & {
  createdByName: string | null
  sentByName: string | null
  acceptanceRecordedByName: string | null
  visitPlan: { id: string; status: string; effectiveFrom: string; weeklyContractedHours: string | null } | null
  revisions: { id: string; revision: number; status: CareQuotationStatus; weeklyTotal: number; createdAt: string }[]
  events: ReferralEvent[]
  documents: LinkedDocument[]
}

export type QuotationPayload = {
  referralId?: string | null
  visitPlanId?: string | null
  responsibleEmployeeId?: string | null
  payerType?: QuotationPayerType
  payerName?: string
  payerRelationship?: string
  payerEmail?: string
  payerPhone?: string
  payerAddress?: string
  validUntil?: string | null
  startDate?: string | null
  notes?: string
  terms?: string
  lines?: Omit<QuotationLine, 'id' | 'weeklyHours' | 'weeklyCost'>[]
  charges?: Omit<QuotationCharge, 'id'>[]
}

export type QuotationStatusPayload = {
  action: QuotationAction
  at?: string
  acceptedByName?: string
  acceptanceMethod?: string
  note?: string
}

const base = (serviceUserId: string) => `/service-users/${serviceUserId}`

export async function fetchReferrals(serviceUserId: string): Promise<ReferralRow[]> {
  return (await apiJson<ApiEnvelope<ReferralRow[]>>(`${base(serviceUserId)}/referrals`, { method: 'GET' })).data
}

export async function fetchReferral(serviceUserId: string, referralId: string): Promise<ReferralDetail> {
  return (
    await apiJson<ApiEnvelope<ReferralDetail>>(`${base(serviceUserId)}/referrals/${referralId}`, { method: 'GET' })
  ).data
}

export async function fetchReferralHistory(serviceUserId: string): Promise<ReferralEvent[]> {
  return (await apiJson<ApiEnvelope<ReferralEvent[]>>(`${base(serviceUserId)}/referral-history`, { method: 'GET' }))
    .data
}

export async function createReferral(serviceUserId: string, body: ReferralPayload): Promise<ReferralDetail> {
  return (
    await apiJson<ApiEnvelope<ReferralDetail>>(`${base(serviceUserId)}/referrals`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  ).data
}

export async function updateReferral(
  serviceUserId: string,
  referralId: string,
  body: Partial<ReferralPayload>,
): Promise<ReferralDetail> {
  return (
    await apiJson<ApiEnvelope<ReferralDetail>>(`${base(serviceUserId)}/referrals/${referralId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  ).data
}

export async function changeReferralStatus(
  serviceUserId: string,
  referralId: string,
  body: { status: ReferralStatus; reason?: string },
): Promise<ReferralDetail> {
  return (
    await apiJson<ApiEnvelope<ReferralDetail>>(`${base(serviceUserId)}/referrals/${referralId}/status`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  ).data
}

export async function addReferralFollowUp(
  serviceUserId: string,
  referralId: string,
  body: { note: string; nextFollowUpAt?: string | null },
): Promise<ReferralDetail> {
  return (
    await apiJson<ApiEnvelope<ReferralDetail>>(`${base(serviceUserId)}/referrals/${referralId}/follow-ups`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  ).data
}

export async function addReferralNote(serviceUserId: string, referralId: string, note: string): Promise<ReferralDetail> {
  return (
    await apiJson<ApiEnvelope<ReferralDetail>>(`${base(serviceUserId)}/referrals/${referralId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    })
  ).data
}

export async function fetchQuotations(serviceUserId: string): Promise<QuotationRow[]> {
  return (await apiJson<ApiEnvelope<QuotationRow[]>>(`${base(serviceUserId)}/quotations`, { method: 'GET' })).data
}

export async function fetchQuotation(serviceUserId: string, quotationId: string): Promise<QuotationDetail> {
  return (
    await apiJson<ApiEnvelope<QuotationDetail>>(`${base(serviceUserId)}/quotations/${quotationId}`, { method: 'GET' })
  ).data
}

export async function createQuotation(serviceUserId: string, body: QuotationPayload): Promise<QuotationDetail> {
  return (
    await apiJson<ApiEnvelope<QuotationDetail>>(`${base(serviceUserId)}/quotations`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  ).data
}

export async function updateQuotation(
  serviceUserId: string,
  quotationId: string,
  body: QuotationPayload,
): Promise<QuotationDetail> {
  return (
    await apiJson<ApiEnvelope<QuotationDetail>>(`${base(serviceUserId)}/quotations/${quotationId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  ).data
}

export async function changeQuotationStatus(
  serviceUserId: string,
  quotationId: string,
  body: QuotationStatusPayload,
): Promise<QuotationDetail> {
  return (
    await apiJson<ApiEnvelope<QuotationDetail>>(`${base(serviceUserId)}/quotations/${quotationId}/status`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  ).data
}

export async function reviseQuotation(serviceUserId: string, quotationId: string, note?: string): Promise<QuotationDetail> {
  return (
    await apiJson<ApiEnvelope<QuotationDetail>>(`${base(serviceUserId)}/quotations/${quotationId}/revise`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    })
  ).data
}
