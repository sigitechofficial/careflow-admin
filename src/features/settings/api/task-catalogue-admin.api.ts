import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { TaskCatalogueGroup } from '@/features/service-users/visit-tasks/types'

export type TaskCatalogueAdminTask = {
  id: string
  name: string
  sortOrder: number
  supportLevelApplicable: boolean
  consentRequired: boolean
  competencyGated: boolean
  competency: string | null
  outOfScope: boolean
  requiresMultipleCarers: boolean
  flagsJson: Record<string, unknown> | null
  isActive: boolean
}

export type TaskCatalogueAdminCategory = {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  tasks: TaskCatalogueAdminTask[]
}

export type TaskCatalogueAdminGroup = {
  id: string
  code: string
  source: string | null
  sortOrder: number
  isActive: boolean
  categories: TaskCatalogueAdminCategory[]
}

export type TaskCatalogueCategoryOption = {
  id: string
  label: string
  groupCode: string
}

export type CreateTaskCatalogueTaskPayload = {
  categoryId: string
  name: string
  supportLevelApplicable?: boolean
  consentRequired?: boolean
  competencyGated?: boolean
  competency?: string
  outOfScope?: boolean
  requiresMultipleCarers?: boolean
}

export type UpdateTaskCatalogueTaskPayload = {
  categoryId?: string
  name?: string
  supportLevelApplicable?: boolean
  consentRequired?: boolean
  competencyGated?: boolean
  competency?: string | null
  outOfScope?: boolean
  requiresMultipleCarers?: boolean
  isActive?: boolean
}

export async function fetchTaskCatalogueAdmin(): Promise<TaskCatalogueAdminGroup[]> {
  const res = await apiJson<ApiEnvelope<TaskCatalogueAdminGroup[]>>(
    '/task-catalogue?includeInactive=true',
    { method: 'GET' },
  )
  return res.data ?? []
}

export function flattenTaskCatalogueCategories(
  groups: TaskCatalogueAdminGroup[],
): TaskCatalogueCategoryOption[] {
  const options: TaskCatalogueCategoryOption[] = []
  for (const group of groups) {
    for (const category of group.categories) {
      if (!category.isActive) continue
      options.push({
        id: category.id,
        label: category.name,
        groupCode: group.code,
      })
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label))
}

export async function createTaskCatalogueTask(payload: CreateTaskCatalogueTaskPayload) {
  const res = await apiJson<ApiEnvelope<TaskCatalogueAdminTask>>('/task-catalogue/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data!
}

export async function updateTaskCatalogueTask(id: string, payload: UpdateTaskCatalogueTaskPayload) {
  const res = await apiJson<ApiEnvelope<TaskCatalogueAdminTask>>(`/task-catalogue/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.data!
}

export async function deleteTaskCatalogueTask(id: string) {
  await apiJson<ApiEnvelope<{ message: string }>>(`/task-catalogue/tasks/${id}`, {
    method: 'DELETE',
  })
}
