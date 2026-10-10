export type OfficeSalaryPeriod = 'MONTHLY' | 'ANNUAL'

export type OfficeSalary = {
  amount: number
  period: OfficeSalaryPeriod
  /** Monthly equivalent (annual ÷ 12). */
  monthlyAmount: number
  payDay: number | null
  startDate: string | null
  bankAccountName: string | null
  bankSortCode: string | null
  /** Masked (••••1234) in the list; full in the detail view. */
  bankAccountNumber: string | null
  notes: string | null
  isActive: boolean
  updatedAt: string
}

export type OfficeSalaryPayment = {
  id: string
  month: string
  amount: number
  paidAt: string | null
  reference: string | null
  note: string | null
  recordedAt: string
}

export type OfficeSalaryRow = {
  userId: string
  name: string
  email: string
  roles: string[]
  loginActive: boolean
  salary: OfficeSalary | null
  payment: OfficeSalaryPayment | null
}

export type OfficeSalaryList = {
  month: string
  rows: OfficeSalaryRow[]
  totals: { salariedCount: number; monthlyTotal: number; paidTotal: number; unpaidCount: number }
}

export type OfficeSalaryDetail = {
  userId: string
  name: string
  email: string
  salary: OfficeSalary | null
  payments: OfficeSalaryPayment[]
}

export type UpsertOfficeSalaryInput = {
  amount: number
  period: OfficeSalaryPeriod
  payDay?: number | null
  startDate?: string | null
  bankAccountName?: string | null
  bankSortCode?: string | null
  bankAccountNumber?: string | null
  notes?: string | null
  isActive?: boolean
}

export type RecordOfficeSalaryPaymentInput = {
  month: string
  amount?: number
  paidAt?: string
  reference?: string
  note?: string
}
