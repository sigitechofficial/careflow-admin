import * as React from 'react'
import { CornerDownLeft, History, Search, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useRecordSearch, type RecordSearchHit } from '@/components/layout/useRecordSearch'
import { useAuthStore } from '@/features/auth/store'
import { useFindEntries } from '@/features/search/find-entries'
import { clearRecent, openFindTarget, readRecent, type FindTarget } from '@/features/search/find-navigation'
import { insideRecordHits } from '@/features/search/inside-records'
import { rank, type ScoredEntry } from '@/features/search/search-engine'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/shared/ui/command'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

const KIND_GROUP: Record<ScoredEntry['kind'], string> = {
  howto: 'How to',
  page: 'Pages',
  tab: 'Tabs',
  setting: 'Settings',
}
const GROUP_ORDER = ['How to', 'Pages', 'Tabs', 'Settings']
const PER_GROUP = { 'How to': 3, Pages: 8, Tabs: 6, Settings: 8 } as Record<string, number>

/** The search results for one query: records (from the server), inside-record shortcuts, then the app itself. */
function useFindResults(query: string) {
  const prepared = useFindEntries()
  const records = useRecordSearch(query)
  const app = React.useMemo(() => (query.trim() ? rank(prepared, query, 80) : []), [prepared, query])
  const appGroups = React.useMemo(() => {
    const groups = new Map<string, ScoredEntry[]>()
    for (const e of app) {
      const g = KIND_GROUP[e.kind]
      const list = groups.get(g) ?? []
      if (list.length < (PER_GROUP[g] ?? 6)) list.push(e)
      groups.set(g, list)
    }
    return GROUP_ORDER.filter(g => groups.get(g)?.length).map(g => ({ section: g, items: groups.get(g)! }))
  }, [app])
  const inside = React.useMemo(() => insideRecordHits(query, records.hits), [query, records.hits])
  const recordGroups = React.useMemo(() => {
    const map = new Map<string, RecordSearchHit[]>()
    for (const h of records.hits) map.set(h.section, [...(map.get(h.section) ?? []), h])
    return [...map].map(([section, items]) => ({ section, items }))
  }, [records.hits])
  return { appGroups, recordGroups, inside, records, empty: !app.length && !records.hits.length && !records.suggested.length }
}

function ResultRow({ title, context, answer }: { title: string; context?: string; answer?: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {context ? <span className="shrink-0 truncate text-[10px] text-muted-foreground max-w-[50%]">{context}</span> : null}
      </span>
      {answer ? <span className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{answer}</span> : null}
    </span>
  )
}

/** The results list (desktop drop-down and mobile dialog). Arrow keys move, Enter opens. */
function FindResults({ query, onPick }: { query: string; onPick: (t: FindTarget) => void }) {
  const userId = useAuthStore(s => s.user?.id)
  const { appGroups, recordGroups, inside, records, empty } = useFindResults(query)
  const [recent, setRecent] = React.useState(() => readRecent(userId))

  if (!query.trim()) {
    return (
      <CommandList className="max-h-[70vh]">
        {recent.length ? (
          <CommandGroup
            heading={
              <span className="flex items-center justify-between">
                <span>Recent</span>
                <button
                  type="button"
                  className="text-[10px] font-normal text-muted-foreground hover:text-foreground"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    clearRecent(userId)
                    setRecent([])
                  }}
                >
                  Clear
                </button>
              </span>
            }
          >
            {recent.map(r => (
              <CommandItem key={`recent:${r.id}`} value={`recent:${r.id}`} onSelect={() => onPick(r)} className="cursor-pointer">
                <History className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <ResultRow title={r.title} context={r.context} />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            Search people, records, pages, tabs and settings, or ask “how do I…”. Try a name, “rota”, “PPE” or “multiple device”.
          </p>
        )}
      </CommandList>
    )
  }

  return (
    <CommandList className="max-h-[70vh]">
      <CommandEmpty>{records.pending ? 'Searching…' : 'Nothing found. Try another word, or fewer words.'}</CommandEmpty>
      {inside.length ? (
        <CommandGroup heading="Go straight to">
          {inside.map(h => (
            <CommandItem key={h.id} value={h.id} onSelect={() => onPick({ id: h.id, title: h.label, context: h.detail, href: h.href, search: h.search })} className="cursor-pointer">
              <ResultRow title={h.label} context={h.detail} />
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {records.didYouMean && records.suggested.length ? (
        <CommandGroup heading={`Did you mean “${records.didYouMean}”?`}>
          {records.suggested.map(hit => (
            <CommandItem
              key={`suggested:${hit.id}`}
              value={`suggested:${hit.id}`}
              onSelect={() => onPick({ id: hit.id, title: hit.label, context: hit.detail ?? hit.section, href: hit.href, search: hit.search })}
              className="cursor-pointer"
            >
              <ResultRow title={hit.label} context={hit.detail ?? hit.section} />
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {recordGroups.map(group => (
        <CommandGroup key={`records:${group.section}`} heading={group.section}>
          {group.items.map(hit => (
            <CommandItem
              key={hit.id}
              value={hit.id}
              onSelect={() => onPick({ id: hit.id, title: hit.label, context: hit.detail ?? group.section, href: hit.href, search: hit.search })}
              className="cursor-pointer"
            >
              <ResultRow title={hit.label} context={hit.detail} />
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
      {records.pending && !records.hits.length && !empty ? <p className="px-3 py-2 text-[11px] text-muted-foreground">Searching records…</p> : null}
      {appGroups.map(group => (
        <CommandGroup key={group.section} heading={group.section}>
          {group.items.map(e => (
            <CommandItem
              key={e.id}
              value={e.id}
              onSelect={() => onPick({ id: e.id, title: e.title, context: e.context, href: e.href, search: e.search, highlight: e.highlight })}
              className="cursor-pointer"
              data-testid={`find-result-${e.kind}`}
            >
              <ResultRow title={e.title} context={e.context} answer={e.answer} />
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </CommandList>
  )
}

function usePick(after: () => void) {
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.user?.id)
  return React.useCallback(
    (t: FindTarget) => {
      openFindTarget(navigate, t, userId)
      after()
    },
    [navigate, userId, after],
  )
}

type TopbarNavSearchProps = {
  className?: string
}

/** "Find anything" in the top bar: Ctrl+K or / to start typing from anywhere. */
export function TopbarNavSearch({ className }: TopbarNavSearchProps) {
  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const close = React.useCallback(() => {
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }, [])
  const pick = usePick(close)

  // Ctrl+K (⌘K) anywhere, or "/" when not typing in a field.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(input|textarea|select)$/i.test(e.target.tagName))
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative flex-1 max-w-md', className)}>
      <Command
        shouldFilter={false}
        loop
        className="overflow-visible rounded-none bg-transparent"
        onKeyDown={e => {
          if (e.key === 'Escape') close()
        }}
      >
        <Input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Find anything…  (Ctrl+K)"
          leftElement={<Search className="h-3.5 w-3.5" />}
          className="h-8 text-xs bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input"
          aria-label="Find anything: people, records, pages, tabs and settings"
          data-testid="topbar-nav-search"
          autoComplete="off"
        />
        {open ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 min-w-[22rem] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
            data-testid="topbar-nav-search-results"
          >
            <FindResults query={query} onPick={pick} />
            <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              <span>↑↓ to move</span>
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" aria-hidden /> to open
              </span>
              <span>Esc to close</span>
            </div>
          </div>
        ) : null}
      </Command>
    </div>
  )
}

/** Mobile: a search button that opens the same results in a dialog. */
export function TopbarNavSearchMobile() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const close = React.useCallback(() => {
    setQuery('')
    setOpen(false)
  }, [])
  const pick = usePick(close)

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Find anything" data-testid="topbar-nav-search-mobile" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={next => (next ? setOpen(true) : close())}>
        <DialogContent className="max-w-md gap-0 p-0 sm:rounded-xl" size="md">
          <DialogHeader className="sr-only">
            <DialogTitle>Find anything</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false} loop className="rounded-none border-0">
            <div className="flex items-center gap-1 border-b border-border px-3 py-2">
              <Input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Find anything…"
                leftElement={<Search className="h-3.5 w-3.5" />}
                className="h-9 border-transparent bg-muted/40"
                data-testid="topbar-nav-search-mobile-input"
              />
              {query ? (
                <Button variant="ghost" size="icon" aria-label="Clear" onClick={() => setQuery('')}>
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <FindResults query={query} onPick={pick} />
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
