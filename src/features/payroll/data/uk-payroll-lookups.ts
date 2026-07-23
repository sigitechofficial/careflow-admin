import type { PayrollNiCategory } from '@/features/payroll/types/payroll.types'
import type { ComboboxOption } from '@/shared/ui/combobox'

/** Common UK PAYE tax codes (HMRC). Digits × 10 = annual free pay for letter codes like 1257L. */
export type UkTaxCodeOption = {
  value: string
  label: string
  description?: string
  group: 'Standard' | 'Special' | 'Scotland' | 'Wales'
}

export const UK_TAX_CODE_OPTIONS: UkTaxCodeOption[] = [
  {
    value: '1257L',
    label: '1257L — Personal allowance (standard)',
    description: 'England / Northern Ireland — £12,570 free pay',
    group: 'Standard',
  },
  {
    value: '1257M',
    label: '1257M — Marriage allowance received',
    description: 'Higher personal allowance from marriage transfer',
    group: 'Standard',
  },
  {
    value: '1257N',
    label: '1257N — Marriage allowance transferred',
    description: 'Lower personal allowance after marriage transfer',
    group: 'Standard',
  },
  {
    value: '1257T',
    label: '1257T — Other calculations apply',
    description: 'HMRC has other adjustments on this code',
    group: 'Standard',
  },
  {
    value: '1250L',
    label: '1250L — Older personal allowance code',
    description: 'Legacy PA code still seen on some notices',
    group: 'Standard',
  },
  {
    value: '1185L',
    label: '1185L — Reduced personal allowance',
    description: 'Lower free-pay code from HMRC notice',
    group: 'Standard',
  },

  {
    value: '0T',
    label: '0T — No personal allowance',
    description: 'All pay taxable from £0 free pay',
    group: 'Special',
  },
  {
    value: 'BR',
    label: 'BR — Basic rate on all taxable pay',
    description: '20% on all taxable pay (no free pay)',
    group: 'Special',
  },
  {
    value: 'D0',
    label: 'D0 — Higher rate on all taxable pay',
    description: '40% on all taxable pay',
    group: 'Special',
  },
  {
    value: 'D1',
    label: 'D1 — Additional rate on all taxable pay',
    description: '45% on all taxable pay',
    group: 'Special',
  },
  {
    value: 'NT',
    label: 'NT — No tax to deduct',
    description: 'Do not deduct Income Tax',
    group: 'Special',
  },
  {
    value: 'K497',
    label: 'K497 — Negative allowance (K code)',
    description: 'Example K code — replace with notice value if needed',
    group: 'Special',
  },

  {
    value: 'S1257L',
    label: 'S1257L — Scottish personal allowance',
    description: 'Scotland PAYE code (S prefix)',
    group: 'Scotland',
  },
  {
    value: 'S0T',
    label: 'S0T — Scottish, no personal allowance',
    group: 'Scotland',
  },
  {
    value: 'SBR',
    label: 'SBR — Scottish basic rate on all',
    group: 'Scotland',
  },
  {
    value: 'SD0',
    label: 'SD0 — Scottish intermediate/higher path',
    group: 'Scotland',
  },
  {
    value: 'SD1',
    label: 'SD1 — Scottish higher path',
    group: 'Scotland',
  },
  {
    value: 'SD2',
    label: 'SD2 — Scottish top path',
    group: 'Scotland',
  },

  {
    value: 'C1257L',
    label: 'C1257L — Welsh personal allowance',
    description: 'Wales PAYE code (C prefix)',
    group: 'Wales',
  },
  {
    value: 'C0T',
    label: 'C0T — Welsh, no personal allowance',
    group: 'Wales',
  },
  {
    value: 'CBR',
    label: 'CBR — Welsh basic rate on all',
    group: 'Wales',
  },
  {
    value: 'CD0',
    label: 'CD0 — Welsh higher rate on all',
    group: 'Wales',
  },
  {
    value: 'CD1',
    label: 'CD1 — Welsh additional rate on all',
    group: 'Wales',
  },
]

export const UK_TAX_CODE_OTHER = '__OTHER__'

export type UkNiCategoryOption = {
  value: PayrollNiCategory
  label: string
  description: string
}

/** Full Class 1 NI letter categories used in UK employer payroll. */
export const UK_NI_CATEGORY_OPTIONS: UkNiCategoryOption[] = [
  {
    value: 'A',
    label: 'A — Standard (most employees)',
    description: 'Class 1 employee + employer NI at standard rates',
  },
  {
    value: 'B',
    label: 'B — Married women / widows reduced rate',
    description: 'Reduced employee NI rate (certificate required)',
  },
  {
    value: 'C',
    label: 'C — Over State Pension age',
    description: 'No employee NI; employer NI may still apply',
  },
  {
    value: 'F',
    label: 'F — Freeport standard',
    description: 'Freeport employer relief category',
  },
  {
    value: 'H',
    label: 'H — Apprentice under 25',
    description: 'Apprentice under 25 NI letter',
  },
  {
    value: 'I',
    label: 'I — Freeport married women / widows',
    description: 'Freeport + reduced employee rate',
  },
  {
    value: 'J',
    label: 'J — Deferment (other job pays NI)',
    description: 'Employee deferment — other employment pays NI',
  },
  {
    value: 'L',
    label: 'L — Freeport deferment',
    description: 'Freeport + deferment',
  },
  {
    value: 'M',
    label: 'M — Under 21',
    description: 'Under 21 NI letter',
  },
  {
    value: 'S',
    label: 'S — State Pension age (no employee NI)',
    description: 'No employee NI contribution',
  },
  {
    value: 'V',
    label: 'V — Veteran',
    description: 'Armed forces veteran category',
  },
  {
    value: 'Z',
    label: 'Z — Under 21 deferment',
    description: 'Under 21 with deferment',
  },
  {
    value: 'X',
    label: 'X — No National Insurance',
    description: 'No NI deductions for this employment',
  },
]

export function taxCodeSelectValue(stored: string | null | undefined): string {
  const code = (stored ?? '').trim().toUpperCase()
  if (!code) return '1257L'
  if (UK_TAX_CODE_OPTIONS.some((o) => o.value === code)) return code
  return UK_TAX_CODE_OTHER
}

export function buildTaxCodeComboboxOptions(includeOther = true): ComboboxOption[] {
  const options: ComboboxOption[] = UK_TAX_CODE_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    description: o.description ?? o.group,
  }))
  if (includeOther) {
    options.push({
      value: UK_TAX_CODE_OTHER,
      label: 'Other HMRC code (rare / notice)',
      description: 'Enter a code not listed above',
    })
  }
  return options
}

export function buildNiCategoryComboboxOptions(): ComboboxOption[] {
  return UK_NI_CATEGORY_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    description: o.description,
  }))
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
