import * as React from 'react'
import { ClipboardPen, Eye, Loader2, Pencil, Users } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { formatSurveyDate, formatSurveyDateTime } from '@/features/surveys/survey-datetime'
import { useSurvey, useSurveyResponses } from '@/features/surveys/hooks/useSurveys'
import {
  MIN_ANONYMOUS_RECIPIENTS,
  SURVEY_RESPONSE_CHANNEL_LABELS,
  surveyRespondentRelationLabel,
  type SurveyResponseItem,
  type SurveyTargetKind,
} from '@/features/surveys/types'
import { describeSurveyRespondent } from '@/features/surveys/survey-respondent'
import { RecordSurveyResponseDialog } from '@/features/surveys/components/RecordSurveyResponseDialog'
import { useAuthStore } from '@/features/auth/store'
import { SurveySectionHeading } from '@/features/surveys/components/SurveySectionHeading'
import { withSectionHeadings } from '@/features/surveys/survey-sections'
import { useResponseFlags } from '@/features/surveys/insight/survey-insight'

/** Anonymous answers keep only the date; everything else shows date and time. */
const formatSubmitted = (r: SurveyResponseItem) =>
  r.submittedDateOnly ? formatSurveyDate(r.submittedAt) : formatSurveyDateTime(r.submittedAt)

/** Shown when an anonymous survey's written answers are held back. */
export const WRITTEN_ANSWERS_HELD_BACK = `Written answers on an anonymous survey are shown once the survey has closed and at least ${MIN_ANONYMOUS_RECIPIENTS} people have answered, so they cannot be traced to anyone.`

/** Shown in place of an anonymous recording's notes while they are held back with its written answers. */
export const CONTACT_NOTES_HELD_BACK = 'Notes — shown once the survey has closed'

function ResponseAnswersDialog({
  response,
  targetKind,
  writtenAnswersNote,
  onClose,
}: {
  response: SurveyResponseItem | null
  targetKind?: SurveyTargetKind
  writtenAnswersNote?: string | null
  onClose: () => void
}) {
  return (
    <Dialog open={response != null} onOpenChange={open => (open ? undefined : onClose())}>
      <DialogContent size="lg">
        {response ? (
          <>
            <DialogHeader>
              <DialogTitle>{response.respondentLabel}</DialogTitle>
              <DialogDescription>
                Submitted {formatSubmitted(response)}
                {response.answeredWithoutName ? ' · answered without their name' : ''}
                {response.periodTitle ? ` · ${response.periodTitle}` : ''}
                {response.respondentRelation
                  ? ` · ${describeSurveyRespondent(response.respondentRelation, response.respondentName, targetKind)}`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-2">
              {response.writtenAnswersWithheld ? (
                <p
                  className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                  data-testid="response-written-withheld"
                >
                  {writtenAnswersNote ?? WRITTEN_ANSWERS_HELD_BACK}
                </p>
              ) : null}
              {response.channel && response.channel !== 'ONLINE' && response.channel !== 'PORTAL' ? (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                  <p className="font-medium text-foreground">
                    {SURVEY_RESPONSE_CHANNEL_LABELS[response.channel]}
                    {response.recordedByName ? ` · recorded by ${response.recordedByName}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      response.contactedAt
                        ? `${response.channel === 'TELEPHONE' ? 'Call' : 'Collected'} ${formatSurveyDateTime(response.contactedAt)}`
                        : null,
                      response.contactNumber ? `Number ${response.contactNumber}` : null,
                      response.consentGiven ? 'Agreed to answer by phone' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {response.contactNotes ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-foreground" data-testid="response-contact-notes">
                      {response.contactNotes}
                    </p>
                  ) : response.contactNotesWithheld ? (
                    <p className="mt-1 text-xs italic text-muted-foreground" data-testid="response-contact-notes-withheld">
                      {CONTACT_NOTES_HELD_BACK}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {response.answers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No answers recorded.</p>
              ) : (
                withSectionHeadings(response.answers).map(({ item: a, index: idx, heading }) => (
                  <React.Fragment key={a.questionId}>
                    {heading ? <SurveySectionHeading title={heading} /> : null}
                    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Q{idx + 1}. {a.questionText}
                      </p>
                      <p
                        className={`mt-1 whitespace-pre-wrap text-sm ${
                          a.withheldFields?.includes('textValue') ? 'italic text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {a.displayValue}
                      </p>
                      {a.comment ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground" data-testid="response-comment">
                          <span className="text-xs font-medium text-muted-foreground">Comment: </span>
                          {a.comment}
                        </p>
                      ) : null}
                    </div>
                  </React.Fragment>
                ))
              )}
            </DialogBody>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function SurveyResponsesPanel({ surveyId }: { surveyId: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useSurveyResponses(surveyId)
  const surveyQuery = useSurvey(surveyId)
  const survey = surveyQuery.data
  const canRecord = useAuthStore(s => s.can('surveys.responses.record'))
  const [viewing, setViewing] = React.useState<SurveyResponseItem | null>(null)
  // Answer quality: flags for a look (never removed); only for people who can open responses.
  const flagsQuery = useResponseFlags(surveyId)
  const flagsOf = React.useMemo(() => new Map((flagsQuery.data ?? []).map(f => [f.responseId, f.flags])), [flagsQuery.data])
  const [recordOpen, setRecordOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SurveyResponseItem | null>(null)
  // "All periods" of a repeating survey lists every period's responses: one is edited on the period it
  // belongs to (its own survey, questions and permissions), never on the repeating survey's row.
  const editSurveyId = editing?.surveyId && editing.surveyId !== surveyId ? editing.surveyId : null
  const editSurveyQuery = useSurvey(editSurveyId ?? undefined)
  // "All periods" counts closed periods together before showing anonymous written answers, but a
  // correction is saved on the period, under the period's own rule. So the edit opens on the period's
  // own view of the response: a written answer held back there shows as held back (and is kept as it
  // is) — never text the period's rule would keep despite staff clearing it, and never held-back text.
  const periodResponsesQuery = useSurveyResponses(editSurveyId ?? undefined, Boolean(editSurveyId))
  const periodResponse = editSurveyId
    ? (periodResponsesQuery.data?.responses.find(r => r.id === editing?.id) ?? null)
    : null
  // Kept once found, so a background refresh of the period's list never resets what staff are typing.
  // Taken only once the list is not being fetched: a cached list can be out of date (e.g. a correction
  // just saved here, whose refresh was cancelled when the edit closed), and is refreshed on opening.
  const periodListSettled = !periodResponsesQuery.isFetching
  const [periodEditing, setPeriodEditing] = React.useState<SurveyResponseItem | null>(null)
  React.useEffect(() => {
    if (!editing || !editSurveyId) {
      setPeriodEditing(null)
    } else if (periodResponse && periodListSettled && periodEditing?.id !== editing.id) {
      setPeriodEditing(periodResponse)
    }
  }, [editing, editSurveyId, periodResponse, periodListSettled, periodEditing])
  const dialogEditing = editSurveyId ? (periodEditing?.id === editing?.id ? periodEditing : null) : editing
  const dialogSurvey = editSurveyId ? editSurveyQuery.data : survey
  // Editing a period's response from "All periods": what is still loading (or failed) before it can open.
  const periodEditProblem: 'loading' | 'error' | 'missing' | null = (() => {
    if (!editing || !editSurveyId || (dialogSurvey && dialogEditing)) return null
    if (editSurveyQuery.isError || periodResponsesQuery.isError) return 'error'
    if (!editSurveyQuery.data || !periodResponsesQuery.data) return 'loading'
    return periodResponse ? 'loading' : 'missing'
  })()
  const retryingPeriodEdit = editSurveyQuery.isFetching || periodResponsesQuery.isFetching
  const retryPeriodEdit = () => {
    if (retryingPeriodEdit) return
    if (editSurveyQuery.isError || !editSurveyQuery.data) void editSurveyQuery.refetch()
    void periodResponsesQuery.refetch()
  }
  const editingNote =
    editSurveyId && dialogEditing?.writtenAnswersWithheld && !editing?.writtenAnswersWithheld
      ? `This response is corrected on its period${editing?.periodTitle ? ` (${editing.periodTitle})` : ''}. “All periods” counts closed periods together, but in this period on its own some written answers are still held back, so they cannot be traced to anyone. They are kept as they are unless you type a replacement.`
      : null
  const showAnsweredBy = Boolean(data?.responses.some(r => r.respondentRelation))
  const showRecordedBy = Boolean(data?.responses.some(r => r.recordedByName))
  // Who recorded it: everyone, the office, independent reviewers, or one reviewer (?recordedBy=<id> from the reviewers page).
  const [recordedBy, setRecordedBy] = React.useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get('recordedBy') ?? 'all'
    } catch {
      return 'all'
    }
  })
  const reviewers = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const r of data?.responses ?? []) if (r.recordedByReviewer && r.recordedById) m.set(r.recordedById, r.recordedByName ?? 'Reviewer')
    return [...m.entries()]
  }, [data])
  const shownResponses = (data?.responses ?? []).filter(r =>
    recordedBy === 'all'
      ? true
      : recordedBy === 'reviewers'
        ? r.recordedByReviewer
        : recordedBy === 'office'
          ? !r.recordedByReviewer
          : r.recordedById === recordedBy,
  )
  const showPeriod = Boolean(data?.responses.some(r => r.periodTitle))
  // A repeating survey's answers are recorded on one of its periods.
  const isSeriesSource = Boolean(survey && !survey.clonedFromId && (survey.recurrence || survey.periodCount > 0))
  const canRecordHere =
    canRecord && Boolean(survey) && survey?.status === 'ACTIVE' && !survey?.isTemplate && !isSeriesSource

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
            Responses
            {data ? (
              <span className="sr-only"> </span>
            ) : null}
            {data ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.total}
              </span>
            ) : null}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data?.isAnonymous
              ? 'This survey is anonymous — answers are not linked to anyone and show the date only.'
              : 'Who submitted and what they answered.'}
            {!data?.isAnonymous && data?.answeredWithoutName
              ? ` ${data.answeredWithoutName} ${data.answeredWithoutName === 1 ? 'was' : 'were'} given without a name and ${data.answeredWithoutName === 1 ? 'is' : 'are'} not linked to anyone (date only).`
              : ''}
          </p>
          {data?.writtenAnswersNote ? (
            <p className="mt-0.5 text-xs text-muted-foreground" data-testid="responses-written-withheld">
              {data.writtenAnswersNote}
            </p>
          ) : null}
          {data?.withoutNameAnswersNote ? (
            <p className="mt-0.5 text-xs text-muted-foreground" data-testid="responses-without-name-held">
              {data.withoutNameAnswersNote}
            </p>
          ) : null}
          {data?.responsesBeingAddedNote ? (
            <p className="mt-0.5 text-xs text-muted-foreground" data-testid="responses-being-added">
              {data.responsesBeingAddedNote}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {canRecordHere ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => setRecordOpen(true)}
              data-testid="survey-record-response"
            >
              <ClipboardPen className="h-3.5 w-3.5" aria-hidden /> Record response
            </Button>
          ) : null}
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex min-h-6 items-center rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading responses…
        </div>
      ) : isError ? (
        <p className="px-4 py-6 text-sm text-destructive">Could not load responses.</p>
      ) : !data || data.responses.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {data?.withoutNameAnswersHeldBack
            ? 'No responses to show yet.'
            : 'No responses yet. Send the survey, or record a response taken by phone, on a visit or on paper.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          {reviewers.length ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-sm" data-testid="responses-recorded-by-filter">
              <label htmlFor="responses-recorded-by" className="text-muted-foreground">
                Recorded by
              </label>
              <select
                id="responses-recorded-by"
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={recordedBy}
                onChange={e => setRecordedBy(e.target.value)}
              >
                <option value="all">Everyone</option>
                <option value="office">Online and office staff</option>
                <option value="reviewers">Independent reviewers</option>
                {reviewers.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name} (reviewer)
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                {shownResponses.length} of {data.responses.length}
              </span>
            </div>
          ) : null}
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Respondent</th>
                {showPeriod ? <th className="px-4 py-2">Period</th> : null}
                {showAnsweredBy ? <th className="px-4 py-2">Answered by</th> : null}
                <th className="px-4 py-2">Channel</th>
                {showRecordedBy ? <th className="px-4 py-2">Recorded by</th> : null}
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Answers</th>
                <th className="px-4 py-2 text-right">Response</th>
              </tr>
            </thead>
            <tbody>
              {shownResponses.map(r => (
                <tr key={r.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {r.respondentLabel}
                    {(flagsOf.get(r.id) ?? []).map(f => (
                      <span key={f.flag} className="ml-2 inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-normal text-amber-900 dark:text-amber-100" data-testid="response-quality-flag">
                        {f.label}
                      </span>
                    ))}
                  </td>
                  {showPeriod ? <td className="px-4 py-2.5 text-muted-foreground">{r.periodTitle ?? '—'}</td> : null}
                  {showAnsweredBy ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.respondentRelation
                        ? `${surveyRespondentRelationLabel(r.respondentRelation, survey?.targetKind)}${
                            r.respondentName ? ` (${r.respondentName})` : ''
                          }`
                        : '—'}
                    </td>
                  ) : null}
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.channel ? SURVEY_RESPONSE_CHANNEL_LABELS[r.channel] : '—'}
                  </td>
                  {showRecordedBy ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.recordedByName ?? '—'}
                      {r.recordedByReviewer ? (
                        <span className="ml-1.5 rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-100">
                          Independent reviewer
                        </span>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular-nums">
                    {formatSubmitted(r)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{r.answerCount}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      {canRecord && r.canEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => setEditing(r)}
                          data-testid="survey-response-edit"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                          <span className="sr-only"> response, {formatSubmitted(r)}</span>
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setViewing(r)}>
                        <Eye className="h-3.5 w-3.5" aria-hidden /> View response
                        {/* Which one, for screen readers (the same date the row already shows). */}
                        <span className="sr-only">, {formatSubmitted(r)}</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ResponseAnswersDialog
        response={viewing}
        targetKind={survey?.targetKind}
        writtenAnswersNote={data?.writtenAnswersNote}
        onClose={() => setViewing(null)}
      />
      <Dialog open={periodEditProblem != null} onOpenChange={open => (open ? undefined : setEditing(null))}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Edit recorded response</DialogTitle>
            <DialogDescription>
              {editing?.respondentLabel ?? ''}
              {editing?.periodTitle ? ` · ${editing.periodTitle}` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {periodEditProblem === 'loading' ? (
              <p
                className="flex items-center gap-2 text-sm text-muted-foreground"
                role="status"
                data-testid="period-edit-loading"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the period…
              </p>
            ) : (
              <>
                <p className="text-sm text-destructive" role="alert" data-testid="period-edit-error">
                  {periodEditProblem === 'missing'
                    ? 'This response could not be found on its period — it may have just changed. Try again, or refresh the list.'
                    : 'The period this response belongs to could not be loaded, so it cannot be edited yet.'}
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(null)}
                    data-testid="period-edit-close"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={retryPeriodEdit}
                    // Not `disabled`: disabling the focused button would drop keyboard focus out of the dialog.
                    aria-disabled={retryingPeriodEdit}
                    data-testid="period-edit-retry"
                  >
                    {retryingPeriodEdit ? 'Trying again…' : 'Try again'}
                  </Button>
                </div>
              </>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
      {dialogSurvey ? (
        <RecordSurveyResponseDialog
          surveyId={editSurveyId ?? surveyId}
          listedOnSurveyId={surveyId}
          targetKind={dialogSurvey.targetKind}
          questions={dialogSurvey.questions ?? []}
          open={recordOpen || dialogEditing != null}
          editing={dialogEditing}
          editingNote={editingNote}
          isAnonymous={dialogSurvey.isAnonymous}
          sectionIntros={dialogSurvey.sectionIntros}
          onClose={() => {
            setRecordOpen(false)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
