import * as React from 'react'
import { ChevronDown, ChevronRight, History, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { EmptyState, PageHeader } from '@/shared/ui/page-elements'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant, operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useHoursHistory } from '@/features/hours-approvals/hooks'
import type {
  HoursApprovalType,
  HoursHistoryEvent,
  HoursHistoryGroup,
  HoursHistoryGroupBy,
  HoursHistoryKind,
} from '@/features/hours-approvals/types'

const GROUP_TABS: { id: HoursHistoryGroupBy; label: string }[] = [
  { id: 'carer', label: 'Carers' },
  { id: 'service_user', label: 'Service users' },
]

const KIND_LABEL: Record<HoursHistoryKind, string> = {
  EXTRA_HOURS: 'Extra hours',
  HOURS_REQUEST: 'Hours requests',
  EXTRA_VISIT: 'Extra visits',
  SPECIAL_VISIT: 'Special visits',
}

/** Which records each tab holds (special visits belong to a carer, extra visits to a service user). */
const KINDS_BY_GROUP: Record<HoursHistoryGroupBy, HoursHistoryKind[]> = {
  carer: ['EXTRA_HOURS', 'HOURS_REQUEST', 'SPECIAL_VISIT'],
  service_user: ['HOURS_REQUEST', 'EXTRA_VISIT'],
}

const REQUEST_LABEL: Record<HoursApprovalType, string> = {
  ROTA_VISIT_OVER_HOURS: "Visit over the carer's weekly hours",
  VISIT_PLAN_OVER_HOURS: "Visit plan over the carer's weekly hours",
  CONTRACTED_HOURS_CHANGE: 'Contracted hours change',
  SERVICE_USER_WEEKLY_HOURS_CHANGE: 'Weekly hours change',
  EXTRA_VISIT_OVER_HOURS: 'Extra visit over the weekly hours',
  DRAFT_PLAN_OVER_HOURS: 'Draft visit plan over the weekly hours',
  EXTRA_WEEKLY_HOURS: 'Extra weekly hours (waiting for approval)',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  ACTIVE: 'Given',
  CREATED: 'Added',
}

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
  ACTIVE: 'success',
  CREATED: 'secondary',
}

function hoursText(n: number | null | undefined): string {
  if (n == null) return '—'
  const r = Math.round(n * 10) / 10
  return `${Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)}h`
}

function summaryOf(group: HoursHistoryGroup): string {
  const parts: string[] = []
  const extras = group.events.filter(e => e.kind === 'EXTRA_HOURS')
  if (extras.length) {
    const given = extras.filter(e => e.status === 'ACTIVE').reduce((sum, e) => sum + (e.hours ?? 0), 0)
    parts.push(`${extras.length} extra hours grant${extras.length === 1 ? '' : 's'} (+${hoursText(given)})`)
  }
  const requests = group.events.filter(e => e.kind === 'HOURS_REQUEST')
  if (requests.length) {
    const count = (s: string) => requests.filter(e => e.status === s).length
    const detail = [
      count('APPROVED') ? `${count('APPROVED')} approved` : null,
      count('REJECTED') ? `${count('REJECTED')} rejected` : null,
      count('PENDING') ? `${count('PENDING')} pending` : null,
      count('CANCELLED') ? `${count('CANCELLED')} cancelled` : null,
    ].filter(Boolean)
    parts.push(`${requests.length} request${requests.length === 1 ? '' : 's'}${detail.length ? ` (${detail.join(', ')})` : ''}`)
  }
  const extraVisits = group.events.filter(e => e.kind === 'EXTRA_VISIT').length
  if (extraVisits) parts.push(`${extraVisits} extra visit${extraVisits === 1 ? '' : 's'}`)
  const specials = group.events.filter(e => e.kind === 'SPECIAL_VISIT').length
  if (specials) parts.push(`${specials} special visit${specials === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

export default function HoursHistoryPage() {
  const { formatDate, formatTime, formatTimeRangeHm } = useOrganisationDisplayFormat()
  const today = operationalTodayIso()
  const [group, setGroup] = React.useState<HoursHistoryGroupBy>('carer')
  const [from, setFrom] = React.useState(`${today.slice(0, 7)}-01`)
  const [to, setTo] = React.useState(today)
  const [kind, setKind] = React.useState<HoursHistoryKind | 'ALL'>('ALL')
  const [search, setSearch] = React.useState('')
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  const validRange = Boolean(from && to && from <= to)
  const query = React.useMemo(
    () => ({ group, from, to, kind: kind === 'ALL' ? undefined : kind }),
    [group, from, to, kind],
  )
  const { data: groups = [], isLoading, isError } = useHoursHistory(query)
  const shown = React.useMemo(() => {
    const s = search.trim().toLowerCase()
    return s ? groups.filter(g => g.personName.toLowerCase().includes(s)) : groups
  }, [groups, search])

  const formatInstant = (iso: string | null | undefined) => {
    if (!iso) return '—'
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }
  const visitText = (e: HoursHistoryEvent) => {
    if (!e.visitDate) return null
    const time = e.startTime && e.endTime ? ` ${formatTimeRangeHm(e.startTime, e.endTime)}` : ''
    return `${formatDate(e.visitDate)}${time}`
  }

  const describe = (e: HoursHistoryEvent): { what: string; details: string[] } => {
    const weekLine =
      e.weekHours != null
        ? `Week ${hoursText(e.weekHours)}${e.limitHours != null ? ` · limit ${hoursText(e.limitHours)}` : ''}`
        : null
    switch (e.kind) {
      case 'EXTRA_HOURS': {
        const period =
          e.periodType === 'WEEK' && e.periodStart
            ? `Week of ${formatDate(e.periodStart)}`
            : e.periodType === 'DAY' && e.periodStart
              ? `${formatDate(e.periodStart)} (raises that whole week)`
              : e.periodStart && e.periodEnd
                ? `${formatDate(e.periodStart)} – ${formatDate(e.periodEnd)} (each week it touches)`
                : ''
        return {
          what: `Extra hours +${hoursText(e.hours)}`,
          details: [period, e.reason ? `Note: ${e.reason}` : ''].filter(Boolean),
        }
      }
      case 'HOURS_REQUEST': {
        const label = e.requestType ? REQUEST_LABEL[e.requestType] : 'Hours request'
        const change =
          e.previousHours != null || e.requestedHours != null
            ? `${hoursText(e.previousHours)} → ${hoursText(e.requestedHours)}`
            : null
        return {
          what: label,
          details: [
            visitText(e),
            e.serviceUserName ? `Service user: ${e.serviceUserName}` : null,
            e.carerNames.length ? `Carers: ${e.carerNames.join(', ')}` : null,
            change ?? weekLine,
          ].filter((x): x is string => Boolean(x)),
        }
      }
      case 'EXTRA_VISIT':
        return {
          what: `Extra visit${e.hours != null ? ` (${hoursText(e.hours)})` : ''}`,
          details: [
            visitText(e),
            e.carerNames.length ? `Carers: ${e.carerNames.join(', ')}` : "Carers: the slot's usual carers",
            e.reason ? `Note: ${e.reason}` : null,
          ].filter((x): x is string => Boolean(x)),
        }
      case 'SPECIAL_VISIT':
        return {
          what: `Special visit${e.title ? `: ${e.title}` : ''}${e.hours != null ? ` (${hoursText(e.hours)})` : ''}`,
          details: [visitText(e), e.reason ? `Note: ${e.reason}` : null].filter((x): x is string => Boolean(x)),
        }
    }
  }

  const decisionText = (e: HoursHistoryEvent) => {
    if (e.kind === 'EXTRA_HOURS') {
      return e.decidedAt
        ? `Cancelled by ${e.decidedByName ?? '—'} · ${formatInstant(e.decidedAt)}`
        : null
    }
    if (e.kind !== 'HOURS_REQUEST' || !e.decidedAt) return null
    const verb = e.status === 'APPROVED' ? 'Approved' : e.status === 'REJECTED' ? 'Rejected' : 'Cancelled'
    return `${verb}${e.decidedByName ? ` by ${e.decidedByName}` : ''} · ${formatInstant(e.decidedAt)}`
  }

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex w-full flex-col gap-4" data-testid="hours-history-page">
      <PageHeader
        title="Hours & visits history"
        description="Who gave extra hours, asked for hours or added extra and special visits, who approved or rejected them, and when — by carer or by service user."
        icon={<History className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Employee' }, { label: 'Hours & visits history' }]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {GROUP_TABS.map(t => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={group === t.id ? 'default' : 'ghost'}
              onClick={() => {
                setGroup(t.id)
                setExpanded(new Set())
                if (kind !== 'ALL' && !KINDS_BY_GROUP[t.id].includes(kind)) setKind('ALL')
              }}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="space-y-1">
          <Label htmlFor="hours-history-from" className="text-xs">
            From
          </Label>
          <Input id="hours-history-from" type="date" className="h-9 w-40" value={from} max={to} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hours-history-to" className="text-xs">
            To
          </Label>
          <Input id="hours-history-to" type="date" className="h-9 w-40" value={to} min={from} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hours-history-kind" className="text-xs">
            Type
          </Label>
          <Select value={kind} onValueChange={v => setKind(v as HoursHistoryKind | 'ALL')}>
            <SelectTrigger id="hours-history-kind" className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {KINDS_BY_GROUP[group].map(k => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="hours-history-search" className="text-xs">
            {group === 'carer' ? 'Carer' : 'Service user'}
          </Label>
          <Input
            id="hours-history-search"
            className="h-9 w-56"
            placeholder="Search by name"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {!validRange ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Choose a From date on or before the To date.
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading history…
          </div>
        ) : isError ? (
          <div className="px-6 py-12 text-center text-sm text-destructive">Could not load the history.</div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" aria-hidden />}
            title="Nothing in these dates"
            description="Extra hours, hours requests and visits appear here once they are given, asked for or added."
          />
        ) : (
          <ul className="divide-y divide-border">
            {shown.map(g => {
              const open = expanded.has(g.personId)
              return (
                <li key={g.personId} data-testid="hours-history-person">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                    onClick={() => toggle(g.personId)}
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{g.personName}</span>
                      <span className="block text-xs text-muted-foreground">{summaryOf(g)}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {g.events.length} record{g.events.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  {open ? (
                    <div className="overflow-x-auto border-t border-border bg-muted/20">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <th className="px-4 py-2">When</th>
                            <th className="px-4 py-2">What</th>
                            <th className="px-4 py-2">By</th>
                            <th className="px-4 py-2">Decision</th>
                            <th className="px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.events.map(e => {
                            const { what, details } = describe(e)
                            const decision = decisionText(e)
                            return (
                              <tr key={`${e.kind}-${e.id}`} className="border-b border-border/60 align-top last:border-0">
                                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-foreground">
                                  {formatInstant(e.at)}
                                </td>
                                <td className="px-4 py-2.5">
                                  <p className="text-foreground">{what}</p>
                                  {details.map(d => (
                                    <p key={d} className="text-xs text-muted-foreground">
                                      {d}
                                    </p>
                                  ))}
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground">{e.byName ?? '—'}</td>
                                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                  {decision ?? '—'}
                                  {e.decisionNotes ? <p className="mt-0.5">{e.decisionNotes}</p> : null}
                                </td>
                                <td className="px-4 py-2.5">
                                  <Badge variant={STATUS_BADGE[e.status] ?? 'secondary'} size="sm">
                                    {STATUS_LABEL[e.status] ?? e.status}
                                  </Badge>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
