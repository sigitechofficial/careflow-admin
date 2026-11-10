import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { Input } from '@/shared/ui/input'
import { formatSurveyDate } from '@/features/surveys/survey-datetime'

type FormerPerson = { id: string; name: string; leftOn: string | null; hasPersonalEmail: boolean }
type FormerPeople = { kind: 'EMPLOYEE' | 'SERVICE_USER'; needsReason: boolean; people: FormerPerson[] }

/**
 * People who left (staff) or whose care ended (people we support) in the last 3 months, chosen by name. Sent
 * to the personal email on their record (never a work address, the carer app or the portal), each message
 * with a one-click "unsubscribe from all surveys". A reason is needed unless the survey is for them (leavers,
 * care ending). Anonymous surveys ask them to answer on paper (a link would show whether they answered).
 */
export function SurveyFormerPeopleField({
  surveyId,
  anonymous,
  value,
  onChange,
  reason,
  onReasonChange,
}: {
  surveyId: string
  anonymous: boolean
  value: string[]
  onChange: (ids: string[]) => void
  reason: string
  onReasonChange: (reason: string) => void
}) {
  const { data, isError } = useQuery({
    queryKey: ['surveys', 'former-people', surveyId],
    retry: false,
    queryFn: async () => (await apiJson<ApiEnvelope<FormerPeople>>(`/surveys/${surveyId}/former-people`, { method: 'GET' })).data,
  })
  if (isError || !data) return null
  const chosen = data.people.filter(p => value.includes(p.id))
  const reasonId = `former-reason-${surveyId}`
  return (
    <fieldset className="space-y-1.5 rounded-md border border-border p-3 text-sm" data-testid="survey-former-people">
      <legend className="px-1 font-medium">People who have left or whose care ended (last 3 months)</legend>
      <p className="text-xs text-muted-foreground">
        {anonymous
          ? 'They are emailed at the personal address on their record and asked to answer on paper: an anonymous survey never gets a personal link.'
          : 'They are emailed their own link at the personal address on their record. No login is needed.'}{' '}
        Every message lets them unsubscribe from all surveys with one click.
      </p>
      {data.people.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nobody in the last 3 months.</p>
      ) : (
        data.people.map(p => (
          <label key={p.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={value.includes(p.id)}
              onChange={e => onChange(e.target.checked ? [...value, p.id] : value.filter(x => x !== p.id))}
            />
            <span>
              {p.name}
              <span className="text-xs text-muted-foreground">
                {p.leftOn ? ` · ${data.kind === 'EMPLOYEE' ? 'left' : 'care ended'} ${formatSurveyDate(p.leftOn)}` : ''}
                {p.hasPersonalEmail ? '' : ' · no personal email: post a paper copy'}
              </span>
            </span>
          </label>
        ))
      )}
      {chosen.length && data.needsReason ? (
        <label className="block space-y-1 pt-1" htmlFor={reasonId}>
          <span className="font-medium">Why are they being asked? (required, kept in the audit trail)</span>
          <Input
            id={reasonId}
            value={reason}
            maxLength={300}
            onChange={e => onReasonChange(e.target.value)}
            placeholder="For example: their views on the new rota before they left"
          />
        </label>
      ) : null}
    </fieldset>
  )
}

/** Whether the chosen former people still need a reason before sending. */
export function formerReasonMissing(needsReason: boolean, chosen: number, reason: string): boolean {
  return needsReason && chosen > 0 && reason.trim().length < 5
}
