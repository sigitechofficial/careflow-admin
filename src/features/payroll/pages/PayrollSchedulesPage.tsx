import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Info,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import { PayrollInfoHeading } from '@/features/payroll/components/PayrollInfoHeading'
import { PAYROLL_SECTION_GUIDANCE } from '@/features/payroll/data/payroll-section-guidance'
import {
  useCreatePayrollSchedule,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { toastWarning } from '@/shared/lib/toast'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'

const FREQUENCIES: PayrollPayFrequency[] = ['WEEKLY', 'FORTNIGHTLY', 'FOUR_WEEKLY', 'MONTHLY']

const STAT_TONES = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
} as const

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  purpose,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone: keyof typeof STAT_TONES
  purpose: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`About ${label}`}
              >
                <Info className="h-3.5 w-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="z-[110] max-w-sm text-left text-xs leading-snug">
              <p className="mb-1 font-medium text-popover-foreground">Purpose</p>
              <p>{purpose}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            STAT_TONES[tone],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

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
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [frequency, setFrequency] = React.useState<PayrollPayFrequency>('MONTHLY')
  const [anchorDay, setAnchorDay] = React.useState(28)

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
    generateMut.mutate({
      scheduleId: selectedSchedule.id,
      taxYearId: selectedTaxYearId,
    })
  }

  return (
    <PayrollSectionLayout
      title="Schedules & periods"
      description="Define pay frequencies and generate calendar periods for a tax year. No statutory calculations."
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
            Tax-year periods
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Generate calendar
          </span>
        </div>

        {!isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              label="Schedules"
              value={schedules.length}
              icon={CalendarClock}
              tone="emerald"
              purpose={PAYROLL_SECTION_GUIDANCE.schedules.purpose}
            />
            <SummaryCard
              label="Active"
              value={activeSchedules}
              icon={CalendarDays}
              tone="sky"
              purpose={PAYROLL_SECTION_GUIDANCE.activeSchedules.purpose}
            />
            <SummaryCard
              label="Tax years"
              value={taxYears.length}
              icon={CalendarRange}
              tone="violet"
              purpose={PAYROLL_SECTION_GUIDANCE.taxYears.purpose}
            />
            <SummaryCard
              label="Open periods"
              value={openPeriods}
              icon={Sparkles}
              tone="amber"
              purpose={PAYROLL_SECTION_GUIDANCE.openPeriods.purpose}
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
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={generateMut.isPending || selectedSchedule?.status === 'ARCHIVED'}
                onClick={handleGeneratePeriods}
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', generateMut.isPending && 'animate-spin')}
                  aria-hidden
                />
                {generateMut.isPending ? 'Generating…' : 'Generate periods'}
              </Button>
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
                  description="Weekly, fortnightly, four-weekly, or monthly calendars"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/10 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pl-4 pr-3 font-medium">Name</th>
                      <th className="py-2.5 pr-3 font-medium">Code</th>
                      <th className="py-2.5 pr-3 font-medium">Frequency</th>
                      <th className="py-2.5 pr-3 font-medium">Anchor</th>
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
                        <td className="py-3 pr-3 tabular-nums">{row.anchorDay}</td>
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
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          <CalendarClock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden />
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
                  description="Filtered by the schedule and tax year above"
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
                      <th className="py-2.5 pr-4 font-medium">Status</th>
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
                        <td className="py-3 pr-4">
                          <PayrollStatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                    {periods.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          <CalendarRange className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden />
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
            <TooltipProvider delayDuration={200}>
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
            </label>
            <label className="block space-y-1 text-sm">
              <PayrollInfoHeading
                title={PAYROLL_SECTION_GUIDANCE.anchorDay.title}
                purpose={PAYROLL_SECTION_GUIDANCE.anchorDay.purpose}
                as="h5"
              />
              <Input
                type="number"
                min={1}
                max={31}
                value={anchorDay}
                onChange={(e) => setAnchorDay(Number(e.target.value) || 1)}
              />
              <span className="text-xs text-muted-foreground">
                Monthly: day of month (1–31; shorter months use the last day). Weekly-style: day
                within the pay cycle.
              </span>
            </label>
            </TooltipProvider>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMut.isPending || !name.trim() || !code.trim()}
              onClick={() =>
                createMut.mutate(
                  { name, code, frequency, anchorDay },
                  {
                    onSuccess: (created) => {
                      setOpen(false)
                      setName('')
                      setCode('')
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
