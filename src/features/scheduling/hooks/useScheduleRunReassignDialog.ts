import * as React from 'react'
import { useScheduleRunMutations } from '@/features/scheduling/hooks/useScheduleRuns'
import { useScheduleEmployeesCatalog } from '@/features/scheduling/hooks/useScheduleEmployeesCatalog'
import type { JobsDayRunsResponse } from '@/features/scheduling/types/scheduling.types'
import { collectJobServiceUserLocationIds } from '@/features/scheduling/utils/employee-branch-scope.util'
import { scheduleRunCarerLabelFromJobs } from '@/features/scheduling/components/ScheduleRunReassignDialog'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { runCarerOutcomeText } from '@/features/scheduling/components/RunCarerPreviewPanel'

type HookOptions = {
  date: string
  runs: JobsDayRunsResponse['runs']
  onChanged?: () => void
  onOpenFullEditor?: (runId: string) => void
}

export function useScheduleRunReassignDialog({
  date,
  runs,
  onChanged,
  onOpenFullEditor,
}: HookOptions) {
  const mutations = useScheduleRunMutations(date)
  const [runId, setRunId] = React.useState<string | null>(null)
  const [previousEmployeeId, setPreviousEmployeeId] = React.useState<string | null>(null)
  const [newEmployeeId, setNewEmployeeId] = React.useState('')

  const bundle = React.useMemo(
    () => (runId ? runs.find((entry) => entry.run.id === runId) ?? null : null),
    [runId, runs],
  )

  const serviceUserLocationIds = React.useMemo(
    () => collectJobServiceUserLocationIds(bundle?.jobs ?? []),
    [bundle?.jobs],
  )
  const employeesQuery = useScheduleEmployeesCatalog({
    enabled: Boolean(runId),
    locationIds: serviceUserLocationIds,
    includeEmployeeIds: previousEmployeeId ? [previousEmployeeId] : [],
    activeOnly: true,
  })

  const carerOptions = employeesQuery.comboboxOptions

  const openForRunId = React.useCallback(
    (targetRunId: string) => {
      const entry = runs.find((item) => item.run.id === targetRunId)
      if (!entry) {
        toastWarning('Run not found', 'Refresh the board and try again.')
        return
      }
      if (entry.run.status === 'COMPLETED' || entry.run.status === 'CANCELLED') {
        toastWarning('Cannot reassign run', 'Completed and cancelled runs cannot be reassigned.')
        return
      }
      setRunId(targetRunId)
      setPreviousEmployeeId(entry.run.employeeId ?? null)
      setNewEmployeeId(entry.run.employeeId ?? '')
    },
    [runs],
  )

  const close = React.useCallback(() => {
    setRunId(null)
    setPreviousEmployeeId(null)
    setNewEmployeeId('')
  }, [])

  const handleReassign = async () => {
    if (!runId || !bundle) return
    if (!newEmployeeId) {
      toastWarning('Select a carer', 'Choose who should take this run.')
      return
    }
    if (newEmployeeId === previousEmployeeId) {
      toastWarning('No change', 'Select a different carer to reassign this run.')
      return
    }

    try {
      await mutations.update.mutateAsync({
        id: runId,
        payload: { employeeId: newEmployeeId },
      })
      const result = await mutations.syncCarer.mutateAsync({
        id: runId,
        payload: {
          force: true,
          unallocateEmployeeId: previousEmployeeId ?? undefined,
        },
      })
      const outcome = runCarerOutcomeText(result)
      if (outcome.tone === 'warning') toastWarning('Run reassigned', outcome.text)
      else toastSuccess('Run reassigned', outcome.text)
      close()
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not reassign run')
    }
  }

  return {
    openForRunId,
    close,
    dialogProps: {
      open: Boolean(runId && bundle),
      onOpenChange: (open: boolean) => !open && close(),
      runName: bundle?.run.name ?? '',
      date,
      jobs: bundle?.jobs ?? [],
      currentEmployeeLabel: scheduleRunCarerLabelFromJobs(
        bundle?.jobs ?? [],
        previousEmployeeId ?? bundle?.run.employeeId,
      ),
      newEmployeeId,
      onNewEmployeeIdChange: setNewEmployeeId,
      carerOptions,
      carersLoading: employeesQuery.isLoading,
      onReassign: handleReassign,
      onOpenFullEditor:
        onOpenFullEditor && runId
          ? () => {
              close()
              onOpenFullEditor(runId)
            }
          : undefined,
      saving: mutations.update.isPending || mutations.syncCarer.isPending,
    },
  }
}
