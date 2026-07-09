import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { PayrollRunStatus } from '@/features/billing/types/billing.types'

export type PayrollRunRow = {
  id: string
  period: string
  periodStart: string
  periodEnd: string
  status: PayrollRunStatus
  carers: number
  visitLines: number
  grossPay: string
  nmwTopUp: string
  exceptions: number
}

export type PayrollRunsSummary = {
  payrollDrafts: number
}

export type PayrollRunLineDetail = {
  id: string
  visitRef: string | null
  employeeId: string | null
  carerName: string
  serviceUserName: string
  payableTime: string
  hoursLabel: string | null
  minutes: number
  unitRate: string | null
  formula: string | null
  amount: string
  description: string
  exceptionMessage: string | null
}

export type PayrollRunCarerSummary = {
  employeeId: string
  carerName: string
  visitCount: number
  totalMinutes: number
  totalHours: string
  grossPay: string
}

export type PayrollRunDetail = PayrollRunRow & {
  notes: string | null
  carerSummaries: PayrollRunCarerSummary[]
  lines: PayrollRunLineDetail[]
}

export async function fetchPayrollRuns(): Promise<PayrollRunRow[]> {
  const res = await apiJson<ApiEnvelope<PayrollRunRow[]>>('/billing/payroll-runs', { method: 'GET' })
  return res.data
}

export async function fetchPayrollRunsSummary(): Promise<PayrollRunsSummary> {
  const res = await apiJson<ApiEnvelope<PayrollRunsSummary>>('/billing/payroll-runs/summary', {
    method: 'GET',
  })
  return res.data
}

export async function fetchPayrollRun(id: string): Promise<PayrollRunDetail> {
  const res = await apiJson<ApiEnvelope<PayrollRunDetail>>(`/billing/payroll-runs/${id}`, {
    method: 'GET',
  })
  return res.data
}

export async function createPayrollRun(body: {
  periodStart: string
  periodEnd: string
  notes?: string
}): Promise<PayrollRunRow> {
  const res = await apiJson<ApiEnvelope<PayrollRunRow>>('/billing/payroll-runs', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function calculatePayrollRun(id: string): Promise<void> {
  await apiJson(`/billing/payroll-runs/${id}/calculate`, { method: 'POST' })
}

export async function approvePayrollRun(id: string): Promise<void> {
  await apiJson(`/billing/payroll-runs/${id}/approve`, { method: 'POST' })
}

export async function lockPayrollRun(id: string): Promise<void> {
  await apiJson(`/billing/payroll-runs/${id}/lock`, { method: 'POST' })
}

function parseContentDispositionFilename(header: string | null, fallback: string): string {
  if (!header) return fallback
  const match = /filename="([^"]+)"/i.exec(header)
  return match?.[1] ?? fallback
}

function triggerCsvDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function downloadPayrollRunCsvFile(
  id: string,
  method: 'GET' | 'POST',
): Promise<{ blob: Blob; filename: string }> {
  const { getApiBaseUrl } = await import('@/shared/lib/api-base')
  const { useAuthStore } = await import('@/features/auth/store')
  const base = getApiBaseUrl()
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${base}/billing/payroll-runs/${id}/export`, {
    method,
    headers,
  })

  if (!res.ok) {
    const text = await res.text()
    let message = text || `Payroll export failed (${res.status})`
    try {
      const json = JSON.parse(text) as { message?: string; errors?: string[] }
      if (json.errors?.length) message = json.errors.join('; ')
      else if (json.message) message = json.message
    } catch {
      /* plain text body */
    }
    throw new Error(message)
  }

  const fallback = `payroll-run-${id}.csv`
  const filename = parseContentDispositionFilename(res.headers.get('Content-Disposition'), fallback)
  return { blob: await res.blob(), filename }
}

/** Download CSV and mark the run as exported (locked runs only). */
export async function exportPayrollRun(id: string): Promise<void> {
  const { blob, filename } = await downloadPayrollRunCsvFile(id, 'POST')
  triggerCsvDownload(blob, filename)
}

/** Re-download CSV for an already-exported run. */
export async function downloadPayrollRunCsv(id: string): Promise<void> {
  const { blob, filename } = await downloadPayrollRunCsvFile(id, 'GET')
  triggerCsvDownload(blob, filename)
}
