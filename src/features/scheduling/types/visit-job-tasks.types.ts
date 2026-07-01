import { visitTaskPriorityRank } from '@/features/service-users/visit-tasks/visit-task-priority.util'

export type VisitTaskCompletionInputMode = 'tick' | 'value' | 'note' | 'value_and_note'

export type VisitTaskCompletionInputSpec = {
  inputMode: VisitTaskCompletionInputMode
  valueLabel?: string
  valuePlaceholder?: string
  noteLabel?: string
  notePlaceholder?: string
}

export type VisitJobTaskRow = {
  assignmentId: string
  taskCatalogueTaskId: string
  name: string
  categoryName: string
  groupCode: string
  consentRequired: boolean
  supportLevelApplicable: boolean
  completionInput: VisitTaskCompletionInputSpec
  carerInstructions: string | null
  priority: string
  isExtra?: boolean
  isCompleted: boolean
  recordedValue: string | null
  notes: string | null
  completedAt: string | null
}

export type VisitJobTasksResponse = {
  medicationRoundCode: string | null
  roundLabel: string | null
  windowStart: string | null
  windowEnd: string | null
  tasks: VisitJobTaskRow[]
}

export function extraVisitTaskAssignmentId(taskCatalogueTaskId: string): string {
  return `extra-${taskCatalogueTaskId}`
}

export function resolveCompletionInputFromFlags(
  flagsJson: Record<string, unknown> | null | undefined,
): VisitTaskCompletionInputSpec {
  const stored = flagsJson?.completionInput
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const mode = (stored as { inputMode?: string }).inputMode
    if (mode === 'tick' || mode === 'value' || mode === 'note' || mode === 'value_and_note') {
      return {
        inputMode: mode,
        valueLabel:
          typeof (stored as { valueLabel?: string }).valueLabel === 'string'
            ? (stored as { valueLabel: string }).valueLabel
            : undefined,
        valuePlaceholder:
          typeof (stored as { valuePlaceholder?: string }).valuePlaceholder === 'string'
            ? (stored as { valuePlaceholder: string }).valuePlaceholder
            : undefined,
        noteLabel:
          typeof (stored as { noteLabel?: string }).noteLabel === 'string'
            ? (stored as { noteLabel: string }).noteLabel
            : undefined,
        notePlaceholder:
          typeof (stored as { notePlaceholder?: string }).notePlaceholder === 'string'
            ? (stored as { notePlaceholder: string }).notePlaceholder
            : undefined,
      }
    }
  }
  return { inputMode: 'tick' }
}

export function visitTaskNeedsInputFields(spec: VisitTaskCompletionInputSpec): boolean {
  return spec.inputMode !== 'tick'
}

export function visitTaskCompletionInputMissing(
  spec: VisitTaskCompletionInputSpec,
  isCompleted: boolean,
  recordedValue?: string | null,
  notes?: string | null,
): string | null {
  if (!isCompleted) return null
  const value = recordedValue?.trim() ?? ''
  const note = notes?.trim() ?? ''
  if (spec.inputMode === 'value' && !value) return 'Enter a recorded value'
  if (spec.inputMode === 'note' && !note) return 'Enter a description'
  if (spec.inputMode === 'value_and_note') {
    if (!value && !note) return 'Enter a value and description'
    if (!value) return 'Enter a recorded value'
    if (!note) return 'Enter a description'
  }
  return null
}

export function validateVisitJobTasks(tasks: VisitJobTaskRow[]): string | null {
  for (const task of tasks) {
    if (!task.isCompleted) continue
    const missing = visitTaskCompletionInputMissing(
      task.completionInput,
      true,
      task.recordedValue,
      task.notes,
    )
    if (missing) return `${task.name}: ${missing}`
  }
  return null
}

export function sortVisitJobTasksForCarer(tasks: VisitJobTaskRow[]): VisitJobTaskRow[] {
  return [...tasks].sort((a, b) => {
    if (a.isExtra !== b.isExtra) return a.isExtra ? 1 : -1
    const rankDiff =
      visitTaskPriorityRank(b.priority) - visitTaskPriorityRank(a.priority)
    if (rankDiff !== 0) return rankDiff
    return a.name.localeCompare(b.name)
  })
}
