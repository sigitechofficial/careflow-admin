import * as React from 'react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import {
  useActivatePayrollTaxYear,
  useCreatePayrollTaxYear,
  useEnsureUkPayrollTaxYears,
  usePayrollTaxYears,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

function ukTaxYearFromStartYear(startYear: number) {
  const endYear = startYear + 1
  const code = `${startYear}-${String(endYear).slice(-2)}`
  return {
    code,
    label: `Tax year ${code}`,
    startDate: `${startYear}-04-06`,
    endDate: `${endYear}-04-05`,
  }
}

function currentUkTaxYearStartYear(today = new Date()) {
  const y = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()
  const startsThisCalendarYear = month > 3 || (month === 3 && day >= 6)
  return startsThisCalendarYear ? y : y - 1
}

export default function PayrollTaxYearsPage() {
  const canManage = useAuthStore((s) => s.can('payroll.settings.manage'))
  const { data = [], isLoading } = usePayrollTaxYears()
  const createMut = useCreatePayrollTaxYear()
  const activateMut = useActivatePayrollTaxYear()
  const ensureMut = useEnsureUkPayrollTaxYears()
  const [open, setOpen] = React.useState(false)
  const defaults = ukTaxYearFromStartYear(currentUkTaxYearStartYear())
  const [code, setCode] = React.useState(defaults.code)
  const [label, setLabel] = React.useState(defaults.label)
  const [startDate, setStartDate] = React.useState(defaults.startDate)
  const [endDate, setEndDate] = React.useState(defaults.endDate)

  return (
    <PayrollSectionLayout
      title="Tax years"
      description="UK tax years run 6 April to 5 April. Use Add UK tax years to create the standard set, or add one manually."
      testId="payroll-tax-years-page"
    >
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {canManage ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={ensureMut.isPending}
              onClick={() => ensureMut.mutate(undefined)}
            >
              {ensureMut.isPending ? 'Adding…' : 'Add UK tax years'}
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              Add tax year
            </Button>
          </>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Label</th>
                <th className="py-2 pr-3 font-medium">Dates</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-border/70">
                  <td className="py-2.5 pr-3 font-medium">{row.code}</td>
                  <td className="py-2.5 pr-3">
                    {row.label}
                    {row.isCurrent ? (
                      <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {row.startDate} – {row.endDate}
                  </td>
                  <td className="py-2.5 pr-3">
                    <PayrollStatusBadge status={row.status} />
                  </td>
                  <td className="py-2.5">
                    {canManage && !row.isCurrent ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={activateMut.isPending}
                        onClick={() => activateMut.mutate(row.id)}
                      >
                        Activate
                      </Button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-muted-foreground">
                    No tax years yet. Click <span className="font-medium">Add UK tax years</span> to
                    create 2024–25 through 2027–28.
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
            <DialogTitle>Create tax year</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Code</span>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Label</span>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Start date</span>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>End date</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMut.isPending}
              onClick={() =>
                createMut.mutate(
                  { code, label, startDate, endDate },
                  { onSuccess: () => setOpen(false) },
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
