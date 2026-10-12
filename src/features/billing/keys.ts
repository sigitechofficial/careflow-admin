export const billingKeys = {
  all: ['billing'] as const,
  payCards: (filters?: { search?: string; status?: string; locationId?: string }) =>
    [...billingKeys.all, 'pay-cards', filters ?? {}] as const,
  payCard: (id: string) => [...billingKeys.all, 'pay-card', id] as const,
  payCardVersions: (id: string) => [...billingKeys.all, 'pay-card-versions', id] as const,
  wageTypes: () => [...billingKeys.all, 'wage-types'] as const,
  payItems: (params?: { status?: string; employeeId?: string; wageTypeCode?: string }) =>
    [...billingKeys.all, 'pay-items', params ?? {}] as const,
  payItemSuggestion: (params: { employeeId: string; wageTypeCode: string; unit: string; date: string }) =>
    [...billingKeys.all, 'pay-items', 'suggestion', params] as const,
  visitPayCorrections: (visitReconciliationId: string) =>
    [...billingKeys.all, 'pay-items', 'visit-corrections', visitReconciliationId] as const,
  bankHolidays: (params?: { region?: string; year?: string }) =>
    [...billingKeys.all, 'bank-holidays', params ?? {}] as const,
  employeePayCardHistory: (employeeId: string) =>
    [...billingKeys.all, 'employee-pay-card-history', employeeId] as const,
  payCardAssignmentPreview: (id: string) =>
    [...billingKeys.all, 'pay-card-assignment-preview', id] as const,
  payCardConflicts: (locationId?: string | null) =>
    [...billingKeys.all, 'pay-card-conflicts', locationId ?? 'all'] as const,
  payCardConflictCheck: (input: unknown, locationId?: string | null) =>
    [...billingKeys.all, 'pay-card-conflict-check', locationId ?? 'all', input] as const,
  payCardResolve: (employeeId: string, funderId?: string) =>
    [...billingKeys.all, 'pay-card-resolve', employeeId, funderId ?? ''] as const,
  employeeFunderPayAssignments: (employeeId: string) =>
    [...billingKeys.all, 'employee-funder-pay-assignments', employeeId] as const,
  chargeCards: (filters?: { search?: string; status?: string; locationId?: string }) =>
    [...billingKeys.all, 'charge-cards', filters ?? {}] as const,
  chargeCard: (id: string) => [...billingKeys.all, 'charge-card', id] as const,
  chargeCardAssignmentPreview: (id: string) =>
    [...billingKeys.all, 'charge-card-assignment-preview', id] as const,
  chargeCardResolve: (serviceUserId: string) =>
    [...billingKeys.all, 'charge-card-resolve', serviceUserId] as const,
  fundingContracts: (filters?: {
    search?: string
    readiness?: string
    page?: number
    limit?: number
    locationId?: string
  }) => [...billingKeys.all, 'funding-contracts', filters ?? {}] as const,
  fundingContractsSummary: (locationId?: string | null) =>
    [...billingKeys.all, 'funding-contracts-summary', locationId ?? 'all'] as const,
  invoiceTemplates: (filters?: {
    search?: string
    status?: string
    templateType?: string
    funderId?: string
  }) => [...billingKeys.all, 'invoice-templates', filters ?? {}] as const,
  invoiceTemplate: (id: string) => [...billingKeys.all, 'invoice-template', id] as const,
  invoiceTemplateSystemFields: () => [...billingKeys.all, 'invoice-template-system-fields'] as const,
  invoiceTemplateLayoutPresets: () => [...billingKeys.all, 'invoice-template-layout-presets'] as const,
  invoiceTemplatesSummary: () => [...billingKeys.all, 'invoice-templates-summary'] as const,
  invoiceTemplateResolve: (serviceUserId: string, fundingId?: string) =>
    [...billingKeys.all, 'invoice-template-resolve', serviceUserId, fundingId ?? ''] as const,
  visitReconciliations: (filters?: {
    search?: string
    status?: string
    hasExceptions?: boolean
    serviceUserId?: string
    employeeId?: string
    locationId?: string
    nightDuty?: string
    page?: number
    limit?: number
  }) => [...billingKeys.all, 'visit-reconciliations', filters ?? {}] as const,
  visitReconciliation: (id: string) => [...billingKeys.all, 'visit-reconciliation', id] as const,
  visitReconciliationsSummary: (locationId?: string | null) =>
    [...billingKeys.all, 'visit-reconciliations-summary', locationId ?? 'all'] as const,
  visitReconciliationExceptionQueue: (limit?: number, locationId?: string | null) =>
    [...billingKeys.all, 'visit-reconciliation-exception-queue', limit ?? 10, locationId ?? 'all'] as const,
  payEvaluationFailures: (locationId?: string | null) =>
    [...billingKeys.all, 'pay-evaluation-failures', locationId ?? 'all'] as const,
  payrollRuns: (filters?: { locationId?: string }) =>
    [...billingKeys.all, 'payroll-runs', filters ?? {}] as const,
  payrollRun: (id: string) => [...billingKeys.all, 'payroll-run', id] as const,
  payrollRunsSummary: (locationId?: string | null) =>
    [...billingKeys.all, 'payroll-runs-summary', locationId ?? 'all'] as const,
  employeeEarnings: (employeeId: string, filters?: { dateFrom?: string; dateTo?: string }) =>
    [...billingKeys.all, 'employee-earnings', employeeId, filters ?? {}] as const,
  employeeSalaries: (filters?: {
    dateFrom?: string
    dateTo?: string
    locationId?: string
  }) => [...billingKeys.all, 'employee-salaries', filters ?? {}] as const,
  invoiceRuns: (filters?: { locationId?: string }) =>
    [...billingKeys.all, 'invoice-runs', filters ?? {}] as const,
  invoiceRunsSummary: (locationId?: string | null) =>
    [...billingKeys.all, 'invoice-runs-summary', locationId ?? 'all'] as const,
  invoiceRun: (id: string, locationId?: string | null) =>
    [...billingKeys.all, 'invoice-run', id, locationId ?? 'all'] as const,
  serviceUserInvoices: (serviceUserId: string) =>
    [...billingKeys.all, 'service-user-invoices', serviceUserId] as const,
  serviceUserInvoicesOverview: (month?: string, locationId?: string | null) =>
    [...billingKeys.all, 'service-user-invoices-overview', month ?? 'all', locationId ?? 'all'] as const,
  payments: (filters?: { locationId?: string }) =>
    [...billingKeys.all, 'payments', filters ?? {}] as const,
  payment: (id: string) => [...billingKeys.all, 'payment', id] as const,
  paymentsSummary: () => [...billingKeys.all, 'payments-summary'] as const,
  agedDebt: () => [...billingKeys.all, 'aged-debt'] as const,
  outstandingInvoiceRuns: (locationId?: string | null) =>
    [...billingKeys.all, 'outstanding-invoice-runs', locationId ?? 'all'] as const,
  employeePayoutBatches: (periodKey?: string, locationId?: string | null) =>
    [...billingKeys.all, 'employee-payouts', periodKey ?? 'all', locationId ?? 'all'] as const,
  employeePayoutBatch: (id: string) =>
    [...billingKeys.all, 'employee-payout', id] as const,
}
