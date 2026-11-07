import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarClock, CheckCircle2, ClipboardList, Clock, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { formatSurveyDate } from '@/features/surveys/survey-datetime'
import { SURVEY_RESPONSE_CHANNEL_LABELS, type SurveyResponseChannel } from '@/features/surveys/types'
import { usePersonSurveyHistory, type PersonSurveyHistory } from './survey-reminders'
import { SurveysToCollectList } from './SurveysToCollectList'

/** Who gave the answers, in plain words for the record they are shown on. */
export function answeredByWords(relation: string | null, name: string | null, forStaff: boolean): string {
  switch (relation) {
    case 'FAMILY_MEMBER':
      return name ? `Family member (${name})` : 'A family member'
    case 'REPRESENTATIVE':
      return name ? `Representative (${name})` : 'A representative'
    case 'STAFF':
      return name ? `Staff on their behalf (${name})` : 'Staff on their behalf'
    default:
      return forStaff ? 'Themselves' : 'The person themselves'
  }
}

const SHOW_AT_FIRST = 5

function Heading({ icon, children, count }: { icon: React.ReactNode; children: React.ReactNode; count: number }) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {children} <span className="font-normal normal-case">({count})</span>
    </h4>
  )
}

/**
 * A person's surveys on their record (service user or employee): coming up after an event (with the day it is
 * due), sent and not answered (record their answers), and answered (when, how and by whom, with their answers
 * for staff who may see them). Anonymous surveys show only that they were sent.
 */
export function PersonSurveysSection({ serviceUserId, employeeId }: { serviceUserId?: string; employeeId?: string }) {
  const canSee = useAuthStore(s => s.can('surveys.read') || s.can('surveys.manage') || s.can('surveys.responses.record'))
  const forStaff = Boolean(employeeId)
  const { data } = usePersonSurveyHistory(serviceUserId ? { serviceUserId } : { employeeId }, canSee && Boolean(serviceUserId || employeeId))
  const [allAnswered, setAllAnswered] = React.useState(false)
  if (!canSee || !data) return null
  const total = data.comingUp.length + data.notAnswered.length + data.answered.length + data.anonymous.length
  const openOnes = data.notAnswered.filter(n => n.open && n.person)
  const closedOnes = data.notAnswered.filter(n => !(n.open && n.person))
  const answered = allAnswered ? data.answered : data.answered.slice(0, SHOW_AT_FIRST)

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="person-surveys" data-testid="person-surveys">
      <h3 id="person-surveys" className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
        Surveys
      </h3>
      {total === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">No surveys sent{forStaff ? '' : ' to this person'} yet, and none coming up.</p>
      ) : (
        <div className="mt-3 space-y-5">
          {data.comingUp.length ? (
            <div className="space-y-2" data-testid="person-surveys-coming-up">
              <Heading icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />} count={data.comingUp.length}>
                Coming up
              </Heading>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {data.comingUp.map(c => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{c.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        After: {c.eventLabel} on {formatSurveyDate(c.eventOn)}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-foreground">Due {formatSurveyDate(c.dueOn)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.notAnswered.length ? (
            <div className="space-y-2" data-testid="person-surveys-not-answered">
              <Heading icon={<Clock className="h-3.5 w-3.5" aria-hidden />} count={data.notAnswered.length}>
                Not answered
              </Heading>
              {openOnes.length ? (
                <SurveysToCollectList
                  forPerson
                  items={openOnes.map(n => ({
                    survey: { id: n.surveyId, title: n.title, targetKind: forStaff ? 'EMPLOYEE' : 'SERVICE_USER', closesAt: n.closesAt, libraryReference: null },
                    people: [n.person!],
                  }))}
                />
              ) : null}
              {closedOnes.length ? (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {closedOnes.map(n => (
                    <li key={n.recipientId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <Link to="/surveys/$surveyId" params={{ surveyId: n.surveyId }} className="font-medium text-primary underline-offset-2 hover:underline">
                        {n.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        Sent {n.sentAt ? formatSurveyDate(n.sentAt) : '—'}
                        {n.reminders ? ` · ${n.reminders} ${n.reminders === 1 ? 'reminder' : 'reminders'}` : ''} ·{' '}
                        {n.open ? 'not answered yet' : n.recipientStatus === 'LAPSED' ? 'can no longer be sent' : 'survey closed'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {data.answered.length ? (
            <div className="space-y-2" data-testid="person-surveys-answered">
              <Heading icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />} count={data.answered.length}>
                Answered
              </Heading>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {answered.map(a => (
                  <li key={a.recipientId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{a.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {a.answeredAt ? formatSurveyDate(a.answeredAt) : 'Answered'}
                        {a.channel ? ` · ${SURVEY_RESPONSE_CHANNEL_LABELS[a.channel as SurveyResponseChannel] ?? a.channel}` : ''}
                        {` · ${answeredByWords(a.respondentRelation, a.respondentName, forStaff)}`}
                        {a.recordedBy ? ` · recorded by ${a.recordedBy}` : ''}
                      </span>
                    </span>
                    {a.canViewAnswers ? (
                      <Link
                        to="/surveys/$surveyId/responses"
                        params={{ surveyId: a.surveyId }}
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        View answers
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
              {data.answered.length > SHOW_AT_FIRST ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setAllAnswered(v => !v)}>
                  {allAnswered ? 'Show fewer' : `Show all ${data.answered.length}`}
                </Button>
              ) : null}
            </div>
          ) : null}

          {data.anonymous.length ? (
            <div className="space-y-2" data-testid="person-surveys-anonymous">
              <Heading icon={<EyeOff className="h-3.5 w-3.5" aria-hidden />} count={data.anonymous.length}>
                Anonymous surveys sent
              </Heading>
              <p className="text-xs text-muted-foreground">Answers are anonymous, so whether they answered is never shown.</p>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {data.anonymous.map(a => (
                  <li key={a.recipientId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">{a.title}</span>
                    <span className="text-xs text-muted-foreground">Sent {formatSurveyDate(a.sentAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

export type { PersonSurveyHistory }
