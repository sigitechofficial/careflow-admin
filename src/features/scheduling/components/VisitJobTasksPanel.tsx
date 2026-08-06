import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { validateVisitJobTasks, hydrateVisitJobTaskRow, mapVisitJobTaskForSave } from '@/features/scheduling/types/visit-job-tasks.types'
import { fetchVisitJobTasks, saveVisitJobTasks } from '@/features/scheduling/api/scheduling.api'
import { VisitJobTasksChecklist } from '@/features/scheduling/components/VisitJobTasksChecklist'
import type { VisitJobTaskRow, VisitJobTaskOutcome } from '@/features/scheduling/types/visit-job-tasks.types'
import { formatMedicationRoundWindow } from '@/features/service-users/medication/medication-time-slots'

type Props = {
  jobId: string
  /** Stretch checklist to fill parent height (visit workspace sheet / hub). */
  fillHeight?: boolean
}

export function VisitJobTasksPanel({ jobId, fillHeight = false }: Props) {
  const queryClient = useQueryClient()
  const tasksQuery = useQuery({
    queryKey: ['visit-job-tasks', jobId],
    queryFn: () => fetchVisitJobTasks(jobId),
    enabled: Boolean(jobId),
  })

  const [localTasks, setLocalTasks] = React.useState<VisitJobTaskRow[]>([])
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    if (!tasksQuery.data) return
    setLocalTasks(tasksQuery.data.tasks.map(hydrateVisitJobTaskRow))
    setDirty(false)
  }, [tasksQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => {
      const validationError = validateVisitJobTasks(localTasks)
      if (validationError) {
        throw new Error(validationError)
      }
      return saveVisitJobTasks(jobId, localTasks.map(mapVisitJobTaskForSave))
    },
    onSuccess: async (data) => {
      const syncedObs = localTasks.some(
        (task) =>
          task.isCompleted &&
          (task.outcome ?? 'completed') === 'completed' &&
          Boolean(task.observationTypeCode) &&
          Boolean(task.recordedValue?.trim() || task.notes?.trim()),
      )
      setLocalTasks(data.tasks.map(hydrateVisitJobTaskRow))
      setDirty(false)
      await queryClient.invalidateQueries({ queryKey: ['visit-job-tasks', jobId] })
      toastSuccess(
        syncedObs ? 'Visit tasks updated · observation recorded' : 'Visit tasks updated',
      )
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes(':')) {
        toastWarning('Complete task details', error.message)
        return
      }
      toastApiError(error)
    },
  })

  const toggleTask = (
    assignmentId: string,
    patch: {
      isCompleted?: boolean
      outcome?: VisitJobTaskOutcome | null
      recordedValue?: string | null
      notes?: string | null
    },
  ) => {
    setLocalTasks((prev) =>
      prev.map((task) =>
        task.assignmentId === assignmentId ? { ...task, ...patch } : task,
      ),
    )
    setDirty(true)
  }

  const roundLabel = tasksQuery.data?.roundLabel
  const roundWindow =
    tasksQuery.data?.windowStart && tasksQuery.data?.windowEnd
      ? `${tasksQuery.data.windowStart} – ${tasksQuery.data.windowEnd}`
      : tasksQuery.data?.medicationRoundCode
        ? formatMedicationRoundWindow({
            id: tasksQuery.data.medicationRoundCode,
            name: roundLabel ?? tasksQuery.data.medicationRoundCode,
            code: tasksQuery.data.medicationRoundCode,
            windowStart: tasksQuery.data.windowStart,
            windowEnd: tasksQuery.data.windowEnd,
          })
        : null

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Planned visit tasks</h3>
        {dirty ? (
          <Button
            type="button"
            size="sm"
            onClick={() => saveMutation.mutate(undefined)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save task progress
          </Button>
        ) : null}
      </div>

      <VisitJobTasksChecklist
        tasks={localTasks}
        loading={tasksQuery.isLoading}
        fillHeight={fillHeight}
        roundLabel={roundLabel}
        roundWindow={roundWindow}
        noRoundMessage={
          !tasksQuery.isLoading && !tasksQuery.data?.medicationRoundCode
            ? 'This visit is not linked to a visit-plan time slot, so planned tasks cannot be resolved.'
            : undefined
        }
        emptyMessage={
          tasksQuery.data?.medicationRoundCode
            ? `No tasks are planned for ${roundLabel ?? 'this time slot'}. Add tasks in the service user's Tasks Planner tab.`
            : undefined
        }
        onTaskChange={toggleTask}
      />
    </div>
  )
}
