import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createEmployee,
  createEmployeeNonCoreActivity,
  createEmployeeSkill,
  createJobTitle,
  deleteEmployeeNonCoreActivity,
  deleteEmployeeSkill,
  patchEmployeeStatus,
  patchEmployment,
  patchPersonalDetails,
  updateEmployeeNonCoreActivity,
  uploadEmployeePhoto,
  type CreateEmployeePayload,
  type CreateEmployeeSkillPayload,
  type CreateNonCoreActivityPayload,
  type EmploymentPayload,
  type PersonalDetailsPayload,
} from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateEmployeePayload) => createEmployee(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
      void qc.invalidateQueries({ queryKey: employeeKeys.chartSummary() })
    },
  })
}

export function usePatchPersonalDetails(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PersonalDetailsPayload) => patchPersonalDetails(employeeId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

/** Personal-details patch when the employee id is not known at hook init (create wizard). */
export function usePatchPersonalDetailsMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, body }: { employeeId: string; body: PersonalDetailsPayload }) =>
      patchPersonalDetails(employeeId, body),
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

export function usePatchEmploymentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, body }: { employeeId: string; body: EmploymentPayload }) =>
      patchEmployment(employeeId, body),
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

export function useUploadEmployeePhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, file }: { employeeId: string; file: File }) =>
      uploadEmployeePhoto(employeeId, file),
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

export function useCreateJobTitle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createJobTitle(name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.lookups() })
    },
  })
}

export function usePatchEmployeeStatus(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { statusId: string }) => patchEmployeeStatus(employeeId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
      void qc.invalidateQueries({ queryKey: employeeKeys.chartSummary() })
    },
  })
}

/** Toggle status from list views where the employee id varies per row. */
export function usePatchAnyEmployeeStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, statusId }: { employeeId: string; statusId: string }) =>
      patchEmployeeStatus(employeeId, { statusId }),
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.lists() })
      void qc.invalidateQueries({ queryKey: employeeKeys.chartSummary() })
    },
  })
}

export function useCreateEmployeeSkill(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateEmployeeSkillPayload) => createEmployeeSkill(employeeId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.skills(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.skillsOverview() })
    },
  })
}

export function useCreateEmployeeSkillMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, body }: { employeeId: string; body: CreateEmployeeSkillPayload }) =>
      createEmployeeSkill(employeeId, body),
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.skills(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.skillsOverview() })
    },
  })
}

export function useDeleteEmployeeSkill(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (skillId: string) => deleteEmployeeSkill(employeeId, skillId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.skills(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.skillsOverview() })
    },
  })
}

export function useDeleteEmployeeSkillMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, skillId }: { employeeId: string; skillId: string }) =>
      deleteEmployeeSkill(employeeId, skillId),
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.skills(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.skillsOverview() })
    },
  })
}

export function useCreateEmployeeNonCoreActivity(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateNonCoreActivityPayload) =>
      createEmployeeNonCoreActivity(employeeId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreActivities(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreRegistry() })
    },
  })
}

export function useCreateEmployeeNonCoreActivityMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      employeeId,
      body,
    }: {
      employeeId: string
      body: CreateNonCoreActivityPayload
    }) => createEmployeeNonCoreActivity(employeeId, body),
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreActivities(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreRegistry() })
    },
  })
}

export function useUpdateEmployeeNonCoreActivity(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      body,
    }: {
      activityId: string
      body: Partial<CreateNonCoreActivityPayload>
    }) => updateEmployeeNonCoreActivity(employeeId, activityId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreActivities(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreRegistry() })
    },
  })
}

export function useUpdateEmployeeNonCoreActivityMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      employeeId,
      activityId,
      body,
    }: {
      employeeId: string
      activityId: string
      body: Partial<CreateNonCoreActivityPayload>
    }) => updateEmployeeNonCoreActivity(employeeId, activityId, body),
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreActivities(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreRegistry() })
    },
  })
}

export function useDeleteEmployeeNonCoreActivity(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (activityId: string) => deleteEmployeeNonCoreActivity(employeeId, activityId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreActivities(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreRegistry() })
    },
  })
}

export function useDeleteEmployeeNonCoreActivityMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, activityId }: { employeeId: string; activityId: string }) =>
      deleteEmployeeNonCoreActivity(employeeId, activityId),
    onSuccess: (_data, { employeeId }) => {
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreActivities(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.nonCoreRegistry() })
    },
  })
}
