import * as React from 'react'
import { Plus, Download, Lock } from 'lucide-react'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { MOCK_PAYROLL_RUNS } from '@/features/billing/data/billing-mock.data'
import { PayrollRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'

export function BillingPayrollRunsPanel() {
  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Payroll runs"
        description="Batch carer pay from approved visits including travel, mileage, expenses, premiums, and NMW top-up."
        action={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            New payroll run
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Period</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Carers</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Visit lines</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Gross pay</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">NMW top-up</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Exceptions</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PAYROLL_RUNS.map(row => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5 font-medium">{row.period}</td>
                <td className="px-3 py-2.5">
                  <PayrollRunStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.carers}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.visitLines}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">{row.grossPay}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{row.nmwTopUp}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.exceptions}</td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm">
                      Review
                    </Button>
                    {row.status === 'READY_FOR_REVIEW' && (
                      <Button variant="outline" size="sm" leftIcon={<Lock className="h-3.5 w-3.5" />}>
                        Approve
                      </Button>
                    )}
                    {row.status === 'LOCKED' && (
                      <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>
                        Export
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
