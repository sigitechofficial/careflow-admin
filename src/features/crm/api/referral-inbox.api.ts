import { apiJson, getApiBaseUrl, type ApiEnvelope } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'

export type ReferralEmailStatus = 'RECEIVED' | 'READ' | 'FAILED' | 'NOT_A_REFERRAL' | 'ENQUIRY_CREATED' | 'DISMISSED' | 'FOLLOW_UP'

/** What Claude read from a referral email and its attachments (empty strings where not given). */
export type ReferralExtraction = {
  isReferral: boolean
  requestType?: 'CARE_REFERRAL' | 'PRICE_ENQUIRY' | 'GENERAL_QUESTION' | 'NOT_CARE'
  /** Kind of email (absent on emails read before kinds existed). */
  emailKind?: EmailKind
  summary: string
  person: {
    firstName: string
    lastName: string
    dateOfBirth: string
    addressLine: string
    postcode: string
    phone: string
    nhsNumber: string
    livesAlone: string
  }
  contact: { name: string; relationship: string; phone: string; email: string }
  referrer: { organisation: string; name: string; role: string; email: string; phone: string; reference: string }
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY'
  careNeeds: string
  conditions: string[]
  risks: string[]
  care: {
    hoursPerWeek: string
    visitsPerDay: string
    visitTimes: string
    carersPerVisit: string
    requestedStartDate: string
    genderPreference: string
    languageOrCulture: string
  }
  funding: { type: string; funderName: string; details: string }
  visits?: Array<{ label: string; startTime: string; durationMinutes: number; days: string[]; carers: number; tasks?: string }>
  /** Fuller details from detailed referral forms (absent on emails read before it was added). */
  details?: ReferralDetails
  careAreas?: string[]
  priceAsked?: boolean
  questionsAsked: string[]
  missingInformation: string[]
  attachmentsRead: Array<{ fileName: string; whatItIs: string }>
}

export type ReferralDetails = {
  keyFacts: {
    packageType: string
    respondBy: string
    currentLocation: string
    access: string
    resuscitation: string
    medicationSupport: string
    transfers: string
  }
  allergies: string[]
  medicines: string[]
  equipment: Array<{ item: string; status: string }>
  people: Array<{ role: string; name: string; phone: string; email: string; notes: string }>
  outcomes: string[]
  /** Every other fact, grouped by the form's section. */
  sections: Array<{ section: string; label: string; value: string }>
}

export type ReferralEmail = {
  id: string
  /** The mailbox it came into. */
  mailboxId?: string | null
  fromName: string | null
  fromEmail: string | null
  subject: string | null
  receivedAt: string
  status: ReferralEmailStatus
  attachments: Array<{ index: number; fileName: string; mimeType: string; size: number; available: boolean; skippedReason: string | null }>
  extraction: ReferralExtraction | null
  extractionModel: string | null
  extractionCostUsd: number | null
  error: string | null
  enquiryId: string | null
  enquiryReference?: string | null
  bodyText?: string
  locationId: string | null
  checks: Array<{ key: string; label: string; result: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN'; detail: string }> | null
  decision: 'YES' | 'POSSIBLY' | 'NEED_INFO' | 'NO' | null
  decisionReasons: string[]
  replySubject: string | null
  replyText: string | null
  replySentAt: string | null
  replySentTo: string | null
  replyError: string | null
  replyHtml: string | null
  replyCopiedTo: string[]
  quotationId: string | null
  quotationVersionId: string | null
  rateSource: string | null
}

export type ReferralBranchCoverage = {
  id: string
  locationId: string
  branchName: string
  localAuthorities: string[]
  replyManagerName: string | null
  replyManagerTitle: string | null
  replyPhone: string | null
  isActive: boolean
}

export type ReferralAutomationSettings = {
  id: string
  autoCreateEnquiry: boolean
  autoReply: boolean
  autoReplyDecisions: string[]
  minNoticeDays: number
  answerPriceQuestions: boolean
  availabilityMode: 'SAME_CARER' | 'ANY_CARER_EACH_DAY'
  travelBufferMinutes: number
  copyRepliesTo: string[]
  autoQuote: boolean
  quoteValidDays: number
  unplacedLocationId: string | null
  standardRates: ReferralStandardRate[]
  coverage: ReferralBranchCoverage[]
  rules: ReferralRules
  /** Served by the API so the screen and the checks use the same list. */
  ruleCatalog: RuleDef[]
  emailKinds: Array<{ key: EmailKind; label: string; hint: string; defaultAction: KindAction; newCare: boolean }>
}

export type EmailKind =
  | 'NEW_REFERRAL'
  | 'BROKERAGE_OFFER'
  | 'PRIVATE_ENQUIRY'
  | 'PRICE_ENQUIRY'
  | 'GENERAL_QUESTION'
  | 'FOLLOW_UP'
  | 'REFERRAL_WITHDRAWN'
  | 'EXISTING_CLIENT'
  | 'COMPLAINT'
  | 'SAFEGUARDING_CONCERN'
  | 'JOB_APPLICATION'
  | 'SUPPLIER_OR_MARKETING'
  | 'OTHER'
export type KindAction = 'AUTO' | 'STAFF' | 'IGNORE'
export type RuleOutcome = 'OFF' | 'NOTE' | 'MANAGER' | 'DECLINE'
export type RuleDef = {
  key: string
  group: string
  label: string
  hint: string
  defaultOutcome: RuleOutcome
  value?: { kind: 'minutes' | 'time' | 'hours' | 'age' | 'count'; default: number | string; label: string }
}
export type RuleSetting = { key: string; outcome: RuleOutcome; value?: number | string | null; locationId?: string | null }
export type CustomRule = { id: string; text: string; outcome: 'NOTE' | 'MANAGER'; locationId: string | null; isActive: boolean }
export type ReferralRules = { kinds: Partial<Record<EmailKind, KindAction>>; rules: RuleSetting[]; custom: CustomRule[] }

/** Standard private rates (quotation rate format) for one branch, or all branches when locationId is null. */
export type ReferralStandardRate = {
  id?: string
  locationId: string | null
  branchName?: string
  hourlyRate: number | null
  rates: {
    shortVisits?: Array<{ upToMinutes: number; pricePerVisit: number }>
    weekend?: { mode: 'PERCENT' | 'HOURLY'; value: number } | null
    bankHoliday?: { mode: 'PERCENT' | 'HOURLY'; value: number } | null
    sleepingNightPrice?: number | null
    wakingNightHourly?: number | null
  } | null
  notes?: string | null
}

export type MailboxProvider = 'GMAIL' | 'MICROSOFT' | 'IMAP' | 'INBOUND_WEBHOOK'

export type ImapSettings = {
  imapHost: string
  imapPort: number
  imapSecure: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  username: string
  sentFolder?: string | null
}

export type RelaySettings = { host: string; port: number; secure: boolean; username: string; fromAddress?: string | null }

/** A connected mailbox. Passwords, tokens and keys never leave the server; only whether one is set. */
export type ReferralMailbox = {
  id: string
  provider: MailboxProvider
  emailAddress: string
  displayName: string | null
  /** Gmail label, or the folder to read (Microsoft, IMAP). */
  labelName: string
  defaultLocationId: string | null
  defaultLocationName: string | null
  /** false = turned off (not read; settings kept). */
  isActive: boolean
  lastCheckedAt: string | null
  lastError: string | null
  createdAt: string
  imap: (ImapSettings & { hasPassword: boolean }) | null
  sendVia: 'MAILBOX' | 'SMTP_RELAY'
  relay: (RelaySettings & { hasPassword: boolean }) | null
  webhook: { path: string; hasApiKey: boolean } | null
}

export type ReferralMailboxStatus = {
  gmailConfigured: boolean
  microsoftConfigured: boolean
  aiConfigured: boolean
  testMode: boolean
  /** The first mailbox. */
  mailbox: ReferralMailbox | null
  mailboxes: ReferralMailbox[]
}

export type ImapMailboxInput = ImapSettings & {
  displayName?: string | null
  emailAddress: string
  folder?: string | null
  password: string
  defaultLocationId?: string | null
}

export type MailboxUpdateInput = {
  displayName?: string | null
  labelName?: string
  defaultLocationId?: string | null
  imap?: Partial<ImapSettings> & { password?: string | null }
  sendVia?: 'MAILBOX' | 'SMTP_RELAY'
  relay?: (RelaySettings & { password?: string | null }) | null
  apiKey?: string | null
}

async function data<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, init)
  return res.data
}

export const fetchReferralMailbox = () => data<ReferralMailboxStatus>('/referral-mailbox')
export const startGmailConnect = () => data<{ url: string }>('/referral-mailbox/google/connect', { method: 'POST' })
export const disconnectReferralMailbox = () => apiJson('/referral-mailbox', { method: 'DELETE' })
export const checkReferralMailbox = () =>
  data<{ saved: number; read: number; busy: boolean; errors?: string[] }>('/referral-mailbox/check', { method: 'POST' })
export const insertTestReferral = (scenario: number, mailboxId?: string) =>
  apiJson<{ message: string }>(
    `/referral-mailbox/test-email?scenario=${scenario}${mailboxId ? `&mailboxId=${encodeURIComponent(mailboxId)}` : ''}`,
    { method: 'POST' },
  )

export const startMicrosoftConnect = () => data<{ url: string }>('/referral-mailbox/microsoft/connect', { method: 'POST' })
export const addImapMailbox = (body: ImapMailboxInput) =>
  apiJson<{ message: string; data: { id: string } }>('/referral-mailbox/mailboxes/imap', { method: 'POST', body: JSON.stringify(body) })
export const addWebhookMailbox = (body: { displayName?: string | null; emailAddress: string; apiKey?: string | null; defaultLocationId?: string | null }) =>
  apiJson<{ message: string; data: { id: string; path: string } }>('/referral-mailbox/mailboxes/webhook', {
    method: 'POST',
    body: JSON.stringify(body),
  })
export const updateMailbox = (id: string, body: MailboxUpdateInput) =>
  data<ReferralMailboxStatus>(`/referral-mailbox/mailboxes/${id}`, { method: 'POST', body: JSON.stringify(body) })
export const testMailbox = (id: string) => apiJson<{ message: string }>(`/referral-mailbox/mailboxes/${id}/test`, { method: 'POST' })
export const checkOneMailbox = (id: string) =>
  data<{ saved: number; busy: boolean; errors?: string[] }>(`/referral-mailbox/mailboxes/${id}/check`, { method: 'POST' })
export const newWebhookAddress = (id: string) =>
  apiJson<{ message: string; data: { id: string; path: string } }>(`/referral-mailbox/mailboxes/${id}/webhook-address`, { method: 'POST' })
export const turnMailboxOff = (id: string) => apiJson<{ message: string }>(`/referral-mailbox/mailboxes/${id}/off`, { method: 'POST' })
export const turnMailboxOn = (id: string) => apiJson<{ message: string }>(`/referral-mailbox/mailboxes/${id}/on`, { method: 'POST' })
/** Wipes the mailbox's sign-in, password and keys; emails already read stay. */
export const removeMailbox = (id: string) => apiJson<{ message: string }>(`/referral-mailbox/mailboxes/${id}`, { method: 'DELETE' })

/** The full address an email service posts to (the API's public address + the mailbox's secret path). */
export function webhookUrl(path: string): string {
  const base = getApiBaseUrl()
  const origin = /^https?:\/\//.test(base) ? base : `${window.location.origin}${base || '/api'}`
  return `${origin.replace(/\/$/, '')}${path}`
}
export const fetchReferralEmails = (status: string) =>
  data<ReferralEmail[]>(`/referral-mailbox/emails?status=${encodeURIComponent(status)}`)
export const fetchReferralEmailsForEnquiry = (enquiryId: string) =>
  data<ReferralEmail[]>(`/referral-mailbox/emails?enquiryId=${encodeURIComponent(enquiryId)}`)
export const fetchReferralSettings = () => data<ReferralAutomationSettings>('/referral-mailbox/settings')
export const saveReferralSettings = (body: Partial<Omit<ReferralAutomationSettings, 'coverage' | 'id' | 'standardRates' | 'ruleCatalog' | 'emailKinds'>> & {
  coverage?: Array<Omit<ReferralBranchCoverage, 'id' | 'branchName'>>
  standardRates?: Array<Pick<ReferralStandardRate, 'locationId' | 'hourlyRate' | 'rates' | 'notes'>>
}) => data<ReferralAutomationSettings>('/referral-mailbox/settings', { method: 'POST', body: JSON.stringify(body) })
export const fetchTestScenarios = () =>
  data<Array<{ index: number; label: string; audience: string }>>('/referral-mailbox/test-emails')
export const sendReferralReply = (id: string, body: { subject?: string; text?: string; html?: string }) =>
  apiJson<{ message: string }>(`/referral-mailbox/emails/${id}/reply`, { method: 'POST', body: JSON.stringify(body) })
export const recheckReferral = (id: string) => data<ReferralEmail>(`/referral-mailbox/emails/${id}/recheck`, { method: 'POST' })
export const fetchReferralEmail = (id: string) => data<ReferralEmail>(`/referral-mailbox/emails/${id}`)
export const readReferralAgain = (id: string) => data<ReferralEmail>(`/referral-mailbox/emails/${id}/read`, { method: 'POST' })
export const dismissReferral = (id: string) => apiJson(`/referral-mailbox/emails/${id}/dismiss`, { method: 'POST' })
export const createEnquiryFromReferral = (id: string, locationId: string) =>
  data<{ enquiryId: string; referenceNumber: string }>(`/referral-mailbox/emails/${id}/enquiry`, {
    method: 'POST',
    body: JSON.stringify({ locationId }),
  })

/** An attachment from private storage (signed-in fetch), as a blob for the on-page viewer or a download. */
export async function fetchReferralAttachment(id: string, index: number): Promise<Blob> {
  const headers = new Headers()
  const token = useAuthStore.getState().accessToken
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${getApiBaseUrl()}/referral-mailbox/emails/${id}/attachments/${index}`, { headers })
  if (!res.ok) throw new Error(`Could not open the attachment (${res.status})`)
  return res.blob()
}

/** The text of a Word attachment (browsers can't show .docx). */
export const fetchReferralAttachmentText = (id: string, index: number) =>
  data<{ fileName: string; text: string }>(`/referral-mailbox/emails/${id}/attachments/${index}/text`)
