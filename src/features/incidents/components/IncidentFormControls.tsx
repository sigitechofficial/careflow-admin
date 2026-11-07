import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { IncidentSeverity } from '@/features/incidents/types'

/** Reporter's first view of how serious it is — a manager confirms it at review. */
export const INCIDENT_SEVERITY_FORM_OPTIONS: { value: IncidentSeverity; label: string; hint: string }[] = [
  { value: 'LOW', label: 'Low', hint: 'No or minimal harm, no treatment needed.' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Minor harm: first aid or a GP visit, short-term effect.' },
  { value: 'HIGH', label: 'High', hint: 'Significant harm: hospital treatment, or a safeguarding concern.' },
  {
    value: 'CRITICAL',
    label: 'Critical',
    hint: 'Life-threatening or serious harm, death, or police involvement.',
  },
]

/** A dropdown that opens a checkbox list for multi-selection. */
export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const summary = selected.length
    ? options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ')
    : placeholder
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
  }
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={cn('truncate', selected.length ? 'text-foreground' : 'text-muted-foreground')}>
          {summary}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="h-4 w-4 rounded border-input"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/** "What kind of fall?"-style question for the subtype picker, based on the category name. */
export function subtypeQuestion(category: { key: string; label: string }): string {
  if (category.key === 'OTHER') return 'Subtype'
  const name = category.label.toLowerCase()
  return /(incident|concern|accident|miss)$/.test(name)
    ? `What kind of ${name}?`
    : `What kind of ${name} incident?`
}
