import * as React from 'react'
import { useScheduleRunMutations } from '@/features/scheduling/hooks/useScheduleRuns'
import { useScheduleEmployeesCatalog } from '@/features/scheduling/hooks/useScheduleEmployeesCatalog'
import type { ScheduleRunStatus, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { collectJobServiceUserLocationIds } from '@/features/scheduling/utils/employee-branch-scope.util'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'

export type ScheduleRunBulkAssignBundle = {
  run: {
    id: string
    name: string
    employeeId?: string | null
    status: ScheduleRunStatus
  }
  jobs: TimelineJob[]
}

type HookOptions = {
  date: string
  runs: ScheduleRunBulkAssignBundle[]
  onChanged?: () => void
}

function runIsAssignable(status: ScheduleRunStatus): boolean {
  return status !== 'COMPLETED' && status !== 'CANCELLED'
}

export function useScheduleRunsBulkAssignDialog({ date, runs, onChanged }: HookOptions) {
  const mutations = useScheduleRunMutations(date)
  const [open, setOpen] = React.useState(false)
  const [selectedRunIds, setSelectedRunIds] = React.useState<Set<string>>(new Set())
  const [employeeId, setEmployeeId] = React.useState('')

  const selectedBundles = React.useMemo(
    () => runs.filter((entry) => selectedRunIds.has(entry.run.id)),
    [runs, selectedRunIds],
  )

  const assignableSelectedBundles = React.useMemo(
    () => selectedBundles.filter((entry) => runIsAssignable(entry.run.status)),
    [selectedBundles],
  )

  const serviceUserLocationIds = React.useMemo(
    () =>
      collectJobServiceUserLocationIds(
        assignableSelectedBundles.flatMap((entry) => entry.jobs),
      ),
    [assignableSelectedBundles],
  )
  const includeEmployeeIds = React.useMemo(
    () =>
      [
        ...new Set(
          assignableSelectedBundles
            .map((entry) => entry.run.employeeId?.trim())
            .filter((id): id is string => Boolean(id)),
        ),
      ],
    [assignableSelectedBundles],
  )
  const employeesQuery = useScheduleEmployeesCatalog({
    enabled: open,
    locationIds: serviceUserLocationIds,
    includeEmployeeIds,
    activeOnly: true,
  })

  const carerOptions = employeesQuery.comboboxOptions

  const toggleRunId = React.useCallback(
    (runId: string) => {
      const entry = runs.find((item) => item.run.id === runId)
      if (!entry) return
      if (!runIsAssignable(entry.run.status)) {
        toastWarning('Cannot assign carer', 'Completed and cancelled runs cannot be reassigned.')
        return
      }
      setSelectedRunIds((prev) => {
        const next = new Set(prev)
        if (next.has(runId)) next.delete(runId)
        else next.add(runId)
        return next
      })
    },
    [runs],
  )

  const clearSelection = React.useCallback(() => {
    setSelectedRunIds(new Set())
  }, [])

  const openAssignDialog = React.useCallback(() => {
    if (assignableSelectedBundles.length < 2) {
      toastWarning('Select more runs', 'Check at least 2 runs to assign one carer.')
      return
    }
    setEmployeeId('')
    setOpen(true)
  }, [assignableSelectedBundles.length])

  const close = React.useCallback(() => {
    setOpen(false)
    setEmployeeId('')
  }, [])

  const handleAssign = async () => {
    if (!employeeId) {
      toastWarning('Select a carer', 'Choose who should take these runs.')
      return
    }
    if (assignableSelectedBundles.length < 2) {
      toastWarning('Select more runs', 'Check at least 2 runs to assign one carer.')
      return
    }

    let assigned = 0
    let warningCount = 0
    const skippedSameCarer: string[] = []

    try {
      for (const bundle of assignableSelectedBundles) {
        const previousEmployeeId = bundle.run.employeeId ?? null
        if (previousEmployeeId === employeeId) {
          skippedSameCarer.push(bundle.run.name)
          continue
        }

        await mutations.update.mutateAsync({
          id: bundle.run.id,
          payload: { employeeId },
        })
        const result = await mutations.syncCarer.mutateAsync({
          id: bundle.run.id,
          payload: {
            force: true,
            unallocateEmployeeId: previousEmployeeId ?? undefined,
          },
        })
        assigned += 1
        if (result.warnings?.length) warningCount += result.warnings.length
      }

      if (assigned === 0) {
        toastWarning('No changes', 'Selected runs already use this carer.')
        return
      }

      const visitCount = assignableSelectedBundles.reduce((sum, entry) => sum + entry.jobs.length, 0)
      if (warningCount > 0) {
        toastWarning(
          'Runs assigned with warnings',
          `${assigned} run(s) reassigned · ${warningCount} visit warning(s). Review runs for details.`,
        )
      } else {
        toastSuccess(
          'Carer assigned to runs',
          `${assigned} run(s) · ${visitCount} visit(s) moved to the selected carer.`,
        )
      }

      if (skippedSameCarer.length > 0) {
        toastWarning(
          'Some runs skipped',
          `${skippedSameCarer.length} run(s) already had this carer.`,
        )
      }

      clearSelection()
      close()
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not assign carer to runs')
    }
  }

  return {
    selectedRunIds,
    toggleRunId,
    clearSelection,
    openAssignDialog,
    dialogProps: {
      open,
      onOpenChange: (next: boolean) => !next && close(),
      date,
      bundles: assignableSelectedBundles,
      employeeId,
      onEmployeeIdChange: setEmployeeId,
      carerOptions,
      carersLoading: employeesQuery.isLoading,
      onAssign: handleAssign,
      saving: mutations.update.isPending || mutations.syncCarer.isPending,
    },
  }
}
