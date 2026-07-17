import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEmployeeAbsence,
  deleteEmployeeAbsence,
  fetchEmployeeAbsences,
  updateEmployeeAbsence,
  type AbsenceType,
  type EmployeeAbsenceBody,
  type EmployeeAbsencesParams,
} from '@/features/employees/api/employee-absences.api'
import { employeeKeys } from '@/features/employees/keys'

const ABSENCES_ROOT = [...employeeKeys.all(), 'absences']

export function useEmployeeAbsences(params?: EmployeeAbsencesParams, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.absences(params),
    queryFn: () => fetchEmployeeAbsences(params),
    enabled,
    placeholderData: previous => previous,
  })
}

export function useCreateEmployeeAbsence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: EmployeeAbsenceBody & {
        employeeId: string
        absenceType: AbsenceType
        fromDateTime: string
        toDateTime: string
      },
    ) => createEmployeeAbsence(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ABSENCES_ROOT }),
  })
}

export function useUpdateEmployeeAbsence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: EmployeeAbsenceBody }) =>
      updateEmployeeAbsence(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ABSENCES_ROOT }),
  })
}

export function useDeleteEmployeeAbsence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEmployeeAbsence(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ABSENCES_ROOT }),
  })
}
