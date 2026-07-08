import * as React from 'react'
import { Plus } from 'lucide-react'
import { ContentSectionHeader, ContentCard } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { MOCK_AGED_DEBT, MOCK_PAYMENTS } from '@/features/billing/data/billing-mock.data'
import { BillingStatusBadge } from '@/features/billing/components/BillingStatusBadge'

export function BillingPaymentsPanel() {
  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Payments & remittance"
        description="Track invoices due, payments received, partial matches, remittance batches, and aged debt."
        action={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Record payment
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {MOCK_AGED_DEBT.map(bucket => (
          <ContentCard key={bucket.bucket} className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{bucket.bucket}</p>
            <p className="text-lg font-semibold tabular-nums">{bucket.amount}</p>
            <p className="text-xs text-muted-foreground">{bucket.count} invoices</p>
          </ContentCard>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Reference</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Received</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Matched</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Unmatched</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PAYMENTS.map(row => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5 font-mono text-xs">{row.reference}</td>
                <td className="px-3 py-2.5">{row.type}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">{row.amount}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.received}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.matched}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.unmatched}</td>
                <td className="px-3 py-2.5">
                  <BillingStatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
