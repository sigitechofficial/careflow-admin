import * as React from 'react'
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import { PayrollInfoHeading } from '@/features/payroll/components/PayrollInfoHeading'
import { PAYROLL_SECTION_GUIDANCE } from '@/features/payroll/data/payroll-section-guidance'
import {
  useCreatePayrollSchedule,
  useDeletePayrollPeriod,
  useDeletePayrollPeriods,
  useGeneratePayrollPeriods,
  usePayrollPeriods,
  usePayrollSchedules,
  usePayrollTaxYears,
  useUpdatePayrollSchedule,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import type { PayrollPayFrequency } from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { StatCard } from '@/shared/ui/card'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { toastWarning } from '@/shared/lib/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'

const FREQUENCIES: PayrollPayFrequency[] = ['WEEKLY', 'FORTNIGHTLY', 'FOUR_WEEKLY', 'MONTHLY']

export default function PayrollSchedulesPage() {
  const canManage = useAuthStore((s) => s.can('payroll.settings.manage'))
  const canPeriods = useAuthStore((s) => s.can('payroll.periods.manage'))
  const { data: schedules = [], isLoading } = usePayrollSchedules()
  const { data: taxYears = [] } = usePayrollTaxYears()
  const [selectedScheduleId, setSelectedScheduleId] = React.useState<string>('')
  const [selectedTaxYearId, setSelectedTaxYearId] = React.useState<string>('')
  const { data: periods = [] } = usePayrollPeriods(
    selectedScheduleId || selectedTaxYearId
      ? {
          scheduleId: selectedScheduleId || undefined,
          taxYearId: selectedTaxYearId || undefined,
        }
      : undefined,
  )
  const createMut = useCreatePayrollSchedule()
  const updateMut = useUpdatePayrollSchedule()
  const generateMut = useGeneratePayrollPeriods()
  const deletePeriodMut = useDeletePayrollPeriod()
  const deletePeriodsMut = useDeletePayrollPeriods()
  const [open, setOpen] = React.useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [frequency, setFrequency] = React.useState<PayrollPayFrequency>('MONTHLY')

  React.useEffect(() => {
    if (schedules.length === 0) {
      if (selectedScheduleId) setSelectedScheduleId('')
      return
    }
    const stillValid = schedules.some((s) => s.id === selectedScheduleId)
    if (!selectedScheduleId || !stillValid) {
      setSelectedScheduleId(schedules[0]!.id)
    }
  }, [schedules, selectedScheduleId])

  React.useEffect(() => {
    if (taxYears.length === 0) {
      if (selectedTaxYearId) setSelectedTaxYearId('')
      return
    }
    const stillValid = taxYears.some((t) => t.id === selectedTaxYearId)
    if (!selectedTaxYearId || !stillValid) {
      const current = taxYears.find((t) => t.isCurrent) ?? taxYears[0]
      if (current) setSelectedTaxYearId(current.id)
    }
  }, [taxYears, selectedTaxYearId])

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) ?? null
  const activeSchedules = schedules.filter((s) => s.status === 'ACTIVE').length
  const openPeriods = periods.filter((p) => p.status === 'OPEN' || p.status === 'IN_RUN').length

  const handleGeneratePeriods = () => {
    if (!selectedSchedule) {
      toastWarning('Select a schedule', 'Choose a pay schedule from the list before generating periods.')
      return
    }
    if (!selectedTaxYearId) {
      toastWarning('Select a tax year', 'Choose a UK tax year before generating periods.')
      return
    }
    if (selectedSchedule.status === 'ARCHIVED') {
      toastWarning('Schedule archived', 'Activate or create another schedule before generating periods.')
      return
    }
    const replaceExisting = periods.length > 0
    if (replaceExisting) {
      const ok = window.confirm(
        'Replace existing periods with full calendar months (1st → last day)? This only works if no UK payroll runs are attached to those periods.',
      )
      if (!ok) return
    }
    generateMut.mutate({
      scheduleId: selectedSchedule.id,
      taxYearId: selectedTaxYearId,
      replaceExisting,
    })
  }

  const handleDeleteAllPeriods = () => {
    if (!selectedScheduleId || !selectedTaxYearId) {
      toastWarning('Select filters', 'Choose a schedule and tax year before deleting periods.')
      return
    }
    deletePeriodsMut.mutate(
      { scheduleId: selectedScheduleId, taxYearId: selectedTaxYearId },
      { onSuccess: () => setDeleteAllOpen(false) },
    )
  }

  const isPeriodMutating =
    generateMut.isPending || deletePeriodMut.isPending || deletePeriodsMut.isPending

  return (
    <PayrollSectionLayout
      title="Schedules & periods"
      description="Define pay frequencies and generate monthly periods (1st → last day of each month) for a tax year. No statutory calculations."
      testId="payroll-schedules-page"
    >
      <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Pay frequencies
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden />
            Calendar months
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            1st → last day
          </span>
        </div>

        {!isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Schedules"
              value={schedules.length}
              icon={<CalendarClock className="h-5 w-5" aria-hidden />}
              tone="emerald"
              tooltip={PAYROLL_SECTION_GUIDANCE.schedules.purpose}
            />
            <StatCard
              label="Active"
              value={activeSchedules}
              icon={<CalendarDays className="h-5 w-5" aria-hidden />}
              tone="sky"
              tooltip={PAYROLL_SECTION_GUIDANCE.activeSchedules.purpose}
            />
            <StatCard
              label="Tax years"
              value={taxYears.length}
              icon={<CalendarRange className="h-5 w-5" aria-hidden />}
              tone="violet"
              tooltip={PAYROLL_SECTION_GUIDANCE.taxYears.purpose}
            />
            <StatCard
              label="Open periods"
              value={openPeriods}
              icon={<Sparkles className="h-5 w-5" aria-hidden />}
              tone="amber"
              tooltip={PAYROLL_SECTION_GUIDANCE.openPeriods.purpose}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Schedule</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
              >
                <option value="">All schedules</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Tax year</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={selectedTaxYearId}
                onChange={(e) => setSelectedTaxYearId(e.target.value)}
              >
                <option value="">All tax years</option>
                {taxYears.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code}
                    {t.isCurrent ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {canPeriods && selectedScheduleId && selectedTaxYearId ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={isPeriodMutating || selectedSchedule?.status === 'ARCHIVED'}
                  onClick={handleGeneratePeriods}
                >
                  <RefreshCw
                    className={cn('h-3.5 w-3.5', generateMut.isPending && 'animate-spin')}
                    aria-hidden
                  />
                  {generateMut.isPending
                    ? periods.length > 0
                      ? 'Regenerating…'
                      : 'Generating…'
                    : periods.length > 0
                      ? 'Regenerate periods'
                      : 'Generate periods'}
                </Button>
                {periods.length > 0 ? (
                  <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        disabled={isPeriodMutating}
                        data-testid="payroll-periods-delete-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Delete periods
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete all filtered periods?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Permanently deletes {periods.length} pay period
                          {periods.length === 1 ? '' : 's'} for the selected schedule and tax year.
                          Blocked if any period still has a UK payroll run — delete those runs
                          first.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletePeriodsMut.isPending}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deletePeriodsMut.isPending}
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeleteAllPeriods()
                          }}
                        >
                          {deletePeriodsMut.isPending ? 'Deleting…' : 'Delete periods'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </>
            ) : null}
            {canManage ? (
              <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add schedule
              </Button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <CalendarClock className="h-4 w-4" aria-hidden />
                </div>
                <PayrollInfoHeading
                  title={PAYROLL_SECTION_GUIDANCE.schedules.title}
                  purpose={PAYROLL_SECTION_GUIDANCE.schedules.purpose}
                  description="Weekly, fortnightly, four-weekly, or monthly (1st → last day)"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/10 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pl-4 pr-3 font-medium">Name</th>
                      <th className="py-2.5 pr-3 font-medium">Code</th>
                      <th className="py-2.5 pr-3 font-medium">Frequency</th>
                      <th className="py-2.5 pr-3 font-medium">Status</th>
                      <th className="py-2.5 pr-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/20',
                          selectedScheduleId === row.id && 'bg-emerald-50/40 dark:bg-emerald-950/15',
                        )}
                        onClick={() => setSelectedScheduleId(row.id)}
                      >
                        <td className="py-3 pl-4 pr-3 font-medium text-foreground">{row.name}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{row.code}</td>
                        <td className="py-3 pr-3">{row.frequency.replace(/_/g, ' ')}</td>
                        <td className="py-3 pr-3">
                          <PayrollStatusBadge status={row.status} />
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {canManage && row.status === 'DRAFT' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={updateMut.isPending}
                              onClick={(event) => {
                                event.stopPropagation()
                                updateMut.mutate({ id: row.id, body: { status: 'ACTIVE' } })
                              }}
                            >
                              Activate
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {selectedScheduleId === row.id ? 'Selected' : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          <CalendarClock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
                          No schedules yet. Add a schedule to start generating periods.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
                  <CalendarRange className="h-4 w-4" aria-hidden />
                </div>
                <PayrollInfoHeading
                  title={PAYROLL_SECTION_GUIDANCE.periods.title}
                  purpose={PAYROLL_SECTION_GUIDANCE.periods.purpose}
                  description="Monthly = 1st to last day of each calendar month · filtered by schedule and tax year above"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/10 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pl-4 pr-3 font-medium">#</th>
                      <th className="py-2.5 pr-3 font-medium">Label</th>
                      <th className="py-2.5 pr-3 font-medium">Period</th>
                      <th className="py-2.5 pr-3 font-medium">Payment</th>
                      <th className="py-2.5 pr-3 font-medium">Status</th>
                      {canPeriods ? (
                        <th className="py-2.5 pr-4 text-right font-medium">Actions</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border/70 transition-colors hover:bg-muted/20"
                      >
                        <td className="py-3 pl-4 pr-3 tabular-nums text-muted-foreground">
                          {p.sequence}
                        </td>
                        <td className="py-3 pr-3 font-medium">{p.label}</td>
                        <td className="py-3 pr-3 tabular-nums">
                          {p.periodStart} – {p.periodEnd}
                        </td>
                        <td className="py-3 pr-3 tabular-nums">{p.paymentDate}</td>
                        <td className="py-3 pr-3">
                          <PayrollStatusBadge status={p.status} />
                        </td>
                        {canPeriods ? (
                          <td className="py-3 pr-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={isPeriodMutating}
                              aria-label={`Delete period ${p.label}`}
                              onClick={() => {
                                const ok = window.confirm(
                                  `Delete period “${p.label}” (${p.periodStart} – ${p.periodEnd})? This fails if a UK payroll run is linked.`,
                                )
                                if (!ok) return
                                deletePeriodMut.mutate(p.id)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              Delete
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                    {periods.length === 0 ? (
                      <tr>
                        <td
                          colSpan={canPeriods ? 6 : 5}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          <CalendarRange className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
                          No periods for the selected filters. Choose a schedule and tax year, then
                          generate.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <CalendarClock className="h-4 w-4" aria-hidden />
              </span>
              Create pay schedule
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Code</span>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Frequency</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PayrollPayFrequency)}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              {frequency === 'MONTHLY' ? (
                <span className="text-xs text-muted-foreground">
                  Monthly periods run from the 1st to the last day of each calendar month.
                </span>
              ) : null}
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMut.isPending || !name.trim() || !code.trim()}
              onClick={() =>
                createMut.mutate(
                  { name, code, frequency },
                  {
                    onSuccess: (created) => {
                      setOpen(false)
                      setName('')
                      setCode('')
                      setFrequency('MONTHLY')
                      if (created?.id) setSelectedScheduleId(created.id)
                    },
                  },
                )
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PayrollSectionLayout>
  )
}
