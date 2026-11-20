import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  BookCopy,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileText,
  FileSearch,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Paperclip,
  PlayCircle,
  Scale,
  Target,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { MockInspectionTemplate, TemplateGuidance } from '../types'
import { useMockInspectionTemplates } from '../hooks'
import { HELP } from '../help'
import { InfoTip } from '../components/InfoTip'
import { StartInspectionDialog } from '../components/StartInspectionDialog'
import { durationLabel, keyQuestionLabel } from '../components/TemplateDetail'
import { RelatedSurveys, SurveyList, surveysForStatements, useSurveysByStatement } from '../components/RelatedSurveys'
import { PolicyList, RelatedPolicies, policiesForStatements, usePoliciesByStatement } from '../components/RelatedPolicies'
import { AdoptAllButton } from '../components/AdoptButtons'

/** A titled card with an icon header (same look as the CQC notification page). */
function SectionCard({
  id,
  icon,
  title,
  description,
  aside,
  children,
}: {
  id?: string
  icon: React.ReactNode
  title: string
  description?: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-4 rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {aside}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

const GUIDANCE: { key: keyof TemplateGuidance; label: string; icon: React.ReactNode }[] = [
  { key: 'lookAt', label: 'Look at', icon: <FileSearch className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'askPeople', label: 'Ask people we support', icon: <Users className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'askStaff', label: 'Ask staff', icon: <MessageCircle className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'inCareFlow', label: 'In CareFlow', icon: <LayoutDashboard className="h-3.5 w-3.5" aria-hidden /> },
]

/** The four kinds of guidance as small cards; empty ones are left out. */
function GuidanceCards({ guidance }: { guidance: TemplateGuidance }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {GUIDANCE.filter(g => guidance[g.key].length).map(g => (
        <div key={g.key} className="rounded-lg border border-border bg-muted/20 p-3" data-testid={`mock-guidance-${g.key}`}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span className="text-primary">{g.icon}</span>
            {g.label}
          </p>
          <ul className="mt-1.5 space-y-1 text-[13px] leading-snug text-muted-foreground">
            {guidance[g.key].map(item => (
              <li key={item} className="flex gap-1.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Label above value, for the side panel. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  )
}

function ReadPage({ t }: { t: MockInspectionTemplate }) {
  const navigate = useNavigate()
  const canStart = useAuthStore(s => s.can('cqc_mock_inspection.manage'))
  const [starting, setStarting] = React.useState(false)
  const { canSee: canSeeSurveys, byStatement } = useSurveysByStatement()
  const { canSee: canSeePolicies, byStatement: policiesByStatement } = usePoliciesByStatement()
  const codes = t.statements.map(s => s.code)
  /** Every ready-made survey and policy for this inspection's statements, once each, most useful first. */
  const allSurveys = surveysForStatements(codes, byStatement)
  const allPolicies = policiesForStatements(codes, policiesByStatement)
  const adoptedPolicies = allPolicies.filter(p => p.adoptedPolicyId && p.adoptedStatus !== 'ARCHIVED').length
  const adoptedSurveys = allSurveys.filter(s => s.adoptedTemplateId).length
  const groups = t.keyQuestionCodes.map(code => ({ code, statements: t.statements.filter(s => s.keyQuestionCode === code) }))
  /** Statements are numbered 1, 2, 3… across the key questions, in reading order. */
  const numberOf = new Map(groups.flatMap(g => g.statements).map((s, i) => [s.code, i + 1]))

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6" data-testid="ready-made-inspection-page">
      <div className="flex flex-wrap items-start gap-3 border-b border-border pb-5">
        <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
          <Link to="/governance/mock-inspections/ready-made">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to ready-made inspections</span>
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            <Link to="/governance/mock-inspections/ready-made" className="hover:text-foreground hover:underline">
              Ready-made inspections
            </Link>{' '}
            / {t.groupName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{t.title}</h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t.summary}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-5">
          <SectionCard icon={<CalendarClock className="h-4 w-4" />} title="When to use it">
            <p className="text-sm leading-relaxed text-foreground">{t.whenToUse}</p>
            {!t.givesOverallRating ? (
              <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                This inspection covers some key questions only. Like a focused CQC inspection, it rates the key
                questions it covers but gives no overall rating for the service.
              </p>
            ) : null}
          </SectionCard>

          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Jump to a key question">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Jump to:</span>
            {groups.map(g => (
              <a
                key={g.code}
                href={`#kq-${g.code}`}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
              >
                {keyQuestionLabel(g.code)} <span className="tabular-nums text-muted-foreground">({g.statements.length})</span>
              </a>
            ))}
          </nav>

          {groups.map(g => (
            <SectionCard
              key={g.code}
              id={`kq-${g.code}`}
              icon={<Scale className="h-4 w-4" />}
              title={keyQuestionLabel(g.code)}
              description={`${g.statements.length} quality statement${g.statements.length === 1 ? '' : 's'} to score`}
            >
              <ol className="space-y-5">
                {g.statements.map(s => {
                  return (
                    <li key={s.code} className="border-b border-border pb-5 last:border-0 last:pb-0" data-testid="mock-template-statement">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {numberOf.get(s.code)}
                        </span>
                        <div className="min-w-0 flex-1 space-y-3">
                          <h3 className="text-[15px] font-semibold leading-snug text-foreground">{s.title}</h3>
                          {s.focus ? (
                            <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                              <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                              <p>
                                <span className="font-semibold text-primary">Focus: </span>
                                {s.focus}
                              </p>
                            </div>
                          ) : null}
                          <GuidanceCards guidance={s.guidance} />
                          <RelatedPolicies policies={policiesByStatement[s.code]} />
                          <RelatedSurveys surveys={byStatement[s.code]} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </SectionCard>
          ))}
        </div>

        {/* On wide screens the panel stays in view and scrolls on its own (56px top bar + 16px gaps). */}
        <aside
          className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-5.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pb-1 lg:pr-1"
          aria-label="About this inspection"
          data-testid="mock-template-side"
        >
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="mock-template-glance">
            <div className="mb-3 flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">At a glance</h2>
              <InfoTip label="ready-made inspections">{HELP.readyMade}</InfoTip>
            </div>
            <dl className="space-y-3">
              <Fact label="Type">{t.groupName}</Fact>
              <Fact label="Quality statements">{t.statementCount}</Fact>
              <Fact label="Time needed">About {durationLabel(t.estimatedMinutes)}</Fact>
              <Fact label="Key questions">
                <span className="mt-1 flex flex-wrap gap-1">
                  {t.keyQuestionCodes.map(code => (
                    <Badge key={code} size="sm" variant="outline">
                      {keyQuestionLabel(code)}
                    </Badge>
                  ))}
                </span>
              </Fact>
              <Fact label="Rating">{t.givesOverallRating ? 'Overall and each key question' : 'Each key question it covers'}</Fact>
            </dl>
            {!t.matchesFramework ? (
              <p className="mt-3 flex gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Some statements are not in the current CQC framework, so this inspection cannot be started until it is
                updated.
              </p>
            ) : null}
            {canStart ? (
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() => setStarting(true)}
                disabled={!t.matchesFramework}
                data-testid="mock-template-start"
              >
                <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden />
                Start this inspection
              </Button>
            ) : null}
          </div>

          {(canSeePolicies && allPolicies.length) || (canSeeSurveys && allSurveys.length) ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="mock-template-attached">
              <div className="mb-1 flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-primary" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">Attached to this inspection</h2>
                <InfoTip label="what is attached">{HELP.attached}</InfoTip>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                The policies and surveys behind its statements. Those covering more of this inspection come first.
              </p>

              {canSeePolicies && allPolicies.length ? (
                <section className="space-y-1.5" data-testid="mock-template-policies">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
                      Policies ({allPolicies.length})
                      <span className="font-normal text-muted-foreground">· {adoptedPolicies} adopted</span>
                    </h3>
                    <AdoptAllButton kind="policy" ids={allPolicies.filter(p => !p.adoptedPolicyId).map(p => p.id)} />
                  </div>
                  <PolicyList policies={allPolicies} limit={6} />
                </section>
              ) : null}

              {canSeeSurveys && allSurveys.length ? (
                <section
                  className={canSeePolicies && allPolicies.length ? 'mt-4 space-y-1.5 border-t border-border pt-3' : 'space-y-1.5'}
                  data-testid="mock-template-surveys"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <ClipboardList className="h-3.5 w-3.5 text-primary" aria-hidden />
                      Surveys ({allSurveys.length})
                      <span className="font-normal text-muted-foreground">· {adoptedSurveys} adopted</span>
                    </h3>
                    <AdoptAllButton kind="survey" ids={allSurveys.filter(s => !s.adoptedTemplateId).map(s => s.id)} />
                  </div>
                  <SurveyList surveys={allSurveys} limit={6} />
                </section>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-sm">
            <div className="mb-2 flex items-center gap-1.5">
              <BookCopy className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">Sources</h2>
            </div>
            <p className="leading-relaxed">
              Researched {t.researchedOn}. The guidance is CareFlow&apos;s own wording based on CQC&apos;s single
              assessment framework; check CQC&apos;s website for its latest guidance.
            </p>
            {t.sources.length ? (
              <ul className="mt-2 space-y-1.5">
                {t.sources.map(s => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex gap-1 leading-snug text-primary hover:underline"
                    >
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      {s.source}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </aside>
      </div>

      <StartInspectionDialog
        open={starting}
        onOpenChange={setStarting}
        template={t}
        onStarted={id => void navigate({ to: '/governance/mock-inspections/$inspectionId', params: { inspectionId: id } })}
      />
    </div>
  )
}

/** Governance → Mock CQC inspection → Ready-made inspections → one inspection, to read before starting it. */
export default function ReadyMadeInspectionPage() {
  const { templateCode } = useParams({ strict: false }) as { templateCode: string }
  const query = useMockInspectionTemplates()
  if (query.isLoading) {
    return (
      <div className="p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  const t = query.data?.find(x => x.code === templateCode)
  if (!t) {
    return (
      <div className="space-y-2 p-6 text-sm">
        <p className={query.isError ? 'text-destructive' : 'text-muted-foreground'}>
          {query.isError ? 'The ready-made inspections could not be loaded.' : 'This ready-made inspection was not found.'}
        </p>
        <Link to="/governance/mock-inspections/ready-made" className="text-primary hover:underline">
          Back to ready-made inspections
        </Link>
      </div>
    )
  }
  return <ReadPage t={t} />
}
