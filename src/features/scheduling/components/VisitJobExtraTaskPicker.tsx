import * as React from 'react'
import { Combobox } from '@/shared/ui/combobox'
import type { TaskCatalogueGroup } from '@/features/service-users/visit-tasks/types'
import {
  extraVisitTaskAssignmentId,
  resolveCompletionInputFromFlags,
  type VisitJobTaskRow,
} from '@/features/scheduling/types/visit-job-tasks.types'
import { DEFAULT_VISIT_TASK_PRIORITY } from '@/features/service-users/visit-tasks/visit-task-priority.util'

const VISIT_TASK_GROUP_CODES = new Set([
  'personal_care',
  'observations_monitoring',
  'condition_specific',
  'equipment_ipc',
  'shopping_errands',
])

function filterCatalogueForVisits(groups: TaskCatalogueGroup[]): TaskCatalogueGroup[] {
  return groups
    .filter((group) => VISIT_TASK_GROUP_CODES.has(group.code))
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) => category.tasks.length > 0),
    }))
    .filter((group) => group.categories.length > 0)
}

type Props = {
  catalogue: TaskCatalogueGroup[]
  existingTasks: VisitJobTaskRow[]
  disabled?: boolean
  onAdd: (task: VisitJobTaskRow) => void
}

export function VisitJobExtraTaskPicker({ catalogue, existingTasks, disabled, onAdd }: Props) {
  const [pickerValue, setPickerValue] = React.useState<string | undefined>()

  const existingTaskIds = React.useMemo(
    () => new Set(existingTasks.map((task) => task.taskCatalogueTaskId)),
    [existingTasks],
  )

  const options = React.useMemo(() => {
    const rows: Array<{ value: string; label: string; description?: string }> = []
    for (const group of filterCatalogueForVisits(catalogue)) {
      for (const category of group.categories) {
        for (const task of category.tasks) {
          if (existingTaskIds.has(task.id)) continue
          rows.push({
            value: task.id,
            label: task.name,
            description: category.name,
          })
        }
      }
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label))
  }, [catalogue, existingTaskIds])

  const handleSelect = (taskId: string) => {
    if (!taskId) return
    for (const group of catalogue) {
      for (const category of group.categories) {
        const task = category.tasks.find((row) => row.id === taskId)
        if (!task) continue
        onAdd({
          assignmentId: extraVisitTaskAssignmentId(task.id),
          taskCatalogueTaskId: task.id,
          name: task.name,
          categoryName: category.name,
          groupCode: group.code,
          consentRequired: task.consentRequired,
          supportLevelApplicable: task.supportLevelApplicable,
          completionInput: resolveCompletionInputFromFlags(task.flagsJson),
          carerInstructions: null,
          priority: DEFAULT_VISIT_TASK_PRIORITY,
          isExtra: true,
          isCompleted: true,
          recordedValue: null,
          notes: null,
          completedAt: null,
        })
        setPickerValue(undefined)
        return
      }
    }
  }

  if (options.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Extra task done on visit</p>
        <p className="text-xs text-muted-foreground">
          Add a task that was not planned for this time slot but was completed during the visit.
        </p>
      </div>
      <div className="flex w-full shrink-0 sm:w-80">
        <Combobox
          options={options}
          value={pickerValue}
          placeholder="Choose a task…"
          searchPlaceholder="Search tasks…"
          emptyText="No matching tasks"
          disabled={disabled}
          allowDeselect={false}
          onChange={(value) => {
            setPickerValue(value)
            handleSelect(value)
          }}
        />
      </div>
    </div>
  )
}
