import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type EmployeePortalAccountStatus = {
  configured: boolean
  isEnabled: boolean
  email: string | null
  lastLoginAt: string | null
}

export async function fetchEmployeePortalAccount(employeeId: string): Promise<EmployeePortalAccountStatus> {
  const res = await apiJson<ApiEnvelope<EmployeePortalAccountStatus>>(
    `/employees/${employeeId}/portal-account`,
  )
  return res.data
}

export async function upsertEmployeePortalAccount(
  employeeId: string,
  body: { email?: string; isEnabled?: boolean },
): Promise<EmployeePortalAccountStatus> {
  const res = await apiJson<ApiEnvelope<EmployeePortalAccountStatus>>(
    `/employees/${employeeId}/portal-account`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function setEmployeePortalPassword(employeeId: string, password: string): Promise<void> {
  await apiJson(`/employees/${employeeId}/portal-account/set-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}
