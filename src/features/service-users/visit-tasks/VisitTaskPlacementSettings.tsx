import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarX2, Clock, Timer } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { formatDate } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { updateServiceUserVisitTaskSettings } from '@/features/service-users/visit-tasks/api'
import type { ServiceUserVisitTasksResponse } from '@/features/service-users/visit-tasks/types'

type UnplacedTask = NonNullable<ServiceUserVisitTasksResponse['unplacedTasks']>[number]

type Props = {
  serviceUserId: string
  graceMinutes: number | null
  daysWithoutVisit: Array<{ date: string; taskCount: number }>
  unplacedTasks: UnplacedTask[]
}

function gapLabel(minutes: number | null): string {
  if (minutes == null) return 'no visit'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

function dayLabel(isoDay: string): string {
  // Midday UTC keeps the calendar day stable in any org timezone.
  const at = `${isoDay}T12:00:00.000Z`
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(at),
  )
  return `${weekday} ${formatDate(at)}`
}

/**
 * Tasks Planner: how far a task may move to the nearest visit when no visit covers its due time,
 * and which upcoming days have tasks but no visit created (those tasks reach no carer).
 */
export function VisitTaskPlacementSettings({
  serviceUserId,
  graceMinutes,
  daysWithoutVisit,
  unplacedTasks,
}: Props) {
  const queryClient = useQueryClient()
  const [value, setValue] = React.useState(graceMinutes == null ? '' : String(graceMinutes))

  React.useEffect(() => {
    setValue(graceMinutes == null ? '' : String(graceMinutes))
  }, [graceMinutes])

  const trimmed = value.trim()
  const parsed = trimmed === '' ? null : Number(trimmed)
  const invalid = parsed != null && (!Number.isInteger(parsed) || parsed < 0 || parsed > 1440)
  const dirty = parsed !== graceMinutes

  const saveMutation = useMutation({
    mutationFn: () =>
      updateServiceUserVisitTaskSettings(serviceUserId, { nearestVisitGraceMinutes: parsed }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['service-user-visit-tasks', serviceUserId] })
      toastSuccess('Nearest-visit grace saved')
    },
    onError: (error) => toastApiError(error),
  })

  return (
    <div className="mb-4 space-y-3">
      {daysWithoutVisit.length > 0 ? (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarX2 className="h-4 w-4 shrink-0" aria-hidden />
            No visit has been created for these days
          </p>
          <p className="mt-0.5 text-xs">
            Tasks due on these days will not show to any carer until a visit is created.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {daysWithoutVisit.map((d) => (
              <li
                key={d.date}
                className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium dark:bg-amber-900/60"
              >
                {dayLabel(d.date)} · {d.taskCount} {d.taskCount === 1 ? 'task' : 'tasks'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {unplacedTasks.length > 0 ? (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            These tasks won&apos;t reach any visit
          </p>
          <p className="mt-0.5 text-xs">
            No visit covers their due time and the nearest visit is more than{' '}
            {graceMinutes ?? 0} minutes away. Change the task time, add a visit, or raise the
            grace below.
          </p>
          <ul className="mt-2 space-y-1">
            {unplacedTasks.map((t) => (
              <li
                key={`${t.date}:${t.assignmentId}`}
                className="flex flex-wrap items-center gap-x-2 rounded-lg bg-amber-100 px-2.5 py-1 text-xs dark:bg-amber-900/60"
              >
                <span className="font-semibold">{dayLabel(t.date)}</span>
                <span>·</span>
                <span className="font-medium">{t.taskName}</span>
                {t.dueTime ? <span className="tabular-nums">({t.dueTime})</span> : null}
                <span>·</span>
                <span>nearest visit {gapLabel(t.nearestGapMinutes)} away</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="min-w-[16rem] flex-1">
          <label
            htmlFor="task-nearest-visit-grace"
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
          >
            <Timer className="h-3.5 w-3.5 text-primary" aria-hidden />
            Nearest-visit grace (minutes)
          </label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            When no visit covers a task&apos;s due time, it moves to the nearest visit only if that
            visit is within this many minutes. Default 60. Leave empty for no limit.
          </p>
        </div>
        <Input
          id="task-nearest-visit-grace"
          type="number"
          inputMode="numeric"
          min={0}
          max={1440}
          step={5}
          placeholder="No limit"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-9 w-28 tabular-nums"
          aria-invalid={invalid || undefined}
        />
        <Button
          type="button"
          size="sm"
          className="h-9"
          disabled={!dirty || invalid || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Save
        </Button>
        {invalid ? (
          <p className="basis-full text-xs text-destructive">Enter whole minutes from 0 to 1440.</p>
        ) : null}
      </div>
    </div>
  )
}
