import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAllEmployees } from '@/features/employees/api'
import {
  useScheduleRunDetail,
  useScheduleRunMutations,
  useScheduleRunsList,
} from '@/features/scheduling/hooks/useScheduleRuns'
import type { ScheduleRunRow } from '@/features/scheduling/types/scheduling.types'
import { computeScheduleRunStats } from '@/features/scheduling/utils/schedule-run-stats.util'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'

type Options = {
  date: string
  travelBufferMinutes?: number
  onChanged?: () => void
}

export function useScheduleRunEditDialog({
  date,
  travelBufferMinutes = 0,
  onChanged,
}: Options) {
  const runsQuery = useScheduleRunsList({ runDate: date }, Boolean(date))
  const mutations = useScheduleRunMutations(date)

  const [editRun, setEditRun] = React.useState<ScheduleRunRow | null>(null)
  const [editRunInitialTab, setEditRunInitialTab] = React.useState<'run' | 'map'>('run')
  const [pendingRunId, setPendingRunId] = React.useState<string | null>(null)

  const [editName, setEditName] = React.useState('')
  const [editEmployeeId, setEditEmployeeId] = React.useState('')
  const [editNotes, setEditNotes] = React.useState('')

  const pendingRunQuery = useScheduleRunDetail(pendingRunId, Boolean(pendingRunId))

  const employeesQuery = useQuery({
    queryKey: ['employees', 'runs-picker'],
    queryFn: () => listAllEmployees({}),
  })

  const carerComboboxOptions = React.useMemo(
    () => [
      { value: '', label: 'Unassigned', description: 'No default carer for this run' },
      ...(employeesQuery.data ?? []).map((emp) => ({
        value: emp.id,
        label: emp.fullName ?? [emp.firstName, emp.lastName].filter(Boolean).join(' ') ?? 'Unknown',
      })),
    ],
    [employeesQuery.data],
  )

  const runs = runsQuery.data?.rows ?? []

  const openEditRun = React.useCallback((run: ScheduleRunRow, options?: { tab?: 'run' | 'map' }) => {
    setPendingRunId(null)
    setEditRun(run)
    setEditRunInitialTab(options?.tab ?? 'run')
    setEditName(run.name)
    setEditEmployeeId(run.employeeId ?? '')
    setEditNotes(run.description ?? '')
  }, [])

  const closeEditRun = React.useCallback(() => {
    setEditRun(null)
    setEditRunInitialTab('run')
    setEditName('')
    setEditEmployeeId('')
    setEditNotes('')
    setPendingRunId(null)
  }, [])

  const openEditRunById = React.useCallback(
    (runId: string) => {
      const fromList = runs.find((run) => run.id === runId)
      if (fromList) {
        openEditRun(fromList)
        return
      }
      setPendingRunId(runId)
    },
    [openEditRun, runs],
  )

  React.useEffect(() => {
    if (!pendingRunId || !pendingRunQuery.data) return
    openEditRun(pendingRunQuery.data)
    setPendingRunId(null)
  }, [openEditRun, pendingRunId, pendingRunQuery.data])

  React.useEffect(() => {
    if (!pendingRunId || !pendingRunQuery.isError) return
    toastApiError(pendingRunQuery.error, 'Could not load run')
    setPendingRunId(null)
  }, [pendingRunId, pendingRunQuery.error, pendingRunQuery.isError])

  const handleSaveEditRun = async () => {
    if (!editRun) return
    if (!editName.trim()) {
      toastWarning('Run name required', 'Enter a name for this run.')
      return
    }
    try {
      await mutations.update.mutateAsync({
        id: editRun.id,
        payload: {
          name: editName.trim(),
          employeeId: editEmployeeId || undefined,
          description: editNotes.trim() || undefined,
        },
      })
      toastSuccess('Run updated')
      closeEditRun()
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not update run')
    }
  }

  const handleSaveAndUpdateSchedule = async () => {
    if (!editRun) return
    if (!editName.trim()) {
      toastWarning('Run name required', 'Enter a name for this run.')
      return
    }
    try {
      await mutations.update.mutateAsync({
        id: editRun.id,
        payload: {
          name: editName.trim(),
          employeeId: editEmployeeId || undefined,
          description: editNotes.trim() || undefined,
        },
      })
      if (editEmployeeId) {
        await mutations.syncCarer.mutateAsync(editRun.id)
      }
      if (editRun.status === 'DRAFT') {
        await mutations.update.mutateAsync({ id: editRun.id, payload: { status: 'PUBLISHED' } })
      }
      toastSuccess('Run saved and schedule updated')
      closeEditRun()
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not update schedule')
    }
  }

  const handleDeleteRun = async () => {
    if (!editRun) return
    if (editRun.status === 'COMPLETED') {
      toastWarning('Cannot delete run', 'Completed runs cannot be deleted.')
      return
    }
    try {
      await mutations.remove.mutateAsync(editRun.id)
      toastSuccess('Run deleted', 'Visits were detached and remain on the rota.')
      closeEditRun()
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not delete run')
    }
  }

  const editRunStats = React.useMemo(
    () => computeScheduleRunStats(editRun?.jobs ?? [], travelBufferMinutes),
    [editRun?.jobs, travelBufferMinutes],
  )

  return {
    runs,
    editRun,
    openEditRun,
    openEditRunById,
    closeEditRun,
    dialogProps: {
      open: Boolean(editRun),
      onOpenChange: (open: boolean) => !open && closeEditRun(),
      run: editRun,
      runs,
      date,
      stats: editRunStats,
      editName,
      onEditNameChange: setEditName,
      editEmployeeId,
      onEditEmployeeIdChange: setEditEmployeeId,
      editNotes,
      onEditNotesChange: setEditNotes,
      carerOptions: carerComboboxOptions,
      carersLoading: employeesQuery.isLoading,
      onSwitchRun: openEditRun,
      initialTab: editRunInitialTab,
      onSave: handleSaveEditRun,
      onSaveAndUpdateSchedule: handleSaveAndUpdateSchedule,
      onCancel: closeEditRun,
      onDelete: handleDeleteRun,
      saving: mutations.update.isPending,
      updatingSchedule: mutations.update.isPending || mutations.syncCarer.isPending,
      deleting: mutations.remove.isPending,
    },
  }
}
