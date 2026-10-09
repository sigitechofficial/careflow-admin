import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Heart, MessageSquareWarning, PlusCircle, Search } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
} from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import { useFeedbackList, useFeedbackSummary } from '@/features/complaints/hooks/useComplaints'
import type { FeedbackRow, FeedbackStatus, FeedbackType } from '@/features/complaints/types'
import {
  COMPLAINT_SEVERITY_LABEL,
  FEEDBACK_STATUS_LABEL,
  feedbackAboutText,
  feedbackFromText,
  feedbackStatusVariant,
  severityVariant,
} from '@/features/complaints/feedback-labels'
import { FeedbackFormDialog, feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'

type Tab = 'complaints' | 'compliments'

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
  tone?: 'warning' | 'destructive' | 'success'
  active?: boolean
  onClick?: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        'rounded-lg border bg-card px-4 py-3 text-left shadow-sm transition-colors',
        active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted/30',
      )}
    >
      <div
        className={cn(
          'text-2xl font-semibold tabular-nums',
          tone === 'destructive' && value ? 'text-destructive' : '',
          tone === 'warning' && value ? 'text-warning' : '',
          tone === 'success' ? 'text-success' : '',
        )}
      >
        {value ?? '—'}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </button>
  )
}

function DueCell({ row }: { row: FeedbackRow }) {
  if (row.type !== 'COMPLAINT' || row.status === 'CLOSED') return <span className="text-muted-foreground">—</span>
  if (!row.acknowledgedAt && row.acknowledgeDueAt) {
    return (
      <span className={row.acknowledgeOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}>
        Acknowledge by {formatOrganisationDate(row.acknowledgeDueAt)}
        {row.acknowledgeOverdue ? ' · overdue' : ''}
      </span>
    )
  }
  if (!row.respondedAt && row.responseDueAt) {
    return (
      <span className={row.responseOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}>
        Respond by {formatOrganisationDate(row.responseDueAt)}
        {row.responseOverdue ? ' · overdue' : ''}
      </span>
    )
  }
  return <span className="text-muted-foreground">Responded {formatOrganisationDate(row.respondedAt)}</span>
}

/** Accident & Incident → Complaints & Compliments register. */
export default function ComplaintsComplimentsPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { tab?: string }
  const tab: Tab = search.tab === 'compliments' ? 'compliments' : 'complaints'
  const type: FeedbackType = tab === 'complaints' ? 'COMPLAINT' : 'COMPLIMENT'
  const canManage = useAuthStore(s => s.can('complaints.manage'))

  // Complaints open on the open ones; compliments on everything.
  const [status, setStatus] = React.useState<FeedbackStatus | 'OPEN' | ''>(() => (tab === 'complaints' ? 'OPEN' : ''))
  const [overdue, setOverdue] = React.useState(false)
  const [text, setText] = React.useState('')
  const deferredText = React.useDeferredValue(text)
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)

  const summaryQuery = useFeedbackSummary()
  const listQuery = useFeedbackList({
    type,
    status: status || undefined,
    overdue: overdue || undefined,
    search: deferredText.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
  })
  const rows = listQuery.data ?? []
  const summary = summaryQuery.data
  const error =
    listQuery.error instanceof ApiError ? listQuery.error.message : listQuery.error ? 'Could not load records.' : null

  const setTab = (next: Tab, filters: { status?: FeedbackStatus | 'OPEN' | ''; overdue?: boolean } = {}) => {
    setStatus(filters.status ?? (next === 'complaints' ? 'OPEN' : ''))
    setOverdue(filters.overdue ?? false)
    void navigate({ to: '/incidents/feedback', search: { tab: next } })
  }
  const openDetail = (id: string) =>
    void navigate({ to: '/incidents/feedback/$feedbackId', params: { feedbackId: id } })

  const isComplaints = tab === 'complaints'
  const statusOptions: { value: FeedbackStatus | 'OPEN'; label: string }[] = isComplaints
    ? [
        { value: 'OPEN', label: 'Open (not closed)' },
        ...(['RECEIVED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESPONDED', 'CLOSED'] as const).map(s => ({
          value: s,
          label: FEEDBACK_STATUS_LABEL[s],
        })),
      ]
    : [
        { value: 'OPEN', label: 'Not shared yet' },
        { value: 'CLOSED', label: 'Shared / closed' },
      ]

  return (
    <div className="flex flex-col gap-4" data-testid="complaints-compliments-page">
      <PageHeader
        title="Complaints & Compliments"
        description="Record, track and respond to complaints, and share compliments with the team."
        icon={<MessageSquareWarning className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'Complaints & Compliments' },
        ]}
        actions={
          canManage
            ? [
                {
                  label: isComplaints ? 'Record complaint' : 'Record compliment',
                  onClick: () => setFormOpen(true),
                  icon: <PlusCircle className="h-4 w-4" />,
                },
              ]
            : []
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="Open complaints"
          value={summary?.openComplaints}
          active={isComplaints && status === 'OPEN' && !overdue}
          onClick={() => setTab('complaints', { status: 'OPEN' })}
          testId="feedback-card-open"
        />
        <SummaryCard
          label="Overdue complaints"
          value={summary?.overdueComplaints}
          tone="destructive"
          active={isComplaints && overdue}
          onClick={() => setTab('complaints', { status: 'OPEN', overdue: true })}
          testId="feedback-card-overdue"
        />
        <SummaryCard label="Complaints this month" value={summary?.complaintsThisMonth} />
        <SummaryCard label="Compliments this month" value={summary?.complimentsThisMonth} tone="success" />
        <SummaryCard
          label="Compliments to share"
          value={summary?.complimentsToShare}
          tone="warning"
          active={!isComplaints && status === 'OPEN'}
          onClick={() => setTab('compliments', { status: 'OPEN' })}
          testId="feedback-card-to-share"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex gap-1 border-b border-border px-3 pt-2" role="tablist">
          {(
            [
              ['complaints', 'Complaints', MessageSquareWarning],
              ['compliments', 'Compliments', Heart],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-testid={`feedback-tab-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium',
                tab === id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Reference, subject, name or details…"
                className="pl-8"
                data-testid="feedback-search"
              />
            </div>
            <select
              className={feedbackSelectClass}
              value={status}
              onChange={e => setStatus(e.target.value as FeedbackStatus | 'OPEN' | '')}
              data-testid="feedback-status-filter"
            >
              <option value="">All statuses</option>
              {statusOptions.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Received from" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Received to" />
          </div>
          {isComplaints ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={overdue}
                onChange={e => setOverdue(e.target.checked)}
                data-testid="feedback-overdue-filter"
              />
              Only overdue (past acknowledge or response target)
            </label>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm" data-testid="feedback-table">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {(isComplaints
                    ? ['Reference', 'Received', 'From', 'About', 'Subject', 'Severity', 'Status', 'Due', 'Handled by']
                    : ['Reference', 'Received', 'From', 'About', 'Subject', 'Category', 'Shared with staff']
                  ).map(h => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                      {isComplaints ? 'No complaints match these filters.' : 'No compliments match these filters.'}
                    </td>
                  </tr>
                ) : (
                  rows.map(row => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/20"
                      onClick={() => openDetail(row.id)}
                      data-testid="feedback-row"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-primary">{row.referenceNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {formatOrganisationDateTime(row.receivedAt)}
                      </td>
                      <td className="px-3 py-2.5">{feedbackFromText(row)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{feedbackAboutText(row)}</td>
                      <td className="max-w-xs px-3 py-2.5">
                        <div className="truncate font-medium text-foreground">{row.subject}</div>
                        {isComplaints && row.category ? (
                          <div className="text-xs text-muted-foreground">{row.category}</div>
                        ) : null}
                      </td>
                      {isComplaints ? (
                        <>
                          <td className="px-3 py-2.5">
                            {row.severity ? (
                              <Badge size="sm" variant={severityVariant(row.severity)}>
                                {COMPLAINT_SEVERITY_LABEL[row.severity]}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge size="sm" variant={feedbackStatusVariant(row.status)}>
                              {FEEDBACK_STATUS_LABEL[row.status]}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                            <DueCell row={row} />
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{row.handler?.name ?? '—'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-muted-foreground">{row.category ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            {row.sharedWithStaffAt ? (
                              <span className="text-muted-foreground">{formatOrganisationDate(row.sharedWithStaffAt)}</span>
                            ) : row.status === 'CLOSED' ? (
                              <span className="text-muted-foreground">Closed</span>
                            ) : (
                              <Badge size="sm" variant="warning">
                                Not shared yet
                              </Badge>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FeedbackFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        type={type}
        onCreated={openDetail}
      />
    </div>
  )
}
