import type {
  ExceptionSeverity,
  ExportStatus,
  InvoiceRunStatus,
  PayrollRunStatus,
  RateCardKind,
  RateCardStatus,
  TemplateType,
  VisitReconciliationStatus,
} from '@/features/billing/types/billing.types'

export const BILLING_DASHBOARD_STATS = {
  visitsReady: 142,
  visitsWithExceptions: 18,
  payrollDrafts: 1,
  invoiceDrafts: 2,
  missingRateCards: 5,
  missingFundingContracts: 3,
  overdueInvoices: 12,
  unmatchedPayments: 4,
}

export const BILLING_EXCEPTION_QUEUE = [
  {
    id: 'ex-1',
    code: 'CHARGE_CARD_MISSING',
    visitRef: 'VIS-L01-20260901-0123',
    serviceUser: 'Margaret Hughes',
    severity: 'high' as ExceptionSeverity,
    message: 'No active charge card for visit date',
  },
  {
    id: 'ex-2',
    code: 'RATE_MISSING',
    visitRef: 'VIS-CROYDON1-20260713-0448',
    serviceUser: 'James Okonkwo',
    severity: 'high' as ExceptionSeverity,
    message: 'Carer pay rate card missing',
  },
  {
    id: 'ex-3',
    code: 'PO_MISSING',
    visitRef: 'VIS-CROYDON1-20260713-0439',
    serviceUser: 'Eleanor Price',
    severity: 'medium' as ExceptionSeverity,
    message: 'Purchase order required for London Council export',
  },
  {
    id: 'ex-4',
    code: 'TEMPLATE_VALIDATION_FAILED',
    visitRef: 'INV-RUN-2026-W27',
    serviceUser: 'Multiple',
    severity: 'medium' as ExceptionSeverity,
    message: 'Service user reference missing for council template',
  },
]

export const MOCK_RATE_CARDS: {
  id: string
  name: string
  code: string
  kind: RateCardKind
  status: RateCardStatus
  assignedTo: string
  effectiveFrom: string
  effectiveTo: string | null
  rulesCount: number
}[] = [
  {
    id: 'rc-1',
    name: 'Standard Carer Pay — London',
    code: 'PAY-LON-2026',
    kind: 'carer_pay',
    status: 'ACTIVE',
    assignedTo: 'Branch: London',
    effectiveFrom: '2026-04-01',
    effectiveTo: null,
    rulesCount: 12,
  },
  {
    id: 'rc-2',
    name: 'Agency Worker Pay',
    code: 'PAY-AGY-2026',
    kind: 'carer_pay',
    status: 'ACTIVE',
    assignedTo: 'Worker type: Agency',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    rulesCount: 8,
  },
  {
    id: 'rc-3',
    name: 'Private Client Charge — Default',
    code: 'CHG-PVT-DEF',
    kind: 'invoice_charge',
    status: 'ACTIVE',
    assignedTo: 'Organisation default',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    rulesCount: 15,
  },
  {
    id: 'rc-4',
    name: 'London Council 2026 Rates',
    code: 'CHG-LA-LON-26',
    kind: 'invoice_charge',
    status: 'ACTIVE',
    assignedTo: 'Funder: London Council',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    rulesCount: 22,
  },
  {
    id: 'rc-5',
    name: 'Complex Care Premium',
    code: 'PAY-CPLX-PREM',
    kind: 'carer_pay',
    status: 'PENDING_APPROVAL',
    assignedTo: 'Premium override',
    effectiveFrom: '2026-07-01',
    effectiveTo: null,
    rulesCount: 3,
  },
]

export const MOCK_CHARGE_CARDS = [
  {
    id: 'cc-1',
    name: 'John Smith — Private rates',
    code: 'SU-JS-2026',
    attachment: 'Service user',
    status: 'ACTIVE' as RateCardStatus,
    billingFrequency: 'Weekly',
    currency: 'GBP',
    effectiveFrom: '2026-01-15',
    rulesSummary: 'Fixed up to 60 min; hourly for longer visits',
  },
  {
    id: 'cc-2',
    name: 'London Council contract',
    code: 'FUNDER-LA-LON',
    attachment: 'Funder',
    status: 'ACTIVE' as RateCardStatus,
    billingFrequency: '4-weekly',
    currency: 'GBP',
    effectiveFrom: '2026-04-01',
    rulesSummary: 'Service-type rates, PO required',
  },
  {
    id: 'cc-3',
    name: 'Reablement package — Week 1-6',
    code: 'PKG-REAB-001',
    attachment: 'Care package',
    status: 'ACTIVE' as RateCardStatus,
    billingFrequency: 'Weekly package',
    currency: 'GBP',
    effectiveFrom: '2026-06-02',
    rulesSummary: 'Non-chargeable assessment visits',
  },
  {
    id: 'cc-4',
    name: 'Family top-up — Okonkwo',
    code: 'TOP-OKO-FAM',
    attachment: 'Funding contract',
    status: 'DRAFT' as RateCardStatus,
    billingFrequency: 'Weekly',
    currency: 'GBP',
    effectiveFrom: '2026-07-14',
    rulesSummary: '30% split after LA cap',
  },
]

export const MOCK_FUNDING_CONTRACTS = [
  {
    id: 'fc-1',
    serviceUser: 'Eleanor Price',
    funders: 'London Council (70%), Family top-up (30%)',
    packageRef: 'PKG-LA-88421',
    poNumber: 'PO-LCC-2026-4412',
    authorisedHours: '35 hrs/week',
    billingContact: 'Mrs A. Price (Appointee)',
    effectiveFrom: '2026-04-01',
    status: 'Active',
  },
  {
    id: 'fc-2',
    serviceUser: 'James Okonkwo',
    funders: 'NHS ICB (complex care)',
    packageRef: 'CHC-OKO-2026',
    poNumber: '—',
    authorisedHours: 'As per CHC plan',
    billingContact: 'ICB Finance Team',
    effectiveFrom: '2026-02-10',
    status: 'Active',
  },
  {
    id: 'fc-3',
    serviceUser: 'Margaret Hughes',
    funders: 'Private (self-funded)',
    packageRef: 'PVT-MH-001',
    poNumber: '—',
    authorisedHours: 'Open',
    billingContact: 'Margaret Hughes',
    effectiveFrom: '2025-11-01',
    status: 'Setup incomplete',
  },
]

export const MOCK_INVOICE_TEMPLATES = [
  {
    id: 'tpl-1',
    funder: 'London Council',
    templateName: 'London Council Excel Template v2',
    templateType: 'XLSX' as TemplateType,
    version: '2.1',
    deliveryMethod: 'Council portal upload',
    grouping: 'One invoice per service user',
    status: 'ACTIVE' as RateCardStatus,
    requiredFields: ['SU Ref', 'PO Number', 'Visit times', 'Service code'],
  },
  {
    id: 'tpl-2',
    funder: 'NHS / ICB',
    templateName: 'CHC CSV Portal Upload',
    templateType: 'CSV' as TemplateType,
    version: '1.4',
    deliveryMethod: 'Secure upload',
    grouping: 'One invoice per care package',
    status: 'ACTIVE' as RateCardStatus,
    requiredFields: ['NHS number', 'Care package ref', 'Units'],
  },
  {
    id: 'tpl-3',
    funder: 'Private family',
    templateName: 'Detailed PDF Invoice',
    templateType: 'PDF' as TemplateType,
    version: '3.0',
    deliveryMethod: 'Email',
    grouping: 'One invoice per billing contact',
    status: 'ACTIVE' as RateCardStatus,
    requiredFields: ['Bill-to address', 'Payment terms'],
  },
]

export const MOCK_VISIT_RECONCILIATION = [
  {
    id: 'vr-1',
    visitRef: 'VIS-L01-20260901-0123',
    serviceUser: 'Margaret Hughes',
    carer: 'Saima Ahmad',
    date: '2026-07-06',
    planned: '09:00–09:30',
    actual: '09:04–09:32',
    approvedPayable: '09:04–09:30',
    approvedBillable: '09:00–09:30',
    status: 'REQUIRES_MANAGER_APPROVAL' as VisitReconciliationStatus,
    exceptions: [
      { code: 'OVERRUN' as const, message: 'Actual duration exceeded planned by 2 minutes' },
      { code: 'CHARGE_CARD_MISSING' as const, message: 'No charge card could be resolved for this service user' },
    ],
  },
  {
    id: 'vr-2',
    visitRef: 'VIS-CROYDON1-20260713-0448',
    serviceUser: 'James Okonkwo',
    carer: 'Ahmad Alam',
    date: '2026-07-06',
    planned: '18:00–19:00',
    actual: '18:00–19:15',
    approvedPayable: '18:00–19:15',
    approvedBillable: '18:00–19:00',
    status: 'APPROVED_FOR_BOTH' as VisitReconciliationStatus,
    exceptions: [],
  },
  {
    id: 'vr-3',
    visitRef: 'VIS-CROYDON1-20260713-0442',
    serviceUser: 'Eleanor Price',
    carer: 'Briana Adjei',
    date: '2026-07-05',
    planned: '07:30–08:00',
    actual: '—',
    approvedPayable: '—',
    approvedBillable: '—',
    status: 'PENDING_REVIEW' as VisitReconciliationStatus,
    exceptions: [
      { code: 'MISSING_CHECK_OUT' as const, message: 'Visit ended without a recorded check-out' },
      { code: 'GPS_MISMATCH' as const, message: 'Check-in location does not match the service user address' },
    ],
  },
]

export const MOCK_PAYROLL_RUNS = [
  {
    id: 'pr-1',
    period: 'Week ending 06 Jul 2026',
    status: 'READY_FOR_REVIEW' as PayrollRunStatus,
    carers: 48,
    visitLines: 312,
    grossPay: '£18,420.50',
    exceptions: 4,
    nmwTopUp: '£126.00',
  },
  {
    id: 'pr-2',
    period: 'Week ending 29 Jun 2026',
    status: 'LOCKED' as PayrollRunStatus,
    carers: 47,
    visitLines: 298,
    grossPay: '£17,890.25',
    exceptions: 0,
    nmwTopUp: '£98.50',
  },
]

export const MOCK_INVOICE_RUNS = [
  {
    id: 'ir-1',
    period: 'Week ending 06 Jul 2026',
    status: 'EXCEPTION_FOUND' as InvoiceRunStatus,
    serviceUsers: 62,
    funders: 8,
    netTotal: '£42,180.00',
    exceptions: 7,
    exportStatus: 'TEMPLATE_VALIDATION_FAILED' as ExportStatus,
  },
  {
    id: 'ir-2',
    period: 'Week ending 29 Jun 2026',
    status: 'SENT' as InvoiceRunStatus,
    serviceUsers: 61,
    funders: 8,
    netTotal: '£41,520.75',
    exceptions: 0,
    exportStatus: 'SENT' as ExportStatus,
  },
]

export const MOCK_PAYMENTS = [
  {
    id: 'pay-1',
    reference: 'REM-LCC-2026-W26',
    type: 'Council remittance',
    amount: '£12,450.00',
    received: '2026-07-03',
    matched: '£11,980.00',
    unmatched: '£470.00',
    status: 'Partial match',
  },
  {
    id: 'pay-2',
    reference: 'BT-PRICE-8842',
    type: 'Family bank transfer',
    amount: '£210.00',
    received: '2026-07-05',
    matched: '£210.00',
    unmatched: '£0.00',
    status: 'Fully matched',
  },
  {
    id: 'pay-3',
    reference: 'DD-HUGHES-001',
    type: 'Direct Debit',
    amount: '£0.00',
    received: '—',
    matched: '—',
    unmatched: '—',
    status: 'Failed',
  },
]

export const MOCK_AGED_DEBT = [
  { bucket: '0–7 days', count: 8, amount: '£3,240.00' },
  { bucket: '8–30 days', count: 5, amount: '£2,180.50' },
  { bucket: '31–60 days', count: 3, amount: '£1,420.00' },
  { bucket: '61–90 days', count: 2, amount: '£890.00' },
  { bucket: '90+ days', count: 1, amount: '£450.00' },
]

export const MOCK_AUDIT_EXPORTS = [
  {
    id: 'ae-1',
    type: 'Invoice change history',
    requestedBy: 'Finance Admin',
    dateRange: '01 Jun – 30 Jun 2026',
    status: 'Completed',
    createdAt: '2026-07-01 14:22',
  },
  {
    id: 'ae-2',
    type: 'Rate card uplift batch',
    requestedBy: 'Branch Manager',
    dateRange: 'Effective 01 Apr 2026',
    status: 'Completed',
    createdAt: '2026-03-28 09:15',
  },
  {
    id: 'ae-3',
    type: 'Visit evidence export',
    requestedBy: 'Quality Lead',
    dateRange: '01 Jul – 06 Jul 2026',
    status: 'Queued',
    createdAt: '2026-07-07 08:40',
  },
]
