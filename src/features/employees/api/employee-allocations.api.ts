import type { ApiEnvelope } from '@/shared/api/api-client'
import { apiJson } from '@/shared/api/api-client'

export type AllocationItemCategory = 'EQUIPMENT' | 'PPE' | 'UNIFORM' | 'OTHER'

export type EmployeeAllocationStatus = 'ISSUED' | 'RETURNED' | 'LOST' | 'DAMAGED'

/** An item the organisation issues to staff (Settings → Allocation items). */
export type AllocationItemTypeRow = {
  id: string
  name: string
  category: AllocationItemCategory
  returnable: boolean
  sortOrder: number
  isActive: boolean
}

export type AllocationItemTypePayload = {
  name: string
  category: AllocationItemCategory
  returnable?: boolean
  sortOrder?: number
}

export type EmployeeAllocationRow = {
  id: string
  employeeId: string
  itemTypeId: string
  itemType: AllocationItemTypeRow
  quantity: number
  size: string | null
  serialNumber: string | null
  issuedAt: string
  issuedByName: string | null
  expectedReturnAt: string | null
  status: EmployeeAllocationStatus
  returnedAt: string | null
  returnNotes: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type EmployeeAllocationRegistryRow = EmployeeAllocationRow & { employeeDisplayName: string }

export type CreateEmployeeAllocationPayload = {
  itemTypeId: string
  quantity?: number
  size?: string
  serialNumber?: string
  issuedAt: string
  expectedReturnAt?: string | null
  notes?: string
}

export type UpdateEmployeeAllocationPayload = Partial<CreateEmployeeAllocationPayload> & {
  status?: EmployeeAllocationStatus
  returnedAt?: string | null
  returnNotes?: string
}

export type EmployeeAllocationsRegistryParams = {
  status?: EmployeeAllocationStatus
  category?: AllocationItemCategory
  itemTypeId?: string
  search?: string
}

export async function listAllocationItemTypes(): Promise<AllocationItemTypeRow[]> {
  const res = await apiJson<ApiEnvelope<AllocationItemTypeRow[]>>('/employee-allocations/items', {
    method: 'GET',
  })
  return res.data
}

export async function createAllocationItemType(body: AllocationItemTypePayload): Promise<AllocationItemTypeRow> {
  const res = await apiJson<ApiEnvelope<AllocationItemTypeRow>>('/employee-allocations/items', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateAllocationItemType(
  id: string,
  body: Partial<AllocationItemTypePayload>,
): Promise<AllocationItemTypeRow> {
  const res = await apiJson<ApiEnvelope<AllocationItemTypeRow>>(`/employee-allocations/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteAllocationItemType(id: string): Promise<void> {
  await apiJson(`/employee-allocations/items/${id}`, { method: 'DELETE' })
}

export async function listEmployeeAllocations(employeeId: string): Promise<EmployeeAllocationRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeAllocationRow[]>>(`/employees/${employeeId}/allocations`, {
    method: 'GET',
  })
  return res.data
}

export async function createEmployeeAllocation(
  employeeId: string,
  body: CreateEmployeeAllocationPayload,
): Promise<EmployeeAllocationRow> {
  const res = await apiJson<ApiEnvelope<EmployeeAllocationRow>>(`/employees/${employeeId}/allocations`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateEmployeeAllocation(
  employeeId: string,
  allocationId: string,
  body: UpdateEmployeeAllocationPayload,
): Promise<EmployeeAllocationRow> {
  const res = await apiJson<ApiEnvelope<EmployeeAllocationRow>>(
    `/employees/${employeeId}/allocations/${allocationId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteEmployeeAllocation(employeeId: string, allocationId: string): Promise<void> {
  await apiJson(`/employees/${employeeId}/allocations/${allocationId}`, { method: 'DELETE' })
}

export async function fetchEmployeeAllocationsRegistry(
  params: EmployeeAllocationsRegistryParams,
): Promise<EmployeeAllocationRegistryRow[]> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v.trim()) qs.set(k, v.trim())
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EmployeeAllocationRegistryRow[]>>(`/employee-allocations${suffix}`, {
    method: 'GET',
  })
  return res.data
}
