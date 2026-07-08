import * as React from 'react'
import { Download, FileSearch } from 'lucide-react'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { MOCK_AUDIT_EXPORTS } from '@/features/billing/data/billing-mock.data'
import { BillingStatusBadge } from '@/features/billing/components/BillingStatusBadge'

export function BillingAuditExportPanel() {
  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Audit & export"
        description="Finance audit exports, rate change history, payroll and invoice change logs, and visit evidence for inspection."
        action={
          <Button size="sm" leftIcon={<FileSearch className="h-4 w-4" />}>
            New export job
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Export type</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Requested by</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Date range</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_AUDIT_EXPORTS.map(row => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5 font-medium">{row.type}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.requestedBy}</td>
                <td className="px-3 py-2.5">{row.dateRange}</td>
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.createdAt}</td>
                <td className="px-3 py-2.5">
                  <BillingStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2.5">
                  {row.status === 'Completed' && (
                    <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>
                      Download
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Locked finance records use adjustments, credit notes, or debit notes — never silent edits. All manual changes require audit trail.
      </p>
    </div>
  )
}
