import type { EnquiryLostReason, EnquiryStage } from '@/features/crm/types/crm.types'

export type QuoteStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'CHANGES_REQUESTED'
  | 'UNDER_NEGOTIATION'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'SUPERSEDED'
  | 'CANCELLED'

export type QuoteType = 'PROVISIONAL_ESTIMATE' | 'FINAL'
export type QuoteFundingCategory = 'PRIVATE' | 'LOCAL_AUTHORITY' | 'NHS' | 'OTHER' | 'MIXED'
export type QuotePayerType = 'PRIVATE_CLIENT' | 'LOCAL_AUTHORITY' | 'NHS' | 'OTHER'
export type QuoteFundingMethod = 'FIXED' | 'PERCENTAGE' | 'PER_VISIT'
export type QuoteFundingStatus = 'CONFIRMED' | 'PENDING_APPROVAL'
export type QuotePatternFrequency = 'WEEKLY' | 'FORTNIGHTLY' | 'FOUR_WEEKLY' | 'ONE_OFF'
export type QuoteNightDuty = 'NONE' | 'SLEEPING_NIGHT' | 'WAKING_NIGHT'
export type QuoteExtraKind = 'SETUP_FEE' | 'MILEAGE' | 'DISCOUNT' | 'OTHER'
export type QuoteChargeFrequency = 'ONE_OFF' | 'WEEKLY' | 'MONTHLY'
export type QuoteResponseType = 'ACCEPTED' | 'DECLINED' | 'CHANGES_REQUESTED' | 'QUERY' | 'NO_RESPONSE'
export type QuoteSendChannel = 'EMAIL' | 'EXTERNAL_EMAIL' | 'POST' | 'HAND_DELIVERED' | 'OTHER'

export type QuotePatternInput = {
  label: string
  careType?: string | null
  startTime: string
  endTime?: string | null
  windowEndTime?: string | null
  durationMinutes: number
  daysOfWeek: number[]
  frequency: QuotePatternFrequency
  effectiveFrom?: string | null
  effectiveTo?: string | null
  oneOffDates?: string[]
  carersPerVisit: number
  nightDuty?: QuoteNightDuty
  activities?: string[]
  notes?: string | null
  manualChargePerVisit?: number | null
  overrideReason?: string | null
}

export type QuoteFundingInput = {
  payerType: QuotePayerType
  payerName?: string | null
  funderId?: string | null
  reference?: string | null
  method: QuoteFundingMethod
  amount: number
  status?: QuoteFundingStatus
}

export type QuoteExtraInput = {
  kind: QuoteExtraKind
  description: string
  frequency: QuoteChargeFrequency
  amount?: number | null
  quantity?: number | null
  isPercentage?: boolean
}

export type QuoteDraftInput = {
  quoteType?: QuoteType
  locationId?: string
  ownerId?: string | null
  proposedStartDate?: string | null
  proposedEndDate?: string | null
  issueDate?: string | null
  validUntil?: string | null
  assessmentReference?: string | null
  fundingCategory?: QuoteFundingCategory
  /** £ per carer per hour; each visit = rate × length × carers unless it has its own price. */
  hourlyRate?: number | null
  /** Short-visit, weekend, bank holiday and night rates (all optional). */
  rates?: QuoteRates | null
  /** DETAILED: visits with times priced from rates. SUMMARY: a typed weekly total and visit slots. */
  clientLayout?: QuoteClientLayout
  /** The typed weekly price of the visits on a SUMMARY quote. */
  manualWeeklyTotal?: number | null
  internalNotes?: string | null
  clientNotes?: string | null
  terms?: string | null
  patterns?: QuotePatternInput[]
  fundings?: QuoteFundingInput[]
  extras?: QuoteExtraInput[]
}

export type QuoteOccurrence = {
  date: string
  weekday: string
  amount: number | null
  rateReference: string
  isBankHoliday: boolean
  issue: string | null
}

export type QuotePricing = {
  /** A "total amount" quote: the visits' price is the typed weekly total; no hours. */
  manual?: boolean
  patterns: Array<{
    index: number
    label: string
    weeklyOccurrences: number
    weeklyCoverageMinutes: number
    weeklyCarerMinutes: number
    chargePerOccurrence: number | null
    rateReference: string | null
    weeklyTotal: number
    oneOffTotal: number
    occurrences: QuoteOccurrence[]
    issues: string[]
  }>
  extras: Array<QuoteExtraInput & { total: number; weeklyEquivalent: number; issue: string | null }>
  fundings: Array<QuoteFundingInput & { weeklyAmount: number }>
  visitsWeekly: number
  extrasWeekly: number
  discountWeekly: number
  netWeekly: number
  vatWeekly: number
  vatLabel: string
  weeklyTotal: number
  oneOffTotal: number
  weeklyCoverageMinutes: number
  weeklyCarerMinutes: number
  estimates: Array<{ key: string; label: string; amount: number; method: string }>
  calendarMonth: { month: string; amount: number; occurrences: number; bankHolidayOccurrences: number; method: string; complete: boolean }
  clientWeeklyLiability: number
  clientWeeklyLiabilityIfPendingDeclined: number
  fundedWeekly: number
  pendingFundingWeekly: number
  issues: string[]
  unresolvedCharges: number
}

/** DETAILED: every visit with times and prices. SUMMARY: only the total and the visits by time of day. */
export type QuoteClientLayout = 'DETAILED' | 'SUMMARY'

/** A day rate: a % on top of the visit price, or an hourly rate used instead of the standard one. */
export type QuoteDayRate = { mode: 'PERCENT' | 'HOURLY'; value: number }

/**
 * The quote's other rates. A visit is priced by its night rate, else its short-visit price, else the
 * hourly rate; a bank holiday (or else weekend) rate is then applied for the day.
 */
export type QuoteRates = {
  shortVisits?: { upToMinutes: number; pricePerVisit: number }[]
  weekend?: QuoteDayRate | null
  bankHoliday?: QuoteDayRate | null
  sleepingNightPrice?: number | null
  wakingNightHourly?: number | null
}

export type QuotePricingPreview = {
  /** £ per carer per hour the preview was priced at. */
  hourlyRate: number | null
  referenceWeekStart: string
  calendarMonth: string
  pricing: QuotePricing
}

export type QuoteVersion = {
  id: string
  quotationId: string
  quotationNumber: string
  versionNumber: number
  label: string
  status: QuoteStatus
  statusLabel: string
  editable: boolean
  quoteType: QuoteType
  revisedFromVersionId: string | null
  locationId: string | null
  ownerId: string | null
  ownerName?: string | null
  proposedStartDate: string | null
  proposedEndDate: string | null
  issueDate: string | null
  validUntil: string | null
  assessmentReference: string | null
  fundingCategory: QuoteFundingCategory
  hourlyRate: number | null
  rates: QuoteRates | null
  clientLayout: QuoteClientLayout
  manualWeeklyTotal: number | null
  internalNotes: string | null
  clientNotes: string | null
  terms: string | null
  totals: {
    weekly: number
    fourWeekly: number
    monthlyAverage: number
    annual: number
    calendarMonth: number | null
    oneOff: number
    vatWeekly: number
    clientWeeklyLiability: number
    weeklyCoverageMinutes: number
    weeklyCarerMinutes: number
    unresolvedCharges: number
    calculatedAt: string | null
  }
  pricing: QuotePricing | null
  /** Only on quotes priced before manual pricing, from a charge card. */
  pricingCard: { id: string; name: string } | null
  issuedAt: string | null
  approvedAt: string | null
  approvedByName?: string | null
  approvalNote: string | null
  sentAt: string | null
  acceptedAt: string | null
  agreementReceivedAt: string | null
  agreementNote: string | null
  convertedVisitPlanId: string | null
  statusChangedAt: string
  createdAt: string
  patterns: Array<QuotePatternInput & {
    id: string
    rateReference: string | null
    chargePerOccurrence: number | null
    weeklyOccurrences: number
    weeklyCoverageMinutes: number
    weeklyCarerMinutes: number
    weeklyTotal: number
    pricingIssue: string | null
    overrideById: string | null
    overrideAt: string | null
  }>
  fundings: Array<QuoteFundingInput & { id: string; weeklyAmount: number }>
  extras: Array<QuoteExtraInput & { id: string; total: number }>
}

export type QuoteCommunication = {
  id: string
  versionId: string
  channel: QuoteSendChannel
  status: 'SENT' | 'FAILED' | 'RECORDED'
  recipientName: string | null
  recipientEmail: string | null
  template: string | null
  subject: string | null
  senderName: string | null
  sentAt: string | null
  failureReason: string | null
  attemptCount: number
  followUpDate: string | null
  createdAt: string
}

export type QuoteResponse = {
  id: string
  versionId: string
  responseType: QuoteResponseType
  responderName: string | null
  responderRelationship: string | null
  method: string | null
  respondedAt: string
  details: string | null
  evidence: string | null
  declineReasonCode: EnquiryLostReason | null
  nextAction: string | null
  createdVersionId: string | null
  recordedByName: string | null
}

export type QuoteFollowUp = {
  id: string
  versionId: string | null
  assigneeId: string | null
  assigneeName: string | null
  method: string | null
  dueAt: string
  note: string | null
  status: 'OPEN' | 'DONE' | 'CANCELLED'
  overdue: boolean
  completedAt: string | null
  completedByName: string | null
  outcome: string | null
  rescheduledFromId: string | null
  createdAt: string
}

export type QuotePrerequisite = { key: string; label: string; done: boolean; detail: string }

export type QuoteVersionDetail = QuoteVersion & {
  allVersions: Array<{ id: string; versionNumber: number; status: QuoteStatus; statusLabel: string }>
  prerequisites: QuotePrerequisite[] | null
  serviceUserId: string | null
  enquiryStage: EnquiryStage
  emailAvailable: boolean
  defaultRecipient: { name: string | null; email: string | null }
  communications: QuoteCommunication[]
  responses: QuoteResponse[]
  followUps: QuoteFollowUp[]
}

export type QuotationListItem = {
  id: string
  quotationNumber: string
  isCurrent: boolean
  createdAt: string
  latestVersion: QuoteVersion | null
  versions: Array<{ id: string; versionNumber: number; status: QuoteStatus; statusLabel: string; weeklyTotal: number; sentAt: string | null; createdAt: string }>
  summary: {
    weeklyTotal: number
    monthlyAverage: number
    sentAt: string | null
    lastSend: { status: QuoteCommunication['status']; channel: QuoteSendChannel; at: string; failureReason: string | null } | null
    responseType: QuoteResponseType | null
    respondedAt: string | null
    followUp: { id: string; dueAt: string; overdue: boolean } | null
  }
}

export type EnquiryQuotations = {
  quotations: QuotationListItem[]
  emailAvailable: boolean
  legacy: {
    unlinked: boolean
    hasLegacyFields: boolean
    weeklyAmount: number | null
    hourlyRate: number | null
    sentAt: string | null
    notes: string | null
    reconciledAt: string | null
    reconcileNote: string | null
  }
}

export type SendQuoteInput = {
  channel: QuoteSendChannel
  recipientName?: string
  recipientEmail?: string
  subject?: string
  message?: string
  sentAt?: string
  followUpDate?: string
  idempotencyKey: string
}

export type RecordResponseInput = {
  responseType: QuoteResponseType
  responderName?: string
  responderRelationship?: string
  method?: string
  respondedAt?: string
  details?: string
  evidence?: string
  declineReasonCode?: EnquiryLostReason
  markEnquiryLost?: boolean
  nextAction?: string
  followUpAt?: string
}

export type CreateFollowUpInput = { dueAt: string; assigneeId?: string | null; method?: string; note?: string; versionId?: string }
export type UpdateFollowUpInput = { action: 'COMPLETE' | 'RESCHEDULE' | 'CANCEL'; dueAt?: string; outcome?: string }
export type ReconcileLegacyInput = { action: 'ACKNOWLEDGE' | 'MOVE_STAGE'; stage?: EnquiryStage; note: string }

type QuoteDiffSide = {
  id: string
  versionNumber: number
  statusLabel: string
  weeklyTotal: number
  clientWeeklyLiability: number
}

/** Two versions compared in plain words (values already formatted: £, days, dates). */
export type QuoteDiff = {
  from: QuoteDiffSide
  to: QuoteDiffSide
  rows: Array<{
    section: string
    /** The visit, funder or extra the row belongs to ("Visit 2 · Morning visit"). */
    item: string | null
    field: string
    from: string | null
    to: string | null
    change: 'changed' | 'added' | 'removed'
    /** For money fields: new minus old. */
    delta: number | null
  }>
}

export type ClientQuoteView = {
  /** SUMMARY: visits by time of day with no times or per-visit prices. */
  layout?: QuoteClientLayout
  provider?: { name: string; email: string | null; phone: string | null; vatNumber: string | null }
  quotationNumber: string
  versionNumber: number
  quoteTypeLabel: string
  statusLabel: string
  issueDate: string | null
  validUntil: string | null
  proposedStartDate: string | null
  clientName: string
  visits: Array<{ label: string; when: string; duration: string; carers: number; activities: string[]; perVisit: string | null; weekly: string }>
  extras: Array<{ description: string; frequency: string; amount: string }>
  /** The rates in words, when the quote has rates besides the hourly one. */
  rates?: Array<{ label: string; value: string }>
  totals: Array<{ label: string; amount: string; method: string }>
  oneOffTotal: string | null
  /** Only when the quote charges VAT. */
  vatLabel: string | null
  funding: Array<{ payer: string; detail: string; weekly: string; status: string }>
  clientWeeklyLiability: string
  clientNotes: string | null
  terms: string | null
}
