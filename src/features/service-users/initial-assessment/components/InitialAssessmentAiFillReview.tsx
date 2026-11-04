import * as React from 'react'
import { Check, Gauge, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useBodyMapLookups } from '@/features/service-users/body-map/hooks/useBodyMapLookups'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useSuggestInitialAssessmentAnswers } from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import {
  mapLookupRowsToQuestionOptions,
  resolveQuestionOptions,
} from '@/features/service-users/initial-assessment/utils/question-options'
import { hasAssessmentAnswer } from '@/features/service-users/initial-assessment/utils/question-prefill'
import { isSecureQuestion } from '@/features/service-users/initial-assessment/utils/secure-field'
import type {
  InitialAssessmentAiFillResult,
  InitialAssessmentAiFillSuggestion,
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'

const formatTokens = (n: number) => n.toLocaleString('en-GB')
/** Fills cost fractions of a cent, so small amounts keep 4 decimals. */
const formatUsd = (n: number) => `$${n < 0.01 ? n.toFixed(4) : n.toFixed(2)}`
const formatModel = (model: string) =>
  model.startsWith('claude-haiku-5-5') ? 'Claude Haiku 5.5' : model

export type AiFillTarget = {
  /** Name of the open form tab, e.g. "Personal Details & Medical History". */
  tabTitle: string
  questions: InitialAssessmentQuestion[]
  answers: Record<string, InitialAssessmentAnswerInput>
  editable: boolean
  onApply: (answers: InitialAssessmentAnswerInput[]) => void
}

type Props = {
  serviceUserId: string
  submissionId: string
  transcript: string
  target: AiFillTarget
}

/**
 * "Fill fields from transcript": AI suggests answers for the open tab, the assessor ticks which
 * to use, and the chosen ones go into the form (saved by the form's normal autosave).
 * Answers that would replace something already entered start unticked.
 */
export function InitialAssessmentAiFillReview({ serviceUserId, submissionId, transcript, target }: Props) {
  const suggest = useSuggestInitialAssessmentAnswers(serviceUserId, submissionId)
  const suLookups = useServiceUserLookups()
  const bodyMapLookups = useBodyMapLookups()
  const [suggestions, setSuggestions] = React.useState<InitialAssessmentAiFillSuggestion[] | null>(null)
  const [picked, setPicked] = React.useState<Set<string>>(new Set())
  const [tabTitle, setTabTitle] = React.useState('')
  const [lastUsage, setLastUsage] = React.useState<Pick<InitialAssessmentAiFillResult, 'usage' | 'totals'> | null>(null)
  /** What was put into the form on the last Apply, listed so the assessor can see which fields changed. */
  const [applied, setApplied] = React.useState<{ tabTitle: string; items: InitialAssessmentAiFillSuggestion[] } | null>(null)

  const questionById = React.useMemo(
    () => new Map(target.questions.map((q) => [q.id, q] as const)),
    [target.questions],
  )
  const hasExisting = (questionId: string) => {
    const q = questionById.get(questionId)
    return q ? hasAssessmentAnswer(target.answers[questionId], q) : false
  }

  const run = () => {
    const catalogs = {
      woundTypeCatalog: bodyMapLookups.data?.woundTypes ?? [],
      fundingTypeCatalog: mapLookupRowsToQuestionOptions(suLookups.data?.fundingTypes ?? []),
      ethnicityCatalog: mapLookupRowsToQuestionOptions(suLookups.data?.ethnicities ?? []),
      languageCatalog: mapLookupRowsToQuestionOptions(suLookups.data?.languages ?? []),
      genderCatalog: mapLookupRowsToQuestionOptions(suLookups.data?.genders ?? []),
      sexCatalog: mapLookupRowsToQuestionOptions(suLookups.data?.sexes ?? []),
      sexualOrientationCatalog: mapLookupRowsToQuestionOptions(suLookups.data?.sexualOrientations ?? []),
    }
    const questions = target.questions
      .filter((q) => !isSecureQuestion(q))
      .map((q) => {
        const options = resolveQuestionOptions(q, catalogs).map((o) => ({ value: String(o.value), label: String(o.label) }))
        return options.length ? { id: q.id, options } : { id: q.id }
      })
    if (!questions.length) {
      toastWarning('Nothing to fill', 'No fields on this tab can be filled from a transcript.')
      return
    }
    setTabTitle(target.tabTitle)
    suggest.mutate(
      { transcript, questions },
      {
        onSuccess: (res) => {
          setLastUsage({ usage: res.usage, totals: res.totals })
          setSuggestions(res.suggestions)
          setPicked(new Set(res.suggestions.filter((s) => !hasExisting(s.questionId)).map((s) => s.questionId)))
        },
        onError: (e) => toastApiError(e, 'Could not fill the fields'),
      },
    )
  }

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const apply = () => {
    if (!suggestions) return
    const chosen = suggestions.filter((s) => picked.has(s.questionId))
    target.onApply(chosen.map((s) => s.answer))
    toastSuccess(`${chosen.length} field${chosen.length === 1 ? '' : 's'} filled. Check them on the form.`)
    setApplied({ tabTitle, items: chosen })
    setSuggestions(null)
  }

  const usageLine = lastUsage ? (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground"
      data-testid="ia-ai-usage"
    >
      <span className="flex items-center gap-1 font-medium text-foreground">
        <Gauge className="h-3.5 w-3.5" />
        AI key usage
      </span>
      <span>
        This fill: {formatModel(lastUsage.usage.model)} · {formatTokens(lastUsage.usage.inputTokens)} in +{' '}
        {formatTokens(lastUsage.usage.outputTokens)} out tokens ≈ {formatUsd(lastUsage.usage.costUsd)}
      </span>
      <span title={`Since ${new Date(lastUsage.totals.since).toLocaleString()}`}>
        Since the API started: {lastUsage.totals.requests} fill{lastUsage.totals.requests === 1 ? '' : 's'} ·{' '}
        {formatTokens(lastUsage.totals.inputTokens + lastUsage.totals.outputTokens)} tokens ≈{' '}
        {formatUsd(lastUsage.totals.costUsd)}
      </span>
    </div>
  ) : null

  const appliedList = applied ? (
    <div
      className="flex flex-col rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
      data-testid="ia-ai-filled-list"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 px-3 py-2 dark:border-emerald-900">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
          <Check className="h-4 w-4" />
          {applied.items.length} field{applied.items.length === 1 ? '' : 's'} filled from the transcript on “{applied.tabTitle}”
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={() => setApplied(null)}>
          Hide
        </Button>
      </div>
      <ul className="max-h-80 divide-y divide-emerald-100 overflow-y-auto text-sm dark:divide-emerald-900/60">
        {applied.items.map((s) => (
          <li key={s.questionId} className="grid gap-x-3 px-3 py-1.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <span className="text-muted-foreground">{s.questionText}</span>
            <span className="font-medium">{s.display}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null

  if (!target.editable) {
    return <p className="text-xs text-muted-foreground">This assessment is read-only, so fields cannot be filled.</p>
  }

  if (!suggestions) {
    return (
      <div className="flex flex-col gap-2">
        {appliedList}
        {usageLine}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 dark:border-violet-900 dark:bg-violet-950/30">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            {suggest.isPending
              ? `Reading the transcript and filling “${tabTitle}”… this can take a minute.`
              : `Fill the “${target.tabTitle}” tab from this transcript. You will review every answer before it goes into the form.`}
          </p>
          <Button type="button" size="sm" onClick={run} disabled={suggest.isPending || !transcript.trim()} data-testid="ia-ai-fill">
            {suggest.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            {suggest.isPending ? 'Filling…' : 'Fill fields from transcript'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border" data-testid="ia-ai-fill-review">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <p className="text-sm font-medium">
          {suggestions.length
            ? `${suggestions.length} answer${suggestions.length === 1 ? '' : 's'} found for “${tabTitle}”`
            : `No answers for “${tabTitle}” were found in the transcript`}
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.length ? (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPicked(new Set(suggestions.map((s) => s.questionId)))}>
                Select all
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
                Select none
              </Button>
              <Button type="button" size="sm" onClick={apply} disabled={!picked.size}>
                <Check className="mr-1 h-4 w-4" />
                Apply {picked.size} to form
              </Button>
            </>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={() => setSuggestions(null)}>
            Close
          </Button>
        </div>
      </div>
      {suggestions.length ? (
        <ul className="max-h-[28rem] divide-y overflow-y-auto">
          {suggestions.map((s) => {
            const existing = hasExisting(s.questionId)
            return (
              <li key={s.questionId}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-muted/40">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0"
                    checked={picked.has(s.questionId)}
                    onChange={() => toggle(s.questionId)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">{s.questionText}</span>
                    <span className="block font-medium">{s.display}</span>
                    {s.evidence ? <span className="block text-xs italic text-muted-foreground">“{s.evidence}”</span> : null}
                    {existing ? (
                      <span className="block text-xs text-amber-700 dark:text-amber-300">Already answered: ticking this replaces the current answer</span>
                    ) : null}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      ) : null}
      <p className="px-3 pb-2 text-xs text-muted-foreground">
        AI can make mistakes. Check each answer. Secure fields such as key safe codes are never filled.
      </p>
      {usageLine ? <div className="px-3 pb-2">{usageLine}</div> : null}
    </div>
  )
}
