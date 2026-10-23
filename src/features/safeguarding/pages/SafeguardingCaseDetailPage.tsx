import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState, LoadingSpinner } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { SafeguardingSectionLayout } from '@/features/safeguarding/components/SafeguardingSectionLayout'
import { SafeguardingInvestigationCard } from '@/features/safeguarding/components/SafeguardingInvestigationCard'
import {
  AlertList,
  ChecklistCard,
  ImmediateSafetyCard,
  LeadReviewCard,
  MultiAgencyCard,
  VoiceCard,
  scoreClass,
  useOpenSectionListener,
} from '@/features/safeguarding/components/SafeguardingSections'
import {
  useAddSafeguardingNote,
  useSafeguardingCase,
  useTransitionSafeguarding,
  useUpdateSafeguarding,
} from '@/features/safeguarding/hooks/useSafeguarding'
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  REFERRAL_LABELS,
  REFERRAL_OPTIONS,
  RISK_CLASS,
  RISK_LABELS,
  RISK_OPTIONS,
  STATUS_CLASS,
  STATUS_LABELS,
  STATUS_STEPS,
  availableActions,
  fmtDate,
  fmtDateTime,
} from '@/features/safeguarding/safeguarding-labels'
import type {
  SafeguardingAction,
  SafeguardingCase,
  SafeguardingReferralDecision,
  SafeguardingRisk,
} from '@/features/safeguarding/types/safeguarding.types'

function Stepper({ status }: { status: SafeguardingCase['status'] }) {
  const currentIndex = STATUS_STEPS.indexOf(status)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_STEPS.map((s, i) => (
        <span
          key={s}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            i <= currentIndex ? STATUS_CLASS[s] : 'bg-muted text-muted-foreground/60'
          }`}
        >
          {STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  )
}

function ActionPanel({ caseData }: { caseData: SafeguardingCase }) {
  const transition = useTransitionSafeguarding(caseData.id)
  const [action, setAction] = React.useState<SafeguardingAction | null>(null)
  const [note, setNote] = React.useState('')
  const [outcome, setOutcome] = React.useState('')
  const [lessons, setLessons] = React.useState('')
  const actions = availableActions(caseData.status)

  const run = () => {
    if (!action) return
    transition.mutate(
      {
        action,
        note: note.trim() || undefined,
        outcome: action === 'CLOSE' ? outcome.trim() || undefined : undefined,
        lessonsLearned: action === 'CLOSE' ? lessons.trim() || undefined : undefined,
      },
      {
        onSuccess: () => {
          toastSuccess(`${ACTION_LABELS[action]} done`)
          setAction(null)
          setNote('')
          setOutcome('')
          setLessons('')
        },
        onError: e => toastApiError(e, 'Could not update case'),
      },
    )
  }

  if (actions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {actions.map(a => (
            <Button
              key={a}
              variant={action === a ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAction(a)}
            >
              {ACTION_LABELS[a]}
            </Button>
          ))}
        </div>
        {action && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {action === 'CLOSE' && (
              <>
                <label className="text-sm font-medium">Outcome (required)</label>
                <textarea
                  className="min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                />
                <label className="text-sm font-medium">Lessons learned (optional)</label>
                <textarea
                  className="min-h-[48px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={lessons}
                  onChange={e => setLessons(e.target.value)}
                />
              </>
            )}
            <label className="text-sm font-medium">Note (optional)</label>
            <textarea
              className="min-h-[48px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={run}
                disabled={transition.isPending || (action === 'CLOSE' && outcome.trim() === '')}
              >
                Confirm {ACTION_LABELS[action]}
              </Button>
              <Button variant="ghost" onClick={() => setAction(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReferralsCard({ caseData }: { caseData: SafeguardingCase }) {
  const canManage = useAuthStore(s => s.can)('safeguarding.manage')
  const update = useUpdateSafeguarding(caseData.id)
  const [editing, setEditing] = React.useState(false)
  const [laReferral, setLaReferral] = React.useState(caseData.laReferral)
  const [laReference, setLaReference] = React.useState(caseData.laReference ?? '')
  const [laReferredAt, setLaReferredAt] = React.useState(caseData.laReferredAt?.slice(0, 10) ?? '')
  const [cqcNotified, setCqcNotified] = React.useState(caseData.cqcNotified)
  const [cqcReference, setCqcReference] = React.useState(caseData.cqcReference ?? '')
  const [riskLevel, setRiskLevel] = React.useState<SafeguardingRisk>(caseData.riskLevel)

  React.useEffect(() => {
    setLaReferral(caseData.laReferral)
    setLaReference(caseData.laReference ?? '')
    setLaReferredAt(caseData.laReferredAt?.slice(0, 10) ?? '')
    setCqcNotified(caseData.cqcNotified)
    setCqcReference(caseData.cqcReference ?? '')
    setRiskLevel(caseData.riskLevel)
  }, [caseData])

  useOpenSectionListener('referrals', () => {
    if (canManage) setEditing(true)
  })

  const save = () => {
    update.mutate(
      { laReferral, laReference, laReferredAt: laReferredAt || null, cqcNotified, cqcReference, riskLevel },
      {
        onSuccess: () => {
          toastSuccess('Case updated')
          setEditing(false)
        },
        onError: e => toastApiError(e, 'Could not update case'),
      },
    )
  }

  return (
    <Card data-section="referrals" className="scroll-mt-20 transition-shadow">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Risk & referrals</CardTitle>
        {canManage && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              Risk level
              <select
                className="h-9 rounded-md border border-input bg-background px-3"
                value={riskLevel}
                onChange={e => setRiskLevel(e.target.value as SafeguardingRisk)}
              >
                {RISK_OPTIONS.map(r => (
                  <option key={r} value={r}>
                    {RISK_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <div />
            <label className="flex flex-col gap-1">
              Local Authority referral
              <select
                className="h-9 rounded-md border border-input bg-background px-3"
                value={laReferral}
                onChange={e => setLaReferral(e.target.value as SafeguardingReferralDecision)}
              >
                {REFERRAL_OPTIONS.map(o => (
                  <option key={o} value={o}>
                    {REFERRAL_LABELS[o]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              LA reference
              <input
                className="h-9 rounded-md border border-input bg-background px-3"
                value={laReference}
                onChange={e => setLaReference(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Date referred to LA
              <input
                type="date"
                className="h-9 rounded-md border border-input bg-background px-3"
                value={laReferredAt}
                onChange={e => setLaReferredAt(e.target.value)}
              />
            </label>
            <div />
            <label className="flex flex-col gap-1">
              CQC notification
              <select
                className="h-9 rounded-md border border-input bg-background px-3"
                value={cqcNotified}
                onChange={e => setCqcNotified(e.target.value as SafeguardingReferralDecision)}
              >
                {REFERRAL_OPTIONS.map(o => (
                  <option key={o} value={o}>
                    {REFERRAL_LABELS[o]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              CQC reference
              <input
                className="h-9 rounded-md border border-input bg-background px-3"
                value={cqcReference}
                onChange={e => setCqcReference(e.target.value)}
              />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <Button size="sm" onClick={save} disabled={update.isPending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Risk level</dt>
              <dd>{RISK_LABELS[caseData.riskLevel]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Local Authority referral</dt>
              <dd>
                {REFERRAL_LABELS[caseData.laReferral]}
                {caseData.laReference ? ` · ${caseData.laReference}` : ''}
                {caseData.laReferredAt ? ` · ${fmtDate(caseData.laReferredAt)}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">CQC notification</dt>
              <dd>
                {REFERRAL_LABELS[caseData.cqcNotified]}
                {caseData.cqcReference ? ` · ${caseData.cqcReference}` : ''}
              </dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

function Timeline({ caseData }: { caseData: SafeguardingCase }) {
  const addNote = useAddSafeguardingNote(caseData.id)
  const [note, setNote] = React.useState('')
  const canManage = useAuthStore(s => s.can)('safeguarding.manage')

  const submit = () => {
    if (!note.trim()) return
    addNote.mutate(note.trim(), {
      onSuccess: () => {
        toastSuccess('Note added')
        setNote('')
      },
      onError: e => toastApiError(e, 'Could not add note'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {canManage && (
          <div className="flex gap-2">
            <input
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Add a note…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <Button size="sm" onClick={submit} disabled={addNote.isPending}>
              Add
            </Button>
          </div>
        )}
        <ol className="flex flex-col gap-2">
          {[...caseData.events].reverse().map(ev => (
            <li key={ev.id} className="border-l-2 border-border pl-3">
              <p className="text-sm font-medium">{ev.action}</p>
              {ev.note && <p className="text-sm text-muted-foreground">{ev.note}</p>}
              <p className="text-xs text-muted-foreground">
                {fmtDateTime(ev.at)}
                {ev.userName && ` · ${ev.userName}`}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

export default function SafeguardingCaseDetailPage() {
  const params = useParams({ strict: false }) as { caseId?: string }
  const { data: caseData, isLoading } = useSafeguardingCase(params.caseId)

  if (isLoading) {
    return (
      <SafeguardingSectionLayout title="Case" description="Loading…" testId="safeguarding-detail-loading">
        <LoadingSpinner />
      </SafeguardingSectionLayout>
    )
  }

  if (!caseData) {
    return (
      <SafeguardingSectionLayout title="Case not found" description="" testId="safeguarding-detail-missing">
        <EmptyState title="Case not found" description="This safeguarding case may have been removed." />
      </SafeguardingSectionLayout>
    )
  }

  const personLabel = caseData.serviceUserName || caseData.personDescription || 'Person not recorded'

  return (
    <SafeguardingSectionLayout
      title={`${caseData.referenceNumber}${caseData.personDescription ? ` · ${caseData.personDescription}` : ''}`}
      description="Safeguarding case"
      testId="safeguarding-detail-page"
      breadcrumbTail={[
        { label: 'Safeguarding', href: '/safeguarding' },
        { label: caseData.referenceNumber },
      ]}
    >
      <div className="flex flex-col gap-5">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/safeguarding">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
              Back to safeguarding
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{personLabel}</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[caseData.status]}`}>
                    {STATUS_LABELS[caseData.status]}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_CLASS[caseData.riskLevel]}`}>
                    {RISK_LABELS[caseData.riskLevel]} risk
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {caseData.referenceNumber} · {CATEGORY_LABELS[caseData.category]} · Raised {fmtDate(caseData.raisedAt)}
                  {caseData.locationName && ` · ${caseData.locationName}`}
                  {caseData.aboutServiceUserId && (
                    <>
                      {' · '}
                      <Link
                        to="/service-users/$serviceUserId"
                        params={{ serviceUserId: caseData.aboutServiceUserId }}
                        className="text-primary hover:underline"
                      >
                        View profile
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreClass(caseData.checkScore.pct)}`}
                title="CQC records checklist"
              >
                Records {caseData.checkScore.pct === null ? '—' : `${caseData.checkScore.pct}%`}
              </span>
            </div>
            <Stepper status={caseData.status} />
            <AlertList alerts={caseData.alerts} />
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <ActionPanel caseData={caseData} />

            <Card data-section="concern" className="scroll-mt-20 transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">Concern</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p>{CATEGORY_LABELS[caseData.category]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Raised by (role)</p>
                    <p>{caseData.raisedByRole || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap">{caseData.description}</p>
                </div>
              </CardContent>
            </Card>

            <ImmediateSafetyCard caseData={caseData} />
            <SafeguardingInvestigationCard caseData={caseData} />
            <ReferralsCard caseData={caseData} />
            <MultiAgencyCard caseData={caseData} />
            <VoiceCard caseData={caseData} />

            {caseData.outcome && (
              <Card data-section="outcome" className="scroll-mt-20 transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">Outcome</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <p className="whitespace-pre-wrap">{caseData.outcome}</p>
                  {caseData.lessonsLearned && (
                    <div>
                      <p className="text-muted-foreground">Lessons learned</p>
                      <p className="whitespace-pre-wrap">{caseData.lessonsLearned}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <LeadReviewCard caseData={caseData} />
            <ChecklistCard caseData={caseData} />
            <Timeline caseData={caseData} />
          </div>
        </div>
      </div>
    </SafeguardingSectionLayout>
  )
}
