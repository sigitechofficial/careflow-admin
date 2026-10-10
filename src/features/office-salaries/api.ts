import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  OfficeSalary,
  OfficeSalaryDetail,
  OfficeSalaryList,
  OfficeSalaryPayment,
  RecordOfficeSalaryPaymentInput,
  UpsertOfficeSalaryInput,
} from '@/features/office-salaries/types'

export async function fetchOfficeSalaries(month: string, init?: RequestInit): Promise<OfficeSalaryList> {
  const res = await apiJson<ApiEnvelope<OfficeSalaryList>>(
    `/office-salaries?month=${encodeURIComponent(month)}`,
    { method: 'GET', ...init },
  )
  return res.data as OfficeSalaryList
}

export async function fetchOfficeSalaryDetail(userId: string, init?: RequestInit): Promise<OfficeSalaryDetail> {
  const res = await apiJson<ApiEnvelope<OfficeSalaryDetail>>(`/office-salaries/${userId}`, {
    method: 'GET',
    ...init,
  })
  return res.data as OfficeSalaryDetail
}

export async function upsertOfficeSalary(userId: string, input: UpsertOfficeSalaryInput): Promise<OfficeSalary> {
  const res = await apiJson<ApiEnvelope<OfficeSalary>>(`/office-salaries/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return res.data as OfficeSalary
}

export async function recordOfficeSalaryPayment(
  userId: string,
  input: RecordOfficeSalaryPaymentInput,
): Promise<OfficeSalaryPayment> {
  const res = await apiJson<ApiEnvelope<OfficeSalaryPayment>>(`/office-salaries/${userId}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data as OfficeSalaryPayment
}

export async function removeOfficeSalaryPayment(userId: string, month: string): Promise<void> {
  await apiJson(`/office-salaries/${userId}/payments/${encodeURIComponent(month)}`, { method: 'DELETE' })
}
