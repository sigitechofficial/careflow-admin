export type FundingUsagePeriod = 'week' | 'month'

export type FundingUsageBudgetLine = {
  funderName: string | null
  fundingTypeName: string | null
  liveDays: number
  weeklyBudget: number | null
  budget: number | null
  authorisedHours: number | null
}

/** Carer pay, client charge and funding budget for one service user in a week or month. */
export type FundingUsage = {
  period: { kind: FundingUsagePeriod; from: string; to: string; days: number }
  visits: number
  carerRows: number
  pendingReview: number
  carerPay: { total: number; paid: number; due: number; pending: number }
  clientCharge: { total: number; invoiced: number; toInvoice: number; pending: number }
  billableHours: number
  margin: number
  budget: {
    amount: number | null
    remaining: number | null
    hours: number | null
    hoursRemaining: number | null
    lines: FundingUsageBudgetLine[]
  }
}
