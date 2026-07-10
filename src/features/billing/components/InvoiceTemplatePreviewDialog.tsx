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
  layoutPresetLabel,
  type InvoiceTemplate,
} from '@/features/billing/types/invoice-templates.types'
import { formatBillingLabel } from '@/features/billing/components/BillingStatusBadge'
import {
  InvoiceBrandedFooter,
  InvoiceBrandedHeader,
} from '@/features/billing/components/InvoiceBrandedDocument'
import {
  useInvoiceOrganisation,
  type InvoiceOrganisation,
} from '@/features/billing/hooks/useInvoiceOrganisation'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: InvoiceTemplate | null
}

const SAMPLE_VALUES: Record<string, string> = {
  PROVIDER_NAME: 'Sunrise Home Care Ltd',
  PROVIDER_ADDRESS: '12 Care House, High Street, London, SW1A 1AA',
  PROVIDER_PHONE: '020 7946 0958',
  PROVIDER_EMAIL: 'finance@sunrisehomecare.example',
  PROVIDER_VAT_NUMBER: 'GB 123 4567 89',
  PROVIDER_COMPANY_NUMBER: '12345678',
  INVOICE_NUMBER: 'INV-2026-0142',
  INVOICE_DATE: '10/07/2026',
  INVOICE_PERIOD_START: '30/06/2026',
  INVOICE_PERIOD_END: '06/07/2026',
  INVOICE_DUE_DATE: '09/08/2026',
  SERVICE_USER_FULL_NAME: 'Margaret Hughes',
  SERVICE_USER_NUMBER: 'SU-10284',
  SERVICE_USER_DOB: '12/03/1948',
  SERVICE_USER_NHS_NUMBER: '943 476 5919',
  SERVICE_USER_FUNDER_REF: 'LA-REF-4412',
  FUNDING_REFERENCE: 'PKG-LA-88421',
  PACKAGE_NAME: 'Homecare Package A',
  PO_NUMBER: 'PO-LCC-2026-4412',
  CONTRACT_REFERENCE: 'CON-LCC-2026-88',
  COST_CENTRE: 'CC-DOM-01',
  VISIT_DATE: '06/07/2026',
  VISIT_START_TIME: '09:00',
  VISIT_END_TIME: '09:30',
  VISIT_DURATION_UNITS: '0.50',
  SERVICE_CODE: 'HC-PERS',
  SERVICE_TYPE: 'Personal care',
  RATE_AMOUNT: '£22.50',
  LINE_TOTAL: '£11.25',
  SUBTOTAL: '£156.75',
  VAT_AMOUNT: '£0.00',
  INVOICE_TOTAL: '£156.75',
  BILLING_CONTACT_NAME: 'Finance Team — London Council',
  BILLING_CONTACT_EMAIL: 'invoices@londoncouncil.example',
  BILL_TO_ADDRESS: 'Civic Centre, London, SW1A 1AA',
  PAYMENT_TERMS: '30 days from invoice date',
  FUNDER_NAME: 'London Council',
  REMITTANCE_NOTE: 'Please quote invoice number on payment. BACS: Sort 12-34-56, Acc 12345678.',
}

const VISIT_LINE_KEYS = new Set([
  'VISIT_DATE',
  'VISIT_START_TIME',
  'VISIT_END_TIME',
  'VISIT_DURATION_UNITS',
  'SERVICE_CODE',
  'SERVICE_TYPE',
  'RATE_AMOUNT',
  'LINE_TOTAL',
])

const SAMPLE_LINE_ITEMS = [
  {
    service: 'Personal care',
    description: '06/07/2026 · 09:00 – 09:30',
    qty: '0.50',
    rate: '£22.50',
    amount: '£11.25',
  },
  {
    service: 'Domestic support',
    description: '07/07/2026 · 14:00 – 15:00',
    qty: '1.00',
    rate: '£18.00',
    amount: '£18.00',
  },
  {
    service: 'Medication support',
    description: '08/07/2026 · 08:00 – 08:15',
    qty: '0.25',
    rate: '£22.50',
    amount: '£5.63',
  },
]

function sampleValue(key: string, org?: InvoiceOrganisation): string {
  if (org) {
    switch (key) {
      case 'PROVIDER_NAME':
        return org.companyName || '—'
      case 'PROVIDER_PHONE':
        return org.phone || '—'
      case 'PROVIDER_EMAIL':
        return org.email || '—'
      case 'PROVIDER_VAT_NUMBER':
        return org.vatNumber || '—'
      case 'PROVIDER_COMPANY_NUMBER':
        return org.companyNumber || '—'
      default:
        break
    }
  }
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

function headerFields(template: InvoiceTemplate) {
  return template.fields.filter(f => !VISIT_LINE_KEYS.has(f.systemFieldKey))
}

function billToName(template: InvoiceTemplate): string {
  if (template.layoutPreset === 'PRIVATE_CLIENT') {
    return sampleValue('BILLING_CONTACT_NAME')
  }
  return sampleValue('FUNDER_NAME')
}

function billToAddressLines(): string[] {
  return sampleValue('BILL_TO_ADDRESS').split(',').map(part => part.trim())
}

type PdfInvoicePreviewProps = {
  template: InvoiceTemplate
  isPrivate: boolean
  org: InvoiceOrganisation
}

function PdfInvoicePreview({ template, isPrivate, org }: PdfInvoicePreviewProps) {
  const billToLines = billToAddressLines()
  const hasVisitLines = template.fields.some(f => VISIT_LINE_KEYS.has(f.systemFieldKey))

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white text-foreground shadow-sm">
      <InvoiceBrandedHeader org={org} />

      <div className="grid gap-8 border-b-2 border-primary px-8 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Invoice details</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">Invoice #</dt>
              <dd>{sampleValue('INVOICE_NUMBER')}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">Date of issue</dt>
              <dd>{sampleValue('INVOICE_DATE')}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">Due date</dt>
              <dd>{sampleValue('INVOICE_DUE_DATE')}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">Period</dt>
              <dd>
                {sampleValue('INVOICE_PERIOD_START')} – {sampleValue('INVOICE_PERIOD_END')}
              </dd>
            </div>
            {template.layoutPreset === 'NHS' ? (
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 font-semibold">NHS no.</dt>
                <dd>{sampleValue('SERVICE_USER_NHS_NUMBER')}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Bill to</p>
          <div className="mt-3 text-sm leading-relaxed">
            <p className="font-bold uppercase">{billToName(template)}</p>
            {billToLines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-3 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</p>
            <p className="mt-1 font-semibold">{sampleValue('SERVICE_USER_FULL_NAME')}</p>
            <p className="text-muted-foreground">
              {sampleValue('SERVICE_USER_NUMBER')}
              {sampleValue('SERVICE_USER_FUNDER_REF') !== '—'
                ? ` · Ref ${sampleValue('SERVICE_USER_FUNDER_REF')}`
                : ''}
            </p>
            {sampleValue('PO_NUMBER') !== '—' ? (
              <p className="text-muted-foreground">PO: {sampleValue('PO_NUMBER')}</p>
            ) : null}
          </div>
        </div>
      </div>

      {hasVisitLines ? (
        <div className="px-8 py-5">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-primary text-left text-xs font-bold uppercase tracking-wide">
                <th className="pb-3 pr-4">Item / service</th>
                <th className="pb-3 pr-4">Description</th>
                <th className="pb-3 pr-4 text-right">Qty / hrs</th>
                <th className="pb-3 pr-4 text-right">Rate</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_LINE_ITEMS.map((row, index) => (
                <tr key={index} className="border-b border-border/80">
                  <td className="py-3 pr-4 align-top font-semibold">{row.service}</td>
                  <td className="py-3 pr-4 align-top text-muted-foreground">{row.description}</td>
                  <td className="py-3 pr-4 align-top text-right tabular-nums">{row.qty}</td>
                  <td className="py-3 pr-4 align-top text-right tabular-nums">{row.rate}</td>
                  <td className="py-3 align-top text-right font-medium tabular-nums">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="grid gap-8 px-8 pb-6 pt-2 sm:grid-cols-2">
        <div className="space-y-5 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Terms</p>
            <p className="mt-2 text-muted-foreground">{sampleValue('PAYMENT_TERMS')}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Conditions / instructions</p>
            <p className="mt-2 text-muted-foreground">
              {isPrivate
                ? sampleValue('REMITTANCE_NOTE')
                : `Care services for ${sampleValue('SERVICE_USER_FULL_NAME')} during the billing period stated above.`}
            </p>
          </div>
        </div>
        <div className="sm:justify-self-end">
          <dl className="min-w-[240px] space-y-2 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="font-semibold">Subtotal</dt>
              <dd className="tabular-nums">{sampleValue('SUBTOTAL')}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="font-semibold">Discount</dt>
              <dd className="tabular-nums">—</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="font-semibold">VAT</dt>
              <dd className="tabular-nums">{sampleValue('VAT_AMOUNT')}</dd>
            </div>
            <div className="flex justify-between gap-6 border-t-2 border-primary pt-3 text-lg font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{sampleValue('INVOICE_TOTAL')}</dd>
            </div>
          </dl>
        </div>
      </div>

      <InvoiceBrandedFooter org={org} />
    </div>
  )
}

export function InvoiceTemplatePreviewDialog({ open, onOpenChange, template }: Props) {
  const org = useInvoiceOrganisation(open)
  const fields = React.useMemo(
    () => [...(template?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [template],
  )

  if (!template) return null

  const isSpreadsheetExport =
    template.templateType === 'XLSX' || template.templateType === 'CSV'
  const metaFields = headerFields(template)
  const isLa = template.layoutPreset === 'LOCAL_AUTHORITY'
  const isPrivate = template.layoutPreset === 'PRIVATE_CLIENT'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Invoice design preview</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[80vh] space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{template.name}</span>
            <Badge variant="outline" size="sm">
              {layoutPresetLabel(template.layoutPreset)}
            </Badge>
            <Badge variant="outline" size="sm">
              {template.templateType}
            </Badge>
            <Badge variant="secondary" size="sm">
              v{template.version}
            </Badge>
            <span className="text-muted-foreground">{formatInvoiceTemplateScope(template)}</span>
          </div>

          <p className="text-xs text-muted-foreground">
            Provider name and logo are loaded from Settings → Company. Other values are sample
            placeholders — not live invoice data.
          </p>

          {!isSpreadsheetExport ? (
            <PdfInvoicePreview template={template} isPrivate={isPrivate} org={org} />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-white text-foreground shadow-sm dark:bg-card">
              <InvoiceBrandedHeader org={org} />
              <div className="space-y-4 p-6">
                <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  {isLa
                    ? 'Council upload sheet — Excel column layout for LA commissioning portals. The branded header is included on exported files.'
                    : 'Spreadsheet export preview'}
                </div>
                {fields.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No columns mapped.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b-2 border-primary bg-primary/5 text-left text-xs font-bold uppercase tracking-wide">
                          {fields.map(field => (
                            <th key={field.systemFieldKey} className="border border-border px-2 py-2">
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[0, 1, 2].map(rowIndex => (
                          <tr key={rowIndex}>
                            {fields.map(field => (
                              <td key={field.systemFieldKey} className="border border-border px-2 py-1.5">
                                {rowIndex === 1 && field.systemFieldKey === 'VISIT_DATE'
                                  ? '07/07/2026'
                                  : rowIndex === 2 && field.systemFieldKey === 'LINE_TOTAL'
                                    ? '£22.50'
                                    : sampleValue(field.systemFieldKey, org)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <InvoiceBrandedFooter org={org} />
            </div>
          )}

          {template.includeRemittance && isPrivate ? (
            <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-5">
              <p className="text-center text-sm font-bold uppercase tracking-wide text-primary">
                Remittance advice
              </p>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Provider:</span>{' '}
                  {sampleValue('PROVIDER_NAME', org)}
                </p>
                <p>
                  <span className="text-muted-foreground">Invoice:</span>{' '}
                  {sampleValue('INVOICE_NUMBER')}
                </p>
                <p>
                  <span className="text-muted-foreground">Client:</span>{' '}
                  {sampleValue('SERVICE_USER_FULL_NAME')}
                </p>
                <p>
                  <span className="text-muted-foreground">Amount:</span>{' '}
                  {sampleValue('INVOICE_TOTAL')}
                </p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{sampleValue('REMITTANCE_NOTE')}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
            <span>
              {formatBillingLabel(template.billingFrequency)} · {template.groupingRule ?? '—'}
            </span>
            <span className="font-mono">File: {previewFileName(template)}</span>
          </div>

          {metaFields.length > 0 && !isSpreadsheetExport ? (
            <details className="rounded-lg border border-border px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium text-foreground">
                Mapped header fields ({metaFields.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {metaFields.map(field => (
                  <li key={field.systemFieldKey}>
                    {field.label} → {sampleValue(field.systemFieldKey, org)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
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
