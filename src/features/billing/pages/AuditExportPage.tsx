import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingAuditExportPanel } from '@/features/billing/components/BillingAuditExportPanel'

export default function AuditExportPage() {
  return (
    <BillingSectionLayout
      title="Audit & export"
      description="Download audit trails and finance exports for compliance review."
      testId="billing-audit-export-page"
    >
      <BillingAuditExportPanel />
    </BillingSectionLayout>
  )
}
