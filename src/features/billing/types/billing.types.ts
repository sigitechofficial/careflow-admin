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
  | 'REQUIRES_MANAGER_APPROVAL'

export type ExceptionSeverity = 'low' | 'medium' | 'high'

export type TemplateType = 'PDF' | 'XLSX' | 'CSV' | 'XML' | 'JSON' | 'API'

export type ExportStatus =
  | 'TEMPLATE_MISSING'
  | 'TEMPLATE_VALIDATION_FAILED'
  | 'READY_TO_RENDER'
  | 'RENDERED'
  | 'EXPORTED'
  | 'SENT'
  | 'REJECTED_BY_FUNDER'
