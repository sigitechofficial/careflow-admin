import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  BankHoliday,
  BankHolidayImportResult,
  BankHolidayRegion,
  PayPreviewInput,
  PayPreviewResult,
  WageType,
} from '@/features/billing/types/wage-types.types'

export async function fetchWageTypes(): Promise<WageType[]> {
  const res = await apiJson<ApiEnvelope<WageType[]>>('/billing/wage-types', { method: 'GET' })
  return res.data
}

export async function updateWageType(
  code: string,
  body: { name?: string; description?: string | null; isActive?: boolean },
): Promise<WageType> {
  const res = await apiJson<ApiEnvelope<WageType>>(`/billing/wage-types/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function fetchBankHolidays(params?: { region?: BankHolidayRegion; year?: string }): Promise<BankHoliday[]> {
  const qs = new URLSearchParams()
  if (params?.region) qs.set('region', params.region)
  if (params?.year) qs.set('year', params.year)
  const suffix = qs.toString() ? `?${qs}` : ''
  const res = await apiJson<ApiEnvelope<BankHoliday[]>>(`/billing/bank-holidays${suffix}`, { method: 'GET' })
  return res.data
}

export async function createBankHoliday(body: {
  holidayDate: string
  name: string
  region: BankHolidayRegion
}): Promise<BankHoliday> {
  const res = await apiJson<ApiEnvelope<BankHoliday>>('/billing/bank-holidays', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateBankHoliday(
  id: string,
  body: { name?: string; isActive?: boolean },
): Promise<BankHoliday> {
  const res = await apiJson<ApiEnvelope<BankHoliday>>(`/billing/bank-holidays/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function importBankHolidaysFromGovUk(): Promise<{ message: string; data: BankHolidayImportResult }> {
  return apiJson<{ message: string; data: BankHolidayImportResult }>('/billing/bank-holidays/import-gov-uk', {
    method: 'POST',
  })
}

export async function previewPay(body: PayPreviewInput): Promise<PayPreviewResult> {
  const res = await apiJson<ApiEnvelope<PayPreviewResult>>('/billing/pay-cards/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}
