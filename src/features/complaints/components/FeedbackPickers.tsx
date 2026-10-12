import * as React from 'react'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import type { FeedbackPersonRef } from '@/features/complaints/types'

function useDebounced(value: string, ms = 250) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/** Keeps the current pick in the list even when it is not in the latest search results. */
function withSelected(options: ComboboxOption[], selected: FeedbackPersonRef | null): ComboboxOption[] {
  if (!selected || options.some(o => o.value === selected.id)) return options
  return [{ value: selected.id, label: selected.name }, ...options]
}

export function ServiceUserPicker({
  value,
  onChange,
  placeholder = 'Search service user…',
  testId,
}: {
  value: FeedbackPersonRef | null
  onChange: (next: FeedbackPersonRef | null) => void
  placeholder?: string
  testId?: string
}) {
  const [search, setSearch] = React.useState('')
  const debounced = useDebounced(search)
  const query = useServiceUsers({ limit: 50, search: debounced || undefined })
  const options = withSelected(
    (query.data?.rows ?? []).map(r => ({
      value: r.id,
      label: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.serviceUserNumber ?? undefined,
    })),
    value,
  )
  return (
    <div data-testid={testId}>
      <Combobox
        options={options}
        value={value?.id ?? ''}
        onChange={id => {
          const opt = options.find(o => o.value === id)
          onChange(id && opt ? { id, name: opt.label } : null)
        }}
        onSearchChange={setSearch}
        loading={query.isFetching}
        placeholder={placeholder}
        searchPlaceholder="Type a name…"
        allowDeselect
        className="w-full"
      />
    </div>
  )
}

export function EmployeePicker({
  value,
  onChange,
  placeholder = 'Search staff…',
  testId,
}: {
  value: FeedbackPersonRef | null
  onChange: (next: FeedbackPersonRef | null) => void
  placeholder?: string
  testId?: string
}) {
  const [search, setSearch] = React.useState('')
  const debounced = useDebounced(search)
  const query = useEmployees({ limit: 50, search: debounced || undefined })
  const options = withSelected(
    (query.data?.rows ?? []).map(r => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    })),
    value,
  )
  return (
    <div data-testid={testId}>
      <Combobox
        options={options}
        value={value?.id ?? ''}
        onChange={id => {
          const opt = options.find(o => o.value === id)
          onChange(id && opt ? { id, name: opt.label } : null)
        }}
        onSearchChange={setSearch}
        loading={query.isFetching}
        placeholder={placeholder}
        searchPlaceholder="Type a name…"
        allowDeselect
        className="w-full"
      />
    </div>
  )
}
