import * as React from 'react'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { buildBodyPartComboboxOptions } from '@/features/service-users/body-map/catalog/body-part-options'
import { cn } from '@/shared/lib/utils'

type Props = {
  value: string
  onChange: (value: string) => void
  /** From marker placement — prioritises leaning/sitting groups when relevant */
  canvasView?: string | null
  disabled?: boolean
  className?: string
  placeholder?: string
}

const PLACEHOLDER_PARTS = new Set(['', 'Marked location'])

export function isClinicalBodyPart(part: string): boolean {
  const t = part.trim()
  return t.length > 0 && !PLACEHOLDER_PARTS.has(t)
}

function optionsIncludingValue(base: ComboboxOption[], current: string): ComboboxOption[] {
  const t = current.trim()
  if (!isClinicalBodyPart(t)) return base
  if (base.some(o => o.value === t)) return base
  return [{ value: t, label: t, description: 'From map selection' }, ...base]
}

export function BodyPartCombobox({
  value,
  onChange,
  canvasView,
  disabled,
  className,
  placeholder = 'Search body parts…',
}: Props) {
  const options = React.useMemo(
    () => optionsIncludingValue(buildBodyPartComboboxOptions(canvasView), value),
    [canvasView, value],
  )

  const displayValue = isClinicalBodyPart(value) ? value.trim() : ''

  return (
    <Combobox
      className={cn(className)}
      options={options}
      value={displayValue}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Type to search body parts…"
      emptyText="No matching body part."
      disabled={disabled}
      allowDeselect={false}
    />
  )
}
