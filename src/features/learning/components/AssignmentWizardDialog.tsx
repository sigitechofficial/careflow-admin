import * as React from 'react'
import { CalendarClock, GraduationCap, Loader2, Search, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { FormField } from '@/shared/ui/form-field'
import { Combobox } from '@/shared/ui/combobox'
import { Checkbox, Switch } from '@/shared/ui/toggle-controls'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import {
  useBulkCreateLearningAssignments,
  useLearningCourses,
  useLearningSettings,
} from '@/features/learning/hooks/useLearning'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { listAllEmployees } from '@/features/employees/api/employees.api'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import type { BulkLearningAssignmentInput } from '@/features/learning/types/learning.types'
import { LEARNING_DELIVERY_METHOD_OPTIONS } from '@/features/learning/types/learning.types'

import { DateTimeInput } from '@/shared/ui/date-time-input'
type TargetMode = 'employees' | 'roles' | 'locations' | 'workAreas'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TARGETS: Array<{ value: TargetMode; label: string }> = [
  { value: 'employees', label: 'Carers' },
  { value: 'roles', label: 'Job roles' },
  { value: 'locations', label: 'Locations' },
  { value: 'workAreas', label: 'Work areas' },
]

/** Carer roles: the job role name contains "carer" (Carer, Senior Carer). Mirrors the API rule. */
function isCarerRole(name?: string | null) {
  return !!name && /carer/i.test(name)
}

/** datetime-local in organisation time → ISO (fixes the old "treated as UTC" quirk). */
function toIso(value: string): string | undefined {
  if (!value.trim()) return undefined
  return orgDatetimeLocalToIso(value) || undefined
}

/**
 * Assign training in one dialog (16 Nov 2026): course, due date, who, optional per-carer
 * dates, then one button. No steps, no reason field.
 */
export function AssignmentWizardDialog({ open, onOpenChange }: Props) {
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const bulkMut = useBulkCreateLearningAssignments()
  const coursesQuery = useLearningCourses({ limit: 100, status: 'PUBLISHED' })
  const settingsQuery = useLearningSettings()
  const lookupsQuery = useEmployeeLookups(open)
  const employeesQuery = useQuery({
    queryKey: ['learning', 'assignment-wizard-employees', globalLocationId ?? 'all'],
    queryFn: () => listAllEmployees(globalLocationId ? { locationIds: [globalLocationId] } : {}),
    enabled: open,
    staleTime: 60_000,
  })

  const [courseId, setCourseId] = React.useState('')
  const [dueAt, setDueAt] = React.useState('')
  const [mode, setMode] = React.useState<TargetMode>('employees')
  const [search, setSearch] = React.useState('')
  const [selected, setSelected] = React.useState<Record<TargetMode, string[]>>({
    employees: [],
    roles: [],
    locations: [],
    workAreas: [],
  })
  const [ownDates, setOwnDates] = React.useState(false)
  const [dueByEmployee, setDueByEmployee] = React.useState<Record<string, string>>({})
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setCourseId('')
    setDueAt('')
    setMode('employees')
    setSearch('')
    setSelected({ employees: [], roles: [], locations: globalLocationId ? [globalLocationId] : [], workAreas: [] })
    setOwnDates(false)
    setDueByEmployee({})
    setError(null)
  }, [open, globalLocationId])

  const courses = (coursesQuery.data?.rows ?? []).filter(c => c.status === 'PUBLISHED' || !c.status)
  const course = courses.find(c => c.id === courseId)
  const defaultDays = settingsQuery.data?.defaultAssignmentDueDays ?? 14

  // Options for the chosen target type, all as { id, label, hint }.
  const items = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows: Array<{ id: string; label: string; hint?: string }> = []
    if (mode === 'employees') {
      rows = (employeesQuery.data ?? [])
        .filter(e => isCarerRole(e.role?.name))
        .map(e => ({ id: e.id, label: employeeListRowDisplayName(e), hint: e.role?.name ?? undefined }))
    } else if (mode === 'roles') {
      rows = (lookupsQuery.data?.roles ?? []).filter(r => isCarerRole(r.name)).map(r => ({ id: r.id, label: r.name }))
    } else if (mode === 'locations') {
      const locs = lookupsQuery.data?.locations ?? []
      rows = (globalLocationId ? locs.filter(l => l.id === globalLocationId) : locs).map(l => ({ id: l.id, label: l.name }))
    } else {
      rows = (lookupsQuery.data?.workAreas ?? []).map(w => ({ id: w.id, label: w.name }))
    }
    return q ? rows.filter(r => r.label.toLowerCase().includes(q)) : rows
  }, [mode, search, employeesQuery.data, lookupsQuery.data, globalLocationId])

  const loadingList = mode === 'employees' ? employeesQuery.isLoading : lookupsQuery.isLoading
  const chosen = selected[mode]
  const allVisibleChosen = items.length > 0 && items.every(i => chosen.includes(i.id))

  const toggle = (id: string) =>
    setSelected(prev => ({
      ...prev,
      [mode]: prev[mode].includes(id) ? prev[mode].filter(x => x !== id) : [...prev[mode], id],
    }))
  const toggleAllVisible = () =>
    setSelected(prev => ({
      ...prev,
      [mode]: allVisibleChosen
        ? prev[mode].filter(id => !items.some(i => i.id === id))
        : Array.from(new Set([...prev[mode], ...items.map(i => i.id)])),
    }))

  const nameOf = (id: string) => {
    const e = (employeesQuery.data ?? []).find(x => x.id === id)
    return e ? employeeListRowDisplayName(e) : id
  }

  const whoLabel =
    mode === 'employees'
      ? `${chosen.length} ${chosen.length === 1 ? 'carer' : 'carers'}`
      : `${chosen.length} ${TARGETS.find(t => t.value === mode)!.label.toLowerCase()}`
  const dueLabel = dueAt
    ? `due ${formatOrganisationDate(toIso(dueAt) ?? dueAt)}`
    : `due in ${defaultDays} days`

  const submit = async () => {
    if (!courseId) return setError('Choose a course')
    if (chosen.length === 0) return setError(mode === 'employees' ? 'Choose at least one carer' : 'Choose at least one group')
    setError(null)
    const body: BulkLearningAssignmentInput = {
      courseId,
      dueAt: toIso(dueAt),
      employeeIds: mode === 'employees' ? chosen : undefined,
      roleIds: mode === 'roles' ? chosen : undefined,
      locationIds: mode === 'locations' ? chosen : undefined,
      workAreaIds: mode === 'workAreas' ? chosen : undefined,
      employeeDueDates:
        mode === 'employees' && ownDates
          ? chosen
              .filter(id => dueByEmployee[id]?.trim() && dueByEmployee[id] !== dueAt)
              .map(id => ({ employeeId: id, dueAt: toIso(dueByEmployee[id] ?? '')! }))
          : undefined,
    }
    try {
      const result = await bulkMut.mutateAsync(body)
      const skipped = result.skipped?.length ?? 0
      toastSuccess(
        `Assigned to ${result.createdCount} ${result.createdCount === 1 ? 'carer' : 'carers'}` +
          (skipped ? ` (${skipped} already had this course)` : ''),
      )
      onOpenChange(false)
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Could not assign the training'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" data-testid="assign-training-dialog">
        <DialogHeader>
          <DialogTitle>Assign training</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {/* 1. Course + due date */}
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <FormField label="Course" required>
              {coursesQuery.isLoading ? (
                <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
                </div>
              ) : courses.length === 0 ? (
                <p className="text-sm text-destructive">No published courses. Publish a course first.</p>
              ) : (
                <Combobox
                  value={courseId}
                  onChange={setCourseId}
                  options={courses.map(c => ({
                    value: c.id,
                    label: c.title,
                    description: [c.code, LEARNING_DELIVERY_METHOD_OPTIONS.find(o => o.value === c.deliveryMethod)?.label]
                      .filter(Boolean)
                      .join(' · '),
                  }))}
                  placeholder="Choose a course"
                  searchPlaceholder="Search courses…"
                  allowDeselect={false}
                />
              )}
            </FormField>
            <FormField label="Due date" hint={dueAt ? undefined : `Empty = ${defaultDays} days from today`}>
              <DateTimeInput value={dueAt} onChange={e => setDueAt(e.target.value)} />
            </FormField>
          </div>

          {/* 2. Who */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Assign to</p>
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="tablist" aria-label="Assign to">
                {TARGETS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={mode === t.value}
                    onClick={() => {
                      setMode(t.value)
                      setSearch('')
                    }}
                    className={
                      mode === t.value
                        ? 'rounded-md bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm'
                        : 'rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground'
                    }
                  >
                    {t.label}
                    {selected[t.value].length ? ` · ${selected[t.value].length}` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={mode === 'employees' ? 'Search carers…' : 'Search…'}
                  className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  aria-label="Search"
                />
                {items.length ? (
                  <button type="button" onClick={toggleAllVisible} className="text-xs font-medium text-primary hover:underline">
                    {allVisibleChosen ? 'Clear' : 'Select all'}
                  </button>
                ) : null}
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                {loadingList ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {mode === 'employees' ? 'No carers found. Only people with a carer job role are listed.' : 'Nothing found.'}
                  </p>
                ) : (
                  items.map(i => (
                    <label
                      key={i.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <Checkbox checked={chosen.includes(i.id)} onCheckedChange={() => toggle(i.id)} />
                      <span className="flex-1">{i.label}</span>
                      {i.hint ? <span className="text-xs text-muted-foreground">{i.hint}</span> : null}
                    </label>
                  ))
                )}
              </div>
            </div>
            {mode !== 'employees' ? (
              <p className="text-xs text-muted-foreground">
                Everyone with a carer job role in the chosen {TARGETS.find(t => t.value === mode)!.label.toLowerCase()} gets the course.
              </p>
            ) : null}
          </div>

          {/* 3. Own dates (carers only) */}
          {mode === 'employees' && chosen.length > 0 ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={ownDates} onCheckedChange={v => setOwnDates(!!v)} />
                Set a different due date for each carer
              </label>
              {ownDates ? (
                <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {chosen.map(id => (
                    <li key={id} className="flex flex-wrap items-center gap-3 px-3 py-1.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">{nameOf(id)}</span>
                      <DateTimeInput
                       
                        className="h-8 w-56"
                        aria-label={`Due date for ${nameOf(id)}`}
                        value={dueByEmployee[id] || dueAt}
                        onChange={e => setDueByEmployee(prev => ({ ...prev, [id]: e.target.value }))}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter className="flex-wrap items-center gap-2 sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" data-testid="assign-summary">
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" /> {course ? course.title : 'No course chosen'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {whoLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> {ownDates && mode === 'employees' ? 'own dates' : dueLabel}
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={bulkMut.isPending}>
              {bulkMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {mode === 'employees' && chosen.length ? `Assign to ${whoLabel}` : 'Assign'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
