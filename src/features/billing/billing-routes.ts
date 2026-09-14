import type { BillingTabId } from '@/features/billing/types/billing.types'

/** Setup / overview tabs that remain on `/billing?tab=…`. */
export const BILLING_SETUP_TAB_IDS: BillingTabId[] = [
  'dashboard',
  'pay-cards',
  'charge-cards',
  'funding-contracts',
  'invoice-templates',
]

/** Ops tabs promoted to dedicated full-page routes. */
export const BILLING_SECTION_PATHS = {
  'service-user-invoices': '/billing/service-user-invoices',
  'visit-reconciliation': '/billing/visit-reconciliation',
  'payroll-runs': '/billing/payroll-runs',
  'invoice-runs': '/billing/invoice-runs',
  'invoice-audit-trail': '/billing/invoice-audit-trail',
  payments: '/billing/payments',
  'audit-export': '/billing/audit-export',
} as const satisfies Partial<Record<BillingTabId, string>>

export type BillingSectionTabId = keyof typeof BILLING_SECTION_PATHS

export function isBillingSectionTab(tab: string): tab is BillingSectionTabId {
  return tab in BILLING_SECTION_PATHS
}

export function billingPathForTab(tab: BillingTabId): string {
  if (isBillingSectionTab(tab)) return BILLING_SECTION_PATHS[tab]
  return '/billing'
}
