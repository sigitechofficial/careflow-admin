import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Plus, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { scoreClass } from '@/features/safeguarding/components/SafeguardingSections'
import { EmptyState, LoadingSpinner } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { SafeguardingSectionLayout } from '@/features/safeguarding/components/SafeguardingSectionLayout'
import {
  useCreateSafeguarding,
  useSafeguardingLeads,
  useSafeguardingList,
  useSafeguardingSummary,
} from '@/features/safeguarding/hooks/useSafeguarding'
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  RISK_CLASS,
  RISK_LABELS,
  RISK_OPTIONS,
  STATUS_CLASS,
  STATUS_LABELS,
  fmtDate,
} from '@/features/safeguarding/safeguarding-labels'
import type {
  SafeguardingCategory,
  SafeguardingRisk,
  SafeguardingStatus,
} from '@/features/safeguarding/types/safeguarding.types'

function RaiseForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const create = useCreateSafeguarding()
  const [person, setPerson] = React.useState('')
  const [serviceUserId, setServiceUserId] = React.useState<string | undefined>(undefined)
  const [suSearch, setSuSearch] = React.useState('')
  const [category, setCategory] = React.useState<SafeguardingCategory>('NEGLECT')
  const [riskLevel, setRiskLevel] = React.useState<SafeguardingRisk>('MEDIUM')
  const [description, setDescription] = React.useState('')
  const [immediateAction, setImmediateAction] = React.useState('')
  const [raisedByRole, setRaisedByRole] = React.useState('')
  const [leadUserId, setLeadUserId] = React.useState('')
  const [reviewDate, setReviewDate] = React.useState('')
  const { data: leads = [], isLoading: leadsLoading } = useSafeguardingLeads()

  const { data: suData } = useServiceUsers({ search: suSearch, limit: 6 }, suSearch.trim().length >= 2)
  const suRows = suData?.rows ?? []

  const submit = () => {
    if (!description.trim()) {
      toastApiError(null, 'A description is required')
      return
    }
    create.mutate(
      {
        category,
        riskLevel,
        description: description.trim(),
        immediateAction: immediateAction.trim() || undefined,
        personDescription: person.trim() || undefined,
        aboutServiceUserId: serviceUserId,
        raisedByRole: raisedByRole.trim() || undefined,
        leadUserId: leadUserId || undefined,
        reviewDate: reviewDate || undefined,
      },
      {
        onSuccess: created => {
          toastSuccess('Safeguarding concern raised')
          navigate({ to: '/safeguarding/$caseId', params: { caseId: created.id } })
        },
        onError: e => toastApiError(e, 'Could not raise concern'),
      },
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Person (name or initials)</label>
            <Input value={person} onChange={e => setPerson(e.target.value)} placeholder="e.g. A.B." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Category</label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={e => setCategory(e.target.value as SafeguardingCategory)}
            >
              {CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Risk level</label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={riskLevel}
              onChange={e => setRiskLevel(e.target.value as SafeguardingRisk)}
            >
              {RISK_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {RISK_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Link service user (optional)</label>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                value={suSearch}
                onChange={e => {
                  setSuSearch(e.target.value)
                  setServiceUserId(undefined)
                }}
                placeholder="Search name…"
              />
            </div>
            {serviceUserId ? (
              <p className="text-xs text-emerald-700">Linked ✓ (clear search to change)</p>
            ) : suSearch.trim().length >= 2 && suRows.length > 0 ? (
              <ul className="rounded-md border border-border">
                {suRows.map(su => (
                  <li key={su.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                      onClick={() => {
                        setServiceUserId(su.id)
                        setPerson(p => p || `${su.preferredName || su.firstName} ${su.lastName}`)
                        setSuSearch(`${su.preferredName || su.firstName} ${su.lastName}`)
                      }}
                    >
                      {su.preferredName || su.firstName} {su.lastName}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Raised by (role, not name)</label>
            <Input value={raisedByRole} onChange={e => setRaisedByRole(e.target.value)} placeholder="e.g. Care worker" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Case lead</label>
            <Combobox
              options={leads.map(l => ({ value: l.id, label: l.name }))}
              value={leadUserId}
              onChange={setLeadUserId}
              placeholder="Select a manager…"
              searchPlaceholder="Search people…"
              emptyText="No one found."
              loading={leadsLoading}
              aria-label="Case lead"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Review date</label>
            <Input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">What is the concern?</label>
          <textarea
            className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Immediate action taken (optional)</label>
          <textarea
            className="min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={immediateAction}
            onChange={e => setImmediateAction(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Raising…' : 'Raise concern'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SafeguardingListPage() {
  const canManage = useAuthStore(s => s.can)('safeguarding.manage')
  const [adding, setAdding] = React.useState(false)
  const [status, setStatus] = React.useState<SafeguardingStatus | ''>('')
  const [risk, setRisk] = React.useState<SafeguardingRisk | ''>('')
  const [showAllAlerts, setShowAllAlerts] = React.useState(false)
  const { locationId } = useGlobalLocationScope()
  const branch = locationId ?? undefined
  const { data: cases, isLoading } = useSafeguardingList({
    status: status || undefined,
    riskLevel: risk || undefined,
    locationId: branch,
  })
  const { data: summary } = useSafeguardingSummary(branch)
  const alerts = summary?.alerts ?? []
  const shownAlerts = showAllAlerts ? alerts : alerts.slice(0, 6)

  return (
    <SafeguardingSectionLayout
      title="Safeguarding"
      description="Raise, triage, refer and close safeguarding concerns."
      testId="safeguarding-list-page"
      actions={
        canManage
          ? [
              {
                label: 'Raise concern',
                icon: <Plus className="h-4 w-4" aria-hidden />,
                onClick: () => setAdding(v => !v),
              },
            ]
          : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {summary && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              { label: 'Open cases', value: summary.open, tone: '' },
              { label: 'High risk (open)', value: summary.highRisk, tone: summary.highRisk ? 'text-red-600' : '' },
              { label: 'LA referral pending', value: summary.laPending, tone: summary.laPending ? 'text-red-600' : '' },
              { label: 'CQC decision pending', value: summary.cqcPending, tone: summary.cqcPending ? 'text-red-600' : '' },
              { label: 'Reviews overdue', value: summary.reviewsOverdue, tone: summary.reviewsOverdue ? 'text-amber-600' : '' },
              {
                label: 'Records audit',
                value: summary.auditPct === null ? '—' : `${summary.auditPct}%`,
                tone:
                  summary.auditPct === null
                    ? ''
                    : summary.auditPct >= 90
                      ? 'text-emerald-600'
                      : summary.auditPct >= 70
                        ? 'text-amber-600'
                        : 'text-red-600',
              },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="py-4">
                  <p className="text-xs uppercase text-muted-foreground">{k.label}</p>
                  <p className={`text-2xl font-semibold ${k.tone}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {alerts.length > 0 && (
          <Card data-testid="safeguarding-attention">
            <CardContent className="flex flex-col gap-2 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                Needs attention ({alerts.length})
              </p>
              <ul className="flex flex-col divide-y divide-border text-sm">
                {shownAlerts.map((a, i) => (
                  <li key={`${a.caseId}-${i}`} className="flex items-center gap-2 py-1.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${a.tone === 'bad' ? 'bg-red-500' : 'bg-amber-500'}`}
                      aria-hidden
                    />
                    <Link
                      to="/safeguarding/$caseId"
                      params={{ caseId: a.caseId }}
                      className="font-medium text-primary hover:underline"
                    >
                      {a.referenceNumber}
                    </Link>
                    <span className="text-muted-foreground">{a.text}</span>
                  </li>
                ))}
              </ul>
              {alerts.length > 6 && (
                <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowAllAlerts(v => !v)}>
                  {showAllAlerts ? 'Show less' : `Show all ${alerts.length}`}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {adding && <RaiseForm onClose={() => setAdding(false)} />}

        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={e => setStatus(e.target.value as SafeguardingStatus | '')}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={risk}
            onChange={e => setRisk(e.target.value as SafeguardingRisk | '')}
          >
            <option value="">All risk levels</option>
            {RISK_OPTIONS.map(r => (
              <option key={r} value={r}>
                {RISK_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : !cases || cases.length === 0 ? (
          <EmptyState title="No safeguarding cases" description="Raise a concern to open a case." />
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Ref</th>
                    <th className="px-4 py-3 font-medium">Person</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Lead</th>
                    <th className="px-4 py-3 font-medium">Review</th>
                    <th className="px-4 py-3 font-medium">Records</th>
                    <th className="px-4 py-3 font-medium">Raised</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link
                          to="/safeguarding/$caseId"
                          params={{ caseId: c.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.referenceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{c.serviceUserName || c.personDescription || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{CATEGORY_LABELS[c.category]}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_CLASS[c.riskLevel]}`}>
                          {RISK_LABELS[c.riskLevel]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[c.status]}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.leadName ?? <span className="text-amber-700">—</span>}
                      </td>
                      <td className={`px-4 py-3 ${c.reviewOverdue ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>
                        {c.status === 'CLOSED' ? '—' : fmtDate(c.reviewDate)}
                        {c.reviewOverdue && ' · Overdue'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreClass(c.checkScore.pct)}`}>
                          {c.checkScore.pct === null ? '—' : `${c.checkScore.pct}%`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.raisedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </SafeguardingSectionLayout>
  )
}
