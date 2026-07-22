import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import {
  useCreateUkPayrollRun,
  usePayrollPeriods,
  useUkPayrollRuns,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

export default function UkPayrollRunsPage() {
  const canManage = useAuthStore((s) => s.can('payroll.runs.manage'))
  const { data = [], isLoading } = useUkPayrollRuns()
  const { data: periods = [] } = usePayrollPeriods()
  const createMut = useCreateUkPayrollRun()
  const [open, setOpen] = React.useState(false)
  const [periodId, setPeriodId] = React.useState('')

  const openPeriods = periods.filter((p) => p.status === 'OPEN' || p.status === 'IN_RUN')

  return (
    <PayrollSectionLayout
      title="UK payroll runs"
      description="Create and manage statutory payroll run shells. Phase 1 does not calculate tax or produce payslips."
      testId="payroll-runs-page"
    >
      <div className="mb-4 flex justify-end">
        {canManage ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            Create run
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Label</th>
                  <th className="py-2 pr-3 font-medium">Period</th>
                  <th className="py-2 pr-3 font-medium">Employees</th>
                  <th className="py-2 pr-3 font-medium">Gross</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Open</th>
                </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-border/70">
                  <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                  <td className="py-2.5 pr-3">
                    {row.period
                      ? `${row.period.periodStart} – ${row.period.periodEnd}`
                      : row.periodId}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{row.employeeCount}</td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {row.grossCalculatedAt != null ? `£${Number(row.totalGross ?? 0).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2.5 pr-3">
                    <PayrollStatusBadge status={row.status} />
                  </td>
                  <td className="py-2.5">
                    <Button asChild size="sm" variant="outline">
                      <Link to={PAYROLL_PATHS.runDetail(row.id)}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-muted-foreground">
                    No UK payroll runs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Create UK payroll run</DialogTitle>
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
