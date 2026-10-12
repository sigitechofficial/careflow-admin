import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPayCard,
  deletePayCard,
  fetchPayCard,
  fetchPayCards,
  fetchPayCardVersions,
  fetchEmployeePayCardHistory,
  changeEmployeePayCard,
  updatePayCard,
  fetchPayCardAssignmentPreview,
  assignPayCardToMatching,
  resolveEmployeePayCard,
  checkPayCardConflicts,
  fetchPayCardConflicts,
  unassignPayCardEmployee,
  fetchEmployeeFunderPayAssignments,
  upsertEmployeeFunderPayAssignment,
  deleteEmployeeFunderPayAssignment,
} from '@/features/billing/api/pay-cards.api'
import { billingKeys } from '@/features/billing/keys'
import { employeeKeys } from '@/features/employees/keys'
import type {
  ChangeEmployeePayCardInput,
  EmployeeFunderPayAssignmentInput,
  PayCardConflictCheckInput,
  PayCardInput,
} from '@/features/billing/types/billing-cards.types'

export function usePayCards(filters?: { search?: string; status?: string; locationId?: string }) {
  return useQuery({
    queryKey: billingKeys.payCards(filters),
    queryFn: () => fetchPayCards(filters),
  })
}

export function usePayCard(id: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.payCard(id ?? ''),
    queryFn: () => fetchPayCard(id!),
    enabled: enabled && !!id,
  })
}

/** Rate history of a pay card (every version with its own rules). */
export function usePayCardVersions(id: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.payCardVersions(id ?? ''),
    queryFn: () => fetchPayCardVersions(id!),
    enabled: enabled && !!id,
  })
}

/** Dated history of a carer's own pay card. */
export function useEmployeePayCardHistory(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.employeePayCardHistory(employeeId ?? ''),
    queryFn: () => fetchEmployeePayCardHistory(employeeId!),
    enabled: enabled && !!employeeId,
  })
}

/** Move one carer to another pay card (or a new personal card) from a date, e.g. promotion. */
export function useChangeEmployeePayCard(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ChangeEmployeePayCardInput) => changeEmployeePayCard(employeeId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) })
    },
  })
}

export function useCreatePayCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PayCardInput) => createPayCard(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useUpdatePayCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PayCardInput> }) => updatePayCard(id, body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: billingKeys.payCard(vars.id) })
    },
  })
}

export function useDeletePayCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePayCard(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function usePayCardAssignmentPreview(id: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.payCardAssignmentPreview(id ?? ''),
    queryFn: () => fetchPayCardAssignmentPreview(id!),
    enabled: enabled && !!id,
  })
}

export function useAssignPayCardToMatching() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, onlyUnassigned }: { id: string; onlyUnassigned?: boolean }) =>
      assignPayCardToMatching(id, { onlyUnassigned }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useUnassignPayCardEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) =>
      unassignPayCardEmployee(id, employeeId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useResolveEmployeePayCard(
  employeeId: string | null,
  enabled = true,
  funderId?: string | null,
) {
  return useQuery({
    queryKey: billingKeys.payCardResolve(employeeId ?? '', funderId ?? undefined),
    queryFn: () => resolveEmployeePayCard(employeeId!, { funderId }),
    enabled: enabled && !!employeeId,
  })
}

/** Carers whose pay card cannot be decided today (PC-32). */
export function usePayCardConflicts(locationId?: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.payCardConflicts(locationId),
    queryFn: () => fetchPayCardConflicts(locationId),
    enabled,
  })
}

/** The card as entered in the form, checked against the other active cards (PC-32). */
export function usePayCardConflictCheck(
  input: PayCardConflictCheckInput | null,
  locationId?: string | null,
) {
  return useQuery({
    queryKey: billingKeys.payCardConflictCheck(input, locationId),
    queryFn: () => checkPayCardConflicts(input!, locationId),
    enabled: !!input,
  })
}

export function useEmployeeFunderPayAssignments(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.employeeFunderPayAssignments(employeeId ?? ''),
    queryFn: () => fetchEmployeeFunderPayAssignments(employeeId!),
    enabled: enabled && !!employeeId,
  })
}

export function useUpsertEmployeeFunderPayAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: EmployeeFunderPayAssignmentInput) => upsertEmployeeFunderPayAssignment(body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: billingKeys.employeeFunderPayAssignments(vars.employeeId),
      })
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useDeleteEmployeeFunderPayAssignment(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEmployeeFunderPayAssignment(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: billingKeys.employeeFunderPayAssignments(employeeId),
      })
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}
