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
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import { useSurvey, useSurveyResponses } from '@/features/surveys/hooks/useSurveys'
import {
  SURVEY_RESPONDENT_RELATION_LABELS,
  SURVEY_RESPONSE_CHANNEL_LABELS,
  type SurveyResponseItem,
} from '@/features/surveys/types'
import { describeSurveyRespondent } from '@/features/surveys/survey-respondent'
import { RecordSurveyResponseDialog } from '@/features/surveys/components/RecordSurveyResponseDialog'
import { useAuthStore } from '@/features/auth/store'

function ResponseAnswersDialog({
  response,
  formatInstant,
  onClose,
}: {
  response: SurveyResponseItem | null
  formatInstant: (iso: string) => string
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
                Submitted {formatInstant(response.submittedAt)}
                {response.respondentRelation
                  ? ` · ${describeSurveyRespondent(response.respondentRelation, response.respondentName)}`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-2">
              {response.channel && response.channel !== 'ONLINE' && response.channel !== 'PORTAL' ? (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                  <p className="font-medium text-foreground">
                    {SURVEY_RESPONSE_CHANNEL_LABELS[response.channel]}
                    {response.recordedByName ? ` · recorded by ${response.recordedByName}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      response.contactedAt
                        ? `${response.channel === 'TELEPHONE' ? 'Call' : 'Collected'} ${formatInstant(response.contactedAt)}`
                        : null,
                      response.contactNumber ? `Number ${response.contactNumber}` : null,
                      response.consentGiven ? 'Agreed to answer by phone' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {response.contactNotes ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{response.contactNotes}</p>
                  ) : null}
                </div>
              ) : null}
              {response.answers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No answers recorded.</p>
              ) : (
                response.answers.map((a, idx) => (
                  <div key={a.questionId} className="rounded-lg border border-border bg-card px-3 py-2.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Q{idx + 1}. {a.questionText}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{a.displayValue}</p>
                  </div>
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
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const formatInstant = (iso: string) => {
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }
  const { data, isLoading, isError, refetch, isFetching } = useSurveyResponses(surveyId)
  const surveyQuery = useSurvey(surveyId)
  const survey = surveyQuery.data
  const canRecord = useAuthStore(s => s.can('surveys.responses.record'))
  const [viewing, setViewing] = React.useState<SurveyResponseItem | null>(null)
  const [recordOpen, setRecordOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SurveyResponseItem | null>(null)
  const showAnsweredBy = Boolean(data?.responses.some(r => r.respondentRelation))
  const showRecordedBy = Boolean(data?.responses.some(r => r.recordedByName))
  const canRecordHere = canRecord && Boolean(survey) && survey?.status !== 'DRAFT'

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
            Response audience
            {data ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.total}
              </span>
            ) : null}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data?.isAnonymous
              ? 'This survey is anonymous — respondent names are hidden.'
              : 'Who submitted and what they answered.'}
          </p>
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
            className="text-xs font-medium text-primary hover:underline"
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
          No responses yet. Share the survey link, or record a response taken by phone, paper or in person.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Respondent</th>
                {showAnsweredBy ? <th className="px-4 py-2">Answered by</th> : null}
                <th className="px-4 py-2">Channel</th>
                {showRecordedBy ? <th className="px-4 py-2">Recorded by</th> : null}
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Answers</th>
                <th className="px-4 py-2 text-right">Response</th>
              </tr>
            </thead>
            <tbody>
              {data.responses.map(r => (
                <tr key={r.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-foreground">{r.respondentLabel}</td>
                  {showAnsweredBy ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.respondentRelation
                        ? `${SURVEY_RESPONDENT_RELATION_LABELS[r.respondentRelation]}${
                            r.respondentName ? ` (${r.respondentName})` : ''
                          }`
                        : '—'}
                    </td>
                  ) : null}
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.channel ? SURVEY_RESPONSE_CHANNEL_LABELS[r.channel] : '—'}
                  </td>
                  {showRecordedBy ? (
                    <td className="px-4 py-2.5 text-muted-foreground">{r.recordedByName ?? '—'}</td>
                  ) : null}
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular-nums">
                    {formatInstant(r.submittedAt)}
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
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setViewing(r)}>
                        <Eye className="h-3.5 w-3.5" aria-hidden /> View response
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ResponseAnswersDialog response={viewing} formatInstant={formatInstant} onClose={() => setViewing(null)} />
      {survey ? (
        <RecordSurveyResponseDialog
          surveyId={surveyId}
          targetKind={survey.targetKind}
          questions={survey.questions ?? []}
          open={recordOpen || editing != null}
          editing={editing}
          onClose={() => {
            setRecordOpen(false)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
