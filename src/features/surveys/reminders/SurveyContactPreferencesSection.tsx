import * as React from 'react'
import { Loader2, MessageSquareOff } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatSurveyDate } from '@/features/surveys/survey-datetime'
import { scrollIntoPane } from '@/shared/lib/scroll-into-pane'

/** API: careflow-api src/surveys/survey-reminders.service.ts (getOptOuts / setOptOuts). */
/** The section's anchor, so other pages can open it (see showSurveyContactPreferences). */
export const SURVEY_CONTACT_PREFERENCES_ID = 'survey-contact-preferences'

/**
 * After switching to the tab that holds it: scroll the contact preferences into view and highlight them briefly.
 * The tab renders after navigation, so it looks for a few seconds.
 */
export function showSurveyContactPreferences() {
  const started = Date.now()
  const attempt = () => {
    const el = document.getElementById(SURVEY_CONTACT_PREFERENCES_ID)
    if (!el) {
      if (Date.now() - started < 5000) window.setTimeout(attempt, 150)
      return
    }
    scrollIntoPane(el)
    // The form above it may still be loading and push it down: look again once the page settles.
    for (const ms of [600, 1200, 2000]) window.setTimeout(() => scrollIntoPane(el, 16, 40), ms)
    el.classList.add('ring-2', 'ring-primary')
    window.setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2500)
  }
  window.setTimeout(attempt, 50)
}

export type SurveyOptOutSubject = 'EMPLOYEE' | 'SERVICE_USER' | 'CANDIDATE'
export type SurveyOptOutChannel = 'ALL' | 'EMAIL' | 'TEXT' | 'APP' | 'PORTAL' | 'PHONE'
type Preferences = {
  channels: SurveyOptOutChannel[]
  /** What staff recorded (never the STOP reply's own note). */
  reason: string | null
  since: string | null
  /** Survey texts stopped by a STOP reply (a START reply lifts only this one). */
  stoppedByText?: { since: string } | null
}

const CHANNELS: Record<SurveyOptOutSubject, Array<{ value: SurveyOptOutChannel; label: string }>> = {
  EMPLOYEE: [
    { value: 'APP', label: 'Carer app notifications' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'TEXT', label: 'Text messages' },
    { value: 'PHONE', label: 'Phone calls' },
  ],
  SERVICE_USER: [
    { value: 'PORTAL', label: 'Portal emails' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'TEXT', label: 'Text messages' },
    { value: 'PHONE', label: 'Phone calls' },
  ],
  // Applicants are only ever emailed (the applicant survey invitation).
  CANDIDATE: [{ value: 'EMAIL', label: 'Email' }],
}

export const surveyContactPreferencesKey = (subjectKind: SurveyOptOutSubject, subjectId: string) =>
  ['surveys', 'contact-preferences', subjectKind, subjectId] as const

/**
 * Survey contact preferences on an employee or service-user record: whether, and how, the person
 * may be asked to take part in surveys (invitations, reminders and phone follow-up). Every send
 * honours these. Viewing needs survey access; changing them needs surveys.manage. Audited by the
 * API without contact details.
 */
export function SurveyContactPreferencesSection({
  subjectKind,
  subjectId,
  generalPreference,
}: {
  subjectKind: SurveyOptOutSubject
  subjectId: string
  /** How they prefer to be contacted in general (Personal Details), shown so survey choices agree with it. */
  generalPreference?: string | null
}) {
  const canRead = useAuthStore(s => s.can('surveys.read') || s.can('surveys.manage'))
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const qc = useQueryClient()
  const key = surveyContactPreferencesKey(subjectKind, subjectId)
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    enabled: canRead && Boolean(subjectId),
    queryFn: async () => {
      const params = new URLSearchParams({ subjectKind, subjectId })
      return (await apiJson<ApiEnvelope<Preferences>>(`/surveys-contact-preferences?${params}`, { method: 'GET' })).data
    },
  })

  const [none, setNone] = React.useState(false)
  const [channels, setChannels] = React.useState<SurveyOptOutChannel[]>([])
  const [reason, setReason] = React.useState('')
  React.useEffect(() => {
    if (!data) return
    setNone(data.channels.includes('ALL'))
    setChannels(data.channels.filter(c => c !== 'ALL'))
    setReason(data.reason ?? '')
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      apiJson(`/surveys-contact-preferences`, {
        method: 'PUT',
        body: JSON.stringify({ subjectKind, subjectId, channels: none ? ['ALL'] : channels, reason: reason.trim() || null }),
      }),
    onSuccess: () => {
      toastSuccess('Survey contact preferences saved')
      void qc.invalidateQueries({ queryKey: key })
    },
    onError: e => toastApiError(e, 'Could not save survey contact preferences'),
  })

  if (!canRead) return null
  const options = CHANNELS[subjectKind]
  const stoppedByText = data?.stoppedByText ?? null
  const anyStopped = none || channels.length > 0
  const changed =
    data &&
    (none !== data.channels.includes('ALL') ||
      [...channels].sort().join() !== data.channels.filter(c => c !== 'ALL').sort().join() ||
      (reason.trim() || null) !== (data.reason ?? null))

  return (
    <section id={SURVEY_CONTACT_PREFERENCES_ID} className="scroll-mt-24 rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="survey-contact-preferences">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <MessageSquareOff className="h-4 w-4 text-muted-foreground" aria-hidden />
        Survey contact preferences
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {subjectKind === 'CANDIDATE'
          ? 'Use this when they have asked not to be sent surveys, or must never be (an offer withdrawn for false information or forged documents, the police asked us not to contact them, or a referral to the Disclosure and Barring Service). The weekly applicant survey invitation follows it.'
          : subjectKind === 'EMPLOYEE'
          ? 'Use this when they have asked not to be sent surveys, or not in some ways. Survey invitations, reminders and phone calls follow it.'
          : 'Use this when they (or the person who speaks for them) have asked not to be sent surveys, or not in some ways. Survey invitations, reminders and phone calls follow it.'}
      </p>
      {generalPreference?.trim() ? (
        <p className="mt-1 text-xs text-muted-foreground" data-testid="survey-general-preference">
          How they prefer to be contacted in general (Personal Details):{' '}
          <span className="font-medium text-foreground">{generalPreference.trim()}</span>. If they don’t want surveys a certain
          way, stop it here.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
        </p>
      ) : isError ? (
        <p className="mt-4 text-sm text-muted-foreground">Survey contact preferences could not be loaded.</p>
      ) : (
        <fieldset className="mt-4 space-y-3" disabled={!canManage || save.isPending}>
          <legend className="sr-only">Survey contact preferences</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={none}
              onChange={e => setNone(e.target.checked)}
            />
            <span className="font-medium">Do not contact them about surveys at all</span>
          </label>
          {!none && options.length > 1 ? (
            <div className="space-y-2 pl-6">
              <p className="text-xs text-muted-foreground">Or stop only these:</p>
              {options.map(o => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={channels.includes(o.value)}
                    onChange={e =>
                      setChannels(prev => (e.target.checked ? [...prev, o.value] : prev.filter(c => c !== o.value)))
                    }
                  />
                  {o.label}
                </label>
              ))}
            </div>
          ) : null}
          {anyStopped ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Why (optional)</span>
              <Input
                value={reason}
                maxLength={300}
                onChange={e => setReason(e.target.value)}
                placeholder="For example: asked at their review not to be texted"
              />
            </label>
          ) : null}
          {stoppedByText ? (
            <p className="text-xs text-muted-foreground">
              They replied STOP to a survey text on {formatSurveyDate(stoppedByText.since)}. If they reply START, survey
              texts start again.
            </p>
          ) : null}
          {data?.since && data.channels.some(c => c !== 'TEXT' || !stoppedByText) ? (
            <p className="text-xs text-muted-foreground">Recorded on {formatSurveyDate(data.since)}.</p>
          ) : null}
          {canManage ? (
            <Button type="button" size="sm" disabled={!changed || save.isPending} onClick={() => save.mutate()} className="gap-1.5">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Save survey contact preferences
            </Button>
          ) : null}
        </fieldset>
      )}
    </section>
  )
}
