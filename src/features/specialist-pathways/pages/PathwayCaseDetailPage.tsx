import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { EmptyState, LoadingSpinner } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { PathwaySectionLayout } from '@/features/specialist-pathways/components/PathwaySectionLayout'
import { PathwaySectionsPanel } from '@/features/specialist-pathways/components/PathwaySectionsPanel'
import { PathwayCarePlanPanel } from '@/features/specialist-pathways/components/PathwayCarePlanPanel'
import { PathwayRisksPanel } from '@/features/specialist-pathways/components/PathwayRisksPanel'
import { PathwayReviewsPanel } from '@/features/specialist-pathways/components/PathwayReviewsPanel'
import { PathwayActivityPanel } from '@/features/specialist-pathways/components/PathwayActivityPanel'
import { PathwayTeamPanel } from '@/features/specialist-pathways/components/PathwayTeamPanel'
import { PathwayDocumentsPanel } from '@/features/specialist-pathways/components/PathwayDocumentsPanel'
import { pathwayListPath } from '@/features/specialist-pathways/specialist-pathways-routes'
import { PATHWAY_META } from '@/features/specialist-pathways/pathway-specs'
import {
  CASE_STATUS_CLASS,
  CASE_STATUS_LABELS,
  PLAN_STATUS_LABELS,
  RISK_LEVEL_CLASS,
  RISK_LEVEL_LABELS,
  fmtDate,
  riskLevelOf,
} from '@/features/specialist-pathways/pathway-labels'
import {
  useClosePathwayCase,
  usePathwayCase,
  useReopenPathwayCase,
} from '@/features/specialist-pathways/hooks/useSpecialistPathways'

type Tab = 'assessment' | 'plan' | 'risks' | 'reviews' | 'team' | 'documents' | 'activity'

export default function PathwayCaseDetailPage() {
  const params = useParams({ strict: false }) as { caseId?: string }
  const caseId = params.caseId
  const { data: caseData, isLoading } = usePathwayCase(caseId)
  const canManage = useAuthStore(s => s.can)('specialist_pathways.manage')
  const close = useClosePathwayCase(caseId ?? '')
  const reopen = useReopenPathwayCase(caseId ?? '')
  const [tab, setTab] = React.useState<Tab>('assessment')
  const [closing, setClosing] = React.useState(false)
  const [reason, setReason] = React.useState('')

  if (isLoading) {
    return (
      <PathwaySectionLayout title="Case" description="Loading…" testId="pathway-case-detail-loading">
        <LoadingSpinner />
      </PathwaySectionLayout>
    )
  }

  if (!caseData) {
    return (
      <PathwaySectionLayout title="Case not found" description="" testId="pathway-case-detail-missing">
        <EmptyState title="Case not found" description="This pathway case may have been removed." />
      </PathwaySectionLayout>
    )
  }

  const personName = caseData.serviceUserName ?? 'Service user'
  const meta = PATHWAY_META[caseData.pathwayType]
  const isClosed = caseData.status === 'CLOSED'
  const latestPlan = caseData.plans?.[0]
  const openRisks = caseData.risks.filter(r => r.status === 'OPEN').length
  const highest = caseData.highestRiskScore

  const onClose = () => {
    if (!reason.trim()) {
      toastApiError(null, 'Enter a reason for closing the case')
      return
    }
    close.mutate(reason.trim(), {
      onSuccess: () => {
        toastSuccess('Case closed')
        setClosing(false)
        setReason('')
      },
      onError: e => toastApiError(e, 'Could not close case'),
    })
  }

  const onReopen = () =>
    reopen.mutate(undefined, {
      onSuccess: () => toastSuccess('Case reopened'),
      onError: e => toastApiError(e, 'Could not reopen case'),
    })

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'assessment', label: 'Assessment' },
    { key: 'plan', label: 'Care plan' },
    { key: 'risks', label: 'Risks', count: openRisks },
    { key: 'reviews', label: 'Reviews', count: caseData.reviews.length },
    { key: 'team', label: 'Team', count: caseData.professionals.length },
    { key: 'documents', label: 'Documents', count: caseData.documents.length },
    { key: 'activity', label: 'Activity' },
  ]

  return (
    <PathwaySectionLayout
      title={`${caseData.ref} · ${personName}`}
      description={`${meta.label} pathway case`}
      testId="pathway-case-detail-page"
      breadcrumbTail={[{ label: meta.label, href: pathwayListPath(meta.slug) }, { label: caseData.ref }]}
    >
      <div className="flex flex-col gap-5">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/specialist-pathways/$pathway" params={{ pathway: meta.slug }}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
              Back to {meta.label}
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{personName}</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CASE_STATUS_CLASS[caseData.status]}`}>
                    {CASE_STATUS_LABELS[caseData.status]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {caseData.ref} · {meta.label}
                  {caseData.serviceUserId && (
                    <>
                      {' · '}
                      <Link
                        to="/service-users/$serviceUserId"
                        params={{ serviceUserId: caseData.serviceUserId }}
                        className="text-primary hover:underline"
                      >
                        View profile
                      </Link>
                    </>
                  )}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  {isClosed ? (
                    <Button variant="outline" onClick={onReopen} disabled={reopen.isPending}>
                      <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                      Reopen case
                    </Button>
                  ) : (
                    !closing && (
                      <Button variant="outline" onClick={() => setClosing(true)}>
                        <Lock className="mr-2 h-4 w-4" aria-hidden />
                        Close case
                      </Button>
                    )
                  )}
                </div>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Review due</dt>
                <dd className={caseData.reviewOverdue ? 'font-semibold text-red-600' : 'font-medium'}>
                  {fmtDate(caseData.reviewDueDate)}
                  {caseData.reviewOverdue && ' · Overdue'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Care plan</dt>
                <dd className="font-medium">
                  {latestPlan ? `v${latestPlan.version} · ${PLAN_STATUS_LABELS[latestPlan.status]}` : 'None yet'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Highest risk</dt>
                <dd>
                  {highest ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_LEVEL_CLASS[riskLevelOf(highest)]}`}>
                      {highest} · {RISK_LEVEL_LABELS[riskLevelOf(highest)]}
                    </span>
                  ) : (
                    <span className="font-medium">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Opened</dt>
                <dd className="font-medium">{fmtDate(caseData.createdAt)}</dd>
              </div>
            </dl>

            {isClosed && caseData.closedReason && (
              <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="font-medium">Closed: </span>
                {caseData.closedReason}
              </p>
            )}

            {closing && (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3">
                <label className="text-sm font-medium" htmlFor="pathway-close-reason">
                  Reason for closing
                </label>
                <textarea
                  id="pathway-close-reason"
                  className="min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Goals met, moved to another provider, passed away"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={onClose} disabled={close.isPending}>
                    {close.isPending ? 'Closing…' : 'Close case'}
                  </Button>
                  <Button variant="ghost" onClick={() => setClosing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-1 overflow-x-auto border-b border-border" role="tablist">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.count ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t.count}</span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === 'assessment' && <PathwaySectionsPanel caseData={caseData} />}
        {tab === 'plan' && <PathwayCarePlanPanel caseData={caseData} />}
        {tab === 'risks' && <PathwayRisksPanel caseData={caseData} />}
        {tab === 'reviews' && <PathwayReviewsPanel caseData={caseData} />}
        {tab === 'team' && <PathwayTeamPanel caseData={caseData} />}
        {tab === 'documents' && <PathwayDocumentsPanel caseData={caseData} />}
        {tab === 'activity' && <PathwayActivityPanel caseData={caseData} />}
      </div>
    </PathwaySectionLayout>
  )
}
