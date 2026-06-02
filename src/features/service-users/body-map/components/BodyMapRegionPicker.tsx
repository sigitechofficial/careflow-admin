import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { cn } from '@/shared/lib/utils'
import type { BodyMapRegionCatalogItem } from '@/features/service-users/body-map/utils/place-marker-from-region'
import { loadBodyMapRegionCatalog } from '@/features/service-users/body-map/utils/place-marker-from-region'

type Props = {
  onSelectRegion: (item: BodyMapRegionCatalogItem) => void
  className?: string
}

export function BodyMapRegionPicker({ onSelectRegion, className }: Props) {
  const [open, setOpen] = React.useState(false)
  const [ready, setReady] = React.useState(false)
  const [items, setItems] = React.useState<BodyMapRegionCatalogItem[]>([])
  const [filter, setFilter] = React.useState('')

  React.useEffect(() => {
    if (!open || ready) return
    void loadBodyMapRegionCatalog().then(list => {
      setItems(list)
      setReady(true)
    })
  }, [open, ready])

  React.useEffect(() => {
    if (!open) setFilter('')
  }, [open])

  const filtered = items.filter(
    i =>
      !filter.trim() ||
      i.listLabel.toLowerCase().includes(filter.toLowerCase()) ||
      i.part.toLowerCase().includes(filter.toLowerCase()) ||
      i.side.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('h-7 gap-1 px-2.5 text-xs', className)}
        >
          Body part
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 p-0"
        onCloseAutoFocus={e => e.preventDefault()}
      >
        <div className="border-b border-border p-2">
          <input
            type="search"
            placeholder="Search region…"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            onKeyDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {ready ? `${items.length} regions · pick to place marker` : 'Loading…'}
          </p>
        </div>
        <ul className="max-h-64 overflow-y-auto p-1 text-xs">
          {!ready ? (
            <li className="px-2 py-3 text-center text-muted-foreground">Loading catalogue…</li>
          ) : filtered.length === 0 ? (
            <li className="px-2 py-3 text-center text-muted-foreground">No matching regions</li>
          ) : (
            filtered.slice(0, 100).map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left hover:bg-indigo-50 hover:text-indigo-900 dark:hover:bg-indigo-950 dark:hover:text-indigo-100"
                  onClick={() => {
                    onSelectRegion(item)
                    setOpen(false)
                  }}
                >
                  {item.listLabel}
                </button>
              </li>
            ))
          )}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
