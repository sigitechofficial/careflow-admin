import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Settings2 } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { SurveyQuestion } from '@/features/surveys/types'

/** API: careflow-api src/surveys/survey-platform.service.ts (Phase 2 part 7). */
export type PlatformSettings = {
  surveyId: string
  editedOnSurveyId: string | null
  repeating: boolean
  recurrence: string | null
  skipMonths: number[]
  librarySkipMonths: number[]
  months: string[]
  rotatingQuestionIds: string[]
  retention: {
    months: number | null
    libraryMonths: number | null
    effectiveMonths: number | null
    /** Where the period starts, as the privacy notice says: when the survey closes, or when each answer was given. */
    basis?: 'FROM_CLOSE' | 'FROM_ANSWER' | null
    deletedAt: string | null
    periodsDeleted: number
  }
}
export type WordingFinding = { rule: string; ruleLabel: string; severity: 'PROBLEM' | 'SUGGESTION'; questionId: string | null; questionText: string | null; message: string }
export type WordingCheck = { surveyId: string; fromLibrary: boolean; estimatedMinutes: number; problems: number; suggestions: number; findings: WordingFinding[] }

const key = (id: string) => ['surveys', 'platform', id] as const
const card = 'rounded-xl border border-border bg-card p-4'

function useSave(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { skipMonths?: number[]; rotatingQuestionIds?: string[]; answerRetentionMonths?: number | null }) =>
      apiJson<ApiEnvelope<PlatformSettings>>(`/surveys/${surveyId}/platform`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(surveyId) }),
  })
}

const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
  try {
    await fn()
    toastSuccess(ok)
  } catch (e) {
    toastApiError(e, fail)
  }
}

/**
 * Survey settings → Repeats, retention and checks: months a repeat skips, a rotating question, how long answers are
 * kept, grouped answer choices, and the wording check against the library standard.
 */
export function SurveyPlatformPanel({ surveyId, questions, canEdit, isTemplate }: { surveyId: string; questions: SurveyQuestion[]; canEdit: boolean; isTemplate: boolean }) {
  const { data } = useQuery({ queryKey: key(surveyId), queryFn: async () => (await apiJson<ApiEnvelope<PlatformSettings>>(`/surveys/${surveyId}/platform`, { method: 'GET' })).data })
  const save = useSave(surveyId)
  const [checkOpen, setCheckOpen] = React.useState(false)
  const [grouping, setGrouping] = React.useState<SurveyQuestion | null>(null)
  const [retention, setRetention] = React.useState('')
  React.useEffect(() => setRetention(data?.retention.months ? String(data.retention.months) : ''), [data?.retention.months])
  // The bank being chosen: saved once it has two questions (or none); one ticked waits for the second.
  const [bank, setBank] = React.useState<string[] | null>(null)
  const savedBank = data?.rotatingQuestionIds.join()
  React.useEffect(() => setBank(null), [savedBank])
  if (!data) return null
  const chosenBank = bank ?? data.rotatingQuestionIds
  const fromAnswer = data.retention.basis === 'FROM_ANSWER'
  const editable = canEdit && !data.editedOnSurveyId
  const choiceQuestions = questions.filter(q => (q.questionType === 'SINGLE_SELECT' || q.questionType === 'MULTI_SELECT') && !q.optionsFrom && Array.isArray(q.options) && q.options.length >= 4)
  const bankable = questions.filter(q => !q.showIf)

  return (
    <section className={card} aria-labelledby="platform-heading" data-testid="survey-platform">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id="platform-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden /> Repeats, answer keeping and checks
        </h3>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setCheckOpen(true)}>
          <ClipboardCheck className="h-4 w-4" aria-hidden /> Check the wording
        </Button>
      </div>
      {data.editedOnSurveyId ? <p className="mt-1 text-xs text-muted-foreground">These are set on the repeating survey.</p> : null}

      {data.repeating ? (
        <fieldset className="mt-3" disabled={!editable}>
          <legend className="text-xs font-medium">Months it does not run in</legend>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {data.months.map((m, i) => (
              <label key={m} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={data.skipMonths.includes(i + 1)}
                  onChange={e =>
                    void run(
                      () => save.mutateAsync({ skipMonths: e.target.checked ? [...data.skipMonths, i + 1] : data.skipMonths.filter(x => x !== i + 1) }),
                      'Months saved',
                      'Could not save the months',
                    )
                  }
                />
                {m.slice(0, 3)}
              </label>
            ))}
          </div>
          {data.librarySkipMonths.length && data.librarySkipMonths.join() !== data.skipMonths.join() ? (
            <p className="mt-1 text-xs text-muted-foreground">
              The ready-made survey does not run in {data.librarySkipMonths.map(m => data.months[m - 1]).join(', ')}.{' '}
              {editable ? (
                <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => void run(() => save.mutateAsync({ skipMonths: data.librarySkipMonths }), 'Months saved', 'Could not save the months')}>
                  Use those months
                </button>
              ) : null}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {data.repeating && bankable.length >= 2 ? (
        <fieldset className="mt-3" disabled={!editable}>
          <legend className="text-xs font-medium">A rotating question (one of these each period, in turn; trends kept)</legend>
          <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto text-sm">
            {bankable.map(q => (
              <li key={q.id}>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={chosenBank.includes(q.id)}
                    onChange={e => {
                      const next = e.target.checked ? [...chosenBank, q.id] : chosenBank.filter(x => x !== q.id)
                      setBank(next)
                      // A bank needs two: one ticked waits for the second (unticking down to one turns it off).
                      const toSave = next.length === 1 ? (data.rotatingQuestionIds.length ? [] : null) : next
                      if (toSave === null) return
                      void run(
                        () => save.mutateAsync({ rotatingQuestionIds: toSave }),
                        toSave.length ? 'Rotating question saved' : 'Rotating question turned off',
                        'Could not save the rotating question',
                      ).finally(() => setBank(null))
                    }}
                  />
                  <span>{q.questionText}</span>
                </label>
              </li>
            ))}
          </ul>
          {chosenBank.length === 1 ? (
            <p className="mt-1 text-xs text-muted-foreground" role="status">
              Tick at least one more question: a rotating question needs two to twelve.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {!isTemplate ? (
        <div className="mt-3 text-sm">
          <label htmlFor="retention-months" className="block text-xs font-medium">
            Keep answers for (months after {fromAnswer ? 'each answer' : 'it closes'})
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Input
              id="retention-months"
              type="number"
              min={1}
              max={120}
              className="w-28"
              value={retention}
              disabled={!editable}
              placeholder={data.retention.libraryMonths ? String(data.retention.libraryMonths) : ''}
              onChange={e => setRetention(e.target.value)}
            />
            {editable ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void run(() => save.mutateAsync({ answerRetentionMonths: retention ? Number(retention) : null }), 'Saved', 'Could not save')}
              >
                Save
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground" data-testid="retention-note">
            {data.retention.effectiveMonths
              ? `${
                  fromAnswer
                    ? `Each answer is deleted ${data.retention.effectiveMonths} months after it was given, while the survey stays open`
                    : `Answers are deleted ${data.retention.effectiveMonths} months after the survey (or each period) closes`
                }${data.retention.months ? '' : ', as the ready-made survey’s privacy notice says'}. Answers linked to an open complaint, safeguarding case or incident are kept until it closes. Who it was sent to, follow-ups and CQC evidence totals are kept.`
              : 'Answers are kept until the survey is deleted. Set a number of months to delete them sooner.'}
            {data.retention.deletedAt ? ' Answers to this survey have been deleted.' : ''}
            {data.retention.periodsDeleted ? ` Answers deleted for ${data.retention.periodsDeleted} period${data.retention.periodsDeleted === 1 ? '' : 's'}.` : ''}
          </p>
        </div>
      ) : null}

      {choiceQuestions.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium">Group answers under headings</p>
          <ul className="mt-1 space-y-1 text-sm">
            {choiceQuestions.map(q => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0">
                  {q.questionText}
                  {q.answerGroups?.length ? <span className="text-xs text-muted-foreground"> · {q.answerGroups.length} groups</span> : null}
                </span>
                {editable ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setGrouping(q)}>
                    {q.answerGroups?.length ? 'Change groups' : 'Group answers'}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {checkOpen ? <WordingCheckDialog surveyId={surveyId} onClose={() => setCheckOpen(false)} /> : null}
      {grouping ? <AnswerGroupsDialog surveyId={surveyId} question={grouping} onClose={() => setGrouping(null)} /> : null}
    </section>
  )
}

function WordingCheckDialog({ surveyId, onClose }: { surveyId: string; onClose: () => void }) {
  const { data, isError, refetch } = useQuery({
    queryKey: ['surveys', 'wording', surveyId],
    queryFn: async () => (await apiJson<ApiEnvelope<WordingCheck>>(`/surveys/${surveyId}/wording-check`, { method: 'GET' })).data,
  })
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Wording check</DialogTitle>
          <DialogDescription>
            Checked against the library standard: plain English, one idea per question, answer scales, negative statements,
            leading wording and an honest time. Nothing is changed for you.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {isError ? (
            <p role="alert" className="text-sm">
              The check could not be run.{' '}
              <button type="button" className="text-primary underline" onClick={() => void refetch()}>
                Try again
              </button>
            </p>
          ) : !data ? (
            <p role="status" className="text-sm text-muted-foreground">Checking…</p>
          ) : (
            <div data-testid="wording-check">
              <p className="text-sm">
                About {data.estimatedMinutes} minute{data.estimatedMinutes === 1 ? '' : 's'} to answer.{' '}
                {data.problems || data.suggestions
                  ? `${data.problems} to fix, ${data.suggestions} to consider.`
                  : 'Nothing to fix.'}
                {data.fromLibrary ? ' Questions from the ready-made library already meet the standard; check the ones you added or changed.' : ''}
              </p>
              <ul className="mt-2 space-y-2">
                {data.findings.map((f, i) => (
                  <li key={i} className="rounded-md border border-border px-3 py-2 text-sm">
                    <p className="text-xs font-medium">
                      <span className={f.severity === 'PROBLEM' ? 'text-rose-700 dark:text-rose-300' : 'text-muted-foreground'}>
                        {f.severity === 'PROBLEM' ? 'To fix' : 'To consider'}
                      </span>{' '}
                      · {f.ruleLabel}
                    </p>
                    {f.questionText ? <p className="mt-0.5 font-medium">“{f.questionText}”</p> : null}
                    <p className="mt-0.5">{f.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AnswerGroupsDialog({ surveyId, question, onClose }: { surveyId: string; question: SurveyQuestion; onClose: () => void }) {
  const qc = useQueryClient()
  const options = (Array.isArray(question.options) ? question.options : []) as string[]
  // The API sends [] when the answers are not grouped yet: start with two empty headings.
  const [headings, setHeadings] = React.useState<string[]>(question.answerGroups?.length ? question.answerGroups.map(g => g.heading) : ['', ''])
  const [groupOf, setGroupOf] = React.useState<Record<string, number | ''>>(() => {
    const out: Record<string, number | ''> = {}
    for (const o of options) {
      const i = question.answerGroups?.findIndex(g => g.options.includes(o)) ?? -1
      out[o] = i >= 0 ? i : ''
    }
    return out
  })
  const save = useMutation({
    mutationFn: (groups: Array<{ heading: string; options: string[] }> | null) =>
      apiJson(`/surveys/${surveyId}/questions/${question.id}/option-groups`, { method: 'PUT', body: JSON.stringify({ groups }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['surveys'] }),
  })
  const groups = headings.map((h, i) => ({ heading: h.trim(), options: options.filter(o => groupOf[o] === i) }))
  const valid = groups.length >= 2 && groups.every(g => g.heading && g.options.length)
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Group the answers</DialogTitle>
          <DialogDescription>People see the answers under these headings, and Results count each group too.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm font-medium">{question.questionText}</p>
          {headings.map((h, i) => (
            <div key={i} className="mt-2 flex gap-2">
              <Input aria-label={`Heading ${i + 1}`} value={h} maxLength={80} onChange={e => setHeadings(p => p.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Heading ${i + 1}`} />
              {headings.length > 2 ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setHeadings(p => p.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" className="mt-2" disabled={headings.length >= 12} onClick={() => setHeadings(p => [...p, ''])}>
            Add a heading
          </Button>
          <ul className="mt-3 space-y-1 text-sm">
            {options.map(o => (
              <li key={o} className="flex items-center justify-between gap-2">
                <span>{o}</span>
                <select
                  aria-label={`Group for ${o}`}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={groupOf[o] === '' ? '' : String(groupOf[o])}
                  onChange={e => setGroupOf(p => ({ ...p, [o]: e.target.value === '' ? '' : Number(e.target.value) }))}
                >
                  <option value="">No group</option>
                  {headings.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Heading ${i + 1}`}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          {question.answerGroups?.length ? (
            <Button type="button" variant="ghost" onClick={() => void run(() => save.mutateAsync(null), 'Groups removed', 'Could not remove the groups').then(onClose)}>
              Remove groups
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!valid || save.isPending} onClick={() => void run(() => save.mutateAsync(groups), 'Groups saved', 'Could not save the groups').then(onClose)}>
            Save groups
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
