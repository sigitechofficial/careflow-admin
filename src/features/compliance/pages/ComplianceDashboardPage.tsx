import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, ScrollText, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import type { Permission } from '@/features/auth/types'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import {
  useBodyMapGovernanceAlerts,
  useComplianceSummary,
  usePolicyReviews,
} from '@/features/home/hooks/useHomeSignals'
import { useLearningDashboard } from '@/features/learning/hooks/useLearning'
import { useSafeguardingSummary } from '@/features/safeguarding/hooks/useSafeguarding'
import { useIncidentStats } from '@/features/incidents/hooks/useIncidents'
import { useFeedbackSummary } from '@/features/complaints/hooks/useComplaints'
import { usePathwaySummary } from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import {
  RAG_CLASS,
  RAG_LABEL,
  type Issue,
  type Rag,
  issue,
  pctOf,
  ragFromCounts,
  ragFromPct,
} from '@/features/compliance/compliance-score'

type Stat = { label: string; value: React.ReactNode; tone?: 'bad' | 'warn' }

type Area = {
  key: string
  title: string
  description: string
  to: string
  linkLabel: string
  loading: boolean
  /** Headline % when the area has one (feeds the overall score). */
  pct: number | null
  rag: Rag
  stats: Stat[]
  issues: Array<Issue | null>
}

function useCan() {
  const can = useAuthStore(s => s.can)
  return React.useCallback((...perms: Permission[]) => perms.some(p => can(p)), [can])
}

const n = (v: number | null | undefined) => v ?? 0

function RagChip({ rag }: { rag: Rag }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RAG_CLASS[rag]}`}>{RAG_LABEL[rag]}</span>
}

function AreaCard({ area }: { area: Area }) {
  return (
    <Card className="flex flex-col" data-testid={`compliance-area-${area.key}`}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{area.title}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{area.description}</p>
        </div>
        {area.loading ? <span className="text-xs text-muted-foreground">Loading…</span> : <RagChip rag={area.rag} />}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {area.pct !== null && !area.loading && (
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Compliance</span>
              <span className="text-xl font-bold tabular-nums">{area.pct}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${area.rag === 'GREEN' ? 'bg-emerald-500' : area.rag === 'AMBER' ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, area.pct))}%` }}
              />
            </div>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {area.stats.map(s => (
            <div key={s.label}>
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd
                className={`font-semibold tabular-nums ${
                  s.tone === 'bad' ? 'text-red-600' : s.tone === 'warn' ? 'text-amber-600' : ''
                }`}
              >
                {area.loading ? '…' : s.value}
              </dd>
            </div>
          ))}
        </dl>
        <Link to={area.to} className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {area.linkLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  )
}

export default function ComplianceDashboardPage() {
  const can = useCan()
  const { locationId } = useGlobalLocationScope()
  const branch = locationId ?? undefined

  const canStaff = can('employees.compliance.reports.read')
  const canTraining = can('learning.dashboard.read')
  const canPolicies = can('policies.read')
  const canSg = can('safeguarding.read', 'safeguarding.manage')
  const canInc = can('incidents.read')
  const canFb = can('complaints.read')
  const canPathways = can('specialist_pathways.read')
  const canBodyMap = can('service_users.read')
  const canAudit = can('audit.read', 'audit_logs.read')

  const staff = useComplianceSummary(locationId, canStaff)
  const training = useLearningDashboard(locationId, canTraining)
  const reviews = usePolicyReviews(30, canPolicies)
  const sg = useSafeguardingSummary(branch, canSg)
  const inc = useIncidentStats(locationId, canInc)
  const fb = useFeedbackSummary(canFb)
  const pathways = usePathwaySummary(branch, canPathways)
  const bodyMap = useBodyMapGovernanceAlerts(canBodyMap)

  const areas: Area[] = []

  if (canStaff) {
    const d = staff.data
    const pct = d ? pctOf(d.valid, d.totalRequired) : null
    areas.push({
      key: 'staff',
      title: 'Staff documents',
      description: 'DBS, right to work, references and other required documents',
      to: '/employee/compliance',
      linkLabel: 'Open staff compliance',
      loading: staff.isLoading,
      pct,
      rag: ragFromPct(pct),
      stats: [
        { label: 'Expired', value: n(d?.expired), tone: d?.expired ? 'bad' : undefined },
        { label: 'Missing', value: n(d?.missing), tone: d?.missing ? 'bad' : undefined },
        { label: 'Expiring soon', value: n(d?.expiringSoon), tone: d?.expiringSoon ? 'warn' : undefined },
        { label: 'Waiting to be checked', value: n(d?.pendingReview), tone: d?.pendingReview ? 'warn' : undefined },
      ],
      issues: [
        issue('bad', d?.expired, 'staff document expired', 'staff documents expired', '/employee/compliance'),
        issue('bad', d?.missing, 'required staff document missing', 'required staff documents missing', '/employee/compliance'),
        issue('warn', d?.expiringSoon, 'staff document expiring soon', 'staff documents expiring soon', '/employee/compliance'),
        issue('warn', d?.pendingReview, 'staff document waiting to be checked', 'staff documents waiting to be checked', '/employee/compliance'),
      ],
    })
  }

  if (canTraining) {
    const d = training.data
    const pct = d && d.mandatoryOwed ? pctOf(n(d.mandatoryCompleted), d.mandatoryOwed) : null
    areas.push({
      key: 'training',
      title: 'Training',
      description: 'Mandatory training and certificates',
      to: '/learning/assignments',
      linkLabel: 'Open training',
      loading: training.isLoading,
      pct,
      rag:
        pct === null
          ? ragFromCounts(n(d?.overdueAssignments) + n(d?.certificatesExpired), n(d?.certificatesExpiring30))
          : ragFromPct(pct),
      stats: [
        { label: 'Overdue training', value: n(d?.overdueAssignments), tone: d?.overdueAssignments ? 'bad' : undefined },
        { label: 'Due in 30 days', value: n(d?.dueNext30), tone: d?.dueNext30 ? 'warn' : undefined },
        { label: 'Certificates expired', value: n(d?.certificatesExpired), tone: d?.certificatesExpired ? 'bad' : undefined },
        { label: 'Expiring (30 days)', value: n(d?.certificatesExpiring30), tone: d?.certificatesExpiring30 ? 'warn' : undefined },
      ],
      issues: [
        issue('bad', d?.overdueAssignments, 'training assignment overdue', 'training assignments overdue', '/learning/assignments'),
        issue('bad', d?.certificatesExpired, 'certificate expired', 'certificates expired', '/learning/certificates'),
        issue('warn', d?.certificatesExpiring30, 'certificate expiring in 30 days', 'certificates expiring in 30 days', '/learning/certificates'),
      ],
    })
  }

  if (canPolicies) {
    const r = reviews.data
    areas.push({
      key: 'policies',
      title: 'Policies',
      description: 'Kept up to date and reviewed on time',
      to: '/policies',
      linkLabel: 'Open policy library',
      loading: reviews.isLoading,
      pct: null,
      rag: ragFromCounts(n(r?.overdue), n(r?.count)),
      stats: [
        // Review counts show "—" when the review endpoint returns nothing, rather than a misleading 0.
        { label: 'Reviews overdue', value: r ? n(r.overdue) : '—', tone: r?.overdue ? 'bad' : undefined },
        { label: 'Reviews due (30 days)', value: r ? n(r.count) : '—', tone: r?.count ? 'warn' : undefined },
        { label: 'No review date', value: r ? n(r.publishedNoReviewDate) : '—', tone: r?.publishedNoReviewDate ? 'warn' : undefined },
      ],
      issues: [
        issue('bad', r?.overdue, 'policy review overdue', 'policy reviews overdue', '/policies'),
        issue('warn', r?.publishedNoReviewDate, 'published policy has no review date', 'published policies have no review date', '/policies'),
      ],
    })
  }

  if (canSg) {
    const d = sg.data
    const pct = d?.auditPct ?? null
    areas.push({
      key: 'safeguarding',
      title: 'Safeguarding',
      description: 'Referral decisions, case management and the records audit',
      to: '/safeguarding',
      linkLabel: 'Open safeguarding',
      loading: sg.isLoading,
      pct,
      rag:
        d && (d.laPending || d.cqcPending)
          ? 'RED'
          : pct === null
            ? ragFromCounts(0, n(d?.reviewsOverdue) + n(d?.noLead))
            : ragFromPct(pct),
      stats: [
        { label: 'Open cases', value: n(d?.open) },
        { label: 'LA / CQC pending', value: `${n(d?.laPending)} / ${n(d?.cqcPending)}`, tone: d?.laPending || d?.cqcPending ? 'bad' : undefined },
        { label: 'Reviews overdue', value: n(d?.reviewsOverdue), tone: d?.reviewsOverdue ? 'warn' : undefined },
        { label: 'No case lead', value: n(d?.noLead), tone: d?.noLead ? 'warn' : undefined },
      ],
      issues: [
        issue('bad', d?.laPending, 'safeguarding LA referral decision pending', 'safeguarding LA referral decisions pending', '/safeguarding'),
        issue('bad', d?.cqcPending, 'safeguarding CQC decision pending', 'safeguarding CQC decisions pending', '/safeguarding'),
        issue('warn', d?.reviewsOverdue, 'safeguarding review overdue', 'safeguarding reviews overdue', '/safeguarding'),
        issue('warn', d?.noLead, 'safeguarding case without a lead', 'safeguarding cases without a lead', '/safeguarding'),
      ],
    })
  }

  if (canInc) {
    const d = inc.data
    const bad = n(d?.candourOverdue) + n(d?.overdueActions)
    areas.push({
      key: 'incidents',
      title: 'Incidents',
      description: 'Open incidents, actions and Duty of Candour',
      to: '/incidents/dashboard',
      linkLabel: 'Open incidents',
      loading: inc.isLoading,
      pct: null,
      rag: ragFromCounts(bad, n(d?.notPickedUp)),
      stats: [
        { label: 'Open incidents', value: n(d?.open) },
        { label: 'Not picked up', value: n(d?.notPickedUp), tone: d?.notPickedUp ? 'warn' : undefined },
        { label: 'Overdue actions', value: n(d?.overdueActions), tone: d?.overdueActions ? 'bad' : undefined },
        { label: 'Duty of Candour overdue', value: n(d?.candourOverdue), tone: d?.candourOverdue ? 'bad' : undefined },
      ],
      issues: [
        issue('bad', d?.candourOverdue, 'incident with Duty of Candour overdue', 'incidents with Duty of Candour overdue', '/incidents/view'),
        issue('bad', d?.overdueActions, 'incident action overdue', 'incident actions overdue', '/incidents/view'),
        issue('warn', d?.notPickedUp, 'incident not yet picked up by a manager', 'incidents not yet picked up by a manager', '/incidents/view'),
      ],
    })
  }

  if (canFb) {
    const d = fb.data
    areas.push({
      key: 'complaints',
      title: 'Complaints',
      description: 'Complaints answered within their deadline',
      to: '/incidents/feedback',
      linkLabel: 'Open complaints',
      loading: fb.isLoading,
      pct: null,
      rag: ragFromCounts(n(d?.overdueComplaints), n(d?.openComplaints)),
      stats: [
        { label: 'Open complaints', value: n(d?.openComplaints), tone: d?.openComplaints ? 'warn' : undefined },
        { label: 'Overdue', value: n(d?.overdueComplaints), tone: d?.overdueComplaints ? 'bad' : undefined },
        { label: 'Complaints this month', value: n(d?.complaintsThisMonth) },
        { label: 'Compliments this month', value: n(d?.complimentsThisMonth) },
      ],
      issues: [issue('bad', d?.overdueComplaints, 'complaint past its response deadline', 'complaints past their response deadline', '/incidents/feedback')],
    })
  }

  if (canPathways || canBodyMap) {
    const t = pathways.data?.totals
    const alerts = canBodyMap ? bodyMap.data?.total : undefined
    areas.push({
      key: 'care-records',
      title: 'Care records',
      description: 'Specialist pathway reviews and plans, body map alerts',
      to: canPathways ? '/apps/specialist-pathways' : '/body-map/review-queue',
      linkLabel: canPathways ? 'Open specialist pathways' : 'Open body map review',
      loading: (canPathways && pathways.isLoading) || (canBodyMap && bodyMap.isLoading),
      pct: null,
      rag: ragFromCounts(n(t?.reviewsOverdue) + n(alerts), n(t?.plansAwaitingApproval)),
      stats: [
        ...(canPathways
          ? [
              { label: 'Pathway reviews overdue', value: n(t?.reviewsOverdue), tone: t?.reviewsOverdue ? ('bad' as const) : undefined },
              { label: 'Plans awaiting approval', value: n(t?.plansAwaitingApproval), tone: t?.plansAwaitingApproval ? ('warn' as const) : undefined },
              { label: 'Very high risks', value: n(t?.highRisks), tone: t?.highRisks ? ('warn' as const) : undefined },
            ]
          : []),
        ...(canBodyMap ? [{ label: 'Body map alerts', value: n(alerts), tone: alerts ? ('bad' as const) : undefined }] : []),
      ],
      issues: [
        issue('bad', t?.reviewsOverdue, 'specialist pathway review overdue', 'specialist pathway reviews overdue', '/apps/specialist-pathways'),
        issue('warn', t?.plansAwaitingApproval, 'pathway care plan awaiting approval', 'pathway care plans awaiting approval', '/apps/specialist-pathways'),
        issue('bad', alerts, 'body map safeguarding alert', 'body map safeguarding alerts', '/body-map/review-queue'),
      ],
    })
  }

  const loading = areas.some(a => a.loading)
  const scored = areas.filter(a => a.pct !== null && !a.loading)
  const overall = scored.length ? Math.round(scored.reduce((sum, a) => sum + (a.pct ?? 0), 0) / scored.length) : null
  const overallRag = ragFromPct(overall)
  const redAreas = areas.filter(a => !a.loading && a.rag === 'RED').length
  const issues = areas
    .flatMap(a => a.issues)
    .filter((i): i is Issue => i !== null)
    .sort((a, b) => (a.tone === b.tone ? b.count - a.count : a.tone === 'bad' ? -1 : 1))

  return (
    <div className="flex flex-col gap-5" data-testid="compliance-dashboard-page">
      <PageHeader
        title="Compliance dashboard"
        description="Every compliance area in one place: staff, training, policies, safeguarding, incidents, complaints and care records."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Compliance dashboard' }]}
      />

      {areas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            You do not have access to any compliance areas.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col gap-2 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overall compliance</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold tabular-nums">{overall === null ? '—' : `${overall}%`}</span>
                  {!loading && <RagChip rag={overallRag} />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average of {scored.length} scored area{scored.length === 1 ? '' : 's'}. Green is 95% or more, amber 80% or more.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-2 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Areas needing action</p>
                <span className={`text-4xl font-bold tabular-nums ${redAreas ? 'text-red-600' : ''}`}>
                  {loading ? '…' : redAreas}
                </span>
                <p className="text-xs text-muted-foreground">of {areas.length} areas are red</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-2 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open issues</p>
                <span className={`text-4xl font-bold tabular-nums ${issues.some(i => i.tone === 'bad') ? 'text-red-600' : ''}`}>
                  {loading ? '…' : issues.length}
                </span>
                <p className="text-xs text-muted-foreground">
                  {issues.filter(i => i.tone === 'bad').length} urgent · {issues.filter(i => i.tone === 'warn').length} to check
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="grid gap-4 md:grid-cols-2 xl:col-span-2">
              {areas.map(a => (
                <AreaCard key={a.key} area={a} />
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <Card data-testid="compliance-attention">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                    Needs attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading && issues.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : issues.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border text-sm">
                      {issues.map(i => (
                        <li key={i.text}>
                          <Link to={i.to} className="flex items-start gap-2 py-2 hover:text-primary">
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i.tone === 'bad' ? 'bg-red-500' : 'bg-amber-500'}`}
                              aria-hidden
                            />
                            <span>{i.text}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {canAudit && (
                <Card>
                  <CardContent className="flex items-center justify-between gap-3 py-4 text-sm">
                    <span className="flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-muted-foreground" aria-hidden />
                      Audit trail: who did what, and when
                    </span>
                    <Link to="/admin/audit" className="font-medium text-primary hover:underline">
                      Open
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
