import * as React from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import type { SendSurveyInput } from '@/features/surveys/types'
import { formatDay, useSendCheck } from '@/features/surveys/contact-rule/survey-contact-rule'

export type ContactRuleOverride = { sendAnyway: boolean; reason: string }

/**
 * In the send dialog (Send now only): how many people had another survey in the last 4 weeks and
 * will be sent this one on their free day, and how many sampling leaves out this time. The sender can
 * send to the held people now anyway, with a reason. Never says which other survey held anyone back.
 */
export function SendContactRuleCheck({
  surveyId,
  input,
  enabled,
  value,
  onChange,
}: {
  surveyId: string
  input: SendSurveyInput
  enabled: boolean
  value: ContactRuleOverride
  onChange: (next: ContactRuleOverride) => void
}) {
  // Wait for the audience to settle before asking.
  const key = JSON.stringify(input)
  const [settled, setSettled] = React.useState(key)
  React.useEffect(() => {
    const t = window.setTimeout(() => setSettled(key), 400)
    return () => window.clearTimeout(t)
  }, [key])
  const settledInput = React.useMemo(() => JSON.parse(settled) as SendSurveyInput, [settled])
  const { data, isLoading, isError } = useSendCheck(surveyId, settledInput, enabled)
  const [showWho, setShowWho] = React.useState(false)

  if (!enabled) return null
  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="send-contact-check">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Checking who has had another survey recently…
      </p>
    )
  }
  if (isError || !data || (!data.heldBack && !data.notSampled && !data.notSentHeld)) return null
  const earliest = data.held.map(h => h.freeFrom).sort()[0]

  return (
    <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm" data-testid="send-contact-check">
      {data.notSampled ? (
        <p>
          Sampling: {data.sendNow} of {data.total - data.heldBack} will be sent it this time ({data.sampling?.percent}%), choosing
          people asked least often first.
        </p>
      ) : null}
      {data.notSentHeld ? (
        <p className="flex items-start gap-1.5" data-testid="send-contact-check-skip">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <span>
            {data.notSentHeld} of {data.total} had another survey in the last 4 weeks and will not be sent this one (this
            survey skips them rather than sending later).
          </span>
        </p>
      ) : null}
      {data.heldBack ? (
        <>
          <p className="flex items-start gap-1.5">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <span>
              {data.heldBack} of {data.total} had another survey in the last 4 weeks. They will be sent this one when 4
              weeks have passed{earliest ? ` (the first on ${formatDay(earliest)})` : ''}, if it is still open.
            </span>
          </p>
          <button type="button" className="text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={() => setShowWho(v => !v)}>
            {showWho ? 'Hide who' : 'Show who'}
          </button>
          {showWho ? (
            <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-xs text-muted-foreground">
              {data.held.map(h => (
                <li key={h.id}>
                  {h.name}: from {formatDay(h.freeFrom)}
                </li>
              ))}
            </ul>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={value.sendAnyway}
              onChange={e => onChange({ ...value, sendAnyway: e.target.checked })}
            />
            Send to them now anyway
          </label>
          {value.sendAnyway ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Why (required, kept in the audit trail)</span>
              <Input
                value={value.reason}
                maxLength={300}
                onChange={e => onChange({ ...value, reason: e.target.value })}
                placeholder="For example: the annual survey must reach everyone this month"
              />
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
