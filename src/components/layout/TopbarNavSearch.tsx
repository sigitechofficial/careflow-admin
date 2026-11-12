import * as React from 'react'
import { CornerDownLeft, Search, X } from 'lucide-react'
import { GroupHeading, KIND_LOOK, RESULT_ITEM_CLASS, ResultRow, recordLook, type ResultLook } from '@/components/layout/find-results-ui'
import { useNavigate } from '@tanstack/react-router'
import { useRecordSearch, type RecordSearchHit } from '@/components/layout/useRecordSearch'
import { useAuthStore } from '@/features/auth/store'
import { locate, useFindEntries } from '@/features/search/find-entries'
import { clearRecent, openFindTarget, readRecent, type FindTarget } from '@/features/search/find-navigation'
import { insideRecordHits } from '@/features/search/inside-records'
import { normalise, queryTerms, rank, type ScoredEntry } from '@/features/search/search-engine'
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
const PER_GROUP = { 'How to': 3, Pages: 6, Tabs: 5, Settings: 6 } as Record<string, number>
/** People are what most searches are for: right after pages and tabs. */
const PEOPLE = new Set(['Service users', 'Staff'])
const MENTIONS_SHOWN = 5

type Group =
  | { key: string; kind: 'app'; label: string; look: ResultLook; items: ScoredEntry[] }
  | { key: string; kind: 'records'; label: string; look: ResultLook; items: RecordSearchHit[] }

/** A record whose name has every typed word (at the start of a word); others only mention them inside. */
function namedMatch(hit: RecordSearchHit, query: string): boolean {
  const name = ` ${normalise(`${hit.label} ${hit.detail ?? ''}`)} `
  const terms = queryTerms(query)
  return terms.length > 0 && terms.every(alts => alts.some(a => name.includes(` ${a}`)))
}

/**
 * The results for one query, best first: shortcuts, pages and tabs, people, settings, how-to and other records
 * whose name matches; last, records that only mention the words somewhere inside.
 */
function useFindResults(query: string) {
  const prepared = useFindEntries()
  const records = useRecordSearch(query)
  const app = React.useMemo(() => (query.trim() ? rank(prepared, query, 80) : []), [prepared, query])
  const inside = React.useMemo(() => insideRecordHits(query, records.hits), [query, records.hits])
  const { groups, mentions } = React.useMemo(() => {
    const byKind = new Map<string, ScoredEntry[]>()
    for (const e of app) {
      const g = KIND_GROUP[e.kind]
      const list = byKind.get(g) ?? []
      if (list.length < (PER_GROUP[g] ?? 6)) list.push(e)
      byKind.set(g, list)
    }
    const named = records.hits.filter(h => namedMatch(h, query))
    const mentioned = records.hits.filter(h => !namedMatch(h, query))
    const bySection = new Map<string, RecordSearchHit[]>()
    for (const h of named) bySection.set(h.section, [...(bySection.get(h.section) ?? []), h])
    const appGroup = (label: string, look: ResultLook): Group[] =>
      byKind.get(label)?.length ? [{ key: `app:${label}`, kind: 'app', label, look, items: byKind.get(label)! }] : []
    const recordGroups = (keep: (section: string) => boolean): Group[] =>
      [...bySection]
        .filter(([section]) => keep(section))
        .map(([section, items]) => ({ key: `rec:${section}`, kind: 'records' as const, label: section, look: recordLook(section), items }))
    return {
      groups: [
        ...appGroup('Pages', KIND_LOOK.page),
        ...appGroup('Tabs', KIND_LOOK.tab),
        ...recordGroups(s => PEOPLE.has(s)),
        ...appGroup('Settings', KIND_LOOK.setting),
        ...appGroup('How to', KIND_LOOK.howto),
        ...recordGroups(s => !PEOPLE.has(s)),
      ],
      mentions: mentioned.slice(0, MENTIONS_SHOWN),
    }
  }, [app, records.hits, query])
  return { groups, mentions, inside, records, empty: !app.length && !records.hits.length && !records.suggested.length }
}

/** The results list (desktop drop-down and mobile dialog). Arrow keys move, Enter opens. */
function FindResults({ query, onPick }: { query: string; onPick: (t: FindTarget) => void }) {
  const userId = useAuthStore(s => s.user?.id)
  const { groups, mentions, inside, records, empty } = useFindResults(query)
  const [recent, setRecent] = React.useState(() => readRecent(userId))
  const recordTarget = (hit: RecordSearchHit): FindTarget => ({
    id: hit.id,
    title: hit.label,
    context: hit.detail,
    trail: locate(hit.href),
    section: hit.section,
    href: hit.href,
    search: hit.search,
  })
  const recordItem = (hit: RecordSearchHit, look: ResultLook, q: string, showKind = false) => (
    <CommandItem key={hit.id} value={hit.id} onSelect={() => onPick(recordTarget(hit))} className={RESULT_ITEM_CLASS}>
      <ResultRow look={look} title={hit.label} query={q} trail={showKind ? [hit.section, ...locate(hit.href)] : locate(hit.href)} detail={hit.detail} />
    </CommandItem>
  )

  if (!query.trim()) {
    return (
      <CommandList className="max-h-[70vh] p-1">
        {recent.length ? (
          <CommandGroup
            heading={
              <span className="flex items-center justify-between">
                <GroupHeading look={KIND_LOOK.recent} label="Recent" count={recent.length} />
                <button
                  type="button"
                  className="text-[10px] font-normal normal-case text-muted-foreground hover:text-foreground"
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
              <CommandItem key={`recent:${r.id}`} value={`recent:${r.id}`} onSelect={() => onPick(r)} className={RESULT_ITEM_CLASS}>
                <ResultRow look={r.section ? recordLook(r.section) : KIND_LOOK.recent} title={r.title} query="" trail={r.trail} detail={r.context} />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : (
          <p className="px-3 py-3 text-xs leading-5 text-muted-foreground">
            Search people, records, documents, pages, tabs and settings, or ask “how do I…”. Try a name, “rota”, “PPE” or “multiple device”.
          </p>
        )}
      </CommandList>
    )
  }

  return (
    <CommandList className="max-h-[70vh] p-1">
      <CommandEmpty>{records.pending ? 'Searching…' : 'Nothing found. Try another word, or fewer words.'}</CommandEmpty>
      {inside.length ? (
        <CommandGroup heading={<GroupHeading look={KIND_LOOK.inside} label="Go straight to" count={inside.length} />}>
          {inside.map(h => (
            <CommandItem key={h.id} value={h.id} onSelect={() => onPick({ ...recordTarget(h), section: undefined })} className={RESULT_ITEM_CLASS}>
              <ResultRow look={KIND_LOOK.inside} title={h.label} query={query} trail={locate(h.href)} detail={h.detail} />
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {records.didYouMean && records.suggested.length ? (
        <CommandGroup heading={<GroupHeading look={KIND_LOOK.suggested} label={`Did you mean “${records.didYouMean}”?`} count={records.suggested.length} />}>
          {records.suggested.map(hit => recordItem(hit, recordLook(hit.section), records.didYouMean ?? ''))}
        </CommandGroup>
      ) : null}
      {groups.map(group => (
        <CommandGroup key={group.key} heading={<GroupHeading look={group.look} label={group.label} count={group.items.length} />}>
          {group.kind === 'app'
            ? group.items.map(e => (
                <CommandItem
                  key={e.id}
                  value={e.id}
                  onSelect={() => onPick({ id: e.id, title: e.title, context: e.context, trail: e.trail, href: e.href, search: e.search, highlight: e.highlight })}
                  className={RESULT_ITEM_CLASS}
                  data-testid={`find-result-${e.kind}`}
                >
                  <ResultRow
                    look={KIND_LOOK[e.kind]}
                    title={e.title}
                    query={query}
                    // A page's trail ends with the page itself: show the way there. Answers and settings: where they are.
                    trail={e.kind === 'setting' || e.kind === 'howto' ? e.trail : e.trail?.slice(0, -1)}
                    answer={e.answer}
                  />
                </CommandItem>
              ))
            : group.items.map(hit => recordItem(hit, group.look, query))}
        </CommandGroup>
      ))}
      {mentions.length ? (
        <CommandGroup heading={<GroupHeading look={KIND_LOOK.mentions} label={`Also mentions “${query.trim()}”`} count={mentions.length} />}>
          {mentions.map(hit => recordItem(hit, recordLook(hit.section), query, true))}
        </CommandGroup>
      ) : null}
      {records.pending && !records.hits.length && !empty ? <p className="px-3 py-2 text-[11px] text-muted-foreground">Searching records…</p> : null}
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
            className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
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
