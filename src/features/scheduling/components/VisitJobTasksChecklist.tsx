import { useState } from 'react'
import { AlertTriangle, CheckSquare, ChevronDown, Flag, ListChecks, Loader2, Users, X } from 'lucide-react'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { formatOpsClockTime, formatOpsHm, dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import {
  displayVisitTaskRecordedValue,
  inferVisitJobTaskOutcome,
  sortVisitJobTasksForCarer,
  stripVisitTaskOutcomeNotes,
  visitJobTaskIsRequired,
  visitJobTaskOutcomeLabel,
  VISIT_JOB_TASK_OUTCOMES,
  type VisitJobTaskOutcome,
  type VisitJobTaskRow,
} from '@/features/scheduling/types/visit-job-tasks.types'
import { VisitPhotoThumbnails } from '@/features/scheduling/components/VisitPhotoThumbnails'
import {
  normalizeVisitTaskPriority,
  visitTaskPriorityBadgeClass,
  visitTaskPriorityCardClass,
  visitTaskPriorityLabel,
} from '@/features/service-users/visit-tasks/visit-task-priority.util'
import { groupVisual, PlannerIconBadge } from '@/features/service-users/visit-tasks/visit-task-planner-visual.util'

type TaskPatch = {
  isCompleted?: boolean
  outcome?: VisitJobTaskOutcome | null
  recordedValue?: string | null
  notes?: string | null
}

type Props = {
  tasks: VisitJobTaskRow[]
  disabled?: boolean
  loading?: boolean
  roundLabel?: string | null
  roundWindow?: string | null
  noRoundMessage?: string
  emptyMessage?: string
  onTaskChange: (assignmentId: string, patch: TaskPatch) => void
  onRemoveExtra?: (assignmentId: string) => void
  idPrefix?: string
  /** When true, fills parent height and scrolls the task list inside. */
  fillHeight?: boolean
  listMaxHeightClass?: string
  /** Normalised observation type code → { label, value }, to surface the linked
   * observation on an obs-linked task (parity with the carer app). */
  observationsByType?: Record<string, RecordedObservation>
}

export type RecordedObservation = {
  label: string
  value: string
  notes?: string | null
  photos?: Array<{ id: string; fileUrl: string; caption?: string | null }>
}

/** Normalise an observation type code so `skin_integrity` == `SKIN_INTEGRITY`. */
export function normalizeObservationCode(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function observationForTask(
  task: VisitJobTaskRow,
  observationsByType: Record<string, RecordedObservation> | undefined,
): RecordedObservation | null {
  if (!observationsByType) return null
  for (const code of [task.observationTypeCode, task.linkedTypeCode]) {
    const key = normalizeObservationCode(code)
    if (key && observationsByType[key]) return observationsByType[key]
  }
  return null
}

function VisitJobTaskCarerGuidance({
  instructions,
  priority,
}: {
  instructions: string | null
  priority: string | null
}) {
  const normalizedPriority = normalizeVisitTaskPriority(priority)
  const trimmed = instructions?.trim() ?? ''

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            visitTaskPriorityBadgeClass(normalizedPriority),
          )}
        >
          <Flag className="h-3 w-3" aria-hidden />
          {visitTaskPriorityLabel(normalizedPriority)} priority
        </span>
        {normalizedPriority === 'critical' ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Do this first
          </span>
        ) : null}
      </div>

      {trimmed.length > 0 ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 dark:bg-primary/10">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Instructions for the carer
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{trimmed}</p>
        </div>
      ) : null}
    </div>
  )
}

function formatTaskCompletedLabel(task: VisitJobTaskRow): string | null {
  if (!task.completedAt) return null
  const time = formatOpsHm(task.completedAt) || formatOpsClockTime(task.completedAt)
  const day = dayKeyFromInstant(task.completedAt)
  const datePart = day ? formatOrganisationDate(`${day}T12:00:00.000Z`, { utc: true }) : ''
  const when = datePart ? `${time} · ${datePart}` : time
  if (task.completedByName?.trim()) return `Recorded · ${when} · ${task.completedByName.trim()}`
  return `Recorded · ${when}`
}

/** One labelled field in the carer record; shows "Not recorded" for blanks. */
function CarerField({ label, value }: { label: string; value?: string | null }) {
  const has = Boolean(value && value.trim())
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'whitespace-pre-wrap text-sm leading-relaxed',
          has ? 'text-foreground' : 'italic text-muted-foreground',
        )}
      >
        {has ? value : 'Not recorded'}
      </p>
    </div>
  )
}

/**
 * Observation value field — renders a multi-field observation value (backend
 * joins sub-fields with " · ") as ONE line per sub-field for readability, with
 * the "Label:" part muted and the value emphasised. Single-value observations
 * (temperature, etc.) render as a single line.
 */
function CarerObservationField({ label, value }: { label: string; value?: string | null }) {
  const parts = (value ?? '')
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean)
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {parts.length === 0 ? (
        <p className="text-sm italic leading-relaxed text-muted-foreground">Not recorded</p>
      ) : (
        <ul className="mt-0.5 space-y-0.5">
          {parts.map((part, index) => {
            const sep = part.indexOf(': ')
            return (
              <li key={index} className="text-sm leading-relaxed">
                {sep > 0 ? (
                  <>
                    <span className="text-muted-foreground">{part.slice(0, sep)}:</span>{' '}
                    <span className="font-medium text-foreground">{part.slice(sep + 2)}</span>
                  </>
                ) : (
                  <span className="font-medium text-foreground">{part}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function VisitJobTaskCarerRecord({
  task,
  observation,
  includeOutcomeNotes = true,
}: {
  task: VisitJobTaskRow
  observation?: RecordedObservation | null
  includeOutcomeNotes?: boolean
}) {
  const outcome = inferVisitJobTaskOutcome(task)
  if (!outcome && !task.isCompleted) return null
  const completedLabel = formatTaskCompletedLabel(task)
  const spec = task.completionInput
  const needsValue = spec?.inputMode === 'value' || spec?.inputMode === 'value_and_note'
  const valueLabel = spec?.valueLabel?.trim() || 'Reading'
  const noteLabel = spec?.noteLabel?.trim() || 'Task outcome notes'
  const value = displayVisitTaskRecordedValue(task.recordedValue)
  const outcomeNotes = stripVisitTaskOutcomeNotes(task.notes)

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Carer app record
        </p>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            outcome === 'completed' && 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100',
            outcome === 'partial' && 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
            outcome === 'declined' && 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100',
            !outcome && 'bg-muted text-muted-foreground',
          )}
        >
          {visitJobTaskOutcomeLabel(outcome)}
        </span>
      </div>
      {completedLabel ? (
        <p className="text-xs text-muted-foreground">{completedLabel}</p>
      ) : null}

      <div className="space-y-2.5">
        {observation ? (
          <>
            <CarerObservationField label={observation.label} value={observation.value} />
            {observation.notes?.trim() ? (
              <CarerField label="Observation notes" value={observation.notes} />
            ) : null}
            <VisitPhotoThumbnails photos={observation.photos} />
          </>
        ) : null}
        {/* Task value only when NOT obs-linked (the observation already carries
            the reading, so we don't duplicate it). */}
        {needsValue && !observation ? (
          <CarerField label={valueLabel} value={value} />
        ) : null}
        {includeOutcomeNotes ? (
          <CarerField label={noteLabel} value={outcomeNotes} />
        ) : null}
      </div>
    </div>
  )
}

export function VisitJobTasksChecklist({
  tasks,
  disabled,
  loading,
  roundLabel,
  roundWindow,
  noRoundMessage,
  emptyMessage,
  onTaskChange,
  onRemoveExtra,
  idPrefix = 'visit-job-task',
  fillHeight = false,
  listMaxHeightClass = 'max-h-[min(24rem,50vh)]',
  observationsByType,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  const toggleExpanded = (assignmentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(assignmentId)) next.delete(assignmentId)
      else next.add(assignmentId)
      return next
    })
  }

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 py-4 text-sm text-muted-foreground',
          fillHeight && 'min-h-0 flex-1',
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading visit tasks…
      </div>
    )
  }

  if (noRoundMessage) {
    return (
      <p className={cn('text-sm text-muted-foreground', fillHeight && 'min-h-0 flex-1')}>
        {noRoundMessage}
      </p>
    )
  }

  if (tasks.length === 0 && emptyMessage) {
    return (
      <p className={cn('text-sm text-muted-foreground', fillHeight && 'min-h-0 flex-1')}>
        {emptyMessage}
      </p>
    )
  }

  const sortedTasks = sortVisitJobTasksForCarer(tasks)
  const requiredTasks = sortedTasks.filter((task) => visitJobTaskIsRequired(task))
  const optionalTasks = sortedTasks.filter((task) => !visitJobTaskIsRequired(task))
  const addressedCount = sortedTasks.filter((task) => Boolean(inferVisitJobTaskOutcome(task))).length
  const remainingCount = sortedTasks.length - addressedCount
  const criticalCount = sortedTasks.filter(
    (task) => !task.isExtra && normalizeVisitTaskPriority(task.priority) === 'critical',
  ).length
  const multiCarerCount = sortedTasks.filter((task) => task.requiresMultipleCarers).length

  const renderTaskCard = (task: VisitJobTaskRow) => {
    const outcome = inferVisitJobTaskOutcome(task)
    const showOutcomeFields = Boolean(task.isCompleted)
    const priority = normalizeVisitTaskPriority(task.priority)
    const taskVisual = groupVisual(task.groupCode)
    const spec = task.completionInput
    const needsValue = spec.inputMode === 'value' || spec.inputMode === 'value_and_note'
    const valueLabel = spec.valueLabel?.trim() || 'Reading'
    const effectiveOutcome = outcome ?? 'completed'
    const observation = observationForTask(task, observationsByType)
    const isExpanded = expandedIds.has(task.assignmentId)
    const detailsId = `${idPrefix}-${task.assignmentId}-details`

    return (
      <li
        key={task.assignmentId}
        className={cn(
          'overflow-hidden rounded-xl border bg-card shadow-sm',
          visitTaskPriorityCardClass(priority),
          outcome === 'completed'
            ? 'border-teal-300/80 bg-teal-50/40 dark:border-teal-900 dark:bg-teal-950/20'
            : outcome === 'partial'
              ? 'border-amber-300/80 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20'
              : outcome === 'declined'
                ? 'border-rose-300/80 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20'
                : 'border-border',
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          {!task.isExtra ? (
            <PlannerIconBadge visual={taskVisual} size="sm" className="shrink-0" />
          ) : null}
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            onClick={() => toggleExpanded(task.assignmentId)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {task.name}
            </span>
            {outcome === 'completed' ? (
              <CheckSquare className="h-4 w-4 shrink-0 text-teal-600" aria-label="Completed" />
            ) : null}
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                isExpanded && 'rotate-180',
              )}
              aria-hidden
            />
          </button>
          {task.isExtra && onRemoveExtra ? (
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              disabled={disabled}
              aria-label={`Remove extra task ${task.name}`}
              onClick={() => onRemoveExtra(task.assignmentId)}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {isExpanded ? (
          <div id={detailsId} className="border-t border-border/60 px-3 pb-3 pt-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`${idPrefix}-${task.assignmentId}`}
                checked={task.isCompleted}
                disabled={disabled}
                className="mt-1 shrink-0"
                onCheckedChange={(value) => {
                  const checked = value === true
                  onTaskChange(task.assignmentId, {
                    isCompleted: checked,
                    outcome: checked ? (outcome ?? 'completed') : null,
                    recordedValue: checked ? task.recordedValue : null,
                    notes: checked ? task.notes : null,
                  })
                }}
              />
              <div className="min-w-0 flex-1">
                <label htmlFor={`${idPrefix}-${task.assignmentId}`} className="min-w-0 cursor-pointer">
                  <span className="flex flex-wrap items-center gap-2">
                    {task.isExtra ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        Extra
                      </span>
                    ) : null}
                    {task.observationTypeCode ? (
                      <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
                        Records observation
                      </span>
                    ) : null}
                    {task.requiresMultipleCarers ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                        title="This task requires more than one carer"
                      >
                        <Users className="h-3 w-3" aria-hidden />
                        2+ carers
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">{task.categoryName}</span>
                </label>

                {!task.isExtra ? (
                  <VisitJobTaskCarerGuidance
                    instructions={task.carerInstructions}
                    priority={task.priority}
                  />
                ) : null}

                <VisitJobTaskCarerRecord
                  task={task}
                  observation={observation}
                  includeOutcomeNotes={!showOutcomeFields}
                />

                {showOutcomeFields ? (
                  <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Update outcome</p>
                      <div
                        className="flex flex-wrap gap-2"
                        role="radiogroup"
                        aria-label={`Outcome for ${task.name}`}
                      >
                        {VISIT_JOB_TASK_OUTCOMES.map((option) => {
                          const selected = (outcome ?? 'completed') === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              disabled={disabled}
                              title={option.description}
                              onClick={() =>
                                onTaskChange(task.assignmentId, {
                                  isCompleted: true,
                                  outcome: option.value,
                                })
                              }
                              className={cn(
                                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                                !selected &&
                                  'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                                selected &&
                                  option.value === 'completed' &&
                                  'border-teal-500 bg-teal-100 text-teal-900 dark:border-teal-600 dark:bg-teal-950 dark:text-teal-100',
                                selected &&
                                  option.value === 'partial' &&
                                  'border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100',
                                selected &&
                                  option.value === 'declined' &&
                                  'border-rose-500 bg-rose-100 text-rose-900 dark:border-rose-600 dark:bg-rose-950 dark:text-rose-100',
                              )}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <CarerField
                      label={spec.noteLabel?.trim() || 'Task outcome notes'}
                      value={stripVisitTaskOutcomeNotes(task.notes)}
                    />

                    {needsValue && effectiveOutcome === 'completed' && !observation ? (
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`${idPrefix}-${task.assignmentId}-value`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          {valueLabel}
                        </label>
                        <Input
                          id={`${idPrefix}-${task.assignmentId}-value`}
                          value={displayVisitTaskRecordedValue(task.recordedValue)}
                          placeholder={spec.valuePlaceholder || `Enter ${valueLabel.toLowerCase()}`}
                          disabled={disabled}
                          onChange={(e) =>
                            onTaskChange(task.assignmentId, {
                              isCompleted: true,
                              recordedValue: e.target.value,
                            })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <div className={cn(fillHeight ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3')}>
      {sortedTasks.length > 0 ? (
        <div className="shrink-0 space-y-1">
          <p className="text-xs text-muted-foreground">
            {roundLabel ? <span className="font-medium text-foreground">{roundLabel}</span> : null}
            {roundWindow ? (
              <span>
                {roundLabel ? ' · ' : ''}
                {roundWindow}
              </span>
            ) : null}
            <span>
              {' '}
              · {addressedCount} addressed · {remainingCount} remaining
              {requiredTasks.length > 0 ? ` · ${requiredTasks.length} required` : ''}
              {optionalTasks.length > 0 ? ` · ${optionalTasks.length} optional` : ''}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Tap a task to open the same details as the carer app: outcome, value/notes, and who recorded it.
            {criticalCount > 0 ? (
              <span className="font-medium text-red-700 dark:text-red-300">
                {' '}
                {criticalCount} critical task{criticalCount === 1 ? '' : 's'} on this visit.
              </span>
            ) : null}
            {multiCarerCount > 0 ? (
              <span className="font-medium text-sky-700 dark:text-sky-300">
                {' '}
                {multiCarerCount} task{multiCarerCount === 1 ? '' : 's'} need{multiCarerCount === 1 ? 's' : ''} more
                than 1 carer.
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          'space-y-5 overflow-y-auto pe-1',
          fillHeight ? 'min-h-0 flex-1' : listMaxHeightClass,
        )}
      >
        {requiredTasks.length > 0 ? (
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Required tasks
            </h4>
            <ul className="space-y-3">{requiredTasks.map(renderTaskCard)}</ul>
          </section>
        ) : null}
        {optionalTasks.length > 0 ? (
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Optional tasks
            </h4>
            <ul className="space-y-3">{optionalTasks.map(renderTaskCard)}</ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
