import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Info, Zap } from 'lucide-react'
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
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  OCCURRENCE_STATUS_LABEL,
  describeTrigger,
  formatDay,
  useDecideEventSends,
  useSaveSurveyEventTrigger,
  useSurveyEventTrigger,
  type EventOccurrence,
  type EventTriggerPayload,
  type SaveTriggerInput,
  type TriggerOptions,
} from './survey-event-triggers'

const fieldClass =
  'mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

type Props = {
  surveyId: string
  /** surveys.manage */
  canEdit: boolean
}

type Tab = 'DECIDE' | 'COMING' | 'DONE'
const TAB_STATUSES: Record<Tab, string[]> = {
  DECIDE: ['DUE'],
  COMING: ['WAITING', 'BATCH'],
  DONE: ['SENT', 'HELD', 'SKIPPED', 'CANCELLED', 'EXPIRED', 'OFFERED'],
}

/**
 * Sent when something happens (Phase 2 part 3): the care-record event this survey follows, the library's
 * suggestion, and (people who manage surveys) who it is coming up for, waiting on a decision, or done.
 * Each send goes into the survey's copy for that month, through the 4-week rule.
 */
export function SurveyEventTriggerPanel({ surveyId, canEdit }: Props) {
  const { data } = useSurveyEventTrigger(surveyId)
  const [editing, setEditing] = React.useState(false)
  const [tab, setTab] = React.useState<Tab>('DECIDE')
  const headingId = React.useId()
  React.useEffect(() => {
    if (data && !data.counts.DUE && tab === 'DECIDE') setTab(data.counts.WAITING || data.counts.BATCH ? 'COMING' : 'DONE')
    // Only when the counts first arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(data)])
  if (!data) return null
  const TABS: Tab[] = ['DECIDE', 'COMING', 'DONE']
  // Arrow keys move between the tabs (the tab pattern).
  const moveTab = (e: React.KeyboardEvent, key: Tab) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = TABS[(TABS.indexOf(key) + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length] ?? key
    setTab(next)
    document.getElementById(`${headingId}-tab-${next}`)?.focus()
  }
  const t = data.trigger
  const family = data.audience === 'FAMILY'
  const event = t ? data.events.find(e => e.code === t.event) : null
  const libEvent = data.library ? data.events.find(e => e.code === data.library!.event) : null

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby={headingId} data-testid="survey-event-trigger">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:flex" aria-hidden>
            <Zap className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 id={headingId} className="text-sm font-semibold text-foreground">
              Sent when something happens
            </h3>
            {t ? (
              <>
                <p className="mt-0.5 text-sm text-foreground" data-testid="survey-event-trigger-summary">
                  <span className="font-medium">{t.label ?? event?.label}.</span> {describeTrigger({ ...t, label: t.label ?? event?.label }, data.audience)}
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {(event?.builtIn ?? []).map(b => (
                    <li key={b}>{b}</li>
                  ))}
                  {t.exclusions.map(x => (
                    <li key={x}>Also not sent when: {data.exclusions.find(e => e.code === x)?.label.toLowerCase() ?? x}</li>
                  ))}
                  <li>Counts events from {formatDay(t.since)}. Each send goes into this survey’s copy for that month.</li>
                </ul>
              </>
            ) : (
              <p className="mt-0.5 text-sm text-foreground" data-testid="survey-event-trigger-summary">
                Not sent after events in the care records.
                {data.library && libEvent
                  ? ` The ready-made survey suggests: ${libEvent.label.toLowerCase()}, ${describeTrigger({ ...data.library, label: libEvent.label }, data.audience).replace(/^./, c => c.toLowerCase())}`
                  : ''}
              </p>
            )}
            {data.libraryWords ? <p className="mt-1 text-xs text-muted-foreground">Ready-made timing: {data.libraryWords}</p> : null}
            {!t && data.notAllowed ? <p className="mt-1 text-xs text-muted-foreground">{data.notAllowed}</p> : null}
          </div>
        </div>
        {canEdit && (t || !data.notAllowed) ? (
          <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setEditing(true)}>
            {t ? 'Change' : 'Switch on'}
          </Button>
        ) : null}
      </div>

      {data.canSeeList && (t || data.occurrences.length) ? (
        <div className="mt-4">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="tablist" aria-label="People">
            {TABS.map(key => {
              const n = TAB_STATUSES[key].reduce((sum, s) => sum + (data.counts[s] ?? 0), 0)
              return (
                <Button key={key} id={`${headingId}-tab-${key}`} type="button" role="tab" aria-selected={tab === key} aria-controls={`${headingId}-panel`} tabIndex={tab === key ? 0 : -1} onKeyDown={e => moveTab(e, key)} size="sm" variant={tab === key ? 'default' : 'ghost'} className="h-8" onClick={() => setTab(key)}>
                  {key === 'DECIDE' ? (family ? 'To offer' : 'To decide') : key === 'COMING' ? 'Coming up' : 'Done'} ({n})
                </Button>
              )
            })}
          </div>
          <div role="tabpanel" id={`${headingId}-panel`} aria-labelledby={`${headingId}-tab-${tab}`}>
            <OccurrenceList
              surveyId={surveyId}
              rows={data.occurrences.filter(o => TAB_STATUSES[tab].includes(o.status))}
              deciding={tab === 'DECIDE' && canEdit}
              family={family}
            />
          </div>
        </div>
      ) : null}

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          CareFlow reads the records it already keeps (visits, reviews, hospital stays, complaints, medicines, leaving and
          absence records). A death recorded on someone’s record stops every survey still waiting for them. Anonymous
          surveys go only when 5 or more people are due at once. The list of names is shown only to people who manage surveys and may see this survey’s results.
        </span>
      </p>

      {editing ? <TriggerDialog surveyId={surveyId} data={data} onClose={() => setEditing(false)} /> : null}
    </section>
  )
}

function OccurrenceList({ surveyId, rows, deciding, family }: { surveyId: string; rows: EventOccurrence[]; deciding: boolean; family: boolean }) {
  const [chosen, setChosen] = React.useState<string[]>([])
  const [action, setAction] = React.useState<'SEND' | 'DONT_SEND' | 'OFFERED' | null>(null)
  React.useEffect(() => setChosen(c => c.filter(id => rows.some(r => r.id === id))), [rows])
  if (!rows.length) return <p className="mt-2 text-sm text-muted-foreground">Nobody here.</p>
  const all = chosen.length === rows.length
  return (
    <div className="mt-2">
      {deciding ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-input" checked={all} onChange={() => setChosen(all ? [] : rows.map(r => r.id))} />
            Choose all
          </label>
          {family ? (
            <Button type="button" size="sm" disabled={!chosen.length} onClick={() => setAction('OFFERED')}>
              Mark offered
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={!chosen.length} onClick={() => setAction('SEND')}>
              Send now
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" disabled={!chosen.length} onClick={() => setAction('DONT_SEND')}>
            {family ? 'Don’t contact' : 'Don’t send'}
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-border rounded-lg border border-border" data-testid="survey-event-occurrences">
        {rows.map(r => (
          <li key={r.id} className="flex items-start gap-2 px-3 py-2 text-sm">
            {deciding ? (
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-input"
                aria-label={`Choose ${r.name}`}
                checked={chosen.includes(r.id)}
                onChange={e => setChosen(c => (e.target.checked ? [...c, r.id] : c.filter(x => x !== r.id)))}
              />
            ) : null}
            <div className="min-w-0">
              <span className="font-medium text-foreground">{r.name}</span>
              <span className="block text-xs text-muted-foreground">
                {r.eventLabel} on {formatDay(r.eventOn)} · due {formatDay(r.dueOn)}
                {r.status === 'WAITING' || r.status === 'DUE' || r.status === 'BATCH' ? `, until ${formatDay(r.lastDay)}` : ''}
                {' · '}
                {OCCURRENCE_STATUS_LABEL[r.status]}
                {r.resolvedOn && !['WAITING', 'DUE', 'BATCH'].includes(r.status) ? ` on ${formatDay(r.resolvedOn)}` : ''}
                {r.reason ? `: ${r.reason}` : ''}
              </span>
              {r.sentIn && r.status === 'SENT' ? (
                <Link to="/surveys/$surveyId" params={{ surveyId: r.sentIn.id }} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
                  {r.sentIn.title ?? 'Month copy'}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {action ? (
        <DecideDialog
          surveyId={surveyId}
          ids={chosen}
          names={rows.filter(r => chosen.includes(r.id)).map(r => r.name)}
          action={action}
          onClose={done => {
            setAction(null)
            if (done) setChosen([])
          }}
        />
      ) : null}
    </div>
  )
}

function DecideDialog({
  surveyId,
  ids,
  names,
  action,
  onClose,
}: {
  surveyId: string
  ids: string[]
  names: string[]
  action: 'SEND' | 'DONT_SEND' | 'OFFERED'
  onClose: (done: boolean) => void
}) {
  const decide = useDecideEventSends(surveyId)
  const [reason, setReason] = React.useState('')
  const who = names.length === 1 ? names[0] : `${names.length} people`
  const needsReason = action === 'DONT_SEND'
  const submit = async () => {
    try {
      const res = await decide.mutateAsync({ ids, action, ...(reason.trim() ? { reason: reason.trim() } : {}) })
      toastSuccess(res.message ?? 'Saved')
      onClose(true)
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }
  const title = action === 'SEND' ? `Send it to ${who} now?` : action === 'OFFERED' ? `Mark as offered to ${who}?` : `Don’t send it to ${who}?`
  return (
    <Dialog open onOpenChange={open => (open ? null : onClose(false))}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {action === 'SEND'
              ? 'It goes through the usual checks (the 4-week rule, contact preferences) into this month’s copy.'
              : action === 'OFFERED'
                ? 'You have offered the survey to the family (by phone, letter or the survey link). Add how, if you like.'
                : 'They will not be sent it for this event. Say why: the reason and the number of people are kept in the audit trail, never names.'}
          </DialogDescription>
        </DialogHeader>
        {action !== 'SEND' ? (
          <DialogBody>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{needsReason ? 'Why' : 'How (optional)'}</span>
              <Input
                value={reason}
                maxLength={300}
                onChange={e => setReason(e.target.value)}
                placeholder={needsReason ? 'For example: an Ombudsman review is open' : 'For example: phoned and posted a paper copy'}
              />
            </label>
          </DialogBody>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button disabled={decide.isPending || (needsReason && reason.trim().length < 5)} onClick={() => void submit()}>
            {action === 'SEND' ? 'Send now' : action === 'OFFERED' ? 'Mark offered' : 'Don’t send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TriggerDialog({ surveyId, data, onClose }: { surveyId: string; data: EventTriggerPayload; onClose: () => void }) {
  const save = useSaveSurveyEventTrigger(surveyId)
  const start = data.trigger ?? (data.library ? { ...data.library, since: '', ownerKey: '' } : null)
  const [event, setEvent] = React.useState(start?.event ?? data.events[0]?.code ?? '')
  const [delay, setDelay] = React.useState(String(start?.delayDays ?? 7))
  const [windowDays, setWindowDays] = React.useState(String(start?.windowDays ?? 7))
  const [exclusions, setExclusions] = React.useState<string[]>(start?.exclusions ?? [])
  const [options, setOptions] = React.useState<TriggerOptions>(start?.options ?? {})
  const [checkFirst, setCheckFirst] = React.useState(start?.checkFirst ?? false)
  const [lookBack, setLookBack] = React.useState('0')
  const family = data.audience === 'FAMILY'
  const info = data.events.find(e => e.code === event)
  const num = (v: string) => (v.trim() === '' ? NaN : Number(v))
  const delayN = num(delay)
  const windowN = num(windowDays)
  const lookN = num(lookBack)
  const minDelay = info?.minDelayDays ?? (info?.beforeAllowed ? -60 : 0)
  const delayBad = !Number.isInteger(delayN) || delayN > 120 || delayN < minDelay
  const windowBad = !Number.isInteger(windowN) || windowN < 1 || windowN > 60
  const lookBad = !data.trigger && (!Number.isInteger(lookN) || lookN < 0 || lookN > 90)
  const complaintBad = event === 'COMPLAINT_CLOSED' && !options.complaintFrom

  const submit = async (off = false) => {
    try {
      const input: SaveTriggerInput | null = off
        ? null
        : {
            event,
            delayDays: delayN,
            windowDays: windowN,
            exclusions,
            options,
            checkFirst: family || checkFirst,
            ...(data.trigger ? {} : { lookBackDays: lookN }),
          }
      await save.mutateAsync(input)
      toastSuccess(off ? 'Switched off' : 'Saved')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }

  return (
    <Dialog open onOpenChange={open => (open ? null : onClose())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Sent when something happens</DialogTitle>
          <DialogDescription>
            CareFlow sends this survey after an event in the care records, through the 4-week rule. Changes are kept in the
            audit trail and never re-send events already dealt with.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium">The event</span>
            <select className={fieldClass} value={event} onChange={e => { setEvent(e.target.value); setOptions({}) }} aria-label="The event">
              {data.events.map(e => (
                <option key={e.code} value={e.code}>
                  {e.label}
                </option>
              ))}
            </select>
            {info ? <span className="mt-1 block text-xs text-muted-foreground">{info.description}</span> : null}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Days after the event</span>
              <Input type="number" value={delay} onChange={e => setDelay(e.target.value)} aria-label="Days after the event" aria-invalid={delayBad} />
              <span className="mt-1 block text-xs text-muted-foreground">
                {info?.beforeAllowed ? 'A negative number sends it before (for example -10 for 10 days before the review).' : `From ${minDelay} to 120.`}
              </span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">May still go up to (days late)</span>
              <Input type="number" value={windowDays} onChange={e => setWindowDays(e.target.value)} aria-label="May still go up to (days late)" aria-invalid={windowBad} />
              <span className="mt-1 block text-xs text-muted-foreground">After that, that event is let go.</span>
            </label>
          </div>
          {event === 'COMPLAINT_CLOSED' ? (
            <fieldset className="space-y-1 text-sm">
              <legend className="font-medium">Whose complaints</legend>
              {(family ? (['FAMILY'] as const) : (['SELF'] as const)).map(v => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name="complaintFrom" checked={options.complaintFrom === v} onChange={() => setOptions({ ...options, complaintFrom: v })} />
                  {v === 'SELF' ? 'Complaints the person made themselves' : 'Complaints made by a family member or representative'}
                </label>
              ))}
            </fieldset>
          ) : null}
          {event === 'CARE_REVIEW_DUE' ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-input" checked={Boolean(options.firstReviewOnly)} onChange={e => setOptions({ ...options, firstReviewOnly: e.target.checked })} />
              Only the first review after care starts (for example the 6-week review)
            </label>
          ) : null}
          {event === 'HOSPITAL_DISCHARGE' ? (
            <label className="block text-sm">
              <span className="font-medium">Nights in hospital at least</span>
              <Input type="number" value={String(options.minNights ?? 1)} onChange={e => setOptions({ ...options, minNights: Number(e.target.value) })} aria-label="Nights in hospital at least" />
            </label>
          ) : null}
          {event === 'MEDICINES_CHANGE' ? (
            <label className="block text-sm">
              <span className="font-medium">Ignore changes in the first days of care</span>
              <Input type="number" value={String(options.ignoreFirstDays ?? 42)} onChange={e => setOptions({ ...options, ignoreFirstDays: Number(e.target.value) })} aria-label="Ignore changes in the first days of care" />
            </label>
          ) : null}
          {event === 'NEW_STARTER_SIGN_OFF' ? (
            <label className="block text-sm">
              <span className="font-medium">Which sign-off</span>
              <select className={fieldClass} value={options.reviewType ?? 'PROBATION_REVIEW'} onChange={e => setOptions({ ...options, reviewType: e.target.value as TriggerOptions['reviewType'] })} aria-label="Which sign-off">
                <option value="PROBATION_REVIEW">End of probation</option>
                <option value="INDUCTION_CHECKIN">End of induction</option>
                <option value="CARE_CERTIFICATE_SIGNOFF">Care Certificate signed off</option>
              </select>
            </label>
          ) : null}
          {event === 'RETURN_FROM_LONG_ABSENCE' ? (
            <label className="block text-sm">
              <span className="font-medium">Absence of at least (days)</span>
              <Input type="number" value={String(options.minDays ?? 28)} onChange={e => setOptions({ ...options, minDays: Number(e.target.value) })} aria-label="Absence of at least (days)" />
            </label>
          ) : null}
          {event === 'TRAINING_ATTENDED' ? (
            <fieldset className="space-y-1 text-sm" data-testid="training-part">
              <legend className="font-medium">Which part</legend>
              {([
                ['A', 'Part A: straight after the course (part of the course, so the 4-week rule does not apply)'],
                ['B', 'Part B: the follow-up weeks later (held back by the 4-week rule, and skipped rather than delayed)'],
              ] as const).map(([v, label]) => (
                <label key={v} className="flex items-start gap-2">
                  <input type="radio" name="trainingPart" checked={(options.part ?? 'A') === v} onChange={() => setOptions({ ...options, part: v })} />
                  <span>{label}</span>
                </label>
              ))}
              <p className="text-xs text-muted-foreground">Each training session gets its own copy, named with the course, date and trainer, so results show per session and pool across sessions.</p>
            </fieldset>
          ) : null}
          {data.exclusions.length ? (
            <fieldset className="space-y-1 text-sm">
              <legend className="font-medium">Also do not send when there is</legend>
              {data.exclusions.map(x => (
                <label key={x.code} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={exclusions.includes(x.code)}
                    onChange={e => setExclusions(v => (e.target.checked ? [...v, x.code] : v.filter(c => c !== x.code)))}
                  />
                  {x.label}
                </label>
              ))}
            </fieldset>
          ) : null}
          {family ? (
            <p className="text-xs text-muted-foreground">Family surveys are always offered by staff: CareFlow lists the families to contact and adds a task.</p>
          ) : (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" checked={checkFirst} onChange={e => setCheckFirst(e.target.checked)} />
              <span>Staff check each one before it is sent (for things CareFlow cannot see, such as an Ombudsman review or a disciplinary process)</span>
            </label>
          )}
          {!data.trigger ? (
            <label className="block text-sm">
              <span className="font-medium">Also include events from the last (days)</span>
              <Input type="number" value={lookBack} onChange={e => setLookBack(e.target.value)} aria-label="Also include events from the last (days)" aria-invalid={lookBad} />
              <span className="mt-1 block text-xs text-muted-foreground">0 = only events from today. Up to 90.</span>
            </label>
          ) : null}
        </DialogBody>
        <DialogFooter>
          {data.trigger ? (
            <Button variant="outline" className="mr-auto text-destructive hover:text-destructive" disabled={save.isPending} onClick={() => void submit(true)}>
              Switch off
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || delayBad || windowBad || lookBad || complaintBad || !event} onClick={() => void submit()}>
            {data.trigger ? 'Save' : 'Switch on'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
