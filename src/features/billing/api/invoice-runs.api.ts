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
  lines: InvoiceRunLine[]
}

export type InvoiceRunDetail = InvoiceRunRow & {
  notes: string | null
  lineCount: number
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

export async function fetchInvoiceRun(id: string): Promise<InvoiceRunDetail> {
  const res = await apiJson<ApiEnvelope<InvoiceRunDetail>>(`/billing/invoice-runs/${id}`, {
    method: 'GET',
  })
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

/** Download the invoice run as CSV or Excel (authenticated, streamed as a file). */
export async function downloadInvoiceRunExport(id: string, format: 'csv' | 'xlsx'): Promise<void> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured.', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${base}/billing/invoice-runs/${id}/export?format=${format}`, { headers })
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
  lineCount: number
  subtotal: string
  subtotalValue: number
  exceptions: number
  funders: number
  funderSummaries: ServiceUserInvoiceFunderSummary[]
  canSend: boolean
}

export type ServiceUserInvoicesSummary = {
  serviceUserId: string
  serviceUserName: string
  serviceUserNumber: string | null
  readyToInvoiceCount: number
  totalInvoiced: string
  totalInvoicedValue: number
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
): Promise<ServiceUserInvoicesOverview> {
  const query = month ? `?month=${encodeURIComponent(month)}` : ''
  const res = await apiJson<ApiEnvelope<ServiceUserInvoicesOverview>>(
    `/billing/invoice-runs/service-users${query}`,
    { method: 'GET' },
  )
  return res.data
}

