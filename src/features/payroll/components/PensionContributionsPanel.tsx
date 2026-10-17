import { usePensionContributions } from '@/features/payroll/hooks/usePayroll'
import { Button } from '@/shared/ui/button'

const gbp = (n: number | undefined) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n ?? 0)

/**
 * Loan / pension completion (implemented, unverified): provider-independent pension contribution
 * file and its reconciliation for one run, from the stored payroll figures. Nothing is paid or sent
 * to a provider.
 */
export function PensionContributionsPanel({ runId }: { runId: string }) {
  const { data, isLoading } = usePensionContributions(runId)
  if (isLoading || !data || !data.lines.length) return null
  const download = () => {
    const blob = new Blob([data.csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pension-contributions-${data.runLabel.replace(/[^a-z0-9]+/gi, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <section className="mt-6 space-y-2 rounded-md border border-border p-4" data-testid="pension-contributions">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Workplace pension contributions ({data.status.toLowerCase()})</h3>
        <Button size="sm" variant="outline" onClick={download}>
          Download contribution file (CSV)
        </Button>
      </div>
      <p className={data.reconciled ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>
        {data.reconciled
          ? 'Reconciled: each line has a scheme reference and gross less net equals the provider relief.'
          : 'Not reconciled: see the issues on the lines below.'}{' '}
        No payment is made and nothing is sent to a pension provider.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-2 font-medium">Employee</th>
              <th className="py-1 pr-2 font-medium">Scheme</th>
              <th className="py-1 pr-2 text-right font-medium">Qualifying earnings</th>
              <th className="py-1 pr-2 text-right font-medium">Employee gross</th>
              <th className="py-1 pr-2 text-right font-medium">From pay</th>
              <th className="py-1 pr-2 text-right font-medium">Provider relief</th>
              <th className="py-1 pr-2 text-right font-medium">Employer</th>
              <th className="py-1 pr-2 text-right font-medium">Adjustments</th>
              <th className="py-1 pr-2 font-medium">Issues</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l) => (
              <tr key={l.employeeId} className="border-t border-border/70">
                <td className="py-1 pr-2">
                  {l.name || l.employeeId} {l.payrollNumber ? `(${l.payrollNumber})` : ''}
                </td>
                <td className="py-1 pr-2">{l.schemeRef ?? '—'}</td>
                <td className="py-1 pr-2 text-right">{gbp(l.qualifyingEarnings)}</td>
                <td className="py-1 pr-2 text-right">{gbp(l.employeeGross)}</td>
                <td className="py-1 pr-2 text-right">{gbp(l.employeeNet)}</td>
                <td className="py-1 pr-2 text-right">{gbp(l.providerTaxRelief)}</td>
                <td className="py-1 pr-2 text-right">{gbp(l.employer)}</td>
                <td className="py-1 pr-2 text-right">
                  {gbp(l.employeeAdjustment)} / {gbp(l.employerAdjustment)}
                </td>
                <td className="py-1 pr-2">{l.issues.join('; ') || '—'}</td>
              </tr>
            ))}
            <tr className="border-t border-border font-medium">
              <td className="py-1 pr-2">Total ({data.totals.employees})</td>
              <td />
              <td className="py-1 pr-2 text-right">{gbp(data.totals.qualifyingEarnings)}</td>
              <td className="py-1 pr-2 text-right">{gbp(data.totals.employeeGross)}</td>
              <td className="py-1 pr-2 text-right">{gbp(data.totals.employeeNet)}</td>
              <td className="py-1 pr-2 text-right">{gbp(data.totals.providerTaxRelief)}</td>
              <td className="py-1 pr-2 text-right">{gbp(data.totals.employer)}</td>
              <td className="py-1 pr-2 text-right">
                {gbp(data.totals.employeeAdjustment)} / {gbp(data.totals.employerAdjustment)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
