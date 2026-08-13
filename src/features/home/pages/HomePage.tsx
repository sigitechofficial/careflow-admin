import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  MessageSquare, ClipboardList, LayoutDashboard,
  AlertTriangle, Search, X, ChevronLeft,
  ChevronRight, ChevronsLeft, Dot,
  Filter, Globe, Loader2,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { useAuthStore } from '@/features/auth/store'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import type { MultiCarerFunderChargeMode } from '@/features/settings/types'
import { useHandoverReport } from '@/features/home/hooks/useHandoverReport'
import type { HandoverReportSortBy } from '@/features/home/api/handover-report.api'
import { operationalTodayIso, addDaysToOperationalIso } from '@/shared/lib/operational-day.util'

const systemUpgrades = [
  {
    section: 'New Navigation',
    items: [
      'Streamlined menus to navigate the care system',
      'Updated look and feel of the settings screen',
    ],
  },
  {
    section: 'PainChek Enhancements',
    items: ['Send Service User location information to your PainChek product'],
  },
]

type SortBy = HandoverReportSortBy

function multiCarerFunderChargeLabel(mode: MultiCarerFunderChargeMode | undefined): {
  title: string
  detail: string
} {
  if (mode === 'FIXED') {
    return {
      title: 'Fixed visit pay',
      detail: 'Funder is charged once for the visit window length.',
    }
  }
  return {
    title: 'Combined visit pay',
    detail: 'Funder is charged for each carer’s hours (default).',
  }
}

function toIsoDateInput(value: string): string {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (!m) return ''
  return `${m[3]}-${m[2]}-${m[1]}`
}

function formatDisplayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

/* ─── Home Page ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const canManagePortal = useAuthStore(s => s.can('service_users.portal.read'))
  const canReadSettings = useAuthStore(s => s.can('lookups.read'))
  const canReadHandover = useAuthStore(
    s => s.can('schedule.read') || s.can('scheduled_visits.read') || s.can('service_users.read'),
  )
  const generalSettingsQuery = useGeneralSettings(canReadSettings)
  const multiCarerMode = generalSettingsQuery.data?.multiCarerFunderChargeMode ?? 'COMBINED'
  const multiCarerLabel = multiCarerFunderChargeLabel(multiCarerMode)
  const windowHours = generalSettingsQuery.data?.handoverReportLastHours ?? 12

  const today = operationalTodayIso()
  const defaultFrom = addDaysToOperationalIso(today, -1)

  const [showFilter, setShowFilter] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<SortBy>('latest')
  const [fromDate, setFromDate] = React.useState(defaultFrom)
  const [toDate, setToDate] = React.useState(today)
  const [serviceUserSearch, setServiceUserSearch] = React.useState('')
  const [appliedFrom, setAppliedFrom] = React.useState<string | undefined>(undefined)
  const [appliedTo, setAppliedTo] = React.useState<string | undefined>(undefined)
  const [appliedName, setAppliedName] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [dismissed, setDismissed] = React.useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDismissed(true), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  const handoverQuery = useHandoverReport({
    from: appliedFrom,
    to: appliedTo,
    serviceUserName: appliedName || undefined,
    sortBy,
    enabled: canReadHandover,
  })

  const PAGE_SIZE = 2
  const entries = handoverQuery.data?.entries ?? []
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const paged = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  React.useEffect(() => {
    setPage(1)
  }, [appliedFrom, appliedTo, appliedName, sortBy, entries.length])

  const applyFilter = () => {
    const from = toIsoDateInput(fromDate) || fromDate
    const to = toIsoDateInput(toDate) || toDate
    setAppliedFrom(from)
    setAppliedTo(to)
    setAppliedName(serviceUserSearch.trim())
    setPage(1)
  }

  const clearFilter = () => {
    setFromDate(defaultFrom)
    setToDate(today)
    setServiceUserSearch('')
    setAppliedFrom(undefined)
    setAppliedTo(undefined)
    setAppliedName('')
    setPage(1)
  }

  const rangeLabel =
    appliedFrom && appliedTo
      ? `${formatDisplayDate(appliedFrom)} – ${formatDisplayDate(appliedTo)}`
      : `Last ${handoverQuery.data?.windowHours ?? windowHours} hours`

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-muted-foreground" />
            My Action Page
          </div>
          <p className="text-sm text-muted-foreground">
            Your daily overview, handovers, and quick actions.
          </p>
        </div>
      </div>

      {!dismissed && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 px-6 py-4 relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
              <h2 className="text-xl font-bold text-foreground">System Maintenance</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl">
              We'll be carrying out scheduled system maintenance on Monday 11th May. During this time, the system will be unavailable for approximately one hour between 4:00am and 6:00am.
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl">
              We recommend saving any work and ensuring you have the information you need in advance, as access will be temporarily interrupted.
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl">
              We apologise for any inconvenience this may cause and appreciate your understanding while we complete these essential updates.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>My Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ActionRow
                icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
                text={<>You have <strong>0</strong> new message. <ActionLink>Read Message(s)</ActionLink></>}
              />
              <ActionRow
                icon={<ClipboardList className="h-5 w-5 text-teal-500" />}
                text={<>You have <strong>9</strong> Audit Actions pending. <ActionLink>Audit Action(s)</ActionLink></>}
              />
              <ActionRow
                icon={<LayoutDashboard className="h-5 w-5 text-green-500" />}
                text={<ActionLink>View my Management Dashboard</ActionLink>}
              />
              {canManagePortal ? (
                <ActionRow
                  icon={<Globe className="h-5 w-5 text-sky-500" />}
                  text={
                    <>
                      Manage service user portal access.{' '}
                      <Link
                        to="/admin/service-user-portal"
                        className="font-bold text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        Open portal admin
                      </Link>
                    </>
                  }
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Handover Report</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{rangeLabel}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowFilter(f => !f)}
                  disabled={!canReadHandover}
                >
                  {showFilter ? 'Hide Filter' : 'Show Filter'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canReadHandover ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  You do not have permission to view the handover report.
                </p>
              ) : (
                <>
                  {showFilter && (
                    <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-sm font-medium w-36 shrink-0">From</label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={e => setFromDate(e.target.value)}
                          className="flex-1 min-w-[220px] border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-sm font-medium w-36 shrink-0">To</label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={e => setToDate(e.target.value)}
                          className="flex-1 min-w-[220px] border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-sm font-medium w-36 shrink-0">Service User Name</label>
                        <div className="flex gap-2 flex-1 min-w-[220px]">
                          <input
                            type="text"
                            value={serviceUserSearch}
                            onChange={e => setServiceUserSearch(e.target.value)}
                            placeholder="Service User Name"
                            className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            onKeyDown={e => {
                              if (e.key === 'Enter') applyFilter()
                            }}
                          />
                          <button
                            type="button"
                            onClick={applyFilter}
                            className="bg-primary text-primary-foreground rounded-md px-3 py-2 hover:bg-primary/90 transition-colors"
                          >
                            <Search className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={applyFilter}
                          className="border border-border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={clearFilter}
                          className="flex items-center gap-1.5 border border-border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          Clear Filter
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-5 flex-wrap">
                    <span className="text-sm text-muted-foreground">Sort report by</span>
                    {([
                      { value: 'name', label: 'Service User Name' },
                      { value: 'earliest', label: 'Sort by Time Earliest' },
                      { value: 'latest', label: 'Sort by Time Latest' },
                    ] as { value: SortBy; label: string }[]).map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          checked={sortBy === opt.value}
                          onChange={() => {
                            setSortBy(opt.value)
                            setPage(1)
                          }}
                          className="h-4 w-4 accent-primary"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>

                  {handoverQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading handover report…
                    </div>
                  ) : handoverQuery.isError ? (
                    <p className="text-sm text-destructive py-4 text-center">
                      Could not load handover report.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-5 divide-y divide-border">
                        {paged.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No handover notes in this period.
                          </p>
                        ) : (
                          paged.map(entry => (
                            <div key={entry.id} className="pt-4 first:pt-0">
                              <Link
                                to="/service-users/$serviceUserId"
                                params={{ serviceUserId: entry.serviceUserId }}
                                className="text-primary hover:underline font-semibold text-sm text-left"
                              >
                                {entry.serviceUserName}
                              </Link>
                              <p className="text-sm font-medium mt-0.5">
                                {entry.timeLabel} - {entry.task} - {entry.carerName}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-4">
                                {entry.notes}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {entries.length > PAGE_SIZE && (
                        <div className="flex items-center justify-center gap-1 pt-2">
                          <PaginationBtn onClick={() => setPage(1)} disabled={page === 1}>
                            <ChevronsLeft className="h-3.5 w-3.5" />
                            <span>First Page</span>
                          </PaginationBtn>
                          <PaginationBtn
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span>Previous</span>
                          </PaginationBtn>
                          <span className="text-xs text-muted-foreground px-2">
                            {page} / {totalPages}
                          </span>
                          <PaginationBtn
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            <span>Next</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </PaginationBtn>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="pt-5">
              <h2 className="font-bold text-base mb-4">System Upgrades 27/01/2026</h2>
              <div className="space-y-4">
                {systemUpgrades.map(group => (
                  <div key={group.section}>
                    <p className="text-sm font-medium mb-2">{group.section}</p>
                    <ul className="space-y-1.5">
                      {group.items.map(item => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Dot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {canReadSettings ? (
            <Card data-testid="home-multi-carer-funder-charging">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold text-base">Multi-carer funder charging</h2>
                  <Link
                    to="/settings/general"
                    search={{ tab: 'dom-care' }}
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                  >
                    Change in settings
                  </Link>
                </div>
                {generalSettingsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading setting…</p>
                ) : generalSettingsQuery.isError ? (
                  <p className="text-sm text-destructive">Could not load this setting.</p>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 space-y-1">
                    <p className="text-sm font-medium text-foreground">{multiCarerLabel.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {multiCarerLabel.detail}
                    </p>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Mode:{' '}
                      <span className="font-mono font-medium text-foreground">{multiCarerMode}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>Version Number - 5.9.2</span>
        <span>Licence expire on 31 Dec 50</span>
      </div>
    </div>
  )
}

function ActionRow({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <span className="shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function ActionLink({ children }: { children: React.ReactNode }) {
  return (
    <button className="font-bold text-foreground hover:text-primary hover:underline transition-colors">
      {children}
    </button>
  )
}

function PaginationBtn({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1 rounded border border-border text-xs transition-colors',
        disabled
          ? 'opacity-40 cursor-not-allowed bg-muted'
          : 'hover:bg-muted bg-background',
      )}
    >
      {children}
    </button>
  )
}
