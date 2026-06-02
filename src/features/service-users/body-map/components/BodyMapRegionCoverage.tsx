import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { loadBodyMapPrototype } from '@/features/service-users/body-map/prototype/load-body-map-prototype'

type MarkableItem = {
  id: string
  part: string
  side: string
  listLabel: string
  viewKey: string
}

type Props = {
  className?: string
  onSelectRegion?: (item: MarkableItem) => void
}

export function BodyMapRegionCoverage({ className, onSelectRegion }: Props) {
  const [ready, setReady] = React.useState(false)
  const [items, setItems] = React.useState<MarkableItem[]>([])
  const [filter, setFilter] = React.useState('')

  React.useEffect(() => {
    void loadBodyMapPrototype().then(() => {
      const list = window.BodyMapCatalog?.listAllCatalogRegions?.() ?? []
      setItems(
        list.map(r => ({
          id: r.id,
          part: r.part,
          side: r.side,
          listLabel: r.listLabel,
          viewKey: r.viewKey,
        })),
      )
      setReady(true)
    })
  }, [])

  const filtered = items.filter(
    i =>
      !filter.trim() ||
      i.listLabel.toLowerCase().includes(filter.toLowerCase()) ||
      i.part.toLowerCase().includes(filter.toLowerCase()),
  )

  const grouped = React.useMemo(() => {
    const map = new Map<string, MarkableItem[]>()
    for (const item of filtered) {
      const key = item.viewKey === 'dual' ? item.listLabel.split(' · ')[0] ?? 'Body' : item.listLabel.split(' · ')[0] ?? 'Zoom'
      const arr = map.get(key) ?? []
      arr.push(item)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  return (
    <aside
      className={cn(
        'flex max-h-[min(560px,60vh)] flex-col rounded-xl border border-border bg-card',
        className?.includes('flex-1') && 'max-h-none',
        className,
      )}
    >
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">Body regions</h3>
        <p className="text-xs text-muted-foreground">
          {ready ? `${items.length} markable regions` : 'Loading catalogue…'}
        </p>
        <input
          type="search"
          placeholder="Search part or view…"
          className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <ul className="flex-1 overflow-y-auto px-1 py-1 text-xs">
        {grouped.map(([group, rows]) => (
          <li key={group} className="mb-2">
            <p className="sticky top-0 bg-card px-2 py-1 font-semibold text-muted-foreground">
              {group}
            </p>
            <ul>
              {rows.slice(0, 80).map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left hover:bg-indigo-50 hover:text-indigo-900"
                    onClick={() => onSelectRegion?.(item)}
                  >
                    {item.listLabel}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </aside>
  )
}
