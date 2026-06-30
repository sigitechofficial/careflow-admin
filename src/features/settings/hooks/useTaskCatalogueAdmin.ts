import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTaskCatalogueTask,
  deleteTaskCatalogueTask,
  fetchTaskCatalogueAdmin,
  updateTaskCatalogueTask,
  type CreateTaskCatalogueTaskPayload,
  type UpdateTaskCatalogueTaskPayload,
} from '@/features/settings/api/task-catalogue-admin.api'
import { settingsKeys } from '@/features/settings/keys'

export function useTaskCatalogueAdmin() {
  return useQuery({
    queryKey: settingsKeys.taskCatalogue(),
    queryFn: fetchTaskCatalogueAdmin,
    staleTime: 30_000,
  })
}

export function useCreateTaskCatalogueTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTaskCatalogueTaskPayload) => createTaskCatalogueTask(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.taskCatalogue() }),
        queryClient.invalidateQueries({ queryKey: ['task-catalogue'] }),
      ])
    },
  })
}

export function useUpdateTaskCatalogueTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTaskCatalogueTaskPayload }) =>
      updateTaskCatalogueTask(id, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.taskCatalogue() }),
        queryClient.invalidateQueries({ queryKey: ['task-catalogue'] }),
      ])
    },
  })
}

export function useDeleteTaskCatalogueTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTaskCatalogueTask(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.taskCatalogue() }),
        queryClient.invalidateQueries({ queryKey: ['task-catalogue'] }),
      ])
    },
  })
}
