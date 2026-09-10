import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  ServiceUserVisitTasksResponse,
  TaskCatalogueGroup,
} from '@/features/service-users/visit-tasks/types'
import type { VisitTaskSchedule } from '@/features/service-users/visit-tasks/visit-task-schedule.util'

export async function fetchTaskCatalogue(): Promise<TaskCatalogueGroup[]> {
  const res = await apiJson<ApiEnvelope<TaskCatalogueGroup[]>>('/task-catalogue', { method: 'GET' })
  return res.data ?? []
}

export async function fetchServiceUserVisitTasks(
  serviceUserId: string,
): Promise<ServiceUserVisitTasksResponse> {
  const res = await apiJson<ApiEnvelope<ServiceUserVisitTasksResponse>>(
    `/service-users/${serviceUserId}/visit-tasks`,
    { method: 'GET' },
  )
  return (
    res.data ?? {
      rounds: [],
      assignmentsByRound: {},
      emarPrompt: {
        medicationCountByRound: {},
        addedRoundCodes: [],
        removedRoundCodes: [],
      },
    }
  )
}

export async function replaceServiceUserVisitTasks(
  serviceUserId: string,
  payload: {
    rounds: Array<{
      medicationRoundCode: string
      tasks: Array<{
        taskCatalogueTaskId: string
        carerInstructions?: string | null
        bodyMapRequired?: boolean
        priority?: string
        schedule?: VisitTaskSchedule
      }>
    }>
  },
): Promise<ServiceUserVisitTasksResponse> {
  const res = await apiJson<ApiEnvelope<ServiceUserVisitTasksResponse>>(
    `/service-users/${serviceUserId}/visit-tasks`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )
  return (
    res.data ?? {
      rounds: [],
      assignmentsByRound: {},
      emarPrompt: {
        medicationCountByRound: {},
        addedRoundCodes: [],
        removedRoundCodes: [],
      },
    }
  )
}
