import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PlusCircle, Send } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { cn } from '@/shared/lib/utils'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import type { CqcNotificationStatus, CqcNotificationType } from '../types'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import {
  useCqcNotificationCandidates,
  useCqcNotificationSummary,
  useCqcNotificationTypes,
  useCqcNotifications,
} from '../hooks'
import { CandidatesTable } from '../components/CandidatesTable'
import { STATUS_LABEL, STATUS_ORDER, formatDateTime, statusVariant } from '../labels'
import { NewNotificationDialog } from '../components/NewNotificationDialog'
import { HELP } from '../help'

function SummaryCard({
  label,
  value,
  tone,
  active,
  onClick,
  testId,
}: {
  label: string
  value: number | undefined
  tone?: 'warning' | 'destructive'
  active: boolean
  onClick: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        'rounded-lg border bg-card px-3 py-3 text-left shadow-sm transition-colors',
        active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted/30',
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          value && tone === 'destructive' ? 'text-destructive' : value && tone === 'warning' ? 'text-warning' : '',
        )}
      >
        {value ?? '–'}
      </div>
    </button>
  )
}

type Card = 'drafts' | 'ready' | 'overdue' | 'submitted' | null

/** Governance → CQC notifications: statutory notifications being prepared and those sent. */
export default function CqcNotificationsPage() {
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('cqc_notifications.manage'))
  const [status, setStatus] = React.useState<CqcNotificationStatus | ''>('')
  const [type, setType] = React.useState<CqcNotificationType | ''>('')
  const [overdue, setOverdue] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [newOpen, setNewOpen] = React.useState(false)
  const [view, setView] = React.useState<'list' | 'possible'>('list')
  const types = useCqcNotificationTypes()
  const summary = useCqcNotificationSummary()
  const candidates = useCqcNotificationCandidates()
  const query = useCqcNotifications({
    status: status || undefined,
    type: type || undefined,
    overdue: overdue || undefined,
    search: search.trim() || undefined,
    limit: 100,
  })
  const rows = query.data?.rows ?? []
  const error = query.error instanceof ApiError ? query.error.message : query.error ? 'Could not load notifications.' : null
  const open = (id: string) => void navigate({ to: '/governance/cqc-notifications/$notificationId', params: { notificationId: id } })

  const activeCard: Card = overdue
    ? 'overdue'
    : status === 'DRAFT'
      ? 'drafts'
      : status === 'READY'
        ? 'ready'
        : status === 'SUBMITTED'
          ? 'submitted'
          : null
  const pickCard = (card: Exclude<Card, null>) => {
    setView('list')
    if (activeCard === card) {
      setStatus('')
      setOverdue(false)
      return
    }
    setOverdue(card === 'overdue')
    setStatus(card === 'drafts' ? 'DRAFT' : card === 'ready' ? 'READY' : card === 'submitted' ? 'SUBMITTED' : '')
  }

  return (
    <div className="flex flex-col gap-4" data-testid="cqc-notifications-page">
      <PageHeader
        title="CQC notifications"
        description="Prepare statutory notifications, send them on the CQC portal, and keep a record of what was sent."
        icon={<Send className="h-4 w-4 text-muted-foreground" aria-hidden />}
        info={HELP.listPage}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Governance' }, { label: 'CQC notifications' }]}
        actions={
          canManage
            ? [{ label: 'New notification', onClick: () => setNewOpen(true), icon: <PlusCircle className="h-4 w-4" /> }]
            : []
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Drafts" value={summary.data?.drafts} active={activeCard === 'drafts'} onClick={() => pickCard('drafts')} testId="cqcn-card-drafts" />
        <SummaryCard label="Ready to submit" value={summary.data?.ready} active={activeCard === 'ready'} onClick={() => pickCard('ready')} testId="cqcn-card-ready" />
        <SummaryCard
          label="Overdue"
          value={summary.data?.overdue}
          tone="destructive"
          active={activeCard === 'overdue'}
          onClick={() => pickCard('overdue')}
          testId="cqcn-card-overdue"
        />
        <SummaryCard
          label="Submitted this month"
          value={summary.data?.submittedThisMonth}
          active={activeCard === 'submitted'}
          onClick={() => pickCard('submitted')}
          testId="cqcn-card-submitted"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Tabs value={view} onValueChange={v => setView(v as 'list' | 'possible')} className="mb-3">
          <TabsList variant="underline" className="h-auto justify-start">
            <TabsTrigger value="list" variant="underline">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="possible" variant="underline" data-testid="cqcn-tab-possible">
              Possible notifications{candidates.data?.length ? ` (${candidates.data.length})` : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {view === 'possible' ? (
          <CandidatesTable />
        ) : (
          <>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input
            className="max-w-[16rem]"
            placeholder="Search reference or summary…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search"
            data-testid="cqcn-search"
          />
          <select
            className={`${feedbackSelectClass} max-w-[14rem]`}
            value={status}
            onChange={e => {
              setStatus(e.target.value as CqcNotificationStatus | '')
              setOverdue(false)
            }}
            aria-label="Status"
            data-testid="cqcn-status-filter"
          >
            <option value="">All statuses</option>
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            className={`${feedbackSelectClass} max-w-[18rem]`}
            value={type}
            onChange={e => setType(e.target.value as CqcNotificationType | '')}
            aria-label="Type"
            data-testid="cqcn-type-filter"
          >
            <option value="">All types</option>
            {(types.data?.types ?? []).map(t => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="cqcn-table">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {['Notification', 'Branch', 'Person', 'Event', 'Due', 'Status'].map(h => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {h}
                      {h === 'Due' ? <InfoTip label="due">{HELP.target}</InfoTip> : null}
                      {h === 'Status' ? <InfoTip label="status">{HELP.status}</InfoTip> : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No notifications{status || type || overdue || search ? ' match these filters' : ' yet'}.
                  </td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/20"
                    onClick={() => open(r.id)}
                    data-testid="cqcn-row"
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-primary">{r.typeLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.referenceNumber}
                        {r.cqcReference ? ` · CQC ${r.cqcReference}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.location.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.serviceUser?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatDateTime(r.eventOccurredAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {r.submittedAt ? (
                        <span className="text-muted-foreground">
                          Sent {formatDateTime(r.submittedAt)}
                          {r.submittedLate ? <span className="ml-1 text-warning">(late)</span> : null}
                        </span>
                      ) : r.status === 'DRAFT' || r.status === 'READY' ? (
                        <span className={r.overdue ? 'font-medium text-destructive' : ''}>
                          {formatDateTime(r.dueAt)}
                          {r.overdue ? ' · overdue' : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge size="sm" variant={statusVariant(r.status)}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          CareFlow does not send anything to the CQC. Send each notification on the CQC provider portal, then record it
          here. The checklists are based on the Care Quality Commission (Registration) Regulations 2009; check the CQC
          website for the current forms.
        </p>
          </>
        )}
      </div>

      <NewNotificationDialog open={newOpen} onOpenChange={setNewOpen} onCreated={open} />
    </div>
  )
}
