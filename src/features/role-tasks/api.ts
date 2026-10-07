import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  RoleTask,
  RoleTaskList,
  RoleTaskListStatus,
  RoleTaskOptions,
  RoleTaskStatus,
  RoleTaskTemplate,
  RoleTaskTemplateInput,
} from '@/features/role-tasks/types'

export async function fetchMyRoleTasks(status: RoleTaskListStatus, init?: RequestInit): Promise<RoleTaskList> {
  const res = await apiJson<ApiEnvelope<RoleTaskList>>(`/role-tasks/mine?status=${status}`, {
    method: 'GET',
    ...init,
  })
  return res.data as RoleTaskList
}

export async function fetchAllRoleTasks(
  params: { status: RoleTaskListStatus; roleId?: string },
  init?: RequestInit,
): Promise<RoleTaskList> {
  const qs = new URLSearchParams({ status: params.status })
  if (params.roleId) qs.set('roleId', params.roleId)
  const res = await apiJson<ApiEnvelope<RoleTaskList>>(`/role-tasks?${qs.toString()}`, {
    method: 'GET',
    ...init,
  })
  return res.data as RoleTaskList
}

export async function updateRoleTaskStatus(
  taskId: string,
  input: { status: Exclude<RoleTaskStatus, 'CANCELLED'>; note?: string | null },
): Promise<RoleTask> {
  const res = await apiJson<ApiEnvelope<RoleTask>>(`/role-tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return res.data as RoleTask
}

export async function fetchRoleTaskTemplates(init?: RequestInit): Promise<RoleTaskTemplate[]> {
  const res = await apiJson<ApiEnvelope<RoleTaskTemplate[]>>('/role-tasks/templates', {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}

export async function fetchRoleTaskOptions(init?: RequestInit): Promise<RoleTaskOptions> {
  const res = await apiJson<ApiEnvelope<RoleTaskOptions>>('/role-tasks/options', {
    method: 'GET',
    ...init,
  })
  return res.data as RoleTaskOptions
}

export async function createRoleTaskTemplate(input: RoleTaskTemplateInput): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>('/role-tasks/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data as { id: string }
}

export async function updateRoleTaskTemplate(
  id: string,
  input: Partial<RoleTaskTemplateInput>,
): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>(`/role-tasks/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return res.data as { id: string }
}

export async function deleteRoleTaskTemplate(id: string): Promise<void> {
  await apiJson(`/role-tasks/templates/${id}`, { method: 'DELETE' })
}
