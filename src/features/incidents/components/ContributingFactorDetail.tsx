import * as React from 'react'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { Input } from '@/shared/ui/input'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { usePolicies } from '@/features/policies/hooks/usePolicies'
import { PickedChips } from '@/features/incidents/components/PickedChips'
import {
  type ContributingFactorDetail,
  type ContributingFactorDetails,
  type ContributingFactorPick,
} from '@/features/incidents/types'

type Item = { id: string; label: string }

/** Search box that adds the picked option to a list of removable chips. */
function ItemsPicker({
  items,
  onChange,
  options,
  loading,
  placeholder,
  emptyText,
  onSearchChange,
}: {
  items: Item[]
  onChange: (items: Item[]) => void
  options: ComboboxOption[]
  loading?: boolean
  placeholder: string
  emptyText: string
  onSearchChange?: (search: string) => void
}) {
  const pickedIds = new Set(items.map((i) => i.id))
  return (
    <>
      <Combobox
        options={options.filter((o) => !pickedIds.has(o.value))}
        value=""
        onChange={(id) => {
          const option = options.find((o) => o.value === id)
          if (option) onChange([...items, { id: option.value, label: option.label }])
        }}
        onSearchChange={onSearchChange}
        loading={loading}
        placeholder={items.length ? 'Add another…' : placeholder}
        searchPlaceholder="Search…"
        emptyText={emptyText}
      />
      <PickedChips items={items} onRemove={(id) => onChange(items.filter((i) => i.id !== id))} />
    </>
  )
}

/** Staff picker: people involved in the incident first, then a search over all staff. */
function StaffPicker({
  items,
  onChange,
  involvedEmployees,
}: {
  items: Item[]
  onChange: (items: Item[]) => void
  involvedEmployees: { id: string; name: string | null }[]
}) {
  const [search, setSearch] = React.useState('')
  const employeesQuery = useEmployees({ limit: 50, search: search || undefined })
  const options = React.useMemo(() => {
    const involved: ComboboxOption[] = involvedEmployees.map((e) => ({
      value: e.id,
      label: e.name ?? 'Staff member',
      description: 'Involved in this incident',
    }))
    const others: ComboboxOption[] = (employeesQuery.data?.rows ?? [])
      .filter((r) => !involvedEmployees.some((e) => e.id === r.id))
      .map((r) => ({
        value: r.id,
        label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: r.jobTitle?.name ?? undefined,
      }))
    return [...involved, ...others]
  }, [employeesQuery.data, involvedEmployees])
  return (
    <ItemsPicker
      items={items}
      onChange={onChange}
      options={options}
      loading={employeesQuery.isLoading}
      onSearchChange={setSearch}
      placeholder="Select staff…"
      emptyText="No staff match your search."
    />
  )
}

function PolicyPicker({ items, onChange }: { items: Item[]; onChange: (items: Item[]) => void }) {
  const [search, setSearch] = React.useState('')
  const policiesQuery = usePolicies({ limit: 50, search: search || undefined })
  const options: ComboboxOption[] = (policiesQuery.data?.rows ?? []).map((p) => ({
    value: p.id,
    label: p.reference ? `${p.reference} — ${p.title}` : p.title,
  }))
  return (
    <ItemsPicker
      items={items}
      onChange={onChange}
      options={options}
      loading={policiesQuery.isLoading}
      onSearchChange={setSearch}
      placeholder="Select policy or procedure…"
      emptyText="No policies match your search."
    />
  )
}

/**
 * The picker for one kind of record (care plan, risk assessment, medication, staff, policy).
 * Used by contributing factors, evidence and corrective measures.
 */
export function RecordItemsPicker({
  pick,
  question,
  items,
  onChange,
  recordOptions,
  involvedEmployees,
  hasServiceUser,
}: {
  pick: Exclude<ContributingFactorPick, 'note' | 'none'>
  question: string
  items: Item[]
  onChange: (items: Item[]) => void
  recordOptions: FactorRecordOptions
  involvedEmployees: { id: string; name: string | null }[]
  hasServiceUser: boolean
}) {
  if (pick === 'staff') {
    return <StaffPicker items={items} onChange={onChange} involvedEmployees={involvedEmployees} />
  }
  if (pick === 'policy') return <PolicyPicker items={items} onChange={onChange} />
  const source = recordOptions[pick]
  return hasServiceUser ? (
    <ItemsPicker
      items={items}
      onChange={onChange}
      options={source.options}
      loading={source.loading}
      placeholder={question.replace(/\?$/, '…')}
      emptyText="Nothing recorded for the service users involved."
    />
  ) : (
    <p className="text-xs text-muted-foreground">
      No service user is linked to this incident, so there is nothing to pick. Add a note instead.
    </p>
  )
}

export type FactorRecordOptions = {
  carePlan: { options: ComboboxOption[]; loading: boolean }
  riskAssessment: { options: ComboboxOption[]; loading: boolean }
  medication: { options: ComboboxOption[]; loading: boolean }
}

/**
 * One ticked item (contributing factor or change made): what it relates to, plus an optional note.
 * `config` says which picker to show and the question to ask.
 */
export function ContributingFactorDetailEditor({
  label,
  config,
  detail,
  onChange,
  recordOptions,
  involvedEmployees,
  hasServiceUser,
}: {
  label: string
  config: { pick: ContributingFactorPick; question: string }
  detail: ContributingFactorDetail
  onChange: (detail: ContributingFactorDetail) => void
  recordOptions: FactorRecordOptions
  involvedEmployees: { id: string; name: string | null }[]
  hasServiceUser: boolean
}) {
  if (config.pick === 'none') return null
  const items = detail.items ?? []
  const setItems = (next: Item[]) => onChange({ ...detail, items: next })

  const picker =
    config.pick === 'note' ? null : (
      <RecordItemsPicker
        pick={config.pick}
        question={config.question}
        items={items}
        onChange={setItems}
        recordOptions={recordOptions}
        involvedEmployees={involvedEmployees}
        hasServiceUser={hasServiceUser}
      />
    )

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-semibold text-foreground">
        {label}
        {config.question ? (
          <span className="font-normal text-muted-foreground"> — {config.question}</span>
        ) : null}
      </p>
      {picker ? <div className="mt-2">{picker}</div> : null}
      <Input
        className="mt-2"
        value={detail.note ?? ''}
        maxLength={2000}
        onChange={(e) => onChange({ ...detail, note: e.target.value })}
        placeholder={config.pick === 'note' ? 'Add details…' : 'Note (optional)'}
        aria-label={`${label} note`}
      />
    </div>
  )
}

/** Read-only list of ticked items with what each relates to. */
export function ContributingFactorsReadView({
  factors,
  details,
  labelFor,
}: {
  factors: string[]
  details: ContributingFactorDetails | null | undefined
  labelFor: (code: string) => string
}) {
  return (
    <ul className="mt-1 space-y-1.5">
      {factors.map((code) => {
        const d = details?.[code]
        return (
          <li key={code} className="rounded-md border border-border px-2.5 py-1.5">
            <p className="text-xs font-medium text-foreground">{labelFor(code)}</p>
            {d?.items?.length ? <PickedChips items={d.items} /> : null}
            {d?.note ? <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{d.note}</p> : null}
          </li>
        )
      })}
    </ul>
  )
}
