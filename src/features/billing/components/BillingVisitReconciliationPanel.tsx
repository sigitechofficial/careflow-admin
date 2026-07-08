import * as React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { MOCK_VISIT_RECONCILIATION } from '@/features/billing/data/billing-mock.data'
import { BillingExceptionBadge, VisitReconStatusBadge } from '@/features/billing/components/BillingStatusBadge'

export function BillingVisitReconciliationPanel() {
  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Visit reconciliation"
        description="Review completed visits before payroll and invoice calculation. Approve payable time and billable time separately."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Filter exceptions
            </Button>
            <Button size="sm">Bulk approve</Button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Visit</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Service user</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Carer</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Planned</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actual</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Approved payable</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Approved billable</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Exceptions</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_VISIT_RECONCILIATION.map(row => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5">
                  <div className="font-mono text-xs">{row.visitRef}</div>
                  <div className="text-xs text-muted-foreground">{row.date}</div>
                </td>
                <td className="px-3 py-2.5 font-medium">{row.serviceUser}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.carer}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{row.planned}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{row.actual}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-primary">{row.approvedPayable}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-primary">{row.approvedBillable}</td>
                <td className="px-3 py-2.5">
                  {row.exceptions.length === 0 ? (
                    <span className="text-xs text-muted-foreground">None</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {row.exceptions.map(ex => (
                        <BillingExceptionBadge key={ex} code={ex} />
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <VisitReconStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Approve">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Reject">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
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
