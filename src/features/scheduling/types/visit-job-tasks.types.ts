import { visitTaskPriorityRank } from '@/features/service-users/visit-tasks/visit-task-priority.util'

export type VisitTaskCompletionInputMode = 'tick' | 'value' | 'note' | 'value_and_note'

export type VisitTaskCompletionInputSpec = {
  inputMode: VisitTaskCompletionInputMode
  valueLabel?: string
  valuePlaceholder?: string
  noteLabel?: string
  notePlaceholder?: string
}

/** Parity with carer mobile save-task outcomes. */
export type VisitJobTaskOutcome = 'completed' | 'partial' | 'declined'

export const VISIT_JOB_TASK_OUTCOMES: Array<{
  value: VisitJobTaskOutcome
  label: string
  description: string
}> = [
  { value: 'completed', label: 'Completed', description: 'Task fully completed' },
  { value: 'partial', label: 'Partial', description: 'Partly done — notes required' },
  { value: 'declined', label: 'Declined', description: 'Not done / refused — notes required' },
]

export type VisitJobTaskRow = {
  assignmentId: string
  taskCatalogueTaskId: string
  name: string
  categoryName: string
  groupCode: string
  consentRequired: boolean
  supportLevelApplicable: boolean
  /** When true, this task typically needs more than one carer (double-up). */
  requiresMultipleCarers?: boolean
  completionInput: VisitTaskCompletionInputSpec
  carerInstructions: string | null
  priority: string
  /** Matches carer-app required vs optional split. */
  isRequired?: boolean
  isExtra?: boolean
  isCompleted: boolean
  /** Present when the task has been addressed (completed / partial / declined). */
  outcome?: VisitJobTaskOutcome | null
  /** When set, completing with a value also writes a Service User Observation. */
  observationTypeCode?: string | null
  linkedTypeCode?: string | null
  recordedValue: string | null
  notes: string | null
  completedAt: string | null
  completedById?: string | null
  completedByName?: string | null
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

export function isVisitTaskOutcomeSentinel(value: string | null | undefined): boolean {
  const upper = String(value ?? '')
    .trim()
    .toUpperCase()
  return upper === 'PARTIAL' || upper === 'DECLINED'
}

/** Strip Outcome/Reason/Checklist markers for editable free-text notes. */
export function stripVisitTaskOutcomeNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null
  const cleaned = notes
    .split(/\s*·\s*/)
    .map((part) => part.trim())
    .filter(
      (part) =>
        part.length > 0 &&
        !/^Outcome:\s*/i.test(part) &&
        !/^Reason:\s*/i.test(part) &&
        !/^Checklist:\s*/i.test(part),
    )
    .join(' · ')
    .trim()
  return cleaned.length > 0 ? cleaned : null
}

export function normalizeVisitJobTaskOutcome(
  value: string | null | undefined,
): VisitJobTaskOutcome | null {
  if (!value?.trim()) return null
  const lower = value.trim().toLowerCase()
  if (lower === 'completed' || lower === 'partial' || lower === 'declined') return lower
  return null
}

export function inferVisitJobTaskOutcome(task: {
  isCompleted?: boolean | null
  outcome?: string | null
  recordedValue?: string | null
  notes?: string | null
}): VisitJobTaskOutcome | null {
  const fromApi = normalizeVisitJobTaskOutcome(task.outcome)
  if (fromApi) return fromApi
  const notes = String(task.notes ?? '')
  const rv = String(task.recordedValue ?? '')
    .trim()
    .toUpperCase()
  if (/Outcome:\s*DECLINED\b/i.test(notes) || rv === 'DECLINED') return 'declined'
  if (/Outcome:\s*PARTIAL\b/i.test(notes) || rv === 'PARTIAL') return 'partial'
  if (task.isCompleted) return 'completed'
  return null
}

export function displayVisitTaskRecordedValue(value: string | null | undefined): string {
  if (isVisitTaskOutcomeSentinel(value)) return ''
  return value ?? ''
}

export function visitTaskCompletionInputMissing(
  spec: VisitTaskCompletionInputSpec,
  isCompleted: boolean,
  recordedValue?: string | null,
  notes?: string | null,
  outcome?: VisitJobTaskOutcome | null,
): string | null {
  if (!isCompleted) return null
  const resolvedOutcome = outcome ?? (isCompleted ? 'completed' : null)
  if (resolvedOutcome === 'partial' || resolvedOutcome === 'declined') {
    if (!stripVisitTaskOutcomeNotes(notes)?.trim()) {
      return resolvedOutcome === 'partial'
        ? 'Add notes explaining the partial outcome'
        : 'Add notes explaining why the task was declined'
    }
    return null
  }

  const value = isVisitTaskOutcomeSentinel(recordedValue)
    ? ''
    : (recordedValue?.trim() ?? '')
  const note = stripVisitTaskOutcomeNotes(notes)?.trim() ?? ''
  const enterField = (label: string | undefined, fallback: string) => {
    const raw = label?.trim()
    if (!raw) return fallback
    return `Enter ${raw.charAt(0).toLowerCase()}${raw.slice(1)}`
  }
  if (spec.inputMode === 'value' && !value) {
    return enterField(spec.valueLabel, 'Enter a recorded value')
  }
  if (spec.inputMode === 'note' && !note) {
    return enterField(spec.noteLabel, 'Enter a description')
  }
  if (spec.inputMode === 'value_and_note') {
    if (!value && !note) {
      const valueBit = spec.valueLabel?.trim()
        ? spec.valueLabel.trim().charAt(0).toLowerCase() + spec.valueLabel.trim().slice(1)
        : 'a value'
      const noteBit = spec.noteLabel?.trim()
        ? spec.noteLabel.trim().charAt(0).toLowerCase() + spec.noteLabel.trim().slice(1)
        : 'a description'
      return `Enter ${valueBit} and ${noteBit}`
    }
    if (!value) return enterField(spec.valueLabel, 'Enter a recorded value')
    if (!note) return enterField(spec.noteLabel, 'Enter a description')
  }
  return null
}

export function validateVisitJobTasks(tasks: VisitJobTaskRow[]): string | null {
  for (const task of tasks) {
    if (!task.isCompleted) continue
    const outcome = inferVisitJobTaskOutcome(task)
    const missing = visitTaskCompletionInputMissing(
      task.completionInput,
      true,
      task.recordedValue,
      task.notes,
      outcome,
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

/** 24 Aug 2026: every visit task must be addressed before clock-out. */
export function visitJobTaskIsRequired(_task: Pick<VisitJobTaskRow, 'priority' | 'isRequired' | 'isExtra'>): boolean {
  return true
}

export function visitJobTaskOutcomeLabel(outcome: VisitJobTaskOutcome | null | undefined): string {
  if (!outcome) return 'Not addressed'
  return VISIT_JOB_TASK_OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome
}

/** Normalize API rows for admin editing (outcome + clean notes/value). */
export function hydrateVisitJobTaskRow(task: VisitJobTaskRow): VisitJobTaskRow {
  const outcome = inferVisitJobTaskOutcome(task)
  return {
    ...task,
    outcome,
    isRequired: visitJobTaskIsRequired(task),
    isCompleted: Boolean(task.isCompleted || outcome),
    notes: stripVisitTaskOutcomeNotes(task.notes),
    recordedValue: isVisitTaskOutcomeSentinel(task.recordedValue)
      ? null
      : task.recordedValue,
    completedById: task.completedById ?? null,
    completedByName: task.completedByName ?? null,
  }
}

export function mapVisitJobTaskForSave(task: VisitJobTaskRow): {
  assignmentId?: string
  taskCatalogueTaskId?: string
  isExtra?: boolean
  isCompleted: boolean
  outcome?: string
  recordedValue?: string
  notes?: string
} {
  const outcome = task.isCompleted
    ? (inferVisitJobTaskOutcome(task) ?? 'completed')
    : null
  const base = task.isExtra
    ? {
        taskCatalogueTaskId: task.taskCatalogueTaskId,
        isExtra: true as const,
        isCompleted: Boolean(task.isCompleted),
        recordedValue: task.recordedValue ?? undefined,
        notes: task.notes ?? undefined,
      }
    : {
        assignmentId: task.assignmentId,
        isCompleted: Boolean(task.isCompleted),
        recordedValue: task.recordedValue ?? undefined,
        notes: task.notes ?? undefined,
      }

  if (!outcome) return base
  return {
    ...base,
    isCompleted: true,
    outcome: outcome.toUpperCase(),
  }
}
