import type { PayrollNiCategory } from '@/features/payroll/types/payroll.types'

/** Common UK PAYE tax codes (HMRC). Digits × 10 = annual free pay for letter codes like 1257L. */
export type UkTaxCodeOption = {
  value: string
  label: string
  group: 'Standard' | 'Special' | 'Scotland' | 'Wales'
}

export const UK_TAX_CODE_OPTIONS: UkTaxCodeOption[] = [
  // Standard England / Northern Ireland (current PA band)
  { value: '1257L', label: '1257L — Personal allowance (standard)', group: 'Standard' },
  { value: '1257M', label: '1257M — Marriage allowance received', group: 'Standard' },
  { value: '1257N', label: '1257N — Marriage allowance transferred', group: 'Standard' },
  { value: '1257T', label: '1257T — Other calculations apply', group: 'Standard' },
  { value: '1250L', label: '1250L — Older personal allowance code', group: 'Standard' },

  // Special / emergency style codes
  { value: '0T', label: '0T — No personal allowance', group: 'Special' },
  { value: 'BR', label: 'BR — All taxable pay at basic rate (20%)', group: 'Special' },
  { value: 'D0', label: 'D0 — All taxable pay at higher rate (40%)', group: 'Special' },
  { value: 'D1', label: 'D1 — All taxable pay at additional rate (45%)', group: 'Special' },
  { value: 'NT', label: 'NT — No tax to deduct', group: 'Special' },
  { value: 'K497', label: 'K497 — Negative allowance (example K code)', group: 'Special' },

  // Scotland (S prefix) — stored for setup; Phase 3 engine still uses ENG bands
  { value: 'S1257L', label: 'S1257L — Scottish personal allowance', group: 'Scotland' },
  { value: 'S0T', label: 'S0T — Scottish, no personal allowance', group: 'Scotland' },
  { value: 'SBR', label: 'SBR — Scottish basic rate on all', group: 'Scotland' },
  { value: 'SD0', label: 'SD0 — Scottish intermediate/higher path', group: 'Scotland' },
  { value: 'SD1', label: 'SD1 — Scottish higher path', group: 'Scotland' },
  { value: 'SD2', label: 'SD2 — Scottish top path', group: 'Scotland' },

  // Wales (C prefix) — same main bands as England currently
  { value: 'C1257L', label: 'C1257L — Welsh personal allowance', group: 'Wales' },
  { value: 'C0T', label: 'C0T — Welsh, no personal allowance', group: 'Wales' },
  { value: 'CBR', label: 'CBR — Welsh basic rate on all', group: 'Wales' },
  { value: 'CD0', label: 'CD0 — Welsh higher rate on all', group: 'Wales' },
  { value: 'CD1', label: 'CD1 — Welsh additional rate on all', group: 'Wales' },
]

export const UK_TAX_CODE_OTHER = '__OTHER__'

export type UkNiCategoryOption = {
  value: PayrollNiCategory
  label: string
}

/** Full Class 1 NI letter categories used in UK employer payroll. */
export const UK_NI_CATEGORY_OPTIONS: UkNiCategoryOption[] = [
  { value: 'A', label: 'A — Standard (most employees)' },
  { value: 'B', label: 'B — Married women / widows reduced rate' },
  { value: 'C', label: 'C — Over State Pension age' },
  { value: 'F', label: 'F — Freeport standard' },
  { value: 'H', label: 'H — Apprentice under 25' },
  { value: 'I', label: 'I — Freeport married women / widows' },
  { value: 'J', label: 'J — Deferment (other job pays NI)' },
  { value: 'L', label: 'L — Freeport deferment' },
  { value: 'M', label: 'M — Under 21' },
  { value: 'S', label: 'S — Over State Pension age (no employee NI)' },
  { value: 'V', label: 'V — Veteran' },
  { value: 'Z', label: 'Z — Under 21 deferment' },
  { value: 'X', label: 'X — No NI (e.g. some special cases)' },
]

export function taxCodeSelectValue(stored: string | null | undefined): string {
  const code = (stored ?? '').trim().toUpperCase()
  if (!code) return '1257L'
  if (UK_TAX_CODE_OPTIONS.some((o) => o.value === code)) return code
  return UK_TAX_CODE_OTHER
}

export function groupTaxCodeOptions() {
  const groups: Array<{ group: UkTaxCodeOption['group']; options: UkTaxCodeOption[] }> = []
  for (const opt of UK_TAX_CODE_OPTIONS) {
    const existing = groups.find((g) => g.group === opt.group)
    if (existing) existing.options.push(opt)
    else groups.push({ group: opt.group, options: [opt] })
  }
  return groups
}
