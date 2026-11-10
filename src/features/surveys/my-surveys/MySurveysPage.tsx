import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { SurveyRespondentForm } from '@/features/surveys/components/SurveyRespondentForm'
import type { SubmitSurveyResponseInput } from '@/features/surveys/types'
import { useMySurveyForm, useMySurveys, useSubmitMySurvey, type MySurveyItem } from './my-surveys'

/** "20 Nov 2026" (UK). */
function day(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' })
}

function stateLine(s: MySurveyItem): string {
  if (s.state === 'COMPLETED') return `Answered${s.completedAt ? ` on ${day(s.completedAt)}` : ''}. Thank you.`
  if (s.state === 'UNAVAILABLE') return s.unavailableReason ?? 'Not taking answers now.'
  const closes = day(s.closesAt)
  return closes ? `Open until ${closes}.` : 'Open now.'
}

/**
 * My surveys: surveys sent to me as a member of staff, answered here on a computer (the carer app has
 * the same list). Anonymous surveys say so; nothing in the address identifies me.
 */
export default function MySurveysPage() {
  const { data, isLoading, isError } = useMySurveys()
  const items = data?.items ?? []
  return (
    <div className="space-y-4">
      <PageHeader
        title="My surveys"
        description="Surveys sent to you as a member of staff. You can answer them here or in the carer app."
        icon={<ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'My surveys' }]}
      />
      {isLoading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your surveys…
        </p>
      ) : isError ? (
        <p role="alert" className="text-sm text-destructive">Could not load your surveys.</p>
      ) : !data?.linked ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground" data-testid="my-surveys-not-linked">
          Your CareFlow login is not linked to a staff record, so no surveys are sent to you here. Surveys are matched by
          the email address on your staff record.
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">You have no surveys at the moment.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card" data-testid="my-surveys-list">
          {items.map(s => (
            <li key={s.surveyId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="text-sm text-muted-foreground">
                  {s.isAnonymous ? 'Anonymous: your answers are not linked to your name. ' : ''}
                  {stateLine(s)}
                </p>
              </div>
              {s.state === 'OPEN' ? (
                <Button asChild size="sm">
                  <Link to="/my-surveys/$surveyId" params={{ surveyId: s.surveyId }}>
                    Answer
                  </Link>
                </Button>
              ) : s.state === 'COMPLETED' ? (
                <CheckCircle2 className="h-5 w-5 text-teal-600" aria-label="Answered" />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Answer one of my surveys, in the app shell. */
export function MySurveyAnswerPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const { data, isLoading, isError, error } = useMySurveyForm(surveyId)
  const submitMut = useSubmitMySurvey(surveyId)
  const [done, setDone] = React.useState<{ closing: string | null } | null>(null)
  const heading = React.useRef<HTMLHeadingElement>(null)
  React.useEffect(() => {
    if (done) heading.current?.focus()
  }, [done])

  const submit = async (input: SubmitSurveyResponseInput, meta?: { language: string | null }) => {
    try {
      const res = await submitMut.mutateAsync(input)
      const lang = meta?.language ?? null
      setDone({ closing: (lang && res?.closingMessages?.[lang]) || res?.closingMessage || null })
      toastSuccess('Thank you — your answers were sent.')
    } catch (e) {
      toastApiError(e, 'Could not send your answers')
    }
  }

  const back = (
    <Button asChild variant="outline" size="sm">
      <Link to="/my-surveys">
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
        Back to my surveys
      </Link>
    </Button>
  )

  if (isLoading) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the survey…
      </p>
    )
  }
  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-destructive">{(error as Error)?.message || 'This survey is not available.'}</p>
        {back}
      </div>
    )
  }
  if (done || data.alreadyCompleted) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-teal-600" aria-hidden />
        <h1 ref={heading} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
          {done ? 'Thank you' : 'You have already answered this survey'}
        </h1>
        {done?.closing ? <p className="whitespace-pre-line text-left text-sm">{done.closing}</p> : null}
        {back}
      </div>
    )
  }
  if (!data.canSubmit) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{data.unavailableReason ?? 'This survey is not taking answers now.'}</p>
        {back}
      </div>
    )
  }
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      {back}
      <SurveyRespondentForm data={data} submitting={submitMut.isPending} onSubmit={submit} />
    </div>
  )
}
