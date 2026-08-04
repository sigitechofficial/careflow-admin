import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import { PayrollInfoHeading } from '@/features/payroll/components/PayrollInfoHeading'
import { PAYROLL_SECTION_GUIDANCE } from '@/features/payroll/data/payroll-section-guidance'
import {
  useCreateUkPayrollRun,
  useDeleteAllUkPayrollRuns,
  usePayrollPeriods,
  useReactivateUkPayrollRun,
  useUkPayrollRuns,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'
import { Button } from '@/shared/ui/button'
import { StatCard } from '@/shared/ui/card'
import { TooltipProvider } from '@/shared/ui/tooltip'
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

function formatGbp(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

export default function UkPayrollRunsPage() {
  const canManage = useAuthStore((s) => s.can('payroll.runs.manage'))
  const { data = [], isLoading } = useUkPayrollRuns()
  const { data: periods = [] } = usePayrollPeriods()
  const createMut = useCreateUkPayrollRun()
  const deleteAllMut = useDeleteAllUkPayrollRuns()
  const reactivateMut = useReactivateUkPayrollRun()
  const [open, setOpen] = React.useState(false)
  const [periodId, setPeriodId] = React.useState('')
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const openPeriods = periods.filter((p) => p.status === 'OPEN' || p.status === 'IN_RUN')
  const closedPeriods = periods.filter((p) => p.status === 'CLOSED')
  const openRuns = data.filter(
    (r) =>
      r.status === 'DRAFT' ||
      r.status === 'EMPLOYEES_ENROLLED' ||
      r.status === 'GROSS_CALCULATED' ||
      r.status === 'STATUTORY_CALCULATED',
  ).length
  const closedRuns = data.filter((r) => r.status === 'CLOSED').length
  const cancelledRuns = data.filter((r) => r.status === 'CANCELLED').length
  const canCleanup =
    canManage && (data.length > 0 || closedPeriods.length > 0 || periods.some((p) => p.status === 'IN_RUN'))

  const handleDeleteAll = () => {
    deleteAllMut.mutate(undefined, {
      onSuccess: () => setDeleteOpen(false),
    })
  }

  return (
    <PayrollSectionLayout
      title="UK payroll runs"
      description="Create runs for a pay period, calculate gross and tax & NI, then close. Reactivate closed or cancelled runs to continue."
      testId="payroll-runs-page"
    >
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Wallet className="h-3.5 w-3.5" aria-hidden />
              Gross → tax &amp; NI
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Enrol ready carers
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reactivate closed runs
            </span>
          </div>

          {!isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Total runs"
                value={data.length}
                icon={<Wallet className="h-5 w-5" aria-hidden />}
                tone="sky"
                tooltip={PAYROLL_SECTION_GUIDANCE.runs.purpose}
              />
              <StatCard
                label="Open"
                value={openRuns}
                icon={<Users className="h-5 w-5" aria-hidden />}
                tone="emerald"
                tooltip="Runs still in progress (draft through statutory calculated). Open a run to enrol, calculate, or close."
              />
              <StatCard
                label="Closed"
                value={closedRuns}
                icon={<Wallet className="h-5 w-5" aria-hidden />}
                tone="amber"
                tooltip="Finished runs. Use Reactivate to reopen for recalculation if no other open run exists for that period."
              />
              <StatCard
                label="Cancelled"
                value={cancelledRuns}
                icon={<RotateCcw className="h-5 w-5" aria-hidden />}
                tone="rose"
                tooltip="Cancelled runs. Reactivate restores the prior working status so you can continue payroll for that period."
              />
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <Wallet className="h-4 w-4" aria-hidden />
                </div>
                <PayrollInfoHeading
                  title={PAYROLL_SECTION_GUIDANCE.runs.title}
                  purpose={PAYROLL_SECTION_GUIDANCE.runs.purpose}
                  description="One run per pay period — view detail to calculate, or reactivate closed/cancelled runs"
                />
              </div>
              {canManage ? (
                <div className="flex flex-wrap items-center gap-2">
                  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        disabled={deleteAllMut.isPending || !canCleanup}
                        data-testid="payroll-runs-delete-all"
                      >
                        {deleteAllMut.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {data.length === 0 && closedPeriods.length > 0
                          ? 'Reopen periods'
                          : 'Delete all runs'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {data.length === 0
                            ? 'Reopen closed pay periods?'
                            : 'Delete all UK payroll runs?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {data.length === 0 ? (
                            <>
                              No runs left, but {closedPeriods.length} period
                              {closedPeriods.length === 1 ? ' is' : 's are'} still marked closed
                              (e.g. August). This reopens them so they appear in Create run again.
                            </>
                          ) : (
                            <>
                              Permanently deletes all UK payroll runs ({data.length}), enrolled
                              employees, and gross/tax calculations. Linked employee payout batches
                              are also removed (Bank paid resets). Closed/in-run pay periods are
                              reopened so you can create runs again. Tax years, schedules, and
                              employee payroll profiles are kept.
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteAllMut.isPending}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deleteAllMut.isPending}
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeleteAll()
                          }}
                        >
                          {deleteAllMut.isPending
                            ? 'Working…'
                            : data.length === 0
                              ? 'Reopen periods'
                              : 'Delete all runs'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Create run
                  </Button>
                </div>
              ) : null}
            </div>

            {isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/10 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pl-4 pr-3 font-medium">Label</th>
                      <th className="py-2.5 pr-3 font-medium">Period</th>
                      <th className="py-2.5 pr-3 font-medium">Employees</th>
                      <th className="py-2.5 pr-3 font-medium">Gross</th>
                      <th className="py-2.5 pr-3 font-medium">Status</th>
                      <th className="py-2.5 pr-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => {
                      const canReactivate =
                        canManage && (row.status === 'CLOSED' || row.status === 'CANCELLED')
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-border/70 transition-colors hover:bg-muted/20"
                        >
                          <td className="py-3 pl-4 pr-3 font-medium text-foreground">{row.label}</td>
                          <td className="py-3 pr-3 text-muted-foreground">
                            {row.period
                              ? `${row.period.periodStart} – ${row.period.periodEnd}`
                              : row.periodId}
                          </td>
                          <td className="py-3 pr-3 tabular-nums">{row.employeeCount}</td>
                          <td className="py-3 pr-3 tabular-nums">
                            {row.grossCalculatedAt != null
                              ? formatGbp(Number(row.totalGross ?? 0))
                              : '—'}
                          </td>
                          <td className="py-3 pr-3">
                            <PayrollStatusBadge status={row.status} />
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canReactivate ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="gap-1.5"
                                  disabled={reactivateMut.isPending}
                                  onClick={() => reactivateMut.mutate(row.id)}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                                  Reactivate
                                </Button>
                              ) : null}
                              <Button asChild size="sm" variant="outline">
                                <Link to={PAYROLL_PATHS.runDetail(row.id)}>View</Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden />
                          No UK payroll runs yet. Create a run after generating periods.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <Wallet className="h-4 w-4" aria-hidden />
              </span>
              Create UK payroll run
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Pay period</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              >
                <option value="">Select period</option>
                {openPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.periodStart} – {p.periodEnd})
                  </option>
                ))}
              </select>
              {openPeriods.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {closedPeriods.length > 0
                    ? 'No open periods. Use Reopen periods first (closed after deleting runs).'
                    : 'No open periods. Generate periods from UK Payroll schedules first.'}
                </p>
              ) : null}
            </label>
            {openPeriods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Generate periods under Schedules before creating a run.
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!periodId || createMut.isPending}
              onClick={() =>
                createMut.mutate(
                  { periodId },
                  {
                    onSuccess: () => {
                      setOpen(false)
                      setPeriodId('')
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
