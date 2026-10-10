import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRoleTaskTemplate,
  deleteRoleTaskTemplate,
  fetchAllRoleTasks,
  fetchMyRoleTasks,
  fetchRoleTaskOptions,
  fetchRoleTaskTemplates,
  updateRoleTaskStatus,
  updateRoleTaskTemplate,
} from '@/features/role-tasks/api'
import type {
  RoleTaskListStatus,
  RoleTaskStatus,
  RoleTaskTemplateInput,
} from '@/features/role-tasks/types'

export const roleTaskKeys = {
  all: () => ['role-tasks'] as const,
  mine: (status: RoleTaskListStatus) => [...roleTaskKeys.all(), 'mine', status] as const,
  list: (status: RoleTaskListStatus, roleId?: string) =>
    [...roleTaskKeys.all(), 'list', status, roleId ?? 'all'] as const,
  templates: () => [...roleTaskKeys.all(), 'templates'] as const,
  options: () => [...roleTaskKeys.all(), 'options'] as const,
}

export function useMyRoleTasks(status: RoleTaskListStatus) {
  return useQuery({
    queryKey: roleTaskKeys.mine(status),
    queryFn: ({ signal }) => fetchMyRoleTasks(status, { signal }),
  })
}

export function useAllRoleTasks(status: RoleTaskListStatus, roleId?: string, enabled = true) {
  return useQuery({
    queryKey: roleTaskKeys.list(status, roleId),
    queryFn: ({ signal }) => fetchAllRoleTasks({ status, roleId }, { signal }),
    enabled,
  })
}

export function useRoleTaskTemplates() {
  return useQuery({
    queryKey: roleTaskKeys.templates(),
    queryFn: ({ signal }) => fetchRoleTaskTemplates({ signal }),
  })
}

export function useRoleTaskOptions() {
  return useQuery({
    queryKey: roleTaskKeys.options(),
    queryFn: ({ signal }) => fetchRoleTaskOptions({ signal }),
    staleTime: 5 * 60_000,
  })
}

function useInvalidateRoleTasks() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: roleTaskKeys.all() })
}

export function useUpdateRoleTaskStatus() {
  const invalidate = useInvalidateRoleTasks()
  return useMutation({
    mutationFn: (vars: {
      taskId: string
      status: Exclude<RoleTaskStatus, 'CANCELLED'>
      note?: string | null
    }) => updateRoleTaskStatus(vars.taskId, { status: vars.status, note: vars.note }),
    onSuccess: invalidate,
  })
}

export function useSaveRoleTaskTemplate() {
  const invalidate = useInvalidateRoleTasks()
  return useMutation({
    mutationFn: (vars: { id?: string; input: RoleTaskTemplateInput }) =>
      vars.id ? updateRoleTaskTemplate(vars.id, vars.input) : createRoleTaskTemplate(vars.input),
    onSuccess: invalidate,
  })
}

export function useDeleteRoleTaskTemplate() {
  const invalidate = useInvalidateRoleTasks()
  return useMutation({
    mutationFn: (id: string) => deleteRoleTaskTemplate(id),
    onSuccess: invalidate,
  })
}
