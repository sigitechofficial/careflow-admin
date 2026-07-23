import * as React from 'react'
import { PayrollInfoHeading } from '@/features/payroll/components/PayrollInfoHeading'
import {
  UK_PAYROLL_CATALOG_2026_27,
  UK_PAYROLL_KIND_LABEL,
  UK_TAX_YEAR_2026_27,
} from '@/features/payroll/data/uk-payroll-2026-27.catalog'
import { PAYROLL_SECTION_GUIDANCE } from '@/features/payroll/data/payroll-section-guidance'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'

const DEDUCTION_OPTIONS: MultiSelectOption[] = UK_PAYROLL_CATALOG_2026_27.filter((item) =>
  item.status === 'CONFIGURED',
).map((item) => ({
  value: item.code,
  label: `${UK_PAYROLL_KIND_LABEL[item.kind]} · ${item.name}`,
}))

/** Short chip labels (without the long category prefix). */
const SHORT_LABEL_BY_CODE = new Map(
  UK_PAYROLL_CATALOG_2026_27.map((item) => [item.code, item.name]),
)

type Props = {
  selectedCodes: string[]
  onChange: (codes: string[]) => void
}

export function UkPayrollDeductionsCatalogPanel({ selectedCodes, onChange }: Props) {
  const options = React.useMemo(() => DEDUCTION_OPTIONS, [])

  const formatSelectedOptions = React.useCallback((selected: MultiSelectOption[]) => {
    return selected.map((opt) => ({
      ...opt,
      label: SHORT_LABEL_BY_CODE.get(opt.value) ?? opt.label,
    }))
  }, [])

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <PayrollInfoHeading
        title="Other deductions"
        purpose={PAYROLL_SECTION_GUIDANCE.catalogue.purpose}
        description={`${UK_TAX_YEAR_2026_27.label}. Search and select student loans, pension, attachments, or voluntary deductions in one place. PAYE tax and employee NI are set above — not in this list.`}
      />

      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Select deductions that apply</span>
        <MultiSelect
          className="w-full min-h-11"
          options={options}
          value={selectedCodes}
          onChange={onChange}
          placeholder="Search student loan, pension, attachment…"
          searchPlaceholder="Type to filter deductions…"
          formatSelectedOptions={formatSelectedOptions}
        />
      </label>

      <p className="text-xs text-muted-foreground">
        Selected items are saved on the profile. £ amounts for these are not calculated yet — only
        PAYE and employee Class 1 NI are calculated on the payroll run.
      </p>
    </div>
  )
}
