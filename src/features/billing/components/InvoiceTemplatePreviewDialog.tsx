import * as React from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  formatInvoiceTemplateScope,
  type InvoiceTemplate,
} from '@/features/billing/types/invoice-templates.types'
import { formatBillingLabel } from '@/features/billing/components/BillingStatusBadge'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: InvoiceTemplate | null
}

const SAMPLE_VALUES: Record<string, string> = {
  SERVICE_USER_FULL_NAME: 'Margaret Hughes',
  SERVICE_USER_NUMBER: 'SU-10284',
  SERVICE_USER_DOB: '12/03/1948',
  SERVICE_USER_NHS_NUMBER: '943 476 5919',
  SERVICE_USER_FUNDER_REF: 'LA-REF-4412',
  FUNDING_REFERENCE: 'PKG-LA-88421',
  PACKAGE_NAME: 'Homecare Package A',
  PO_NUMBER: 'PO-LCC-2026-4412',
  VISIT_DATE: '06/07/2026',
  VISIT_START_TIME: '09:00',
  VISIT_END_TIME: '09:30',
  VISIT_DURATION_UNITS: '0.50 hrs',
  SERVICE_CODE: 'HC-PERS',
  SERVICE_TYPE: 'Personal care',
  RATE_AMOUNT: '£22.50',
  LINE_TOTAL: '£11.25',
  BILLING_CONTACT_NAME: 'Finance Team — London Council',
  BILLING_CONTACT_EMAIL: 'invoices@londoncouncil.example',
  BILL_TO_ADDRESS: 'Civic Centre, London, SW1A 1AA',
  PAYMENT_TERMS: '30 days',
  FUNDER_NAME: 'London Council',
}

function sampleValue(key: string): string {
  return SAMPLE_VALUES[key] ?? '—'
}

function previewFileName(template: InvoiceTemplate): string {
  if (template.fileNamePattern?.trim()) {
    return template.fileNamePattern
      .replace(/\{funder\}/gi, template.funder?.code ?? template.code)
      .replace(/\{week\}/gi, '2026-W27')
      .replace(/\{code\}/gi, template.code)
  }
  return `${template.code}-2026-W27.${template.templateType.toLowerCase()}`
}

export function InvoiceTemplatePreviewDialog({ open, onOpenChange, template }: Props) {
  const fields = React.useMemo(
    () => [...(template?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [template],
  )

  if (!template) return null

  const isTabular =
    template.templateType === 'XLSX' ||
    template.templateType === 'CSV' ||
    template.templateType === 'XML' ||
    template.templateType === 'JSON' ||
    template.templateType === 'API'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Invoice design preview</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{template.name}</span>
            <Badge variant="outline" size="sm">
              {template.templateType}
            </Badge>
            <Badge variant="secondary" size="sm">
              v{template.version}
            </Badge>
            <span className="text-muted-foreground">{formatInvoiceTemplateScope(template)}</span>
          </div>

          <p className="text-xs text-muted-foreground">
            Sample layout based on this template’s field mappings. Values are illustrative — not live invoice
            data.
          </p>

          <div className="rounded-xl border border-border bg-white p-5 shadow-sm dark:bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bill to
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {template.funder?.name ?? sampleValue('FUNDER_NAME')}
                </p>
                <p className="text-sm text-muted-foreground">{sampleValue('BILL_TO_ADDRESS')}</p>
                <p className="text-sm text-muted-foreground">{sampleValue('BILLING_CONTACT_EMAIL')}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-foreground">{template.name}</p>
                <p className="text-muted-foreground">Ref: {template.code}</p>
                <p className="text-muted-foreground">
                  Frequency: {formatBillingLabel(template.billingFrequency)}
                </p>
                {template.deliveryMethod ? (
                  <p className="text-muted-foreground">Delivery: {template.deliveryMethod}</p>
                ) : null}
                {template.groupingRule ? (
                  <p className="text-muted-foreground">Grouping: {template.groupingRule}</p>
                ) : null}
              </div>
            </div>

            {fields.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No fields mapped yet. Edit the template and select columns under Field mappings.
              </p>
            ) : isTabular ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {fields.map(field => (
                        <th
                          key={field.systemFieldKey}
                          className="px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground"
                        >
                          {field.label}
                          {field.isRequired ? (
                            <span className="ml-0.5 text-destructive" title="Required">
                              *
                            </span>
                          ) : null}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1].map(rowIndex => (
                      <tr key={rowIndex} className="border-b border-border last:border-0">
                        {fields.map(field => (
                          <td key={field.systemFieldKey} className="px-2.5 py-2 text-foreground">
                            {rowIndex === 1 && field.systemFieldKey === 'VISIT_DATE'
                              ? '07/07/2026'
                              : rowIndex === 1 && field.systemFieldKey === 'LINE_TOTAL'
                                ? '£22.50'
                                : rowIndex === 1 && field.systemFieldKey === 'VISIT_DURATION_UNITS'
                                  ? '1.00 hrs'
                                  : sampleValue(field.systemFieldKey)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {fields.map(field => (
                    <div key={field.systemFieldKey} className="rounded-md border border-border/70 bg-muted/10 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {field.label}
                        {field.isRequired ? <span className="text-destructive"> *</span> : null}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {sampleValue(field.systemFieldKey)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-dashed border-border px-3 py-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Sample line total</span>
                    <span className="font-semibold">{sampleValue('LINE_TOTAL')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Payment terms: {sampleValue('PAYMENT_TERMS')}</span>
              <span className="font-mono">File: {previewFileName(template)}</span>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
