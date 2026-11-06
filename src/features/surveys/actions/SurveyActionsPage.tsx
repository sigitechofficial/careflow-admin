import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, ClipboardCheck, ExternalLink, Loader2, Printer } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  ACTION_STATUS_LABELS,
  CHANNEL_LABELS,
  formatDay,
  useActingOnResults,
  useCreateAction,
  useCreateDiscussion,
  useDeleteDiscussion,
  usePublishUpdate,
  useSaveUpdate,
  useUpdateAction,
  type ActingOnResults,
  type ActionSource,
  type SurveyActionItem,
  type YouSaidWeDid,
  type YswdChannel,
  type YswdItem,
} from './survey-actions'

const card = 'rounded-xl border border-border bg-card p-4'
const area = 'min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
const field = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
const today = () => new Date().toISOString().slice(0, 10)
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mt-2 block text-xs font-medium text-foreground">
      {children}
    </label>
  )
}

const run = async (fn: () => Promise<unknown>, ok: string, fail: string, after?: () => void) => {
  try {
    await fn()
    toastSuccess(ok)
    after?.()
  } catch (e) {
    toastApiError(e, fail)
  }
}

/** Raise an action from a result (a question's figure, a theme, a discussion, or general). */
function NewActionDialog({ data, onClose, preset }: { data: ActingOnResults; onClose: () => void; preset?: { source: ActionSource; sourceKey?: string; discussionId?: string } }) {
  const create = useCreateAction(data.surveyId)
  const [source, setSource] = React.useState<ActionSource>(preset?.source ?? 'QUESTION')
  const [sourceKey, setSourceKey] = React.useState(preset?.sourceKey ?? data.questions[0]?.key ?? '')
  const [discussionId, setDiscussionId] = React.useState(preset?.discussionId ?? data.discussions[0]?.id ?? '')
  const [title, setTitle] = React.useState('')
  const [detail, setDetail] = React.useState('')
  const [ownerRoleId, setOwnerRoleId] = React.useState(data.roles[0]?.id ?? '')
  const [dueOn, setDueOn] = React.useState(inDays(28))
  const submit = () =>
    run(
      () =>
        create.mutateAsync({
          source,
          sourceKey: source === 'QUESTION' || source === 'THEME' ? sourceKey : null,
          discussionId: source === 'DISCUSSION' ? discussionId : null,
          title,
          detail: detail || null,
          ownerRoleId,
          dueOn,
        }),
      'Action added',
      'Could not add the action',
      onClose,
    )
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise an action</DialogTitle>
          <DialogDescription>
            The action goes to the role as a task. It shows the figure that raised it as Results shows it, never anyone’s
            answers.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Label htmlFor="act-source">What raised it</Label>
          <select id="act-source" className={field} value={source} onChange={e => setSource(e.target.value as ActionSource)}>
            <option value="QUESTION">A question’s result</option>
            {data.themes.length ? <option value="THEME">A theme in written answers</option> : null}
            {data.discussions.length ? <option value="DISCUSSION">A team discussion</option> : null}
            <option value="GENERAL">Something else</option>
          </select>
          {source === 'QUESTION' ? (
            <>
              <Label htmlFor="act-question">Question</Label>
              <select id="act-question" className={field} value={sourceKey} onChange={e => setSourceKey(e.target.value)}>
                {data.questions.map(q => (
                  <option key={q.key} value={q.key}>
                    {q.questionText} ({q.figure})
                  </option>
                ))}
              </select>
            </>
          ) : null}
          {source === 'THEME' ? (
            <>
              <Label htmlFor="act-theme">Theme</Label>
              <select id="act-theme" className={field} value={sourceKey} onChange={e => setSourceKey(e.target.value)}>
                {data.themes.map(t => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          {source === 'DISCUSSION' ? (
            <>
              <Label htmlFor="act-discussion">Discussion</Label>
              <select id="act-discussion" className={field} value={discussionId} onChange={e => setDiscussionId(e.target.value)}>
                {data.discussions.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.kindLabel}, {formatDay(d.heldOn)}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <Label htmlFor="act-title">Action</Label>
          <Input id="act-title" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="For example: Publish the rota two weeks ahead" />
          <Label htmlFor="act-detail">Details (optional)</Label>
          <textarea id="act-detail" className={area} value={detail} maxLength={2000} onChange={e => setDetail(e.target.value)} />
          <Label htmlFor="act-role">Owner (role)</Label>
          <select id="act-role" className={field} value={ownerRoleId} onChange={e => setOwnerRoleId(e.target.value)}>
            {data.roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <Label htmlFor="act-due">Due</Label>
          <Input id="act-due" type="date" value={dueOn} min={today()} onChange={e => setDueOn(e.target.value)} />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={title.trim().length < 3 || !ownerRoleId || create.isPending} onClick={() => void submit()}>
            Add action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Close an action: what was done, and optionally "You said, we did" for CQC evidence and updates. */
function CloseActionDialog({ surveyId, action, onClose }: { surveyId: string; action: SurveyActionItem; onClose: () => void }) {
  const update = useUpdateAction(surveyId)
  const [outcome, setOutcome] = React.useState(action.outcome ?? '')
  const [youSaid, setYouSaid] = React.useState(action.youSaid ?? '')
  const [weDid, setWeDid] = React.useState(action.weDid ?? '')
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as done: {action.title}</DialogTitle>
          <DialogDescription>Say what was done. “You said, we did” is added to this survey’s CQC evidence and can be shared.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Label htmlFor="close-outcome">What was done</Label>
          <textarea id="close-outcome" className={area} value={outcome} maxLength={2000} onChange={e => setOutcome(e.target.value)} />
          <Label htmlFor="close-yousaid">You said (optional, in your own words)</Label>
          <Input id="close-yousaid" value={youSaid} maxLength={600} onChange={e => setYouSaid(e.target.value)} placeholder="For example: The rota came too late to plan your week" />
          <Label htmlFor="close-wedid">We did (optional)</Label>
          <Input id="close-wedid" value={weDid} maxLength={600} onChange={e => setWeDid(e.target.value)} placeholder="For example: The rota now comes out two weeks ahead" />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={outcome.trim().length < 5 || update.isPending}
            onClick={() => void run(() => update.mutateAsync({ id: action.id, status: 'DONE', outcome, youSaid: youSaid || null, weDid: weDid || null }), 'Action done', 'Could not close the action', onClose)}
          >
            Mark as done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DiscussionDialog({ data, onClose }: { data: ActingOnResults; onClose: () => void }) {
  const create = useCreateDiscussion(data.surveyId)
  const [heldOn, setHeldOn] = React.useState(today())
  const [kind, setKind] = React.useState(data.discussionKinds[0]?.code ?? 'TEAM_MEETING')
  const [attendees, setAttendees] = React.useState('')
  const [summary, setSummary] = React.useState('')
  const [agreed, setAgreed] = React.useState('')
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a team discussion</DialogTitle>
          <DialogDescription>When the results were talked through, and what was agreed. Don’t name anyone who answered.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Label htmlFor="disc-day">Day</Label>
          <Input id="disc-day" type="date" value={heldOn} max={today()} onChange={e => setHeldOn(e.target.value)} />
          <Label htmlFor="disc-kind">Meeting</Label>
          <select id="disc-kind" className={field} value={kind} onChange={e => setKind(e.target.value)}>
            {data.discussionKinds.map(k => (
              <option key={k.code} value={k.code}>
                {k.label}
              </option>
            ))}
          </select>
          <Label htmlFor="disc-att">How many attended (optional)</Label>
          <Input id="disc-att" type="number" min={1} value={attendees} onChange={e => setAttendees(e.target.value)} />
          <Label htmlFor="disc-summary">What was discussed</Label>
          <textarea id="disc-summary" className={area} value={summary} maxLength={4000} onChange={e => setSummary(e.target.value)} />
          <Label htmlFor="disc-agreed">What was agreed (optional)</Label>
          <textarea id="disc-agreed" className={area} value={agreed} maxLength={4000} onChange={e => setAgreed(e.target.value)} />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={summary.trim().length < 5 || create.isPending}
            onClick={() =>
              void run(
                () => create.mutateAsync({ heldOn, kind, attendees: attendees ? Number(attendees) : null, summary, agreed: agreed || null }),
                'Discussion recorded',
                'Could not record the discussion',
                onClose,
              )
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UpdateDialog({ data, existing, onClose }: { data: ActingOnResults; existing: YouSaidWeDid | null; onClose: () => void }) {
  const save = useSaveUpdate(data.surveyId)
  const fromActions = data.actions.filter(a => a.status === 'DONE' && a.youSaid && a.weDid).map(a => ({ youSaid: a.youSaid!, weDid: a.weDid!, actionId: a.id }))
  const [title, setTitle] = React.useState(existing?.title ?? `You said, we did: ${data.title}`.slice(0, 160))
  const [intro, setIntro] = React.useState(existing?.intro ?? 'Thank you to everyone who took part. Here is what you told us and what we have done.')
  const [items, setItems] = React.useState<YswdItem[]>(existing?.items ?? (fromActions.length ? fromActions : [{ youSaid: '', weDid: '' }]))
  const [channels, setChannels] = React.useState<YswdChannel[]>(existing?.channels ?? ['LETTER'])
  const toggle = (c: YswdChannel) => setChannels(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>You said, we did</DialogTitle>
          <DialogDescription>
            Say it in your own words: CareFlow refuses anything that repeats a written answer, as a quote can point to who
            wrote it.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Label htmlFor="ysw-title">Title</Label>
          <Input id="ysw-title" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} />
          <Label htmlFor="ysw-intro">Introduction</Label>
          <textarea id="ysw-intro" className={area} value={intro} maxLength={1500} onChange={e => setIntro(e.target.value)} />
          {items.map((it, i) => (
            <fieldset key={i} className="mt-3 rounded-lg border border-border p-2">
              <legend className="px-1 text-xs font-medium">Number {i + 1}</legend>
              <Label htmlFor={`ysw-said-${i}`}>You said</Label>
              <Input id={`ysw-said-${i}`} value={it.youSaid} maxLength={600} onChange={e => setItems(p => p.map((x, j) => (j === i ? { ...x, youSaid: e.target.value } : x)))} />
              <Label htmlFor={`ysw-did-${i}`}>We did</Label>
              <Input id={`ysw-did-${i}`} value={it.weDid} maxLength={600} onChange={e => setItems(p => p.map((x, j) => (j === i ? { ...x, weDid: e.target.value } : x)))} />
              {items.length > 1 ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setItems(p => p.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              ) : null}
            </fieldset>
          ))}
          <Button type="button" size="sm" variant="outline" className="mt-2" disabled={items.length >= 12} onClick={() => setItems(p => [...p, { youSaid: '', weDid: '' }])}>
            Add another
          </Button>
          <fieldset className="mt-3">
            <legend className="text-xs font-medium">Share it on</legend>
            {(Object.keys(CHANNEL_LABELS) as YswdChannel[]).map(c => (
              <label key={c} className="mt-1 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={channels.includes(c)} onChange={() => toggle(c)} /> {CHANNEL_LABELS[c]}
              </label>
            ))}
          </fieldset>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={save.isPending || items.some(i => i.youSaid.trim().length < 3 || i.weDid.trim().length < 3)}
            onClick={() => void run(() => save.mutateAsync({ id: existing?.id, title, intro, items, channels }), 'Saved as a draft', 'Could not save', onClose)}
          >
            Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActionRow({ a, data, onClose }: { a: SurveyActionItem; data: ActingOnResults; onClose: (a: SurveyActionItem) => void }) {
  const update = useUpdateAction(data.surveyId)
  const open = a.status === 'OPEN' || a.status === 'IN_PROGRESS'
  return (
    <li className="rounded-lg border border-border bg-background px-3 py-2.5" data-testid="survey-action">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{a.title}</p>
          {a.sourceLabel ? <p className="text-xs text-muted-foreground">{a.sourceLabel}</p> : null}
          <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <Badge variant={a.status === 'DONE' ? 'default' : 'outline'}>{ACTION_STATUS_LABELS[a.status]}</Badge>
            <span>{a.ownerRole ?? 'Role'}{a.ownerName ? ` (${a.ownerName})` : ''}</span>
            <span className={cn(a.overdue && 'font-medium text-rose-700 dark:text-rose-300')}>
              Due {formatDay(a.dueOn)}
              {a.overdue ? ' · overdue' : ''}
            </span>
          </p>
          {a.outcome ? <p className="mt-1 text-xs">Done: {a.outcome}</p> : null}
          {a.youSaid && a.weDid ? (
            <p className="mt-1 text-xs text-muted-foreground">
              You said: {a.youSaid} · We did: {a.weDid}
            </p>
          ) : null}
        </div>
        {open ? (
          <div className="flex shrink-0 gap-1">
            {a.status === 'OPEN' ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void run(() => update.mutateAsync({ id: a.id, status: 'IN_PROGRESS' }), 'Marked as started', 'Could not change the action')}>
                Start
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={() => onClose(a)}>
              Mark as done
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  )
}

/** /surveys/:surveyId/actions — acting on a survey's results. */
export default function SurveyActionsPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const { data, isLoading, isError } = useActingOnResults(surveyId)
  const publish = usePublishUpdate(surveyId)
  const removeDiscussion = useDeleteDiscussion(surveyId)
  const [newAction, setNewAction] = React.useState<false | { source: ActionSource; discussionId?: string }>(false)
  const [closing, setClosing] = React.useState<SurveyActionItem | null>(null)
  const [discussing, setDiscussing] = React.useState(false)
  const [editingUpdate, setEditingUpdate] = React.useState<YouSaidWeDid | 'new' | null>(null)
  useDocumentTitle(data ? `Acting on results: ${data.title} – CareAdmin` : null)

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading…
      </div>
    )
  }
  if (isError || !data) {
    return <p className="p-6 text-center text-sm text-muted-foreground">These results are limited to particular people, or the survey was not found.</p>
  }
  const manage = data.canManage
  return (
    <div className="w-full flex-1 space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-2">
          <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/surveys/$surveyId/responses" params={{ surveyId }}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to results</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden /> Acting on results
            </div>
            <h1 className="mt-0.5 text-xl font-semibold">{data.title}</h1>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
          <Link to="/surveys/$surveyId/pack" params={{ surveyId }}>
            <Printer className="h-4 w-4" aria-hidden /> CQC and commissioner pack
          </Link>
        </Button>
      </div>

      <section className={card} aria-labelledby="actions-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="actions-heading" className="text-base font-semibold">Action plan</h2>
          {manage ? (
            <Button type="button" size="sm" onClick={() => setNewAction({ source: 'QUESTION' })}>
              Raise an action
            </Button>
          ) : null}
        </div>
        {data.actions.length ? (
          <ul className="mt-3 space-y-2">
            {data.actions.map(a => (
              <ActionRow key={a.id} a={a} data={data} onClose={setClosing} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No actions yet. Raise one from a result that needs work.</p>
        )}
      </section>

      <section className={card} aria-labelledby="disc-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="disc-heading" className="text-base font-semibold">Team discussions</h2>
          {manage ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setDiscussing(true)}>
              Record a discussion
            </Button>
          ) : null}
        </div>
        {data.discussions.length ? (
          <ul className="mt-3 space-y-2">
            {data.discussions.map(d => (
              <li key={d.id} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <p className="font-medium">
                  {d.kindLabel}, {formatDay(d.heldOn)}
                  {d.attendees ? ` · ${d.attendees} attended` : ''}
                </p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">{d.summary}</p>
                {d.agreed ? <p className="mt-1 whitespace-pre-line">Agreed: {d.agreed}</p> : null}
                {manage ? (
                  <div className="mt-1 flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setNewAction({ source: 'DISCUSSION', discussionId: d.id })}>
                      Raise an action from it
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void run(() => removeDiscussion.mutateAsync(d.id), 'Removed', 'Could not remove')}>
                      Remove
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Record when the results were talked through with staff, and what was agreed.</p>
        )}
      </section>

      <section className={card} aria-labelledby="ysw-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ysw-heading" className="text-base font-semibold">You said, we did</h2>
          {manage ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditingUpdate('new')}>
              Write one
            </Button>
          ) : null}
        </div>
        {data.youSaidWeDid.length ? (
          <ul className="mt-3 space-y-2">
            {data.youSaidWeDid.map(u => (
              <li key={u.id} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm" data-testid="you-said-we-did">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {u.title} <Badge variant="outline">{u.status === 'PUBLISHED' ? `Published ${formatDay(u.publishedOn)}` : u.status === 'WITHDRAWN' ? 'Withdrawn' : 'Draft'}</Badge>
                  </p>
                  {manage ? (
                    <div className="flex flex-wrap gap-1">
                      {u.status !== 'PUBLISHED' ? (
                        <>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingUpdate(u)}>
                            Change
                          </Button>
                          <Button type="button" size="sm" onClick={() => void run(() => publish.mutateAsync({ id: u.id, publish: true }), 'Published', 'Could not publish')}>
                            Publish
                          </Button>
                        </>
                      ) : (
                        <Button type="button" size="sm" variant="outline" onClick={() => void run(() => publish.mutateAsync({ id: u.id, publish: false }), 'Withdrawn', 'Could not withdraw')}>
                          Withdraw
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{u.channels.map(c => CHANNEL_LABELS[c]).join(' · ') || 'Not shared anywhere yet'}</p>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {u.items.map((i, n) => (
                    <li key={n}>
                      You said: {i.youSaid} — We did: {i.weDid}
                    </li>
                  ))}
                </ul>
                {u.status === 'PUBLISHED' ? (
                  <p className="mt-1 flex flex-wrap gap-3 text-xs">
                    {u.channels.includes('LETTER') ? (
                      <Link to="/surveys/$surveyId/you-said-we-did/$updateId/letter" params={{ surveyId, updateId: u.id }} className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                        <Printer className="h-3 w-3" aria-hidden /> Print the letter
                      </Link>
                    ) : null}
                    {u.publicToken ? (
                      <a href={`/you-said-we-did/${u.publicToken}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                        <ExternalLink className="h-3 w-3" aria-hidden /> Public page
                      </a>
                    ) : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Tell people what changed because of what they said: on the portal, in the carer app, by letter or on a public page.</p>
        )}
      </section>

      {newAction ? <NewActionDialog data={data} preset={newAction} onClose={() => setNewAction(false)} /> : null}
      {closing ? <CloseActionDialog surveyId={surveyId} action={closing} onClose={() => setClosing(null)} /> : null}
      {discussing ? <DiscussionDialog data={data} onClose={() => setDiscussing(false)} /> : null}
      {editingUpdate ? <UpdateDialog data={data} existing={editingUpdate === 'new' ? null : editingUpdate} onClose={() => setEditingUpdate(null)} /> : null}
    </div>
  )
}
