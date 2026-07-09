export type BillingTabId =
  | 'dashboard'
  | 'pay-cards'
  | 'charge-cards'
  | 'funding-contracts'
  | 'invoice-templates'
  | 'visit-reconciliation'
  | 'payroll-runs'
  | 'invoice-runs'
  | 'payments'
  | 'audit-export'

export type RateCardStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SCHEDULED'
  | 'EXPIRED'
  | 'ARCHIVED'
  | 'SUSPENDED'
  | 'REPLACED'
export type RateCardKind = 'carer_pay' | 'invoice_charge'

export type InvoiceRunStatus =
  | 'DRAFT'
  | 'CALCULATING'
  | 'EXCEPTION_FOUND'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'LOCKED'
  | 'SENT'
  | 'PART_PAID'
  | 'PAID'
  | 'DISPUTED'

export type PayrollRunStatus =
  | 'DRAFT'
  | 'CALCULATING'
  | 'EXCEPTION_FOUND'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'LOCKED'
  | 'EXPORTED'

export type VisitReconciliationStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED_FOR_PAY'
  | 'APPROVED_FOR_INVOICE'
  | 'APPROVED_FOR_BOTH'
  | 'REJECTED_FOR_PAY'
  | 'REJECTED_FOR_INVOICE'
  | 'REQUIRES_MANAGER_APPROVAL'
  | 'LOCKED'

export type ExceptionSeverity = 'low' | 'medium' | 'high'

export type TemplateType = 'PDF' | 'XLSX' | 'CSV' | 'XML' | 'JSON' | 'API'

export type ExportStatus =
  | 'NOT_STARTED'
  | 'TEMPLATE_MISSING'
  | 'TEMPLATE_VALIDATION_FAILED'
  | 'READY_TO_RENDER'
  | 'RENDERED'
  | 'EXPORTED'
  | 'SENT'
  | 'REJECTED_BY_FUNDER'

export type PaymentType =
  | 'COUNCIL_REMITTANCE'
  | 'BANK_TRANSFER'
  | 'DIRECT_DEBIT'
  | 'CARD'
  | 'OTHER'

export type PaymentRecordStatus = 'RECEIVED' | 'FAILED' | 'REFUNDED'

export type PaymentMatchStatus = 'UNMATCHED' | 'PARTIALLY_MATCHED' | 'FULLY_MATCHED'
