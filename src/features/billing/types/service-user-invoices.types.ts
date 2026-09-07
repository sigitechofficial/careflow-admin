import type { ExportStatus, InvoiceRunStatus } from '@/features/billing/types/billing.types'

export type InvoiceRunPaymentStatus = 'UNPAID' | 'PART_PAID' | 'PAID'

export type ServiceUserInvoiceFunderShare = {
  funderId: string | null
  funderName: string
  invoiced: string
  invoicedValue: number
  paid: string
  paidValue: number
  outstanding: string
  outstandingValue: number
  paymentStatus: InvoiceRunPaymentStatus
}

export type ServiceUserInvoiceMonthRow = {
  runId: string
  period: string
  periodStart: string
  periodEnd: string
  status: InvoiceRunStatus
  exportStatus: ExportStatus
  sent: boolean
  sentAt: string | null
  lineCount: number
  subtotal: string
  subtotalValue: number
  runNetTotal: string
  runNetTotalValue: number
  paid: string
  paidValue: number
  outstanding: string
  outstandingValue: number
  paymentStatus: InvoiceRunPaymentStatus
  canRecordPayment: boolean
  funders: ServiceUserInvoiceFunderShare[]
}

export type ServiceUserInvoiceOverviewRow = {
  serviceUserId: string
  serviceUserName: string
  serviceUserNumber: string | null
  invoiceCount: number
  sentCount: number
  pendingCount: number
  totalInvoiced: string
  totalInvoicedValue: number
  lastPeriodEnd: string | null
  months: ServiceUserInvoiceMonthRow[]
}

export type ServiceUserInvoicesOverview = {
  months: string[]
  serviceUsers: ServiceUserInvoiceOverviewRow[]
}
