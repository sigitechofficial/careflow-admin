import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlarmClock, FileInput, FolderOpen, Inbox, Plus, Search, TrendingUp, Trophy, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { StatCard } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { LoadingSpinner } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { CrmSectionLayout } from '@/features/crm/components/CrmSectionLayout'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useEnquiries, useEnquiryOwners } from '@/features/crm/hooks/useCrm'
import {
  BOARD_STAGES,
  SOURCE_LABELS,
  SOURCE_OPTIONS,
  STAGE_CLASS,
  STAGE_LABELS,
  URGENCY_LABELS,
  URGENCY_OPTIONS,
  isFollowUpOverdue,
} from '@/features/crm/crm-labels'
import type { Enquiry, EnquiryKind, EnquirySource, EnquiryUrgency } from '@/features/crm/types/crm.types'

type KindTab = 'ALL' | EnquiryKind
const KIND_TABS: { key: KindTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ENQUIRY', label: 'Enquiries' },
  { key: 'REFERRAL', label: 'Referrals' },
]

/** Pipeline figures for the rows on the chosen tab (before the toolbar filters). */
function pipelineSummary(rows: Enquiry[]) {
  const won = rows.filter(e => e.stage === 'WON').length
  const lost = rows.filter(e => e.stage === 'LOST').length
  const decided = won + lost
  return {
    total: rows.length,
    open: rows.length - decided,
    won,
    lost,
    winRate: decided ? Math.round((won / decided) * 100) : 0,
    followUpsDue: rows.filter(isFollowUpOverdue).length,
  }
}

function initialsOf(first?: string | null, last?: string | null): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'
}

function nameInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return initialsOf(parts[0], parts.length > 1 ? parts[parts.length - 1] : '')
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

const selectClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm'

type Filters = {
  q: string
  source: EnquirySource | ''
  urgency: EnquiryUrgency | ''
  owner: string // '' all · 'none' unassigned · user id
  overdueOnly: boolean
}

const EMPTY_FILTERS: Filters = { q: '', source: '', urgency: '', owner: '', overdueOnly: false }

function matches(e: Enquiry, f: Filters): boolean {
  if (f.source && e.source !== f.source) return false
  if (f.urgency && e.urgency !== f.urgency) return false
  if (f.owner === 'none' && e.ownerId) return false
  if (f.owner && f.owner !== 'none' && e.ownerId !== f.owner) return false
  if (f.overdueOnly && !isFollowUpOverdue(e)) return false
  const q = f.q.trim().toLowerCase()
  if (q) {
    const hay = [
      e.firstName,
      e.lastName,
      e.referenceNumber,
      e.contactName,
      e.contactPhone,
      e.postcode,
      e.referringOrganisation,
      e.referralReference,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

function EnquiryCard({ e }: { e: Enquiry }) {
  const overdue = isFollowUpOverdue(e)
  return (
    <Link
      to="/crm/$enquiryId"
      params={{ enquiryId: e.id }}
      className={`group rounded-lg border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md ${
        overdue ? 'border-red-300 dark:border-red-900' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initialsOf(e.firstName, e.lastName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium group-hover:text-primary">
            {e.firstName} {e.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {e.referenceNumber}
            {e.locationName ? ` · ${e.locationName}` : ''}
          </p>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {e.kind === 'REFERRAL' && (
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Referral
            </span>
          )}
          {e.urgency !== 'ROUTINE' && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-950 dark:text-red-300">
              {URGENCY_LABELS[e.urgency]}
            </span>
          )}
        </span>
      </div>

      {overdue && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <AlarmClock className="h-3 w-3" aria-hidden />
          Follow-up overdue
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{e.kind === 'REFERRAL' && e.referringOrganisation ? e.referringOrganisation : SOURCE_LABELS[e.source]}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span>{daysSince(e.stageChangedAt)}d</span>
          <span
            title={e.ownerName ? `Owner: ${e.ownerName}` : 'Unassigned'}
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${
              e.ownerName ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'border border-dashed border-border'
            }`}
          >
            {e.ownerName ? nameInitials(e.ownerName) : ''}
          </span>
        </span>
      </div>
    </Link>
  )
}

export default function EnquiryBoardPage() {
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can)('crm.manage')
  const { locationId: headerLocationId } = useGlobalLocationScope()
  const { data: enquiries, isLoading } = useEnquiries(headerLocationId ? { locationId: headerLocationId } : undefined)
  const { data: owners = [] } = useEnquiryOwners()
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS)
  const [tab, setTab] = React.useState<KindTab>('ALL')
  const tabRows = React.useMemo(
    () => (enquiries ?? []).filter(e => tab === 'ALL' || e.kind === tab),
    [enquiries, tab],
  )
  const summary = React.useMemo(() => (enquiries ? pipelineSummary(tabRows) : null), [enquiries, tabRows])
  const countFor = (k: KindTab) => (enquiries ?? []).filter(e => k === 'ALL' || e.kind === k).length
  const noun = tab === 'REFERRAL' ? 'referrals' : tab === 'ENQUIRY' ? 'enquiries' : 'enquiries & referrals'

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }))

  const filtered = React.useMemo(() => tabRows.filter(e => matches(e, filters)), [tabRows, filters])
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  const byStage = React.useMemo(() => {
    const map: Record<string, Enquiry[]> = {}
    for (const s of BOARD_STAGES) map[s] = []
    for (const e of filtered) (map[e.stage] ??= []).push(e)
    return map
  }, [filtered])

  return (
    <CrmSectionLayout
      title="Enquiries & Referrals"
      description="Capture enquiries and referrals, move them through the pipeline and convert them to clients."
      testId="crm-board-page"
      actions={
        canManage
          ? [
              {
                label: 'New enquiry',
                icon: <Plus className="h-4 w-4" aria-hidden />,
                onClick: () => navigate({ to: '/crm/new' }),
              },
              {
                label: 'New referral',
                icon: <FileInput className="h-4 w-4" aria-hidden />,
                onClick: () => navigate({ to: '/crm/new', search: { kind: 'REFERRAL' } }),
              },
            ]
          : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label="Show" className="inline-flex self-start rounded-lg border border-border bg-muted/40 p-1">
          {KIND_TABS.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{countFor(t.key)}</span>
            </button>
          ))}
        </div>

        {summary && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label={`Total ${noun}`} value={summary.total} tone="primary" icon={<Inbox className="h-4 w-4" aria-hidden />} />
            <StatCard label="Open" value={summary.open} tone="sky" icon={<FolderOpen className="h-4 w-4" aria-hidden />} />
            <StatCard label="Won" value={summary.won} tone="emerald" icon={<Trophy className="h-4 w-4" aria-hidden />} />
            <StatCard
              label="Win rate"
              value={`${summary.winRate}%`}
              tone="violet"
              hint={`${summary.won} won · ${summary.lost} lost`}
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
            />
            <StatCard
              label="Follow-ups due"
              value={summary.followUpsDue ?? 0}
              tone={summary.followUpsDue ? 'rose' : 'muted'}
              hint={`Open ${noun} past their follow-up date`}
              icon={<AlarmClock className="h-4 w-4" aria-hidden />}
            />
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="pl-8"
              placeholder="Search name, ref, contact, postcode, referrer…"
              value={filters.q}
              onChange={e => setFilter('q', e.target.value)}
            />
          </div>
          <select className={selectClass} value={filters.source} onChange={e => setFilter('source', e.target.value as EnquirySource | '')}>
            <option value="">All sources</option>
            {SOURCE_OPTIONS.map(s => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          <select className={selectClass} value={filters.urgency} onChange={e => setFilter('urgency', e.target.value as EnquiryUrgency | '')}>
            <option value="">Any urgency</option>
            {URGENCY_OPTIONS.map(u => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]}
              </option>
            ))}
          </select>
          <div className="w-52">
            <Combobox
              options={[
                { value: 'none', label: 'Unassigned' },
                ...owners.map(o => ({ value: o.id, label: o.name })),
              ]}
              value={filters.owner}
              onChange={v => setFilter('owner', v)}
              placeholder="All owners"
              searchPlaceholder="Search staff…"
              emptyText="No staff member found."
              aria-label="Filter by owner"
            />
          </div>
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
            <input
              type="checkbox"
              checked={filters.overdueOnly}
              onChange={e => setFilter('overdueOnly', e.target.checked)}
            />
            Follow-up overdue
          </label>
          {isFiltered && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => setFilters(EMPTY_FILTERS)}>
              <X className="mr-1 h-4 w-4" aria-hidden />
              Clear
            </Button>
          )}
          {isFiltered && (
            <span className="text-xs text-muted-foreground">
              {filtered.length} of {tabRows.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {BOARD_STAGES.map(stage => {
              const items = byStage[stage] ?? []
              return (
                <div key={stage} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_CLASS[stage]}`}>
                      {STAGE_LABELS[stage]}
                    </span>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex min-h-[120px] flex-col gap-2 p-2">
                    {items.map(e => (
                      <EnquiryCard key={e.id} e={e} />
                    ))}
                    {items.length === 0 && (
                      <p className="rounded-lg border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
                        No {noun}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CrmSectionLayout>
  )
}
