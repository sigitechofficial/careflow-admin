import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useSharedLinkLimit, type ShareLinks } from '@/features/surveys/sharing/survey-sharing.api'

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
/** A time as a datetime-local input takes it (local time, to the minute). */
const localInput = (ms: number) => {
  const d = new Date(ms)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Shared links take at most a set number of answers per 10 minutes (spam protection). For a planned
 * sitting (staff answering together at a meeting) a survey manager raises it until a time.
 */
export function SharedLinkLimit({ surveyId, limit }: { surveyId: string; limit: NonNullable<ShareLinks['linkLimit']> }) {
  const save = useSharedLinkLimit(surveyId)
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState('300')
  const [until, setUntil] = React.useState('')
  const raised = Boolean(limit.raisedUntil)
  const raiseButton = React.useRef<HTMLButtonElement>(null)
  const numberInput = React.useRef<HTMLInputElement>(null)
  const wasEditing = React.useRef(false)
  React.useEffect(() => {
    // Keep the keyboard where the person is: into the form when it opens, back to the limit's button after.
    if (editing) numberInput.current?.focus()
    else if (wasEditing.current) raiseButton.current?.focus()
    wasEditing.current = editing
  }, [editing])
  const n = Number(value)
  const now = Date.now()
  const latest = now + limit.maxDays * 24 * 60 * 60_000
  const untilMs = until ? new Date(until).getTime() : NaN
  const numberOk = value.trim() !== '' && Number.isInteger(n) && n > limit.standard && n <= limit.max
  const untilOk = Number.isFinite(untilMs) && untilMs > now && untilMs <= latest
  const valid = numberOk && untilOk
  // Why Save cannot be pressed yet, said next to it (a disabled button alone does not say).
  const problem = !numberOk
    ? `Enter a whole number from ${limit.standard + 1} to ${limit.max}.`
    : !until
      ? 'Choose until when the higher limit is needed.'
      : !untilOk
        ? `Choose a time in the next ${limit.maxDays} days.`
        : null
  const done = (msg: string) => () => {
    toastSuccess(msg)
    setEditing(false)
  }

  return (
    <div className="space-y-2 text-xs" data-testid="shared-link-limit">
      <p>
        <span className="font-medium">Answers per 10 minutes through each link: {limit.inForce}.</span>{' '}
        <span className="text-muted-foreground">
          {raised
            ? `Raised for a planned sitting until ${when(limit.raisedUntil!)}, then back to ${limit.standard}.`
            : 'More are turned away for a few minutes, so a flood of fake answers cannot swamp the survey.'}
        </span>
      </p>
      {raised ? (
        <Button
          ref={raiseButton}
          type="button"
          size="sm"
          variant="ghost"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({ limit: null }, { onSuccess: done('Standard limit back'), onError: e => toastApiError(e, 'Could not save') })
          }
        >
          Put the standard limit back
        </Button>
      ) : editing ? (
        <fieldset className="space-y-2 rounded-md border p-3">
          <legend className="px-1 font-medium">Raise it for a planned sitting</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="link-limit-value" className="block">
                Answers per 10 minutes ({limit.standard + 1} to {limit.max})
              </label>
              <Input
                ref={numberInput}
                id="link-limit-value"
                type="number"
                inputMode="numeric"
                min={limit.standard + 1}
                max={limit.max}
                value={value}
                aria-invalid={!numberOk}
                aria-describedby="link-limit-problem"
                onChange={e => setValue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="link-limit-until" className="block">
                Until (at most {limit.maxDays} days ahead)
              </label>
              <Input
                id="link-limit-until"
                type="datetime-local"
                min={localInput(now)}
                max={localInput(latest)}
                value={until}
                aria-invalid={Boolean(until) && !untilOk}
                aria-describedby="link-limit-problem"
                onChange={e => setUntil(e.target.value)}
              />
            </div>
          </div>
          <p id="link-limit-problem" className="text-muted-foreground" aria-live="polite">
            {problem ?? ''}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!valid || save.isPending}
              onClick={() =>
                save.mutate(
                  { limit: n, until: new Date(until).toISOString() },
                  { onSuccess: done('Higher limit set'), onError: e => toastApiError(e, 'Could not save') },
                )
              }
            >
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </fieldset>
      ) : (
        <Button ref={raiseButton} type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
          Raise it for a planned sitting
        </Button>
      )}
    </div>
  )
}
