import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useEmployees } from '@/features/employees/hooks/useEmployees'

export type PickedStaff = { id: string; name: string }

/**
 * Staff picker with checkboxes: searches the staff list on the server (works beyond the
 * first page of staff) and stays open so several people can be ticked in one go.
 */
export function IncidentStaffMultiSelect({
  selected,
  onChange,
  placeholder = 'Select staff…',
}: {
  selected: PickedStaff[]
  onChange: (next: PickedStaff[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const query = useEmployees({ limit: 50, search: debounced || undefined }, open)
  const rows = (query.data?.rows ?? []).map((r) => ({
    id: r.id,
    name: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
    jobTitle: r.jobTitle?.name ?? null,
    ref: r.employeeNumber?.trim() ? `#${r.employeeNumber.trim()}` : r.username ? `@${r.username}` : null,
  }))

  const isPicked = (id: string) => selected.some((p) => p.id === id)
  function toggle(row: PickedStaff) {
    onChange(isPicked(row.id) ? selected.filter((p) => p.id !== row.id) : [...selected, row])
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm',
            'hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring',
            open && 'ring-2 ring-ring',
          )}
        >
          <span className={cn('truncate', selected.length ? 'text-foreground' : 'text-muted-foreground')}>
            {selected.length ? `${selected.length} selected` : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-[100] w-[var(--radix-popover-trigger-width)] min-w-[16rem] rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="relative border-b border-border p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff…"
              aria-label="Search staff"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 pr-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            {query.isFetching && (
              <Loader2 className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="max-h-64 overflow-y-auto overscroll-contain p-1" role="listbox" aria-multiselectable>
            {!query.isLoading && rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No staff found</p>
            ) : (
              rows.map((row) => {
                const picked = isPicked(row.id)
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="option"
                    aria-selected={picked}
                    onClick={() => toggle({ id: row.id, name: row.name })}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                      picked && 'bg-accent/50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border',
                        picked && 'border-primary bg-primary',
                      )}
                      aria-hidden
                    >
                      {picked ? <Check className="h-3 w-3 text-primary-foreground" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {row.name}
                        {row.ref ? <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{row.ref}</span> : null}
                      </span>
                      {row.jobTitle && <span className="block truncate text-xs text-muted-foreground">{row.jobTitle}</span>}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
