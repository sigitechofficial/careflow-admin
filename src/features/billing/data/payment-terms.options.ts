/** QBO-style payment terms (due date = invoice date + days). */
export const PAYMENT_TERMS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Due on receipt', label: 'Due on receipt (same day)' },
  { value: 'Net 15', label: 'Net 15 (15 days)' },
  { value: 'Net 30', label: 'Net 30 (30 days)' },
  { value: 'Net 60', label: 'Net 60 (60 days)' },
]

export const DEFAULT_PAYMENT_TERMS = 'Net 30'
