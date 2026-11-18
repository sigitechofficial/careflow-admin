import * as React from 'react'
import { CheckCircle2, ClipboardCheck, XCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { cn } from '@/shared/lib/utils'
import { useSignOffLearningPractical } from '@/features/learning/hooks/useLearning'
import type { LearningAssignmentRecord } from '@/features/learning/types/learning.types'

type Point = { met: boolean | null; comment: string }

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Practical test sign-off (17 Nov 2026): the logged-in admin watches the carer, marks every
 * checklist point Met / Not met (with a comment) and records Competent or Not yet competent.
 * Replaces the plain Passed / Not passed outcome for courses with a practical test.
 */
export function PracticalSignoffCard({ r, onChanged }: { r: LearningAssignmentRecord; onChanged: () => void }) {
  const practical = r.practical!
  const mut = useSignOffLearningPractical()
  const open = !['COMPLETED', 'PASSED', 'CANCELLED', 'EXEMPT', 'EXPIRED', 'FAILED'].includes(r.status)
  const blocked = r.outcomeBlockedReason ?? null
  const waitingForQuiz = r.reviews.some(v => v.kind === 'OUTCOME_PASSED_AFTER_QUIZ') && open

  const [date, setDate] = React.useState(todayKey())
  const [location, setLocation] = React.useState('')
  const [points, setPoints] = React.useState<Point[]>(() => practical.checklist.map(() => ({ met: null, comment: '' })))
  const [competent, setCompetent] = React.useState<boolean | null>(null)
  const [note, setNote] = React.useState('')
  const [nextSteps, setNextSteps] = React.useState('')
  const [giveAgain, setGiveAgain] = React.useState(false)
  const [againDue, setAgainDue] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const pt = (i: number): Point => points[i] ?? { met: null, comment: '' }
  const allAnswered = points.every(p => p.met !== null)
  const allMet = points.every(p => p.met === true)

  const setPoint = (i: number, patch: Partial<Point>) => {
    setPoints(prev => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)))
    if (patch.met === false && competent) setCompetent(null)
  }

  const save = async () => {
    if (!date) return setError('Choose the date you watched the carer')
    if (!allAnswered) return setError('Mark every checklist point as Met or Not met')
    if (competent === null) return setError('Choose Competent or Not yet competent')
    if (competent && !allMet) return setError('Competent needs every point to be Met')
    if (!competent && note.trim().length < 3) return setError('Write why the carer is not yet competent')
    if (!competent && giveAgain && !againDue) return setError('Choose the new due date')
    setError(null)
    try {
      const res = await mut.mutateAsync({
        id: r.id,
        body: {
          assessmentDate: date,
          location: location.trim() || undefined,
          results: practical.checklist.map((criterion, i) => ({
            criterion,
            met: pt(i).met === true,
            comment: pt(i).comment.trim() || undefined,
          })),
          competent,
          note: note.trim() || undefined,
          nextSteps: nextSteps.trim() || undefined,
          reassignDueAt: !competent && giveAgain ? orgDatetimeLocalToIso(againDue) || againDue : undefined,
        },
      })
      toastSuccess(
        competent
          ? res.status === 'COMPLETED'
            ? 'Competent. The course is complete and the certificate is issued.'
            : 'Competent. The course completes when the carer passes the quiz in the app.'
          : res.reassignedAssignmentId
            ? 'Not yet competent. The course is given again and the history is kept.'
            : 'Recorded as not yet competent.',
      )
      onChanged()
    } catch (e) {
      toastApiError(e instanceof ApiError ? e : new Error('Could not save the sign-off'))
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-4" data-testid="practical-signoff">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardCheck className="h-4 w-4" aria-hidden /> Practical test · {practical.competencyName}
        </h3>
        {practical.validityDays ? (
          <span className="text-xs text-muted-foreground">Valid {Math.round(practical.validityDays / 30)} months once competent</span>
        ) : null}
      </div>

      {open && !waitingForQuiz ? (
        blocked ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {blocked}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Date you watched the carer" required>
                <Input type="date" value={date} max={todayKey()} onChange={e => setDate(e.target.value)} />
              </FormField>
              <FormField label="Where / how (optional)">
                <Input
                  value={location}
                  placeholder="Service user's home, watched a real transfer"
                  onChange={e => setLocation(e.target.value)}
                />
              </FormField>
            </div>

            <div className="rounded-md border border-border">
              <p className="border-b border-border bg-muted/30 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Checklist – mark every point
              </p>
              <ul className="divide-y divide-border">
                {practical.checklist.map((point, i) => (
                  <li key={point} className="space-y-1.5 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm">{point}</span>
                      <span className="flex gap-1" role="radiogroup" aria-label={point}>
                        {([true, false] as const).map(v => (
                          <button
                            key={String(v)}
                            type="button"
                            role="radio"
                            aria-checked={pt(i).met === v}
                            onClick={() => setPoint(i, { met: v })}
                            className={cn(
                              'rounded-md border px-2.5 py-0.5 text-xs font-medium',
                              pt(i).met === v
                                ? v
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                  : 'border-red-600 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
                                : 'border-border text-muted-foreground hover:bg-muted',
                            )}
                          >
                            {v ? 'Met' : 'Not met'}
                          </button>
                        ))}
                      </span>
                    </div>
                    {pt(i).met === false || pt(i).comment ? (
                      <Input
                        value={pt(i).comment}
                        placeholder="Comment (what you saw)"
                        onChange={e => setPoint(i, { comment: e.target.value })}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Result">
              <button
                type="button"
                role="radio"
                aria-checked={competent === true}
                disabled={!allMet}
                onClick={() => setCompetent(true)}
                className={cn(
                  'rounded-lg border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50',
                  competent === true ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-border hover:bg-muted/40',
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> Competent
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {r.hasRequiredQuiz ? 'Course passes (after the quiz, if not passed yet).' : 'Course passes and the certificate is issued.'}{' '}
                  Every point must be Met.
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={competent === false}
                onClick={() => setCompetent(false)}
                className={cn(
                  'rounded-lg border p-3 text-left',
                  competent === false ? 'border-red-600 ring-1 ring-red-600' : 'border-border hover:bg-muted/40',
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <XCircle className="h-4 w-4 text-red-600" aria-hidden /> Not yet competent
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Course not passed. You can give it again.</span>
              </button>
            </div>

            <FormField label={competent === false ? 'Why not yet competent' : 'Note (optional)'} required={competent === false}>
              <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} />
            </FormField>
            <FormField label="Next steps (optional)">
              <Input value={nextSteps} placeholder="Practise with a senior on 3 visits, reassess next week" onChange={e => setNextSteps(e.target.value)} />
            </FormField>
            {competent === false ? (
              <div className="space-y-2 rounded-md border border-dashed border-border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={giveAgain} onChange={e => setGiveAgain(e.target.checked)} />
                  Give the course again
                </label>
                {giveAgain ? (
                  <FormField label="New due date" required>
                    <Input type="datetime-local" value={againDue} onChange={e => setAgainDue(e.target.value)} />
                  </FormField>
                ) : null}
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button size="sm" onClick={() => void save()} loading={mut.isPending} data-testid="save-practical-signoff">
              Save sign-off
            </Button>
          </div>
        )
      ) : waitingForQuiz ? (
        <p className="text-sm text-muted-foreground">Competent. Waiting for the carer to pass the quiz in the app.</p>
      ) : null}

      {practical.signoffs.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
          {practical.signoffs.map(s => (
            <div key={s.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <p className="font-medium">
                <span className={s.competent ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                  {s.competent ? 'Competent' : 'Not yet competent'}
                </span>{' '}
                · {formatOrganisationDate(s.assessmentDate)}
                {s.assessorName ? ` · by ${s.assessorName}` : ''}
                {s.location ? ` · ${s.location}` : ''}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {s.results.map(p => (
                  <li key={p.criterion}>
                    {p.met ? '✓' : '✗'} {p.criterion}
                    {p.comment ? ` – ${p.comment}` : ''}
                  </li>
                ))}
              </ul>
              {s.note ? <p className="mt-1 text-xs">Note: {s.note}</p> : null}
              {s.nextSteps ? <p className="text-xs">Next steps: {s.nextSteps}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
