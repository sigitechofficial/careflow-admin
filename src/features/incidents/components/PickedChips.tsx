import { X } from 'lucide-react'

/** Removable chips for picked items (people, care plans, medications…). */
export function PickedChips({
  items,
  onRemove,
}: {
  items: { id: string; label: string }[]
  onRemove?: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 py-0.5 pl-2.5 pr-1 text-xs font-medium text-foreground"
        >
          {item.label}
          {onRemove ? (
            <button
              type="button"
              aria-label={`Remove ${item.label}`}
              onClick={() => onRemove(item.id)}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <span className="pr-1.5" />
          )}
        </span>
      ))}
    </div>
  )
}
