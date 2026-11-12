import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus, UserCheck } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { useSurveys } from '@/features/surveys/hooks/useSurveys'
import { AddReviewerDialog, GrantReviewerDialog, type ReviewersData } from './SurveyReviewers'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { Banner } from '@/shared/ui/banner'
import { Skeleton } from '@/shared/ui/misc'
import { Input } from '@/shared/ui/input'
import { MultiSelect } from '@/shared/ui/multi-select'
import { apiJson } from '@/shared/api/api-client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { extractApiErrorMessage } from '@/shared/lib/toast'
import { formatOpsDateTimeNumeric } from '@/shared/lib/operational-day.util'
import { useAuthStore } from '@/features/auth/store'

type AccessStatus = 'ACTIVE' | 'NOT_STARTED' | 'ENDED' | 'REVOKED'
type Reviewer = {
  id: string
  name: string
  email: string
  accountActive: boolean
  createdAt: string
  liveAccess: number
  answersRecorded: number
  /** Connected to us when added, and what the manager declared. */
  declaredLinks?: string[]
  declaration?: string | null
  access: Array<{
    grantId: string
    survey: { id: string; title: string }
    validFrom: string
    validTo: string
    status: AccessStatus
    sampleSize: number
    answersRecorded: number
    lastRecordedAt: string | null
  }>
}

const STATUS: Record<AccessStatus, { label: string; variant: 'success' | 'info' | 'default' | 'destructive' }> = {
  ACTIVE: { label: 'Live', variant: 'success' },
  NOT_STARTED: { label: 'Not started', variant: 'info' },
  ENDED: { label: 'Ended', variant: 'default' },
  REVOKED: { label: 'Access ended early', variant: 'destructive' },
}

const day = (iso: string) => formatOpsDateTimeNumeric(iso).split(' ')[0]

/**
 * Add a reviewer, or give one access, from here. Several surveys can be chosen (with a search): the account is made
 * once, then each survey's access (its own people and dates) is set in turn, "Survey 1 of 3". An account and its
 * access always belong to a survey the person manages (the API checks), so the surveys are chosen first.
 */
function ReviewerFlow({ mode, userId, onDone }: { mode: 'add' | 'grant'; userId?: string; onDone: () => void }) {
  const surveys = useSurveys({ isTemplate: false })
  // Closed surveys can't be reviewed; a repeating survey is reviewed on the period being run.
  const options = (surveys.data ?? []).filter(s => s.status !== 'CLOSED' && !(s.recurrence && !s.clonedFromId))
  const [chosen, setChosen] = React.useState<string[]>([])
  const [step, setStep] = React.useState<'pick' | 'account' | 'grant'>('pick')
  const [index, setIndex] = React.useState(0)
  const [reviewerId, setReviewerId] = React.useState<string | undefined>(userId)
  const surveyId = chosen[index] ?? ''
  const reviewers = useQuery({
    queryKey: ['surveys', 'reviewers', surveyId],
    queryFn: async () => unwrapEnvelope<ReviewersData>(await apiJson<unknown>(`/surveys/${surveyId}/reviewers`, { method: 'GET' })),
    enabled: Boolean(surveyId) && step === 'grant',
  })
  const titleOf = (id: string) => options.find(o => o.id === id)?.title ?? 'Survey'
  // After each survey (given or skipped), the next one; after the last, done.
  const next = () => (index + 1 < chosen.length ? setIndex(i => i + 1) : onDone())

  if (step === 'account') {
    return (
      <AddReviewerDialog
        surveyId={surveyId}
        allSurveyIds={chosen}
        onClose={onDone}
        onAdded={id => {
          setReviewerId(id)
          setStep('grant')
        }}
      />
    )
  }
  if (step === 'grant') {
    if (!reviewers.data) return null
    return (
      <>
        {chosen.length > 1 ? (
          <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background shadow" data-testid="reviewer-flow-progress">
            Survey {index + 1} of {chosen.length}: {titleOf(surveyId)}
          </div>
        ) : null}
        <GrantReviewerDialog
          key={surveyId}
          surveyId={surveyId}
          data={reviewers.data}
          initialUserId={reviewerId}
          onClose={next}
          onAddAccount={() => setStep('account')}
        />
      </>
    )
  }
  return (
    <Dialog open onOpenChange={o => (!o ? onDone() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add a reviewer' : 'Give access to surveys'}</DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Which surveys? Next you choose who records the answers: an independent reviewer added before, a new one, or staff who run surveys.'
              : 'Which surveys? Next you choose the people and dates for each one.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-1 text-sm" data-testid="reviewer-survey-select">
            <span className="font-medium">Surveys</span>
            <MultiSelect
              options={options.map(o => ({ value: o.id, label: o.status === 'DRAFT' ? `${o.title} (draft)` : o.title }))}
              value={chosen}
              onChange={setChosen}
              placeholder={surveys.isLoading ? 'Loading surveys…' : 'Choose one or more surveys'}
              searchPlaceholder="Search surveys"
              disabled={surveys.isLoading || !options.length}
            />
          </div>
          {!surveys.isLoading && !options.length ? <p className="mt-2 text-xs text-muted-foreground">There are no open surveys to review.</p> : null}
          {chosen.length ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {chosen.length} chosen.{' '}
              <button type="button" className="underline" onClick={() => setChosen([])}>
                Clear
              </button>
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button
            disabled={!chosen.length}
            onClick={() => {
              setIndex(0)
              setStep(mode === 'add' ? 'account' : 'grant')
            }}
            data-testid="reviewer-flow-next"
          >
            Next
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Surveys → Independent reviewers: every outside reviewer across all surveys, the surveys they were given,
 * when, for how many people, and the answers they recorded (each opens that survey's answers, filtered to them).
 * Reviewers are added and given access on each survey's page (Independent reviewers).
 */
export default function ReviewersOverviewPage() {
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const qc = useQueryClient()
  const [q, setQ] = React.useState('')
  const [flow, setFlow] = React.useState<{ mode: 'add' | 'grant'; userId?: string } | null>(null)
  const closeFlow = () => {
    setFlow(null)
    void qc.invalidateQueries({ queryKey: ['surveys', 'reviewers-overview'] })
  }
  const query = useQuery({
    queryKey: ['surveys', 'reviewers-overview'],
    queryFn: async () => unwrapEnvelope<{ reviewers: Reviewer[] }>(await apiJson<unknown>('/survey-reviewers', { method: 'GET' })),
    enabled: canManage,
  })
  if (!canManage) return <p className="p-6 text-sm text-muted-foreground">Only people who manage surveys can see independent reviewers.</p>
  const term = q.trim().toLowerCase()
  const reviewers = (query.data?.reviewers ?? []).filter(
    r => !term || `${r.name} ${r.email} ${r.access.map(a => a.survey.title).join(' ')}`.toLowerCase().includes(term),
  )
  const total = query.data?.reviewers ?? []

  return (
    <div className="space-y-4 p-6" data-testid="reviewers-overview-page">
      <PageHeader
        title="Independent reviewers"
        description="Outside reviewers across all surveys: which surveys they were given, for whom and when, and the answers they recorded."
        icon={<UserCheck className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Surveys', href: '/surveys' }, { label: 'Independent reviewers' }]}
      >
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFlow({ mode: 'add' })} data-testid="add-reviewer">
          Add a reviewer
        </Button>
      </PageHeader>
      <Banner
        variant="info"
        message="A reviewer signs in with their own email and password, and sees only the surveys you give them, their chosen people’s names and the questions: never results, other answers or care records. Access ends on the last day you set."
      />
      {query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : query.isError ? (
        <Banner variant="destructive" message={extractApiErrorMessage(query.error)} />
      ) : !total.length ? (
        <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
          No independent reviewers yet. Use “Add a reviewer” to invite one.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Input className="h-9 w-72" placeholder="Search reviewer or survey" value={q} onChange={e => setQ(e.target.value)} aria-label="Search reviewers" />
            <span className="text-muted-foreground">
              {total.length} reviewer{total.length === 1 ? '' : 's'} · {total.reduce((n, r) => n + r.liveAccess, 0)} live access ·{' '}
              {total.reduce((n, r) => n + r.answersRecorded, 0)} answers recorded
            </span>
          </div>
          {reviewers.map(r => (
            <section key={r.id} className="overflow-hidden rounded-lg border" data-testid={`reviewer-${r.id}`}>
              <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.email} · added {day(r.createdAt)}
                  </div>
                  {r.declaredLinks?.length ? (
                    <div className="mt-1 text-xs text-amber-800 dark:text-amber-300" data-testid="reviewer-declared-links">
                      Declared link: {r.declaredLinks.join('; ')}
                      {r.declaration ? <span className="text-muted-foreground"> — “{r.declaration}”</span> : null}
                    </div>
                  ) : null}
                </div>
                {!r.accountActive ? <Badge variant="destructive" size="sm">Account switched off</Badge> : null}
                {r.accountActive ? (
                  <Button size="sm" variant="outline" onClick={() => setFlow({ mode: 'grant', userId: r.id })}>
                    Give access to surveys
                  </Button>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {r.answersRecorded} answer{r.answersRecorded === 1 ? '' : 's'} recorded · {r.liveAccess} live
                </span>
              </div>
              {r.access.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Survey</th>
                        <th className="px-4 py-2">Access</th>
                        <th className="px-4 py-2">Sample</th>
                        <th className="px-4 py-2">Answers recorded</th>
                        <th className="px-4 py-2">Last recorded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.access.map(a => (
                        <tr key={a.grantId} className="border-t align-top">
                          <td className="px-4 py-2">
                            <Link to="/surveys/$surveyId" params={{ surveyId: a.survey.id }} className="font-medium text-primary hover:underline">
                              {a.survey.title}
                            </Link>
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant={STATUS[a.status].variant} size="sm">
                              {STATUS[a.status].label}
                            </Badge>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {day(a.validFrom)} – {day(a.validTo)}
                            </div>
                          </td>
                          <td className="px-4 py-2">{a.sampleSize ? `${a.sampleSize} ${a.sampleSize === 1 ? 'person' : 'people'}` : 'Anonymous answers'}</td>
                          <td className="px-4 py-2">
                            {a.answersRecorded ? (
                              <a
                                href={`/surveys/${a.survey.id}/responses?recordedBy=${encodeURIComponent(r.id)}`}
                                className="font-medium text-primary hover:underline"
                                data-testid="reviewer-answers-link"
                              >
                                {a.answersRecorded} — see them
                              </a>
                            ) : (
                              <span className="text-muted-foreground">None yet</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{a.lastRecordedAt ? formatOpsDateTimeNumeric(a.lastRecordedAt) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">Not given access to any survey yet.</p>
              )}
            </section>
          ))}
          {!reviewers.length ? <p className="text-sm text-muted-foreground">Nothing matches “{q}”.</p> : null}
        </>
      )}
      {flow ? <ReviewerFlow mode={flow.mode} userId={flow.userId} onDone={closeFlow} /> : null}
    </div>
  )
}
