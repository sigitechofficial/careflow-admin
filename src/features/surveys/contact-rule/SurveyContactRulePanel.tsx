import * as React from 'react'
import { CalendarClock, Info } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  formatDay,
  useSaveSurveyContactRule,
  useSendHeldBack,
  useSkipHeldBack,
  useSurveyContactRule,
  type HeldBackStatus,
  type SurveyContactRulePayload,
} from './survey-contact-rule'

const STATUS_LABEL: Record<HeldBackStatus, string> = {
  HELD: 'Waiting',
  SENT: 'Sent on their free day',
  OVERRIDDEN: 'Sent anyway',
  LAPSED: 'Not sent: the survey closed first',
  SKIPPED: 'Not sent',
  CANCELLED: 'Not sent: they have died',
}

type Props = {
  surveyId: string
  /** surveys.manage */
  canEdit: boolean
  /** The survey is open for answers (Send now anyway). */
  isOpen: boolean
}

/** Plain words for the rule this survey follows. */
export function describeContactRule(data: SurveyContactRulePayload): string {
  const r = data.rule
  const parts: string[] = []
  const weeks = data.days / 7
  parts.push(
    !r.holdBack
      ? `Sent even to people who had another survey in the last ${weeks} weeks.`
      : r.whenHeld === 'SKIP'
        ? `People sent another survey in the last ${weeks} weeks are not sent this one this time.`
        : `People sent another survey in the last ${weeks} weeks are held back, and sent this one when ${weeks} weeks have passed if it is still open.`,
  )
  if (!r.countsAsContact) parts.push('Being sent it does not hold people back from other surveys.')
  if (r.source === 'DEFAULT' && data.defaultRule?.calendar) {
    parts.push('Anonymous staff surveys follow the all-staff survey calendar instead (one longer all-staff survey a month).')
  }
  if (r.source === 'LIBRARY') parts.push(`The ready-made survey sets this${r.reason ? `: ${r.reason}` : '.'}`)
  if (r.source === 'SURVEY' && r.reason) parts.push(`Changed for this survey: ${r.reason}`)
  if (data.sentWith?.length) parts.push(`Sent together with ${data.sentWith.join(' and ')} as one contact: they never hold each other back.`)
  if (data.repeatReason) parts.push(`Repeats every week: ${data.repeatReason}`)
  return parts.join(' ')
}

/**
 * Who gets it: the 4-week contact rule (hold back people surveyed recently, with library and
 * organisation exemptions), sampling, and the people held back with Send now anyway. The other survey
 * that held someone back is named only for people who may see that survey's results.
 */
export function SurveyContactRulePanel({ surveyId, canEdit, isOpen }: Props) {
  const { data } = useSurveyContactRule(surveyId)
  const [editing, setEditing] = React.useState(false)
  const [sending, setSending] = React.useState<string[] | null>(null)
  const [skipping, setSkipping] = React.useState<string[] | null>(null)
  const headingId = React.useId()
  if (!data) return null
  const waiting = data.held.filter(h => h.status === 'HELD')

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby={headingId} data-testid="survey-contact-rule">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:flex" aria-hidden>
            <CalendarClock className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 id={headingId} className="text-sm font-semibold text-foreground">
              Who gets it: the 4-week rule{data.samplingAvailable ? ' and sampling' : ''}
            </h3>
            <p className="mt-0.5 text-sm text-foreground" data-testid="survey-contact-rule-summary">
              {describeContactRule(data)}
            </p>
            {data.samplingAvailable ? (
              <p className="mt-0.5 text-sm text-foreground">
                {data.sampling
                  ? `Each send goes to ${data.sampling.percent}% of the people who are free, choosing those asked least often first. Chosen people always all get it.`
                  : 'Each send goes to everyone in the audience.'}
              </p>
            ) : null}
            {data.inheritedFrom ? (
              <p className="mt-0.5 text-xs text-muted-foreground">This period follows the repeating survey’s settings.</p>
            ) : null}
          </div>
        </div>
        {canEdit && !data.inheritedFrom ? (
          <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setEditing(true)}>
            Change
          </Button>
        ) : null}
      </div>

      {data.held.length ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Held back</h4>
            {canEdit && isOpen && waiting.length > 1 ? (
              <span className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => setSending(waiting.map(h => h.id))}>
                  Send to all {waiting.length} now anyway
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSkipping(waiting.map(h => h.id))}>
                  Don’t send to any of them
                </Button>
              </span>
            ) : null}
          </div>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border" data-testid="survey-held-back">
            {data.held.map(h => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{h.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {h.status === 'HELD'
                      ? `${h.otherSurvey ? `Had "${h.otherSurvey.title}" on ${formatDay(h.otherSurvey.on)}` : 'Had another survey in the last 4 weeks'}.${h.freeFrom ? ` Free from ${formatDay(h.freeFrom)}.` : ''}`
                      : `${STATUS_LABEL[h.status]}${h.resolvedOn ? ` on ${formatDay(h.resolvedOn)}` : ''}${h.overrideReason ? `: ${h.overrideReason}` : ''}`}
                  </span>
                </div>
                {canEdit && isOpen && h.status === 'HELD' ? (
                  <span className="flex gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSending([h.id])} aria-label={`Send to ${h.name} now anyway`}>
                      Send now anyway
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setSkipping([h.id])} aria-label={`Don’t send to ${h.name}`}>
                      Don’t send
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Nobody is asked more than one survey in any 4 weeks, so people are not worn out by surveys. Which other survey
          held someone back is shown only to people who may see that survey’s results.
        </span>
      </p>

      {editing ? <ContactRuleDialog surveyId={surveyId} data={data} onClose={() => setEditing(false)} /> : null}
      {sending ? (
        <SendAnywayDialog
          surveyId={surveyId}
          heldIds={sending}
          names={data.held.filter(h => sending.includes(h.id)).map(h => h.name)}
          onClose={() => setSending(null)}
        />
      ) : null}
      {skipping ? (
        <DontSendDialog
          surveyId={surveyId}
          heldIds={skipping}
          names={data.held.filter(h => skipping.includes(h.id)).map(h => h.name)}
          onClose={() => setSkipping(null)}
        />
      ) : null}
    </section>
  )
}

function ContactRuleDialog({ surveyId, data, onClose }: { surveyId: string; data: SurveyContactRulePayload; onClose: () => void }) {
  const save = useSaveSurveyContactRule(surveyId)
  const usual = data.library ?? data.defaultRule ?? { holdBack: true, countsAsContact: true, whenHeld: 'DELAY' as const }
  const [holdBack, setHoldBack] = React.useState(data.rule.holdBack)
  const [counts, setCounts] = React.useState(data.rule.countsAsContact)
  const [skip, setSkip] = React.useState(data.rule.whenHeld === 'SKIP')
  const [reason, setReason] = React.useState(data.rule.source === 'SURVEY' ? (data.rule.reason ?? '') : '')
  const [sampled, setSampled] = React.useState(Boolean(data.sampling))
  const [percent, setPercent] = React.useState(String(data.sampling?.percent ?? 25))
  const whenHeld = holdBack ? (skip ? 'SKIP' : 'DELAY') : usual.whenHeld
  const differs = holdBack !== usual.holdBack || counts !== usual.countsAsContact || whenHeld !== usual.whenHeld
  const reasonMissing = differs && reason.trim().length < 5
  const percentNumber = Number(percent)
  const percentInvalid = sampled && (!Number.isInteger(percentNumber) || percentNumber < 5 || percentNumber > 100)

  const submit = async () => {
    try {
      await save.mutateAsync({
        rule: differs ? { holdBack, countsAsContact: counts, whenHeld, reason: reason.trim() } : null,
        ...(data.samplingAvailable ? { sampling: sampled ? { percent: percentNumber } : null } : {}),
      })
      toastSuccess('Saved')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }

  return (
    <Dialog open onOpenChange={open => (open ? null : onClose())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Who gets it</DialogTitle>
          <DialogDescription>
            {data.library
              ? `The ready-made survey ${usual.holdBack ? 'follows' : 'is exempt from'} the 4-week rule${usual.countsAsContact ? '' : ' and does not count as a survey contact'}${data.library.reason ? ` (${data.library.reason})` : ''}. A different choice needs a reason, kept in the audit trail.`
              : data.defaultRule?.calendar
                ? 'Anonymous staff surveys follow the all-staff calendar: they do not hold people back or count as a survey contact. A different choice needs a reason, kept in the audit trail.'
                : 'Usually a survey holds back people surveyed in the last 4 weeks, and counts as a survey contact. A different choice needs a reason, kept in the audit trail.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">The 4-week rule</legend>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" checked={holdBack} onChange={e => setHoldBack(e.target.checked)} />
              <span>Hold back people who had another survey in the last 4 weeks</span>
            </label>
            {holdBack ? (
              <div className="space-y-1 pl-6" role="radiogroup" aria-label="People held back">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="whenHeld" checked={!skip} onChange={() => setSkip(false)} />
                  Send it to them once 4 weeks have passed, if it is still open
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="whenHeld" checked={skip} onChange={() => setSkip(true)} />
                  Don’t send it to them this time (routine and sampled surveys)
                </label>
              </div>
            ) : null}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" checked={counts} onChange={e => setCounts(e.target.checked)} />
              <span>Being sent this survey counts as a survey contact (it holds people back from other surveys for 4 weeks)</span>
            </label>
            {differs ? (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Why (required)</span>
                <Input value={reason} maxLength={300} onChange={e => setReason(e.target.value)} placeholder="For example: the complaints policy requires this call within 4 weeks" />
              </label>
            ) : null}
          </fieldset>
          {data.samplingAvailable ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Sampling</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="sampling" checked={!sampled} onChange={() => setSampled(false)} />
                Send to everyone in the audience
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="sampling" checked={sampled} onChange={() => setSampled(true)} />
                Send each time to a share of them
              </label>
              {sampled ? (
                <label className="flex items-center gap-2 pl-6 text-sm">
                  <Input
                    type="number"
                    min={5}
                    max={100}
                    className={cn('w-24', percentInvalid && 'border-destructive')}
                    value={percent}
                    onChange={e => setPercent(e.target.value)}
                    aria-label="Share of people each time (per cent)"
                  />
                  % each time, those asked least often first
                </label>
              ) : null}
              {percentInvalid ? <p className="pl-6 text-xs text-destructive">Choose a whole number from 5 to 100.</p> : null}
              <p className="text-xs text-muted-foreground">
                For a monthly survey, 25% asks each person about every 4 months. Sampling applies when the survey goes to
                everyone in branches or job titles, never to chosen people. Anonymous surveys still go to at least 5.
              </p>
            </fieldset>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || reasonMissing || percentInvalid} onClick={() => void submit()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SendAnywayDialog({ surveyId, heldIds, names, onClose }: { surveyId: string; heldIds: string[]; names: string[]; onClose: () => void }) {
  const send = useSendHeldBack(surveyId)
  const [reason, setReason] = React.useState('')
  const submit = async () => {
    try {
      const res = await send.mutateAsync({ heldIds, reason: reason.trim() })
      toastSuccess(res.message ?? 'Sent')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not send')
    }
  }
  return (
    <Dialog open onOpenChange={open => (open ? null : onClose())}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{names.length === 1 ? `Send to ${names[0]} now?` : `Send to ${names.length} people now?`}</DialogTitle>
          <DialogDescription>
            They had another survey in the last 4 weeks. Sending this one now, before their free day, needs a reason. It is
            kept in the audit trail.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Why</span>
            <Input value={reason} maxLength={300} onChange={e => setReason(e.target.value)} placeholder="For example: they asked to take part now" />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={send.isPending || reason.trim().length < 5} onClick={() => void submit()}>
            Send now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DontSendDialog({ surveyId, heldIds, names, onClose }: { surveyId: string; heldIds: string[]; names: string[]; onClose: () => void }) {
  const skip = useSkipHeldBack(surveyId)
  const [reason, setReason] = React.useState('')
  const submit = async () => {
    try {
      const res = await skip.mutateAsync({ heldIds, reason: reason.trim() })
      toastSuccess(res.message ?? 'Saved')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }
  return (
    <Dialog open onOpenChange={open => (open ? null : onClose())}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{names.length === 1 ? `Don’t send this survey to ${names[0]}?` : `Don’t send this survey to ${names.length} people?`}</DialogTitle>
          <DialogDescription>
            They will not be sent it at all, even when 4 weeks have passed. Say why: the reason and the number of people
            are kept in the audit trail, never their names.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Why</span>
            <Input value={reason} maxLength={300} onChange={e => setReason(e.target.value)} placeholder="For example: covered at their next supervision" />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={skip.isPending || reason.trim().length < 5} onClick={() => void submit()}>
            Don’t send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
