import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { StandardIconImage } from '@/shared/ui/standard-icon-image'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import { fetchCarePlanDeliveryTasks } from '@/features/scheduling/api/scheduling.api'
import {
  DELIVERED_TASK_STATUS_LABELS,
  DELIVERED_TASK_STATUSES,
  type DeliveredCarePlanDetail,
  type DeliveredCarePlanTask,
  type DeliveredTaskStatus,
} from '@/features/scheduling/types/visit-care-plan-delivery.types'

type Props = {
  jobId: string
  options: AcceptedCarePlanItem[]
  defaultSelectedFormIds: string[]
  disabled?: boolean
  extraCareNotes: string
  onExtraCareNotesChange: (value: string) => void
  onDeliveredFormIdsChange: (formIds: string[]) => void
  onDetailsChange: (details: DeliveredCarePlanDetail[]) => void
}

function buildDefaultDetail(
  plan: {
    carePathwayFormId: string
    formName: string
    pictureUrl: string | null
    instanceId: string | null
    publishedVersionId: string | null
    publishedVersionNumber: number | null
    isPublished: boolean
    tasks: Array<{
      fieldKey: string
      label: string
      fieldType: string
      expectedValue: string | boolean | null
    }>
  },
  planDelivered: boolean,
  saved?: DeliveredCarePlanDetail,
): DeliveredCarePlanDetail {
  const savedTasksByKey = new Map((saved?.tasks ?? []).map((task) => [task.fieldKey, task]))
  const tasks: DeliveredCarePlanTask[] = plan.tasks.map((task) => {
    const savedTask = savedTasksByKey.get(task.fieldKey)
    return {
      fieldKey: task.fieldKey,
      label: task.label,
      fieldType: task.fieldType,
      expectedValue: task.expectedValue,
      status: savedTask?.status ?? (planDelivered ? 'DELIVERED' : 'NOT_APPLICABLE'),
      notes: savedTask?.notes,
    }
  })

  return {
    carePathwayFormId: plan.carePathwayFormId,
    carePlanInstanceId: plan.instanceId ?? undefined,
    publishedVersionId: plan.publishedVersionId ?? undefined,
    publishedVersionNumber: plan.publishedVersionNumber ?? undefined,
    formName: plan.formName,
    planDelivered: saved?.planDelivered ?? planDelivered,
    planNotes: saved?.planNotes,
    extraCareNotes: saved?.extraCareNotes,
    tasks,
  }
}

export function ScheduleJobDeliveredCarePlanDetails({
  jobId,
  options,
  defaultSelectedFormIds,
  disabled,
  extraCareNotes,
  onExtraCareNotesChange,
  onDeliveredFormIdsChange,
  onDetailsChange,
}: Props) {
  const formIds = React.useMemo(() => options.map((option) => option.formId), [options])
  const [expandedPlans, setExpandedPlans] = React.useState<Set<string>>(() => new Set())
  const [detailsByFormId, setDetailsByFormId] = React.useState<Map<string, DeliveredCarePlanDetail>>(
    () => new Map(),
  )

  const tasksQuery = useQuery({
    queryKey: ['care-plan-delivery-tasks', jobId, formIds.join(',')],
    queryFn: ({ signal }) => fetchCarePlanDeliveryTasks(jobId, formIds, { signal }),
    enabled: Boolean(jobId) && formIds.length > 0,
    staleTime: 30_000,
  })

  React.useEffect(() => {
    if (!tasksQuery.data?.plans.length) return
    const savedByFormId = new Map(
      (tasksQuery.data.savedDelivery ?? []).map((entry) => [entry.carePathwayFormId, entry]),
    )
    const next = new Map<string, DeliveredCarePlanDetail>()
    for (const plan of tasksQuery.data.plans) {
      const selected = defaultSelectedFormIds.includes(plan.carePathwayFormId)
      next.set(
        plan.carePathwayFormId,
        buildDefaultDetail(plan, selected, savedByFormId.get(plan.carePathwayFormId)),
      )
    }
    setDetailsByFormId(next)
    setExpandedPlans(new Set(defaultSelectedFormIds))
    if (tasksQuery.data.savedExtraCareNotes && !extraCareNotes) {
      onExtraCareNotesChange(tasksQuery.data.savedExtraCareNotes)
    }
  }, [
    tasksQuery.data,
    defaultSelectedFormIds,
    extraCareNotes,
    onExtraCareNotesChange,
  ])

  const syncParent = React.useCallback(
    (next: Map<string, DeliveredCarePlanDetail>) => {
      const details = [...next.values()]
      onDetailsChange(details)
      onDeliveredFormIdsChange(
        details.filter((plan) => plan.planDelivered).map((plan) => plan.carePathwayFormId),
      )
    },
    [onDetailsChange, onDeliveredFormIdsChange],
  )

  const updatePlan = React.useCallback(
    (formId: string, patch: Partial<DeliveredCarePlanDetail>) => {
      setDetailsByFormId((current) => {
        const existing = current.get(formId)
        if (!existing) return current
        const nextPlan = { ...existing, ...patch }
        const next = new Map(current)
        next.set(formId, nextPlan)
        syncParent(next)
        return next
      })
    },
    [syncParent],
  )

  const updateTask = React.useCallback(
    (formId: string, fieldKey: string, patch: Partial<DeliveredCarePlanTask>) => {
      setDetailsByFormId((current) => {
        const existing = current.get(formId)
        if (!existing) return current
        const tasks = existing.tasks.map((task) =>
          task.fieldKey === fieldKey ? { ...task, ...patch } : task,
        )
        const next = new Map(current)
        next.set(formId, { ...existing, tasks })
        syncParent(next)
        return next
      })
    },
    [syncParent],
  )

  const togglePlanDelivered = (formId: string, checked: boolean) => {
    setExpandedPlans((current) => {
      const next = new Set(current)
      if (checked) next.add(formId)
      else next.delete(formId)
      return next
    })
    setDetailsByFormId((current) => {
      const existing = current.get(formId)
      if (!existing) return current
      const tasks = existing.tasks.map((task) => ({
        ...task,
        status: checked
          ? task.status === 'NOT_APPLICABLE'
            ? ('DELIVERED' as DeliveredTaskStatus)
            : task.status
          : ('NOT_APPLICABLE' as DeliveredTaskStatus),
      }))
      const next = new Map(current)
      next.set(formId, { ...existing, planDelivered: checked, tasks })
      syncParent(next)
      return next
    })
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No accepted care plans for this service user. Accept recommendations on initial assessment
        or link plans on the visit plan.
      </p>
    )
  }

  if (tasksQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading care plan requirements…
      </div>
    )
  }

  const plans = tasksQuery.data?.plans ?? []

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const detail = detailsByFormId.get(plan.carePathwayFormId)
        const option = options.find((entry) => entry.formId === plan.carePathwayFormId)
        const expanded = expandedPlans.has(plan.carePathwayFormId)
        const checked = detail?.planDelivered ?? false

        return (
          <div
            key={plan.carePathwayFormId}
            className={cn(
              'overflow-hidden rounded-lg border',
              checked
                ? 'border-teal-300 bg-teal-50/40 dark:border-teal-800 dark:bg-teal-950/20'
                : 'border-border bg-card',
            )}
          >
            <div className="flex items-start gap-3 px-3 py-2.5">
              <Checkbox
                id={`schedule-complete-cp-${plan.carePathwayFormId}`}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => togglePlanDelivered(plan.carePathwayFormId, value === true)}
              />
              <button
                type="button"
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
                disabled={disabled || !plan.tasks.length}
                onClick={() =>
                  setExpandedPlans((current) => {
                    const next = new Set(current)
                    if (next.has(plan.carePathwayFormId)) next.delete(plan.carePathwayFormId)
                    else next.add(plan.carePathwayFormId)
                    return next
                  })
                }
              >
                <StandardIconImage
                  src={option?.pictureUrl ?? plan.pictureUrl}
                  label={plan.formName}
                  className="h-10 w-10 shrink-0"
                  imgClassName="h-10 w-10"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{plan.formName}</span>
                  {option?.carePlanArea ? (
                    <span className="block text-xs text-muted-foreground">{option.carePlanArea}</span>
                  ) : null}
                  {!plan.isPublished ? (
                    <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-300">
                      Care plan not published — publish to load planned interventions.
                    </span>
                  ) : plan.tasks.length === 0 ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      No deliverable items in published plan — use plan notes below.
                    </span>
                  ) : (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {plan.tasks.length} planned item{plan.tasks.length === 1 ? '' : 's'} — expand to
                      record delivery
                    </span>
                  )}
                </span>
                {plan.tasks.length > 0 ? (
                  <ChevronDown
                    className={cn(
                      'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      expanded && 'rotate-180',
                    )}
                    aria-hidden
                  />
                ) : null}
              </button>
            </div>

            {expanded && detail ? (
              <div className="space-y-3 border-t border-border/70 px-3 py-3 dark:border-teal-900/40">
                {detail.tasks.length > 0 ? (
                  <ul className="space-y-2">
                    {detail.tasks.map((task) => (
                      <li
                        key={task.fieldKey}
                        className="rounded-md border border-border/70 bg-background/80 px-3 py-2"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{task.label}</p>
                            {task.expectedValue != null &&
                            String(task.expectedValue).trim() !== '' &&
                            task.fieldType !== 'CHECKBOX' &&
                            task.fieldType !== 'YES_NO' ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Planned: {String(task.expectedValue).trim()}
                              </p>
                            ) : null}
                          </div>
                          <Select
                            value={task.status}
                            onValueChange={(value) =>
                              updateTask(plan.carePathwayFormId, task.fieldKey, {
                                status: value as DeliveredTaskStatus,
                              })
                            }
                            disabled={disabled || !checked}
                          >
                            <SelectTrigger className="h-8 w-full sm:w-[11rem]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DELIVERED_TASK_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {DELIVERED_TASK_STATUS_LABELS[status]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <textarea
                          rows={2}
                          disabled={disabled || !checked}
                          placeholder="Task notes (optional)"
                          className="mt-2 w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={task.notes ?? ''}
                          onChange={(event) =>
                            updateTask(plan.carePathwayFormId, task.fieldKey, {
                              notes: event.target.value,
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    What was / wasn&apos;t delivered for this plan
                  </Label>
                  <textarea
                    rows={2}
                    disabled={disabled || !checked}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Summarise delivery for this care plan…"
                    value={detail.planNotes ?? ''}
                    onChange={(event) =>
                      updatePlan(plan.carePathwayFormId, { planNotes: event.target.value })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Extra care for this plan (beyond published plan)
                  </Label>
                  <textarea
                    rows={2}
                    disabled={disabled || !checked}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Additional tasks provided under this care plan…"
                    value={detail.extraCareNotes ?? ''}
                    onChange={(event) =>
                      updatePlan(plan.carePathwayFormId, { extraCareNotes: event.target.value })
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        )
      })}

      <div className="space-y-1.5 rounded-lg border border-dashed border-border px-3 py-3">
        <Label htmlFor="schedule-extra-care-notes" className="text-sm font-semibold text-foreground">
          Extra care (visit-wide)
        </Label>
        <p className="text-xs text-muted-foreground">
          Care provided that is not covered by any selected care plan.
        </p>
        <textarea
          id="schedule-extra-care-notes"
          rows={3}
          disabled={disabled}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="e.g. changed bed linen, one-off shopping, family-requested support…"
          value={extraCareNotes}
          onChange={(event) => onExtraCareNotesChange(event.target.value)}
        />
      </div>
    </div>
  )
}
