import * as React from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import {
  adminNavItems,
  filterNavByPermission,
  inspectorOnlyNavItems,
} from '@/components/layout/Sidebar'
import type { NavItem } from '@/components/layout/sidebar-types'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/shared/ui/command'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'

export type NavSearchHit = {
  id: string
  section: string
  label: string
  href: string
  search?: Record<string, string>
  ready?: boolean
  keywords: string
}

function flattenNavItems(items: NavItem[]): NavSearchHit[] {
  const hits: NavSearchHit[] = []
  for (const item of items) {
    if (!item.children?.length) {
      hits.push({
        id: `root:${item.href}:${item.label}`,
        section: item.label,
        label: item.label,
        href: item.href,
        ready: item.ready,
        keywords: item.label.toLowerCase(),
      })
      continue
    }
    for (const child of item.children) {
      const searchKey = child.search
        ? Object.entries(child.search)
            .map(([k, v]) => `${k}:${v}`)
            .join(' ')
        : ''
      hits.push({
        id: `child:${item.label}:${child.href}:${child.label}:${searchKey}`,
        section: item.label,
        label: child.label,
        href: child.href,
        search: child.search,
        ready: child.ready,
        keywords: `${item.label} ${child.label} ${searchKey}`.toLowerCase(),
      })
    }
  }
  return hits
}

function filterHits(hits: NavSearchHit[], query: string): NavSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return hits.slice(0, 12)
  const tokens = q.split(/\s+/).filter(Boolean)
  return hits
    .filter(hit => tokens.every(t => hit.keywords.includes(t)))
    .slice(0, 40)
}

function groupHits(hits: NavSearchHit[]): { section: string; items: NavSearchHit[] }[] {
  const map = new Map<string, NavSearchHit[]>()
  for (const hit of hits) {
    const list = map.get(hit.section) ?? []
    list.push(hit)
    map.set(hit.section, list)
  }
  return [...map.entries()].map(([section, items]) => ({ section, items }))
}

function useNavSearchHits() {
  const can = useAuthStore(s => s.can)
  const role = useAuthStore(s => s.user?.role)
  return React.useMemo(() => {
    const source = role === 'temporary_inspector' ? inspectorOnlyNavItems : adminNavItems
    const visible =
      role === 'temporary_inspector' ? source : filterNavByPermission(source, can, role)
    return flattenNavItems(visible)
  }, [can, role])
}

function navigateToHit(
  navigate: ReturnType<typeof useNavigate>,
  hit: NavSearchHit,
) {
  if (hit.ready === false) {
    void navigate({ to: '/in-progress', search: { title: hit.label } })
    return
  }
  if (hit.search && Object.keys(hit.search).length > 0) {
    void navigate({ to: hit.href, search: hit.search })
    return
  }
  void navigate({ to: hit.href })
}

type TopbarNavSearchProps = {
  className?: string
}

/** Desktop inline search over sidebar tabs / sub-tabs. */
export function TopbarNavSearch({ className }: TopbarNavSearchProps) {
  const navigate = useNavigate()
  const allHits = useNavSearchHits()
  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const filtered = React.useMemo(() => filterHits(allHits, query), [allHits, query])
  const grouped = React.useMemo(() => groupHits(filtered), [filtered])
  const showPanel = open && (query.trim().length > 0 || filtered.length > 0)

  React.useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selectHit = (hit: NavSearchHit) => {
    navigateToHit(navigate, hit)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div ref={rootRef} className={cn('relative flex-1 max-w-sm', className)}>
      <Input
        ref={inputRef}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search menu…"
        leftElement={<Search className="h-3.5 w-3.5" />}
        className="h-8 text-xs bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input"
        aria-label="Search sidebar menu"
        data-testid="topbar-nav-search"
        autoComplete="off"
      />
      {showPanel ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          role="listbox"
          data-testid="topbar-nav-search-results"
        >
          <Command shouldFilter={false} className="rounded-none border-0 bg-transparent">
            <CommandList className="max-h-72">
              <CommandEmpty>No matching menu items.</CommandEmpty>
              {grouped.map(group => (
                <CommandGroup key={group.section} heading={group.section}>
                  {group.items.map(hit => (
                    <CommandItem
                      key={hit.id}
                      value={hit.id}
                      onSelect={() => selectHit(hit)}
                      className="cursor-pointer"
                    >
                      <span className="min-w-0 flex-1 truncate">{hit.label}</span>
                      {hit.section !== hit.label ? (
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {hit.section}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  )
}

/** Mobile search trigger + dialog over sidebar tabs / sub-tabs. */
export function TopbarNavSearchMobile() {
  const navigate = useNavigate()
  const allHits = useNavSearchHits()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => filterHits(allHits, query), [allHits, query])
  const grouped = React.useMemo(() => groupHits(filtered), [filtered])

  const selectHit = (hit: NavSearchHit) => {
    navigateToHit(navigate, hit)
    setQuery('')
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Search menu"
        data-testid="topbar-nav-search-mobile"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={next => {
          setOpen(next)
          if (!next) setQuery('')
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0 sm:rounded-xl" size="md">
          <DialogHeader className="sr-only">
            <DialogTitle>Search menu</DialogTitle>
          </DialogHeader>
          <div className="border-b border-border px-3 py-2">
            <Input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search menu…"
              leftElement={<Search className="h-3.5 w-3.5" />}
              className="h-9 border-transparent bg-muted/40"
              data-testid="topbar-nav-search-mobile-input"
            />
          </div>
          <Command shouldFilter={false} className="rounded-none border-0">
            <CommandList className="max-h-[60vh]">
              <CommandEmpty>No matching menu items.</CommandEmpty>
              {grouped.map(group => (
                <CommandGroup key={group.section} heading={group.section}>
                  {group.items.map(hit => (
                    <CommandItem
                      key={hit.id}
                      value={hit.id}
                      onSelect={() => selectHit(hit)}
                    >
                      <span className="min-w-0 flex-1 truncate">{hit.label}</span>
                      {hit.section !== hit.label ? (
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {hit.section}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
