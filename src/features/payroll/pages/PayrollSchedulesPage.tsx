import * as React from 'react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import {
  useCreatePayrollSchedule,
  useGeneratePayrollPeriods,
  usePayrollPeriods,
  usePayrollSchedules,
  usePayrollTaxYears,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import type { PayrollPayFrequency } from '@/features/payroll/types/payroll.types'
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
  const generateMut = useGeneratePayrollPeriods()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [frequency, setFrequency] = React.useState<PayrollPayFrequency>('MONTHLY')
  const [anchorDay, setAnchorDay] = React.useState(28)

  React.useEffect(() => {
    if (!selectedScheduleId && schedules[0]) setSelectedScheduleId(schedules[0].id)
  }, [schedules, selectedScheduleId])

  React.useEffect(() => {
    const current = taxYears.find((t) => t.isCurrent) ?? taxYears[0]
    if (!selectedTaxYearId && current) setSelectedTaxYearId(current.id)
  }, [taxYears, selectedTaxYearId])

  return (
    <PayrollSectionLayout
      title="Schedules & periods"
      description="Define pay frequencies and generate calendar periods for a tax year. No statutory calculations."
      testId="payroll-schedules-page"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
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
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={selectedTaxYearId}
            onChange={(e) => setSelectedTaxYearId(e.target.value)}
          >
            <option value="">All tax years</option>
            {taxYears.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPeriods && selectedScheduleId && selectedTaxYearId ? (
            <Button
              size="sm"
              variant="outline"
              disabled={generateMut.isPending}
              onClick={() =>
                generateMut.mutate({
                  scheduleId: selectedScheduleId,
                  taxYearId: selectedTaxYearId,
                })
              }
            >
              Generate periods
            </Button>
          ) : null}
          {canManage ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              Add schedule
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Frequency</th>
                  <th className="py-2 pr-3 font-medium">Anchor</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((row) => (
                  <tr key={row.id} className="border-b border-border/70">
                    <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                    <td className="py-2.5 pr-3">{row.code}</td>
                    <td className="py-2.5 pr-3">{row.frequency.replaceAll('_', ' ')}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{row.anchorDay}</td>
                    <td className="py-2.5">
                      <PayrollStatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-muted-foreground">
                      No schedules yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Periods</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Label</th>
                    <th className="py-2 pr-3 font-medium">Period</th>
                    <th className="py-2 pr-3 font-medium">Payment</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id} className="border-b border-border/70">
                      <td className="py-2.5 pr-3 tabular-nums">{p.sequence}</td>
                      <td className="py-2.5 pr-3">{p.label}</td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {p.periodStart} – {p.periodEnd}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{p.paymentDate}</td>
                      <td className="py-2.5">
                        <PayrollStatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-muted-foreground">
                        No periods for the selected filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Create pay schedule</DialogTitle>
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
                    {f.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Anchor day</span>
              <Input
                type="number"
                min={1}
                max={28}
                value={anchorDay}
                onChange={(e) => setAnchorDay(Number(e.target.value) || 1)}
              />
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
                  { name, code, frequency, anchorDay },
                  {
                    onSuccess: () => {
                      setOpen(false)
                      setName('')
                      setCode('')
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
