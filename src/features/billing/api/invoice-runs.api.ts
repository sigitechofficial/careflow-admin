import { apiJson, ApiError, type ApiEnvelope } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import type { ExportStatus, InvoiceRunStatus } from '@/features/billing/types/billing.types'
import type { ServiceUserInvoicesOverview } from '@/features/billing/types/service-user-invoices.types'

export type InvoiceRunRow = {
  id: string
  period: string
  periodStart: string
  periodEnd: string
  status: InvoiceRunStatus
  serviceUsers: number
  funders: number
  netTotal: string
  exceptions: number
  exportStatus: ExportStatus
  /** Per–service-user invoices fully paid. */
  invoicesPaid?: number
  /** Per–service-user invoices with no payment. */
  invoicesUnpaid?: number
  /** Per–service-user invoices partially paid. */
  invoicesPartPaid?: number
  /** Total payment allocations on the run. */
  paidAmount?: string
  paidAmountValue?: number
  createdAt?: string | null
  createdById?: string | null
  createdByName?: string | null
  approvedById?: string | null
  approvedByName?: string | null
  lockedById?: string | null
  lockedByName?: string | null
  sentById?: string | null
  sentByName?: string | null
  /** QBO-style invoice document numbers on the run (one per service user). */
  invoiceNumbers?: string[]
}

export type InvoiceRunsSummary = {
  invoiceDrafts: number
}

export type InvoiceRunLine = {
  id: string
  visitRef: string | null
  serviceUserId: string
  serviceUserName: string
  serviceUserNumber: string | null
  funderId: string | null
  funderName: string
  funderCode: string | null
  description: string
  minutes: number | null
  splitPercent: number | null
  amount: string
  amountValue: number
  exceptionMessage: string | null
}

export type InvoiceRunFunderSummary = {
  funderId: string | null
  funderName: string
  funderCode: string | null
  lineCount: number
  subtotal: string
  subtotalValue: number
  paid?: string
  paidValue?: number
  outstanding?: string
  outstandingValue?: number
  paymentStatus?: 'UNPAID' | 'PART_PAID' | 'PAID'
  lines?: InvoiceRunLine[]
}

/** One invoice document per service user on the run. */
export type InvoiceRunServiceUserHistoryEvent = {
  id: string
  type: 'CREATED' | 'APPROVED' | 'LOCKED' | 'SENT' | 'PAYMENT'
  at: string
  label: string
  detail: string | null
  amount: string | null
  amountValue: number | null
  reference: string | null
  funderName: string | null
  actorUserId?: string | null
  actorName?: string | null
}

export type InvoiceRunAuditAction =
  | 'CREATED'
  | 'CALCULATED'
  | 'APPROVED'
  | 'LOCKED'
  | 'SENT'
  | 'EMAIL_SENT'
  | 'EXPORTED'
  | 'PAYMENT_ALLOCATED'

export type InvoiceRunAuditTrailItem = {
  id: string
  action: InvoiceRunAuditAction
  at: string
  actorUserId: string | null
  actorName: string | null
  detail: string | null
  metadata: Record<string, unknown> | null
}

export type InvoiceRunServiceUserFunderShare = {
  funderId: string | null
  funderName: string
  funderCode: string | null
  invoiced: string
  invoicedValue: number
  billTo?: InvoiceBillTo | null
  paid?: string
  paidValue?: number
  outstanding?: string
  outstandingValue?: number
  paymentStatus?: 'UNPAID' | 'PART_PAID' | 'PAID'
}

/** Who an invoice is addressed to: the funder's billing details, or the funding line's own. */
export type InvoiceBillTo = {
  name: string
  attention: string | null
  email: string | null
  addressLines: string[]
  purchaseOrderNumber: string | null
  fundingReference: string | null
}

/** One invoice document per service user on the run. */
export type InvoiceRunServiceUserSummary = {
  /** Set when one funder pays this invoice. */
  billTo?: InvoiceBillTo | null
  serviceUserId: string
  serviceUserName: string
  serviceUserNumber: string | null
  /** How often this client is invoiced: WEEKLY or MONTHLY. */
  invoiceBillingFrequency?: 'WEEKLY' | 'MONTHLY' | string | null
  /** QBO-style sequential number, e.g. INV-1001 */
  invoiceNumber?: string | null
  lineCount: number
  funderCount: number
  funderLabel: string
  funders: InvoiceRunServiceUserFunderShare[]
  subtotal: string
  subtotalValue: number
  paid?: string
  paidValue?: number
  outstanding?: string
  outstandingValue?: number
  paymentStatus?: 'UNPAID' | 'PART_PAID' | 'PAID'
  /** ISO datetime of the last payment allocated to this service-user invoice. */
  paidAt?: string | null
  /** ISO datetime of the last email send for this service-user invoice. */
  sentAt?: string | null
  /** YYYY-MM-DD due date (invoice date + payment terms). */
  dueDate?: string | null
  /** YYYY-MM-DD invoice date when the document was created. */
  invoiceDate?: string | null
  /** Snapshot of charge-card payment terms (e.g. Net 30). */
  paymentTerms?: string | null
  exceptionCount?: number
  history?: InvoiceRunServiceUserHistoryEvent[]
  /** Present when attached client-side for Preview; omitted from list API payload. */
  lines?: InvoiceRunLine[]
}

export type InvoiceRunDetail = InvoiceRunRow & {
  notes: string | null
  lineCount: number
  createdAt?: string | null
  approvedAt: string | null
  lockedAt: string | null
  sentAt: string | null
  paidAmount: string
  outstanding: string
  paidAmountValue: number
  outstandingValue: number
  netTotalValue: number
  lines: InvoiceRunLine[]
  funderSummaries: InvoiceRunFunderSummary[]
  serviceUserSummaries?: InvoiceRunServiceUserSummary[]
  auditTrail?: InvoiceRunAuditTrailItem[]
}

export async function fetchInvoiceRuns(params?: {
  locationId?: string
}): Promise<InvoiceRunRow[]> {
  const qs = new URLSearchParams()
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<InvoiceRunRow[]>>(
    `/billing/invoice-runs${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchInvoiceRunsSummary(locationId?: string): Promise<InvoiceRunsSummary> {
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ''
  const res = await apiJson<ApiEnvelope<InvoiceRunsSummary>>(
    `/billing/invoice-runs/summary${qs}`,
    {
      method: 'GET',
    },
  )
  return res.data
}

export async function fetchInvoiceRun(
  id: string,
  params?: { locationId?: string },
): Promise<InvoiceRunDetail> {
  const qs = new URLSearchParams()
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<InvoiceRunDetail>>(
    `/billing/invoice-runs/${id}${suffix}`,
    {
      method: 'GET',
    },
  )
  return res.data
}

export async function createInvoiceRun(body: {
  periodStart: string
  periodEnd: string
  notes?: string
}): Promise<InvoiceRunRow> {
  const res = await apiJson<ApiEnvelope<InvoiceRunRow>>('/billing/invoice-runs', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteAllInvoiceRuns(): Promise<{ deleted: number }> {
  const res = await apiJson<ApiEnvelope<{ deleted: number }>>('/billing/invoice-runs', {
    method: 'DELETE',
  })
  return res.data
}

export async function calculateInvoiceRun(id: string): Promise<void> {
  await apiJson(`/billing/invoice-runs/${id}/calculate`, { method: 'POST' })
}

export async function approveInvoiceRun(id: string): Promise<void> {
  await apiJson(`/billing/invoice-runs/${id}/approve`, { method: 'POST' })
}

export async function lockInvoiceRun(id: string): Promise<void> {
  await apiJson(`/billing/invoice-runs/${id}/lock`, { method: 'POST' })
}

export async function sendInvoiceRun(id: string): Promise<void> {
  await apiJson(`/billing/invoice-runs/${id}/send`, { method: 'POST' })
}

export type ServiceUserInvoiceEmailFunderShare = {
  funderId: string | null
  funderName: string
  subtotal: string
  subtotalValue: number
  defaultToEmail: string | null
  suggestions: Array<{ email: string; source: string; label: string }>
}

export type ServiceUserInvoiceEmailPreview = {
  runId: string
  period: string
  periodStart: string
  periodEnd: string
  status: string
  currency: string
  serviceUserId: string
  serviceUserName: string
  serviceUserNumber: string | null
  subtotal: string
  subtotalValue: number
  defaultToEmail: string | null
  suggestions: Array<{ email: string; source: string; label: string }>
  funders: ServiceUserInvoiceEmailFunderShare[]
  defaultFunderId: string | null
  requiresFunderSelection: boolean
  hasDirectLines?: boolean
  canMarkSent: boolean
}

export type EmailInvoiceToServiceUserResult = {
  to: string
  messageId: string
  mode: 'smtp' | 'log'
  markedSent: boolean
  runId: string
  serviceUserId: string
  funderId?: string | null
  funderName?: string | null
}

export async function fetchServiceUserInvoiceEmailPreview(
  runId: string,
  serviceUserId: string,
): Promise<ServiceUserInvoiceEmailPreview> {
  const qs = new URLSearchParams({ serviceUserId })
  const res = await apiJson<ApiEnvelope<ServiceUserInvoiceEmailPreview>>(
    `/billing/invoice-runs/${runId}/service-user-email-preview?${qs}`,
  )
  return res.data!
}

export async function emailInvoiceToServiceUser(
  runId: string,
  body: {
    serviceUserId: string
    /** Funder UUID, or `"direct"` for Direct/family lines. */
    funderId?: string
    toEmail?: string
    markSent?: boolean
  },
): Promise<EmailInvoiceToServiceUserResult> {
  const res = await apiJson<ApiEnvelope<EmailInvoiceToServiceUserResult>>(
    `/billing/invoice-runs/${runId}/email-service-user`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data!
}

/** Download the invoice run as CSV or Excel (authenticated, streamed as a file). */
export async function downloadInvoiceRunExport(
  id: string,
  format: 'csv' | 'xlsx',
  opts?: { serviceUserId?: string },
): Promise<void> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured.', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const qs = new URLSearchParams({ format })
  if (opts?.serviceUserId) qs.set('serviceUserId', opts.serviceUserId)
  const res = await fetch(`${base}/billing/invoice-runs/${id}/export?${qs}`, { headers })
  if (!res.ok) throw new ApiError('Export failed', res.status)
  const disposition = res.headers.get('content-disposition') ?? ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  const filename = match?.[1] ?? `invoice-${id}.${format}`
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export type ServiceUserInvoiceFunderSummary = {
  funderId: string | null
  funderName: string
  funderCode: string | null
  lineCount: number
  subtotal: string
  subtotalValue: number
  paid: string
  paidValue: number
  outstanding: string
  outstandingValue: number
  paymentStatus: 'UNPAID' | 'PART_PAID' | 'PAID'
}

export type ServiceUserInvoiceLine = {
  id: string
  /** VISIT_CHARGE, or LATE_CANCELLATION for a visit cancelled late with a Charge decision. */
  lineType?: 'VISIT_CHARGE' | 'ADJUSTMENT' | 'LATE_CANCELLATION' | 'TIMEBANK_HOURS' | 'TIMEBANK_USED'
  /** Late cancellation: hours of notice the cancellation gave. */
  cancellationNoticeHours?: number | null
  /** Late cancellation: percent of the visit fee charged. */
  cancellationChargePercent?: number | null
  visitRef: string | null
  funderName: string
  description: string
  minutes: number | null
  amount: string
  amountValue: number
  exceptionMessage: string | null
  date?: string | null
  slot?: string | null
  carerName?: string | null
  plannedStart?: string | null
  plannedEnd?: string | null
  actualStart?: string | null
  actualEnd?: string | null
  plannedDuration?: string | null
  actualDuration?: string | null
  durationVariance?: string | null
  address?: string | null
}

export type ServiceUserInvoiceRunRow = {
  id: string
  period: string
  periodStart: string
  periodEnd: string
  status: InvoiceRunStatus
  exportStatus: ExportStatus
  sentAt: string | null
  lockedAt: string | null
  invoiceNumber?: string | null
  /** YYYY-MM-DD due date (invoice date + payment terms). */
  dueDate?: string | null
  invoiceDate?: string | null
  paymentTerms?: string | null
  lineCount: number
  subtotal: string
  subtotalValue: number
  exceptions: number
  funders: number
  funderSummaries: ServiceUserInvoiceFunderSummary[]
  lines: ServiceUserInvoiceLine[]
  runNetTotal: string
  runNetTotalValue: number
  paid: string
  paidValue: number
  outstanding: string
  outstandingValue: number
  paymentStatus: 'UNPAID' | 'PART_PAID' | 'PAID'
  sent: boolean
  canSend: boolean
}

export type ServiceUserInvoicesSummary = {
  serviceUserId: string
  serviceUserName: string
  serviceUserNumber: string | null
  readyToInvoiceCount: number
  totalInvoiced: string
  totalInvoicedValue: number
  totalPaid?: string
  totalPaidValue?: number
  openBalance?: string
  openBalanceValue?: number
  runCount: number
  runs: ServiceUserInvoiceRunRow[]
}

export async function fetchServiceUserInvoices(
  serviceUserId: string,
): Promise<ServiceUserInvoicesSummary> {
  const res = await apiJson<ApiEnvelope<ServiceUserInvoicesSummary>>(
    `/billing/invoice-runs/service-user/${serviceUserId}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchServiceUserInvoicesOverview(
  month?: string,
  locationId?: string,
): Promise<ServiceUserInvoicesOverview> {
  const qs = new URLSearchParams()
  if (month) qs.set('month', month)
  if (locationId) qs.set('locationId', locationId)
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<ServiceUserInvoicesOverview>>(
    `/billing/invoice-runs/service-users${query}`,
    { method: 'GET' },
  )
  return res.data
}

