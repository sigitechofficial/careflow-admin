import { RequiredMark } from '@/features/surveys/components/SurveyQuestionField'
import { Clock, Loader2 } from 'lucide-react'
import {
  CQC_KEY_QUESTION_LABELS,
  LIBRARY_CHANNEL_LABELS,
  describeQuestionType,
  type LibrarySurvey,
  type LibrarySurveyDetail as LibrarySurveyDetailData,
} from '@/features/surveys/api/survey-library.api'
import {
  LIBRARY_AUDIENCE_LABELS,
  cardSummary,
  responsesDescription,
  responsesLabel,
  shortTiming,
} from '@/features/surveys/survey-library-display'
import { describeQuestionExtras } from '@/features/surveys/survey-logic'
import { Badge } from '@/shared/ui/badge'

export const questionsText = (n: number) => `${n} question${n === 1 ? '' : 's'}`

/** The facts row, in a fixed order: who answers, when, minutes, questions, how answers are kept. */
export function LibraryFactsRow({ s }: { s: LibrarySurvey }) {
  const facts: [string, string][] = [
    ['Who answers', LIBRARY_AUDIENCE_LABELS[s.audience]],
    ['When', shortTiming(s.timing)],
    ['Time', `About ${s.estimatedMinutes} minute${s.estimatedMinutes === 1 ? '' : 's'}`],
    ['Questions', questionsText(s.questionCount)],
    ['Responses', responsesLabel(s)],
  ]
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs" data-testid="ready-made-facts">
      {facts.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1">
          <dt className="text-muted-foreground">{label}:</dt>
          <dd className="font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function LibraryCqcChips({ s }: { s: Pick<LibrarySurvey, 'cqc'> }) {
  if (!s.cqc.keyQuestions.length) return null
  return (
    <ul className="flex flex-wrap gap-1" aria-label="CQC key questions">
      {s.cqc.keyQuestions.map(k => (
        <li key={k}>
          <Badge variant="outline" size="sm">
            {CQC_KEY_QUESTION_LABELS[k] ?? k}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

/**
 * Everything about a ready-made survey (the "Read" view): overview, questions by section, what
 * people see first, how to run it, acting on the results, CQC areas, policies and sources. Used by
 * the Ready-made surveys page and the New survey dialog.
 */
export function LibrarySurveyDetail({
  survey: shown,
  isLoading,
  isError,
}: {
  survey: LibrarySurveyDetailData | undefined
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  if (isError || !shown)
    return (
      <p role="alert" className="text-sm text-destructive">
        This survey could not be loaded.
      </p>
    )
  let questionNumber = 0
  return (
    <>
      <section className="space-y-3" data-testid="ready-made-detail-overview">
        <p className="text-sm">{cardSummary(shown.summary)}</p>
        <dl className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm sm:grid-cols-3">
          <div className="sm:col-span-3">
            <dt className="text-xs text-muted-foreground">Who answers</dt>
            <dd>
              {LIBRARY_AUDIENCE_LABELS[shown.audience]}: {shown.respondents}
            </dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-xs text-muted-foreground">When</dt>
            <dd>{shown.timing.when}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">How</dt>
            <dd>{shown.channels.map(c => LIBRARY_CHANNEL_LABELS[c] ?? c).join(', ')}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Size</dt>
            <dd>
              {questionsText(shown.questionCount)} · about {shown.estimatedMinutes} minutes
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Responses</dt>
            <dd data-testid="ready-made-responses">{responsesDescription(shown)}</dd>
          </div>
        </dl>
        {shown.purpose ? (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Why run it</h3>
            <p className="text-sm text-muted-foreground">{shown.purpose}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">What it asks</h3>
        {shown.sections.map((sec, si) => (
          <div key={`${sec.title ?? 'section'}-${si}`} className="space-y-1.5" data-testid="ready-made-survey-section">
            {sec.title ? <h4 className="text-sm font-medium">{sec.title}</h4> : null}
            {sec.introduction ? (
              <p className="text-xs text-muted-foreground" data-testid="ready-made-section-intro">
                Shown under the heading: {sec.introduction}
              </p>
            ) : null}
            <ol className="space-y-1.5">
              {sec.questions.map(question => {
                questionNumber += 1
                return (
                  <li key={question.id} className="rounded-md bg-muted/30 px-3 py-2 text-sm">
                    <p>
                      {questionNumber}. {question.questionText}
                      {question.isRequired ? (
                        <RequiredMark />
                      ) : (
                        <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{describeQuestionType(question)}</p>
                    {question.helpText ? <p className="text-xs text-muted-foreground">{question.helpText}</p> : null}
                    {describeQuestionExtras(question, () => question.showIf?.questionText).map(extra => (
                      <p key={extra} className="text-xs text-muted-foreground" data-testid="ready-made-question-extra">
                        {extra}
                      </p>
                    ))}
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-md border border-border p-3">
        <h3 className="text-sm font-semibold">What people see first</h3>
        <p className="whitespace-pre-line text-sm">{shown.introduction}</p>
        <h4 className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Privacy notice</h4>
        <p className="whitespace-pre-line text-sm text-muted-foreground">{shown.privacyNotice}</p>
        {shown.closingMessage ? (
          <>
            <h4 className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">After submitting</h4>
            <p className="whitespace-pre-line text-sm" data-testid="library-closing-message">
              {shown.closingMessage}
            </p>
          </>
        ) : null}
      </section>

      {shown.anonymousVariant ? (
        <section className="space-y-2 rounded-md border border-border p-3" data-testid="library-anonymous-version">
          <h3 className="text-sm font-semibold">Also available as an anonymous version</h3>
          <p className="text-sm text-muted-foreground">
            Choose it when you start a survey from this template (New survey). It cannot be changed afterwards.
          </p>
          <h4 className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What people see first</h4>
          <p className="whitespace-pre-line text-sm">{shown.anonymousVariant.introduction}</p>
          <h4 className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Privacy notice</h4>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{shown.anonymousVariant.privacyNotice}</p>
          {shown.anonymousVariant.questionsLeftOut.length ? (
            <>
              <h4 className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions left out</h4>
              <ul className="list-disc pl-5 text-sm">
                {shown.anonymousVariant.questionsLeftOut.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          ) : null}
          {shown.anonymousVariant.alertsLeftOut.length ? (
            <>
              <h4 className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alerts left out</h4>
              <ul className="list-disc pl-5 text-sm">
                {shown.anonymousVariant.alertsLeftOut.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-1">
        <h3 className="text-sm font-semibold">How to run it</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {shown.managerGuidance.howToRun.map(t => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section className="space-y-1">
        <h3 className="text-sm font-semibold">Acting on the results</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {shown.managerGuidance.actingOnResults.map(t => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      {shown.managerGuidance.alerts.length ? (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold">Answers that need action</h3>
          <ul className="space-y-1.5 text-sm" data-testid="ready-made-survey-alerts">
            {shown.managerGuidance.alerts.map(a => (
              <li
                key={a.when}
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40"
              >
                <span className="font-medium">{a.when}:</span> {a.action}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold">CQC areas</h3>
        <LibraryCqcChips s={shown} />
        {shown.cqc.qualityStatements.length ? (
          <p className="text-sm text-muted-foreground">{shown.cqc.qualityStatements.join('; ')}</p>
        ) : null}
      </section>

      {shown.relatedPolicies.length ? (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold">Related policies</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {shown.relatedPolicies.map(p => (
              <li key={p.reference}>
                {p.title ?? p.reference} <span className="text-xs text-muted-foreground">({p.reference})</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-1">
        <h3 className="text-sm font-semibold">Sources</h3>
        <ul className="list-disc space-y-0.5 pl-5 text-sm">
          {shown.regulatoryBasis.map(r => (
            <li key={r.url + r.source}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {r.source}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" aria-hidden /> Researched {shown.researchedOn}
      </p>
    </>
  )
}
