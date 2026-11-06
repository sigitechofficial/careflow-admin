import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { formatSurveyDate } from '@/features/surveys/survey-datetime'

type FormerStaff = { id: string; name: string; leftOn: string | null; hasPersonalEmail: boolean }

/**
 * Leavers' surveys only (the API refuses others, and this then shows nothing): staff who left in the last 3
 * months, chosen by name. They are sent it at the personal email on their staff record (never a work address
 * or the carer app); anonymous versions ask for a paper copy, since a link would show whether they answered.
 */
export function SurveyFormerStaffField({
  surveyId,
  anonymous,
  value,
  onChange,
}: {
  surveyId: string
  anonymous: boolean
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const { data, isError } = useQuery({
    queryKey: ['surveys', 'former-staff', surveyId],
    retry: false,
    queryFn: async () => (await apiJson<ApiEnvelope<FormerStaff[]>>(`/surveys/${surveyId}/former-staff`, { method: 'GET' })).data,
  })
  if (isError || !data) return null
  return (
    <fieldset className="space-y-1.5 rounded-md border border-border p-3 text-sm" data-testid="survey-former-staff">
      <legend className="px-1 font-medium">People who have left (last 3 months)</legend>
      <p className="text-xs text-muted-foreground">
        {anonymous
          ? 'They are emailed at the personal address on their record and asked to answer on paper: an anonymous survey never gets a personal link.'
          : 'They are emailed their own link at the personal address on their record. No CareFlow login is needed.'}
      </p>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nobody has left in the last 3 months.</p>
      ) : (
        data.map(p => (
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
                {p.leftOn ? ` · left ${formatSurveyDate(p.leftOn)}` : ''}
                {p.hasPersonalEmail ? '' : ' · no personal email: post a paper copy'}
              </span>
            </span>
          </label>
        ))
      )}
    </fieldset>
  )
}
