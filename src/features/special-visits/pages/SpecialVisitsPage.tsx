import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Clock, Loader2, Plus, Trash2 } from 'lucide-react'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import {
  deleteSpecialVisit,
  fetchSpecialVisits,
  fetchSpecialVisitSummary,
  specialVisitKeys,
} from '@/features/special-visits/api'
import { SpecialVisitFormDialog } from '@/features/special-visits/components/SpecialVisitFormDialog'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { ContentCard } from '@/shared/ui/content-section'
import { Label } from '@/shared/ui/form-field'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'

/** Monday (local) of the week containing today, as 'YYYY-MM-DD'. */
function currentWeekStart(): string {
  const now = new Date()
  const diff = (now.getDay() + 6) % 7 // days since Monday (0 = Sun)
  now.setDate(now.getDate() - diff)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

const TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

/** e.g. "Mon 12 Oct, 09:00–10:00" (end omitted when not set). */
function formatVisitTime(startIso: string, endIso: string | null): string {
  const start = new Date(startIso)
  const datePart = DATE_FMT.format(start)
  const startTime = TIME_FMT.format(start)
  if (!endIso) return `${datePart}, ${startTime}`
  return `${datePart}, ${startTime}–${TIME_FMT.format(new Date(endIso))}`
}

export default function SpecialVisitsPage() {
  const qc = useQueryClient()

  const [employeeId, setEmployeeId] = React.useState('')
  const [selectedEmployeeName, setSelectedEmployeeName] = React.useState('')
  const [employeeSearch, setEmployeeSearch] = React.useState('')
  const [weekStart, setWeekStart] = React.useState(currentWeekStart)
  const [formOpen, setFormOpen] = React.useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)

  const employeesQuery = useEmployees({
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
    search: employeeSearch.trim() || undefined,
  })

  const employeeOptions = React.useMemo<ComboboxOption[]>(() => {
    const options = (employeesQuery.data?.rows ?? []).map(emp => ({
      value: emp.id,
      label: emp.fullName ?? (`${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || 'Unknown'),
    }))
    // Keep the chosen carer visible even when the server-side search excludes them.
    if (employeeId && !options.some(o => o.value === employeeId)) {
      options.unshift({ value: employeeId, label: selectedEmployeeName || 'Selected carer' })
    }
    return options
  }, [employeesQuery.data?.rows, employeeId, selectedEmployeeName])

  const ready = Boolean(employeeId && weekStart)

  const summaryQuery = useQuery({
    queryKey: specialVisitKeys.summary(employeeId, weekStart),
    queryFn: () => fetchSpecialVisitSummary({ employeeId, weekStart }),
    enabled: ready,
  })

  const listQuery = useQuery({
    queryKey: specialVisitKeys.list(employeeId, weekStart),
    queryFn: () => fetchSpecialVisits({ employeeId, weekStart }),
    enabled: ready,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSpecialVisit(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: specialVisitKeys.all() })
      toastSuccess('Special visit removed')
      setConfirmDeleteId(null)
    },
    onError: e => toastApiError(e, 'Could not remove the special visit'),
  })

  const summary = summaryQuery.data
  const rows = listQuery.data ?? []
  const remaining = summary?.remainingHours

  const statCards: {
    title: string
    value: number | undefined
    icon: React.ReactNode
    tone: 'sky' | 'violet' | 'amber' | 'emerald'
    highlight?: boolean
  }[] = [
    {
      title: 'Contracted',
      value: summary?.contractedHours,
      icon: <Clock className="h-4 w-4" aria-hidden />,
      tone: 'sky',
    },
    {
      title: 'Booked visits',
      value: summary?.bookedHours,
      icon: <CalendarClock className="h-4 w-4" aria-hidden />,
      tone: 'violet',
    },
    {
      title: 'Special',
      value: summary?.specialHours,
      icon: <CalendarClock className="h-4 w-4" aria-hidden />,
      tone: 'amber',
    },
    {
      title: 'Remaining',
      value: summary?.remainingHours,
      icon: <Clock className="h-4 w-4" aria-hidden />,
      tone: 'emerald',
      highlight: true,
    },
  ]

  return (
    <div className="flex flex-col gap-4" data-testid="special-visits-page">
      <PageHeader
        title="Special visits"
        description="Fill a carer’s remaining contracted hours with flexible special visits for any client or purpose."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Special visits' }]}
      />

      {/* Picker toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex min-w-[16rem] flex-1 flex-col gap-1.5 sm:max-w-sm">
          <Label>Carer</Label>
          <Combobox
            options={employeeOptions}
            value={employeeId}
            onChange={value => {
              setEmployeeId(value)
              setSelectedEmployeeName(employeeOptions.find(o => o.value === value)?.label ?? '')
            }}
            placeholder="Select carer…"
            searchPlaceholder="Search carers…"
            emptyText={employeesQuery.isError ? 'Could not load carers.' : 'No carers found.'}
            loading={employeesQuery.isLoading || employeesQuery.isFetching}
            onSearchChange={setEmployeeSearch}
            allowDeselect={false}
            aria-label="Carer"
            data-testid="special-visits-carer"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="special-visits-week">Week starting</Label>
          <input
            id="special-visits-week"
            type="date"
            className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={weekStart}
            onChange={e => setWeekStart(e.target.value)}
            data-testid="special-visits-week"
          />
        </div>
        <div className="ml-auto">
          <Button
            type="button"
            size="sm"
            disabled={!ready}
            onClick={() => setFormOpen(true)}
            data-testid="special-visits-add"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add special visit
          </Button>
        </div>
      </div>

      {!ready ? (
        <ContentCard className="p-6">
          <p className="text-sm text-muted-foreground">
            Select a carer and a week to see their contracted, booked, special and remaining hours.
          </p>
        </ContentCard>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map(card => {
              const isNegative = card.highlight && (card.value ?? 0) < 0
              return (
                <ContentCard
                  key={card.title}
                  className={cn(
                    'space-y-2 p-4',
                    card.highlight && 'border-primary/40 bg-primary/5',
                    isNegative && 'border-destructive/40 bg-destructive/5',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      card.tone === 'sky' && 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
                      card.tone === 'violet' &&
                        'bg-violet-500/10 text-violet-700 dark:text-violet-300',
                      card.tone === 'amber' && 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
                      card.tone === 'emerald' &&
                        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                    )}
                  >
                    {card.icon}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                  <p
                    className={cn(
                      'text-xl font-semibold tabular-nums tracking-tight text-foreground',
                      isNegative && 'text-destructive',
                    )}
                  >
                    {summaryQuery.isLoading
                      ? '—'
                      : card.value == null
                        ? '—'
                        : `${card.value.toFixed(2)}h`}
                  </p>
                  {card.highlight ? (
                    <p className="text-xs text-muted-foreground">
                      {isNegative ? 'Over contracted hours' : 'Contracted hours still to fill'}
                    </p>
                  ) : null}
                </ContentCard>
              )
            })}
          </div>

          {/* Visits table */}
          <ContentCard className="overflow-hidden p-0">
            {listQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                <p className="text-sm text-muted-foreground">Loading special visits…</p>
              </div>
            ) : listQuery.isError ? (
              <p className="p-4 text-sm text-destructive">Could not load special visits.</p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No special visits recorded for this week. Use “Add special visit” to fill remaining
                contracted hours.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/95">
                    <tr className="border-b border-border">
                      {['Service user', 'Title', 'Time', 'Duration (hours)', 'Notes', 'Actions'].map(
                        label => (
                          <th
                            key={label}
                            className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground"
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr
                        key={row.id}
                        className="border-b border-border align-top last:border-0 hover:bg-muted/20"
                        data-testid={`special-visit-row-${row.id}`}
                      >
                        <td className="px-3 py-2.5 font-medium text-foreground">
                          {row.serviceUserName}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">{row.title}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                          {formatVisitTime(row.startDateTime, row.endDateTime)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {row.hours.toFixed(2)}
                        </td>
                        <td className="max-w-[16rem] px-3 py-2.5">
                          <span className="block truncate" title={row.notes ?? ''}>
                            {row.notes ?? '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {confirmDeleteId === row.id ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(row.id)}
                            >
                              Confirm?
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeleteId(row.id)}
                              data-testid={`special-visit-delete-${row.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>
        </>
      )}

      <SpecialVisitFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        employeeId={employeeId}
        weekStart={weekStart}
        remainingHours={remaining}
      />
    </div>
  )
}
