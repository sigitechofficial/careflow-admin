import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Phone, PhoneCall } from 'lucide-react'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { ApiError } from '@/shared/api/api-client'
import { useSurvey } from '@/features/surveys/hooks/useSurveys'
import { RecordSurveyResponseDialog } from '@/features/surveys/components/RecordSurveyResponseDialog'
import { formatSurveyDate, formatSurveyDateTime } from '@/features/surveys/survey-datetime'
import {
  callListKey,
  SURVEY_CALL_OUTCOME_LABELS,
  useRecordSurveyCall,
  useSurveyCallList,
  type SurveyCallPerson,
} from './survey-reminders'

/**
 * Call list (/surveys/$surveyId/calls): people who have not answered a named survey, with the numbers
 * on their record, reminders sent and earlier calls. Record each call, or record their answers by
 * phone (Record response, Telephone). Never for anonymous surveys. Opened from the call list task.
 */
export default function SurveyCallListPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const list = useSurveyCallList(surveyId)
  const survey = useSurvey(surveyId)
  const qc = useQueryClient()
  useDocumentTitle(list.data ? `Call list: ${list.data.survey.title} – CareAdmin` : null)
  const [calling, setCalling] = React.useState<SurveyCallPerson | null>(null)
  const [recording, setRecording] = React.useState<SurveyCallPerson | null>(null)
  const [showDone, setShowDone] = React.useState(false)

  if (list.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading the call list…
      </div>
    )
  }
  if (list.isError || !list.data) {
    const message = list.error instanceof ApiError ? list.error.message : 'The call list could not be loaded.'
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" asChild>
          <Link to="/surveys">Back to surveys</Link>
        </Button>
      </div>
    )
  }

  const data = list.data
  const toCall = data.people.filter((p) => p.open)
  const offList = data.people.filter((p) => !p.open)
  const dueNow = toCall.filter((p) => p.due)
  const shown = showDone ? data.people : toCall

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-2">
          <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/surveys/$surveyId" params={{ surveyId }}>
              <ArrowLeft className="h-5 w-5" aria-hidden />
              <span className="sr-only">Back to survey</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Call list</h1>
            <p className="text-sm text-muted-foreground">{data.survey.title}</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground" data-testid="call-list-summary">
          <p>
            <strong className="text-foreground">{dueNow.length}</strong> to phone now
            {toCall.length > dueNow.length ? ` · ${toCall.length - dueNow.length} later` : ''}
            {offList.length ? ` · ${offList.length} off the list` : ''}
          </p>
          {data.task ? (
            <p>
              {data.task.roleName} · due {formatSurveyDate(data.task.dueDate)}
              {data.task.status === 'DONE' ? ' · done' : ''}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Phone each person, ask if they would like to answer now, and either record their answers (Record response) or
        what happened on the call. Someone who does not want to take part, or whose number is wrong, comes off the list.
        Only people who have not answered are shown.
      </p>

      {data.people.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Everyone it was sent to has answered.
        </p>
      ) : (
        <>
          <ul className="space-y-3" aria-label="People to phone">
            {shown.map((p) => (
              <li key={p.recipientId} className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="call-list-person">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {p.name}
                      {!p.open ? <span className="ml-2 text-xs font-normal text-muted-foreground">Off the list</span> : null}
                      {p.open && !p.due ? <span className="ml-2 text-xs font-normal text-muted-foreground">Not due yet</span> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Sent {formatSurveyDate(p.sentAt)} · {p.reminders === 0 ? 'no reminders' : `${p.reminders} ${p.reminders === 1 ? 'reminder' : 'reminders'}`}
                      {p.optedOut ? ' · asked not to be phoned about surveys' : ''}
                      {p.died ? ' · has died' : ''}
                    </p>
                    {p.phones.length ? (
                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {p.phones.map((ph) => (
                          <li key={`${ph.label}-${ph.number}`}>
                            <span className="text-muted-foreground">{ph.label}: </span>
                            <a className="font-medium text-primary underline-offset-2 hover:underline" href={`tel:${ph.number.replace(/\s+/g, '')}`}>
                              {ph.number}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No phone number on their record.</p>
                    )}
                  </div>
                  {p.open ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setCalling(p)}>
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                        Record call
                      </Button>
                      <Button type="button" size="sm" className="gap-1.5" disabled={!survey.data} onClick={() => setRecording(p)}>
                        <PhoneCall className="h-3.5 w-3.5" aria-hidden />
                        Record response
                      </Button>
                    </div>
                  ) : null}
                </div>
                {p.calls.length ? (
                  <ol className="mt-3 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground" aria-label={`Calls to ${p.name}`}>
                    {p.calls.map((c) => (
                      <li key={c.id}>
                        <span className="font-medium text-foreground">{SURVEY_CALL_OUTCOME_LABELS[c.outcome] ?? c.outcome}</span>
                        {` · ${formatSurveyDateTime(c.at)}${c.by ? ` · ${c.by}` : ''}`}
                        {c.notes ? <span className="block whitespace-pre-wrap text-foreground">{c.notes}</span> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ul>
          {offList.length ? (
            <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setShowDone((v) => !v)}>
              {showDone ? 'Hide people off the list' : `Show ${offList.length} off the list`}
            </Button>
          ) : null}
        </>
      )}

      {calling ? <RecordCallDialog surveyId={surveyId} person={calling} outcomes={data.outcomes} onClose={() => setCalling(null)} /> : null}
      {recording && survey.data ? (
        <RecordSurveyResponseDialog
          open
          surveyId={surveyId}
          targetKind={survey.data.targetKind}
          questions={survey.data.questions ?? []}
          isAnonymous={survey.data.isAnonymous}
          sectionIntros={survey.data.sectionIntros ?? undefined}
          initialPerson={{
            id: (recording.employeeId ?? recording.serviceUserId)!,
            name: recording.name,
            phone: recording.phones[0]?.number ?? null,
          }}
          onClose={() => {
            setRecording(null)
            void qc.invalidateQueries({ queryKey: callListKey(surveyId) })
          }}
        />
      ) : null}
    </div>
  )
}

function RecordCallDialog({
  surveyId,
  person,
  outcomes,
  onClose,
}: {
  surveyId: string
  person: SurveyCallPerson
  outcomes: string[]
  onClose: () => void
}) {
  const [outcome, setOutcome] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const record = useRecordSurveyCall(surveyId)
  const submit = async () => {
    if (!outcome) return
    try {
      await record.mutateAsync({ recipientId: person.recipientId, outcome, notes: notes.trim() || undefined })
      toastSuccess('Call recorded')
      onClose()
    } catch (e) {
      toastApiError(e, 'Call not recorded')
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a call to {person.name}</DialogTitle>
          <DialogDescription>If they answered the survey on the call, close this and use Record response instead.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">What happened</legend>
            <div className="mt-2 space-y-2">
              {outcomes.map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="call-outcome" className="h-4 w-4" checked={outcome === o} onChange={() => setOutcome(o)} />
                  {SURVEY_CALL_OUTCOME_LABELS[o] ?? o}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            <span className="font-medium text-foreground">Notes (optional)</span>
            <textarea
              className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!outcome || record.isPending} onClick={() => void submit()}>
            Save call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
