import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardPen, Loader2, PhoneCall } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useSurvey } from '@/features/surveys/hooks/useSurveys'
import { RecordSurveyResponseDialog } from '@/features/surveys/components/RecordSurveyResponseDialog'
import { formatSurveyDate } from '@/features/surveys/survey-datetime'
import type { StaffRecordedChannel } from '@/features/surveys/types'
import type { SurveyCallPerson, SurveyToCollect } from './survey-reminders'

/** Opens Record response for one person on one survey, loading the survey's questions first. */
export function RecordForPerson({
  surveyId,
  person,
  initialChannel,
  onClose,
}: {
  surveyId: string
  person: { id: string; name: string; phone?: string | null }
  initialChannel?: StaffRecordedChannel
  onClose: () => void
}) {
  const survey = useSurvey(surveyId)
  if (!survey.data) {
    return survey.isError ? null : (
      <span className="sr-only" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the survey…
      </span>
    )
  }
  return (
    <RecordSurveyResponseDialog
      open
      surveyId={surveyId}
      targetKind={survey.data.targetKind}
      questions={survey.data.questions ?? []}
      isAnonymous={survey.data.isAnonymous}
      sectionIntros={survey.data.sectionIntros ?? undefined}
      initialPerson={person}
      initialChannel={initialChannel}
      onClose={onClose}
    />
  )
}

function personId(p: SurveyCallPerson): string {
  return (p.serviceUserId ?? p.employeeId)!
}

/**
 * Surveys still to collect, each with the people who have not answered: phone numbers, reminders sent,
 * and Record answers (Record response with the person chosen). `forPerson`: one person's record, so
 * names are left out and each survey is one line.
 */
export function SurveysToCollectList({
  items,
  forPerson = false,
  limit,
}: {
  items: SurveyToCollect[]
  forPerson?: boolean
  /** Show at most this many people in all (the dashboard card); the rest are on the full list. */
  limit?: number
}) {
  const [recording, setRecording] = React.useState<{ surveyId: string; person: SurveyCallPerson; channel: StaffRecordedChannel } | null>(null)
  let left = limit ?? Number.POSITIVE_INFINITY

  return (
    <>
      <ul className="space-y-3" aria-label={forPerson ? 'Surveys due' : 'Surveys to collect'}>
        {items.map(item => {
          if (left <= 0) return null
          const people = item.people.slice(0, left)
          left -= people.length
          return (
            <li key={item.survey.id} className="rounded-lg border border-border bg-card" data-testid="to-collect-survey">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="min-w-0">
                  <Link
                    to="/surveys/$surveyId"
                    params={{ surveyId: item.survey.id }}
                    className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {item.survey.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.survey.closesAt ? `Closes ${formatSurveyDate(item.survey.closesAt)}` : 'No closing date'}
                    {forPerson ? '' : ` · ${item.people.length} to collect`}
                  </p>
                </div>
                {!forPerson ? (
                  <Link
                    to="/surveys/$surveyId/calls"
                    params={{ surveyId: item.survey.id }}
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Call list
                  </Link>
                ) : null}
              </div>
              <ul className="divide-y divide-border">
                {people.map(p => (
                  <li key={p.recipientId} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2" data-testid="to-collect-person">
                    <div className="min-w-0 text-sm">
                      {!forPerson ? <p className="font-medium text-foreground">{p.name}</p> : null}
                      <p className="text-xs text-muted-foreground">
                        Sent {p.sentAt ? formatSurveyDate(p.sentAt) : '—'} ·{' '}
                        {p.reminders === 0 ? 'no reminders' : `${p.reminders} ${p.reminders === 1 ? 'reminder' : 'reminders'}`}
                        {p.calls.length ? ` · ${p.calls.length} ${p.calls.length === 1 ? 'call' : 'calls'}` : ''}
                        {p.due ? ' · due a call' : ''}
                      </p>
                      {p.needs ? (
                        <p className="mt-0.5 text-xs font-medium text-amber-800 dark:text-amber-300" data-testid="to-collect-needs">
                          Needs: {p.needs}
                        </p>
                      ) : null}
                      {p.phones.length ? (
                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                          {p.phones.map(ph => (
                            <a
                              key={`${ph.label}-${ph.number}`}
                              className="text-primary underline-offset-2 hover:underline"
                              href={`tel:${ph.number.replace(/\s+/g, '')}`}
                            >
                              {ph.label}: {ph.number}
                            </a>
                          ))}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {p.optedOut ? (
                        <span className="text-xs text-muted-foreground">Asked not to be phoned about surveys</span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => setRecording({ surveyId: item.survey.id, person: p, channel: 'TELEPHONE' })}
                          aria-label={`Record answers by phone${forPerson ? '' : ` for ${p.name}`}: ${item.survey.title}`}
                        >
                          <PhoneCall className="h-3.5 w-3.5" aria-hidden /> By phone
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setRecording({ surveyId: item.survey.id, person: p, channel: 'IN_PERSON' })}
                        aria-label={`Record answers in person${forPerson ? '' : ` for ${p.name}`}: ${item.survey.title}`}
                        data-testid="to-collect-record"
                      >
                        <ClipboardPen className="h-3.5 w-3.5" aria-hidden /> Record answers
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
      {recording ? (
        <RecordForPerson
          surveyId={recording.surveyId}
          person={{ id: personId(recording.person), name: recording.person.name, phone: recording.person.phones[0]?.number ?? null }}
          initialChannel={recording.channel}
          onClose={() => setRecording(null)}
        />
      ) : null}
    </>
  )
}

/** How many people are still to collect across the list. */
export function countToCollect(items: SurveyToCollect[] | undefined): number {
  return (items ?? []).reduce((n, i) => n + i.people.length, 0)
}
