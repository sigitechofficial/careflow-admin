import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CalendarPlus, ClipboardCheck, PlayCircle, Search } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import type { AuditFilters, AuditTab } from '../types'
import { useAuditDashboard, useAudits } from '../hooks'
import { TAB_LABEL } from '../labels'
import { HELP } from '../help'
import { AuditFiltersBar } from '../components/AuditFiltersBar'
import { AuditTimeline } from '../components/AuditTimeline'
import { AuditTable } from '../components/AuditTable'
import { ConductAuditDialog } from '../components/ConductAuditDialog'
import { ScheduleAuditDialog } from '../components/ScheduleAuditDialog'

const TABS: { tab: AuditTab; key: 'overdue' | 'due' | 'inProgress' | 'completed' | 'missed'; ring: string }[] = [
  { tab: 'OVERDUE', key: 'overdue', ring: 'border-warning text-warning' },
  { tab: 'DUE', key: 'due', ring: 'border-info text-info' },
  { tab: 'IN_PROGRESS', key: 'inProgress', ring: 'border-primary text-primary' },
  { tab: 'COMPLETED', key: 'completed', ring: 'border-success text-success' },
  { tab: 'MISSED', key: 'missed', ring: 'border-destructive text-destructive' },
]

const EMPTY: Record<AuditTab, string> = {
  OVERDUE: 'Nothing overdue.',
  DUE: 'No audits due. Schedule one, or conduct one now.',
  IN_PROGRESS: 'No audits in progress.',
  COMPLETED: 'No completed audits yet.',
  MISSED: 'No missed audits.',
}

/** Governance → Audits: the dashboard (all audits), or My audits (those you are accountable for). */
export default function AuditDashboardPage({ mine = false }: { mine?: boolean }) {
  const navigate = useNavigate()
  const me = useAuthStore(s => s.user?.id)
  const canManage = useAuthStore(s => s.can('quality_audits.manage'))
  const [filters, setFilters] = React.useState<AuditFilters>({})
  const [tab, setTab] = React.useState<AuditTab>('OVERDUE')
  const [search, setSearch] = React.useState('')
  const [q, setQ] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [conductOpen, setConductOpen] = React.useState(false)
  const [scheduleOpen, setScheduleOpen] = React.useState(false)

  const effective: AuditFilters = mine ? { ...filters, accountableUserId: me } : filters
  const dashboard = useAuditDashboard(effective)
  const list = useAudits({ ...effective, tab, q: q || undefined, page, limit: 20 })
  const counts = dashboard.data?.counts
  const error =
    list.error instanceof ApiError ? list.error.message : list.error || dashboard.error ? 'Could not load audits.' : null

  // Open on the first tab that has something in it, once the counts arrive.
  const picked = React.useRef(false)
  React.useEffect(() => {
    if (picked.current || !counts) return
    picked.current = true
    const first = TABS.find(t => counts[t.key] > 0)
    if (first) setTab(first.tab)
  }, [counts])

  const open = (id: string) => void navigate({ to: '/governance/audits/$auditId', params: { auditId: id } })
  const changeFilters = (f: AuditFilters) => {
    setFilters(f)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4" data-testid={mine ? 'my-audits-page' : 'audit-dashboard-page'}>
      <PageHeader
        title={mine ? 'My audits' : 'Audits'}
        description={
          mine
            ? 'The audits you are accountable for.'
            : 'Audits due, in progress and done for each branch, with their results.'
        }
        icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />}
        info={HELP.dashboard}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Governance' }, { label: mine ? 'My audits' : 'Audits' }]}
        actions={
          canManage
            ? [
                {
                  label: 'Schedule audit',
                  onClick: () => setScheduleOpen(true),
                  icon: <CalendarPlus className="h-4 w-4" />,
                  variant: 'outline' as const,
                },
                { label: 'Conduct audit', onClick: () => setConductOpen(true), icon: <PlayCircle className="h-4 w-4" /> },
              ]
            : []
        }
      />

      <form
        className="flex flex-col items-center gap-3 rounded-xl bg-primary px-4 py-5 text-primary-foreground shadow-sm"
        onSubmit={e => {
          e.preventDefault()
          setQ(search.trim())
          setPage(1)
        }}
        role="search"
      >
        <h2 className="text-base font-semibold">{mine ? 'My audits' : 'Audit dashboard'}</h2>
        <div className="flex w-full max-w-xl gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type a word to find an audit"
              className="bg-background pl-9 text-foreground"
              aria-label="Find an audit"
              data-testid="audit-search"
            />
          </div>
          <Button type="submit" variant="secondary" data-testid="audit-search-submit">
            Search
          </Button>
        </div>
      </form>

      <div className="flex items-center gap-1.5">
        <InfoTip label="timeline">{HELP.timeline}</InfoTip>
        <span className="text-xs text-muted-foreground">Audits by month, for the filters below</span>
      </div>
      <AuditTimeline data={dashboard.data} loading={dashboard.isLoading} />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Audits by status">
          {TABS.map(t => (
            <button
              key={t.tab}
              type="button"
              role="tab"
              aria-selected={tab === t.tab}
              onClick={() => {
                setTab(t.tab)
                setPage(1)
              }}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                tab === t.tab ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted/30',
              )}
              data-testid={`audit-tab-${t.tab}`}
            >
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm tabular-nums', t.ring)}>
                {counts ? counts[t.key] : '–'}
              </span>
              {TAB_LABEL[t.tab]}
            </button>
          ))}
          <InfoTip label="tabs">{HELP.tabs}</InfoTip>
        </div>
        <AuditFiltersBar value={filters} onChange={changeFilters} showPerson={!mine} className="mb-3">
          {q ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setQ('')
                setSearch('')
              }}
            >
              Clear search “{q}”
            </Button>
          ) : null}
        </AuditFiltersBar>
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        <AuditTable
          rows={list.data?.rows ?? []}
          loading={list.isLoading}
          empty={EMPTY[tab]}
          onOpen={open}
          completed={tab === 'COMPLETED'}
          page={page}
          totalPages={list.data?.totalPages}
          onPage={setPage}
        />
      </div>

      <ConductAuditDialog open={conductOpen} onOpenChange={setConductOpen} onStarted={open} />
      <ScheduleAuditDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </div>
  )
}

export function MyAuditsPage() {
  return <AuditDashboardPage mine />
}
