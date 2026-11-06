import * as React from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { LibrarySurveyDetail, LibrarySurveyQuestion } from '@/features/surveys/api/survey-library.api'
import type { PublicSurveyForm, SurveyQuestion } from '@/features/surveys/types'
import { SurveyRespondentForm } from '@/features/surveys/components/SurveyRespondentForm'

/** The API's contact-me question (survey-respondent-anonymity.util.ts CONTACT_ME_PATTERN, YES_NO only). */
const CONTACT_ME_PATTERN = /^\s*would you like (someone|us) to (contact|get in touch with) you\b/i
const isContactRequest = (q: { questionType: string; questionText: string }) =>
  q.questionType === 'YES_NO' && CONTACT_ME_PATTERN.test(q.questionText ?? '')

/**
 * The questions the anonymous version leaves out (by their text, as the library lists them), plus every
 * question shown only after one of those, down the chain: they could never be asked.
 */
function leftOutIds(questions: LibrarySurveyQuestion[], leftOutTexts: string[]): Set<string> {
  const texts = new Set(leftOutTexts.map(t => t.trim()))
  const out = new Set(questions.filter(q => texts.has(q.questionText.trim())).map(q => q.id))
  const keyOf = new Map(questions.map(q => [q.id, q.key ?? null]))
  let grew = true
  while (grew) {
    grew = false
    const outKeys = new Set([...out].map(id => keyOf.get(id)).filter((k): k is string => Boolean(k)))
    for (const q of questions) {
      if (!out.has(q.id) && q.showIf?.questionKey && outKeys.has(q.showIf.questionKey)) {
        out.add(q.id)
        grew = true
      }
    }
  }
  return out
}

/**
 * A ready-made survey as the person answering it receives it (the same form as Preview): what they
 * read first, the sections, and the questions, including ones shown only after certain answers. With
 * `anonymous`, its anonymous version: that version's introduction and privacy notice, without the
 * questions it leaves out.
 */
export function libraryAsRespondentForm(survey: LibrarySurveyDetail, opts: { anonymous?: boolean } = {}): PublicSurveyForm {
  const variant = opts.anonymous && !survey.anonymous ? (survey.anonymousVariant ?? null) : null
  const all = survey.sections.flatMap(s => s.questions)
  const skip = variant ? leftOutIds(all, variant.questionsLeftOut) : new Set<string>()
  let sortOrder = 0
  // Show-if rules name the earlier question by its key: the form finds it by key, or by id (as the API's form sends).
  const idByKey = new Map(all.filter(q => q.key).map(q => [q.key as string, q.id] as const))
  const questions: SurveyQuestion[] = survey.sections.flatMap(section =>
    section.questions
      .filter(q => !skip.has(q.id))
      .map(q => {
        const notCounted = q.notCountedOptions?.length ? { notCountedOptions: q.notCountedOptions } : {}
        // The library names the earlier question by its text too; the form needs its key, id and answers.
        const showIf = q.showIf
          ? (({ questionText: _t, ...rule }) => ({ ...rule, questionId: idByKey.get(rule.questionKey) ?? null }))(q.showIf)
          : null
        return {
          id: q.id,
          key: q.key ?? null,
          // As the API marks it (isContactRequestQuestion): not asked of anyone answering without their name.
          contactRequest: isContactRequest(q),
          questionText: q.questionText,
          helpText: q.helpText,
          questionType: q.questionType,
          options: q.options,
          // A CareFlow list (ethnicity …): the organisation's own entries, grouped as the answer form shows them.
          ...(q.optionsFrom ? { optionsFrom: q.optionsFrom, optionGroups: q.optionGroups ?? [] } : {}),
          ...(q.answerGroups?.length ? { answerGroups: q.answerGroups } : {}),
          config: q.config || Object.keys(notCounted).length ? { ...(q.config ?? {}), ...notCounted } : null,
          isRequired: q.isRequired,
          sortOrder: sortOrder++,
          sectionTitle: section.title,
          otherOption: q.otherOption ?? null,
          exclusiveOptions: q.exclusiveOptions,
          commentConfig: q.commentConfig ?? null,
          showIf,
        } as SurveyQuestion
      }),
  )
  const sectionIntros: Record<string, string> = {}
  for (const s of survey.sections) {
    if (s.title && s.introduction?.trim()) sectionIntros[s.title] = s.introduction
  }
  const introduction = variant?.introduction ?? survey.introduction
  const privacyNotice = variant?.privacyNotice ?? survey.privacyNotice
  const anonymous = survey.anonymous || Boolean(variant)
  return {
    title: survey.title,
    description: `${introduction.trim()}\n\n${privacyNotice.trim()}`,
    isAnonymous: anonymous,
    allowAnonymousResponses: Boolean(survey.allowAnonymousResponses && !anonymous),
    status: 'ACTIVE',
    opensAt: null,
    closesAt: null,
    alreadyCompleted: false,
    canSubmit: true,
    unavailableReason: null,
    linkKind: survey.audience === 'PUBLIC' ? 'share' : 'recipient',
    askRespondent: survey.audience === 'SERVICE_USER',
    forName: null,
    questions,
    sectionIntros,
  } as PublicSurveyForm
}

/** Try a ready-made survey as people answer it (named or, when it has one, its anonymous version). Nothing is saved. */
export function LibrarySurveyRespondentView({ survey }: { survey: LibrarySurveyDetail }) {
  const hasAnonymous = !survey.anonymous && Boolean(survey.anonymousVariant)
  const [version, setVersion] = React.useState<'named' | 'anonymous'>('named')
  const anonymous = hasAnonymous && version === 'anonymous'
  const form = React.useMemo(() => libraryAsRespondentForm(survey, { anonymous }), [survey, anonymous])
  const [attempt, setAttempt] = React.useState(0)
  const [finished, setFinished] = React.useState(false)
  const startAgain = () => {
    setFinished(false)
    setAttempt(n => n + 1)
  }
  const closingMessage = anonymous ? (survey.anonymousVariant?.closingMessage ?? null) : survey.closingMessage

  const versionSwitch = hasAnonymous ? (
    <div role="group" aria-label="Which version" className="mb-3 inline-flex rounded-md border border-border p-0.5">
      {(
        [
          ['named', 'Named version'],
          ['anonymous', 'Anonymous version'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={version === value}
          onClick={() => {
            setVersion(value)
            startAgain()
          }}
          className={`min-h-8 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            version === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  ) : null

  if (finished) {
    return (
      <div>
        {versionSwitch}
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <CheckCircle2 className="h-6 w-6 text-teal-600" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Response recorded</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Thank you for completing this survey.</p>
          {closingMessage ? (
            <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-left text-sm leading-relaxed text-foreground">
              {closingMessage}
            </p>
          ) : null}
          <p className="mt-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            This is what people see after they submit. Nothing was saved.
          </p>
          <Button type="button" variant="outline" className="mt-5 gap-1.5" onClick={startAgain}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Start again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="library-respondent-view">
      {versionSwitch}
      <p className="mb-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        {anonymous
          ? 'The anonymous version: what people read first, without the questions it leaves out. '
          : 'This is the page people answer on. '}
        Try answering: questions shown only after certain answers appear as you go. Nothing you enter here is saved.
      </p>
      <SurveyRespondentForm
        key={`${version}-${attempt}`}
        data={form}
        submitting={false}
        onSubmit={async () => setFinished(true)}
      />
    </div>
  )
}
