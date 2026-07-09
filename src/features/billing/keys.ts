export const billingKeys = {
  all: ['billing'] as const,
  payCards: (filters?: { search?: string; status?: string }) =>
    [...billingKeys.all, 'pay-cards', filters ?? {}] as const,
  payCard: (id: string) => [...billingKeys.all, 'pay-card', id] as const,
  payCardAssignmentPreview: (id: string) =>
    [...billingKeys.all, 'pay-card-assignment-preview', id] as const,
  payCardResolve: (employeeId: string) =>
    [...billingKeys.all, 'pay-card-resolve', employeeId] as const,
  chargeCards: (filters?: { search?: string; status?: string }) =>
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
  }) => [...billingKeys.all, 'funding-contracts', filters ?? {}] as const,
  fundingContractsSummary: () => [...billingKeys.all, 'funding-contracts-summary'] as const,
  invoiceTemplates: (filters?: {
    search?: string
    status?: string
    templateType?: string
    funderId?: string
  }) => [...billingKeys.all, 'invoice-templates', filters ?? {}] as const,
  invoiceTemplate: (id: string) => [...billingKeys.all, 'invoice-template', id] as const,
  invoiceTemplateSystemFields: () => [...billingKeys.all, 'invoice-template-system-fields'] as const,
  invoiceTemplatesSummary: () => [...billingKeys.all, 'invoice-templates-summary'] as const,
  invoiceTemplateResolve: (serviceUserId: string, fundingId?: string) =>
    [...billingKeys.all, 'invoice-template-resolve', serviceUserId, fundingId ?? ''] as const,
  visitReconciliations: (filters?: {
    search?: string
    status?: string
    hasExceptions?: boolean
    page?: number
    limit?: number
  }) => [...billingKeys.all, 'visit-reconciliations', filters ?? {}] as const,
  visitReconciliation: (id: string) => [...billingKeys.all, 'visit-reconciliation', id] as const,
  visitReconciliationsSummary: () => [...billingKeys.all, 'visit-reconciliations-summary'] as const,
  visitReconciliationExceptionQueue: (limit?: number) =>
    [...billingKeys.all, 'visit-reconciliation-exception-queue', limit ?? 10] as const,
  payrollRuns: () => [...billingKeys.all, 'payroll-runs'] as const,
  payrollRun: (id: string) => [...billingKeys.all, 'payroll-run', id] as const,
  payrollRunsSummary: () => [...billingKeys.all, 'payroll-runs-summary'] as const,
  invoiceRuns: () => [...billingKeys.all, 'invoice-runs'] as const,
  invoiceRunsSummary: () => [...billingKeys.all, 'invoice-runs-summary'] as const,
  invoiceRun: (id: string) => [...billingKeys.all, 'invoice-run', id] as const,
  payments: () => [...billingKeys.all, 'payments'] as const,
  payment: (id: string) => [...billingKeys.all, 'payment', id] as const,
  paymentsSummary: () => [...billingKeys.all, 'payments-summary'] as const,
  agedDebt: () => [...billingKeys.all, 'aged-debt'] as const,
  outstandingInvoiceRuns: () => [...billingKeys.all, 'outstanding-invoice-runs'] as const,
}
