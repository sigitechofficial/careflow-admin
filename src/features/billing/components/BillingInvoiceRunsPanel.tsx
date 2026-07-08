import * as React from 'react'
import { Plus, Send, FileOutput } from 'lucide-react'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { MOCK_INVOICE_RUNS } from '@/features/billing/data/billing-mock.data'
import { ExportStatusBadge, InvoiceRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'

export function BillingInvoiceRunsPanel() {
  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Invoice runs"
        description="Batch service user and funder charges with funding splits, expense recharges, and funder-specific export templates."
        action={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            New invoice run
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Period</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Service users</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Funders</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Net total</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Exceptions</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Export</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICE_RUNS.map(row => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5 font-medium">{row.period}</td>
                <td className="px-3 py-2.5">
                  <InvoiceRunStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.serviceUsers}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.funders}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">{row.netTotal}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.exceptions}</td>
                <td className="px-3 py-2.5">
                  <ExportStatusBadge status={row.exportStatus} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm">
                      Review
                    </Button>
                    <Button variant="outline" size="sm" leftIcon={<FileOutput className="h-3.5 w-3.5" />}>
                      Export
                    </Button>
                    {row.status === 'SENT' && (
                      <Button variant="outline" size="sm" leftIcon={<Send className="h-3.5 w-3.5" />}>
                        Resend
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
