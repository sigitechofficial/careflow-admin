import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAllocationItemType,
  createEmployeeAllocation,
  deleteAllocationItemType,
  deleteEmployeeAllocation,
  fetchEmployeeAllocationsRegistry,
  listAllocationItemTypes,
  listEmployeeAllocations,
  updateAllocationItemType,
  updateEmployeeAllocation,
  type AllocationItemTypePayload,
  type CreateEmployeeAllocationPayload,
  type EmployeeAllocationsRegistryParams,
  type UpdateEmployeeAllocationPayload,
} from '@/features/employees/api/employee-allocations.api'
import { employeeKeys } from '@/features/employees/keys'

export function useAllocationItemTypes(enabled = true) {
  return useQuery({
    queryKey: employeeKeys.allocationItems(),
    queryFn: listAllocationItemTypes,
    enabled,
  })
}

export function useEmployeeAllocations(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.allocations(employeeId),
    queryFn: () => listEmployeeAllocations(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useEmployeeAllocationsRegistry(params: EmployeeAllocationsRegistryParams, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.allocationsRegistry(params),
    queryFn: () => fetchEmployeeAllocationsRegistry(params),
    enabled,
  })
}

function useInvalidateAllocations() {
  const qc = useQueryClient()
  return (employeeId: string) => {
    void qc.invalidateQueries({ queryKey: employeeKeys.allocations(employeeId) })
    void qc.invalidateQueries({ queryKey: [...employeeKeys.all(), 'allocations-registry'] })
  }
}

/** Mutations take the employee id per call so the same hooks serve one employee or the overview list. */
export function useCreateEmployeeAllocation() {
  const invalidate = useInvalidateAllocations()
  return useMutation({
    mutationFn: ({ employeeId, body }: { employeeId: string; body: CreateEmployeeAllocationPayload }) =>
      createEmployeeAllocation(employeeId, body),
    onSuccess: (_d, { employeeId }) => invalidate(employeeId),
  })
}

export function useUpdateEmployeeAllocation() {
  const invalidate = useInvalidateAllocations()
  return useMutation({
    mutationFn: ({
      employeeId,
      allocationId,
      body,
    }: {
      employeeId: string
      allocationId: string
      body: UpdateEmployeeAllocationPayload
    }) => updateEmployeeAllocation(employeeId, allocationId, body),
    onSuccess: (_d, { employeeId }) => invalidate(employeeId),
  })
}

export function useDeleteEmployeeAllocation() {
  const invalidate = useInvalidateAllocations()
  return useMutation({
    mutationFn: ({ employeeId, allocationId }: { employeeId: string; allocationId: string }) =>
      deleteEmployeeAllocation(employeeId, allocationId),
    onSuccess: (_d, { employeeId }) => invalidate(employeeId),
  })
}

function useInvalidateItemTypes() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: employeeKeys.allocationItems() })
}

export function useCreateAllocationItemType() {
  const invalidate = useInvalidateItemTypes()
  return useMutation({
    mutationFn: (body: AllocationItemTypePayload) => createAllocationItemType(body),
    onSuccess: invalidate,
  })
}

export function useUpdateAllocationItemType() {
  const invalidate = useInvalidateItemTypes()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AllocationItemTypePayload> }) =>
      updateAllocationItemType(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteAllocationItemType() {
  const invalidate = useInvalidateItemTypes()
  return useMutation({
    mutationFn: (id: string) => deleteAllocationItemType(id),
    onSuccess: invalidate,
  })
}
