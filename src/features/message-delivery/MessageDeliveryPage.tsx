import * as React from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Hammer, Mail, MessageSquare, PauseCircle, PlayCircle, Search, Send, Smartphone, TriangleAlert } from 'lucide-react'
import { PageHeader, Section } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Banner } from '@/shared/ui/banner'
import { Switch } from '@/shared/ui/toggle-controls'
import { Skeleton } from '@/shared/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { extractApiErrorMessage, toastError, toastSuccess } from '@/shared/lib/toast'
import { formatOpsDateTimeNumeric } from '@/shared/lib/operational-day.util'
import { useAuthStore } from '@/features/auth/store'
import {
  fetchDeliveryLog,
  fetchMessageDelivery,
  saveMessageDelivery,
  sendTestMessage,
  type DeliveryRules,
  type MessageAudience,
  type MessageChannel,
  type MessageDeliverySettings,
  type MessageKind,
} from './message-delivery.api'
import {
  CHANNELS,
  CHANNEL_LABEL,
  OUTCOME_LABEL,
  changedFields,
  deliverySummary,
  describeChanges,
  filterKinds,
  parseList,
  rulesOf,
  saveProblems,
  type KindFilter,
} from './message-delivery.lib'

const KEY = ['message-delivery'] as const
const selectCls = 'h-9 rounded-md border border-input bg-background px-2 text-sm'
const areaCls = 'min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono disabled:opacity-60'
const CHANNEL_ICON: Record<MessageChannel, React.ReactNode> = {
  EMAIL: <Mail className="h-3.5 w-3.5" aria-hidden />,
  TEXT: <MessageSquare className="h-3.5 w-3.5" aria-hidden />,
  WHATSAPP: <MessageSquare className="h-3.5 w-3.5" aria-hidden />,
  PUSH: <Smartphone className="h-3.5 w-3.5" aria-hidden />,
}

type Counts = (channel: MessageChannel, kind: string | null, outcome: string) => number

/** What the server itself does with a channel (environment settings that this page can't change). */
function channelNote(s: MessageDeliverySettings, c: MessageChannel): { tone: 'info' | 'warning'; text: string } | null {
  const e = s.environment
  if (c === 'EMAIL') {
    if (e.email.redirectTo.length) return { tone: 'warning', text: `This server sends every email to ${e.email.redirectTo.join(', ')} instead (MAIL_REDIRECT_TO).` }
    if (e.email.mode === 'log') return { tone: 'warning', text: 'Email is in log mode on this server: written to the log, not sent.' }
    return null
  }
  if (c === 'TEXT') {
    if (e.text.mode === 'off') return { tone: 'warning', text: 'Texts are switched off on this server (TEXT_MESSAGE_MODE=off).' }
    if (e.text.mode !== 'live') return { tone: 'info', text: 'No text provider is connected yet: texts are written to the server log only.' }
    return null
  }
  if (c === 'WHATSAPP') return { tone: 'info', text: 'No WhatsApp sender is built yet. These settings apply as soon as one is.' }
  if (!e.push.ready) return { tone: 'warning', text: 'Push is not set up on this server (no Firebase key), so carers get no notifications.' }
  return null
}

/* ─── Who gets what ──────────────────────────────────────────── */

function KindRow({ k, on, canManage, counts, onToggle }: { k: MessageKind; on: boolean; canManage: boolean; counts: Counts; onToggle: (on: boolean) => void }) {
  const sent = counts(k.channel, k.key, 'SENT')
  const held = counts(k.channel, k.key, 'HELD') + counts(k.channel, k.key, 'REDIRECTED')
  const failed = counts(k.channel, k.key, 'FAILED')
  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${on ? '' : 'bg-muted/40'}`} data-testid={`kind-${k.id}`}>
      <Switch className="mt-1" checked={on} disabled={!canManage} onCheckedChange={onToggle} aria-label={`${k.label} (${CHANNEL_LABEL[k.channel]})`} />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{k.label}</span>
          <Badge variant="outline" size="sm" className="gap-1">
            {CHANNEL_ICON[k.channel]} {CHANNEL_LABEL[k.channel]}
          </Badge>
          {k.status === 'TO_BUILD' ? (
            <Badge variant="outline" size="sm" className="gap-1 border-dashed text-muted-foreground" title="Needed but not built yet. Its switch applies as soon as it is.">
              <Hammer className="h-3 w-3" aria-hidden /> To be built
            </Badge>
          ) : (
            <Badge variant="success" size="sm">Live</Badge>
          )}
          {k.essential ? <Badge variant="info" size="sm" title="Always reaches the person it is for, even when sending is limited to the allowed list">Always to the person it’s for</Badge> : null}
          {!on ? <Badge variant="destructive" size="sm">Off</Badge> : null}
        </div>
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-foreground/80">Why: </span>
          {k.why}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Sent when: </span>
          {k.when}
        </p>
        {!on && k.ifOff ? (
          <p className="mt-1 flex items-start gap-1 text-xs font-medium text-destructive">
            <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> {k.ifOff}
          </p>
        ) : null}
      </div>
      {k.status === 'LIVE' ? (
        <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block" title="In the last 24 hours">
          <div>{sent} sent</div>
          {held ? <div className="text-amber-700 dark:text-amber-400">{held} held</div> : null}
          {failed ? <div className="text-destructive">{failed} failed</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function WhoGetsWhat({
  s,
  current,
  canManage,
  counts,
  setKinds,
}: {
  s: MessageDeliverySettings
  current: DeliveryRules
  canManage: boolean
  counts: Counts
  setKinds: (ids: string[], on: boolean) => void
}) {
  const [filter, setFilter] = React.useState<KindFilter>({ q: '', channel: '', status: 'all' })
  const shown = filterKinds(s.kinds, current.disabledKinds, filter)
  const isOn = (id: string) => !current.disabledKinds.includes(id)
  const liveCount = s.kinds.filter(k => k.status === 'LIVE').length
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Every message CareFlow sends, or will need to send, grouped by who gets it. {liveCount} are live; {s.kinds.length - liveCount} are marked{' '}
        <strong>To be built</strong>: their switches are ready and apply as soon as each is built. Switching one off holds it back for everyone; it shows in the
        delivery log as held.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input className="h-9 w-64 pl-8" placeholder="Search messages" value={filter.q} onChange={e => setFilter(f => ({ ...f, q: e.target.value }))} aria-label="Search messages" />
        </div>
        <select className={selectCls} value={filter.channel} onChange={e => setFilter(f => ({ ...f, channel: e.target.value as KindFilter['channel'] }))} aria-label="Channel filter">
          <option value="">All channels</option>
          {CHANNELS.map(c => (
            <option key={c.channel} value={c.channel}>
              {c.label}
            </option>
          ))}
        </select>
        <select className={selectCls} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value as KindFilter['status'] }))} aria-label="Status filter">
          <option value="all">Live and to be built</option>
          <option value="LIVE">Live only</option>
          <option value="TO_BUILD">To be built only</option>
          <option value="OFF">Switched off</option>
        </select>
        {shown.length !== s.kinds.length ? <span className="text-xs text-muted-foreground">{shown.length} of {s.kinds.length}</span> : null}
      </div>
      {s.audiences.map(a => {
        // Each message is listed under the first group it is for; the others show as "also to".
        const items = shown.filter(k => k.audience[0] === a.key)
        if (!items.length) return null
        const offCount = items.filter(k => !isOn(k.id)).length
        // "Switch all off" leaves sign-in, password and statutory messages on: switch those off one by one.
        const groupOff = items.filter(k => !k.essential).map(k => k.id)
        return (
          <div key={a.key} className="overflow-hidden rounded-lg border" data-testid={`audience-${a.key}`}>
            <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{a.label}</div>
                <div className="text-xs text-muted-foreground">{a.hint}</div>
              </div>
              <span className="text-xs text-muted-foreground">
                {items.length} message{items.length === 1 ? '' : 's'}
                {offCount ? ` · ${offCount} off` : ''}
              </span>
              {canManage ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => (offCount > 0 ? setKinds(items.map(k => k.id), true) : setKinds(groupOff, false))}
                  title={offCount > 0 ? undefined : 'Sign-in, password and statutory messages stay on'}
                >
                  {offCount > 0 ? 'Switch all on' : 'Switch all off'}
                </Button>
              ) : null}
            </div>
            <div className="divide-y">
              {items.map(k => (
                <div key={k.id}>
                  <KindRow k={k} on={isOn(k.id)} canManage={canManage} counts={counts} onToggle={on => setKinds([k.id], on)} />
                  {k.audience.length > 1 ? (
                    <div className="-mt-2 px-4 pb-2 pl-16 text-xs text-muted-foreground">
                      Also to: {k.audience.slice(1).map(x => s.audiences.find(y => y.key === x)?.label ?? x).join(', ')}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {!shown.length ? <p className="py-8 text-center text-sm text-muted-foreground">No messages match.</p> : null}
    </div>
  )
}

/* ─── Channels & testing ─────────────────────────────────────── */

function ChannelsAndTesting({
  s,
  current,
  canManage,
  counts,
  set,
  emailsText,
  setEmailsText,
  phonesText,
  setPhonesText,
}: {
  s: MessageDeliverySettings
  current: DeliveryRules
  canManage: boolean
  counts: Counts
  set: (p: Partial<DeliveryRules>) => void
  emailsText: string
  setEmailsText: (v: string) => void
  phonesText: string
  setPhonesText: (v: string) => void
}) {
  const allOff = CHANNELS.every(c => !current[c.enabledKey])
  const anyLimited = CHANNELS.some(c => c.audienceKey && current[c.audienceKey] === 'ALLOWED_ONLY')
  return (
    <div className="space-y-6">
      <Section
        title="Channels"
        description="Switch a whole channel off for maintenance, or send it only to the allowed list while testing."
        action={
          canManage ? (
            allOff ? (
              <Button size="sm" variant="outline" onClick={() => set({ emailEnabled: true, textEnabled: true, whatsappEnabled: true, pushEnabled: true })}>
                <PlayCircle className="mr-1 h-4 w-4" /> Resume all channels
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => set({ emailEnabled: false, textEnabled: false, whatsappEnabled: false, pushEnabled: false })}>
                <PauseCircle className="mr-1 h-4 w-4" /> Pause all channels
              </Button>
            )
          ) : undefined
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {CHANNELS.map(c => {
            const on = current[c.enabledKey] as boolean
            const audience = (c.audienceKey ? current[c.audienceKey] : current.textAudience) as MessageAudience
            const note = channelNote(s, c.channel)
            return (
              <div key={c.channel} className={`rounded-lg border p-4 ${on ? '' : 'border-destructive/40 bg-destructive/5'}`} data-testid={`channel-${c.channel}`}>
                <div className="flex items-center gap-3">
                  <Switch checked={on} disabled={!canManage} onCheckedChange={v => set({ [c.enabledKey]: v } as Partial<DeliveryRules>)} aria-label={`${c.label} on`} />
                  <span className="flex items-center gap-1.5 font-medium">
                    {CHANNEL_ICON[c.channel]} {c.label}
                  </span>
                  <Badge variant={on ? 'success' : 'destructive'} size="sm" className="ml-auto">
                    {on ? 'On' : 'Paused'}
                  </Badge>
                </div>
                <label className="mt-3 block text-xs text-muted-foreground">
                  Who receives
                  {c.audienceKey ? (
                    <select
                      className={`${selectCls} mt-1 w-full`}
                      value={audience}
                      disabled={!canManage || !on}
                      onChange={e => set({ [c.audienceKey!]: e.target.value } as Partial<DeliveryRules>)}
                      aria-label={`${c.label}: who receives`}
                    >
                      <option value="EVERYONE">Everyone (open to the public)</option>
                      <option value="ALLOWED_ONLY">Only the allowed list (testing)</option>
                    </select>
                  ) : (
                    <span className="mt-1 block text-sm text-foreground">
                      Same as text messages: {audience === 'ALLOWED_ONLY' ? 'only the allowed phone numbers' : 'everyone'}
                    </span>
                  )}
                </label>
                {note ? <p className={`mt-3 rounded-md px-2.5 py-1.5 text-xs ${note.tone === 'warning' ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'bg-sky-500/10 text-sky-800 dark:text-sky-300'}`}>{note.text}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Last 24 h: {counts(c.channel, null, 'SENT')} sent · {counts(c.channel, null, 'HELD') + counts(c.channel, null, 'REDIRECTED')} held ·{' '}
                  {counts(c.channel, null, 'SKIPPED')} not delivered · {counts(c.channel, null, 'FAILED')} failed
                </p>
              </div>
            )
          })}
        </div>
      </Section>

      <Section
        title="Allowed list"
        description={
          anyLimited
            ? 'In use: channels set to “Only the allowed list” send to these and nobody else.'
            : 'Not in use: every channel sends to everyone. Fill this in, then set a channel to “Only the allowed list”.'
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Emails and domains</span>
            <span className="block text-xs text-muted-foreground">One per line. @allforcare.co.uk allows everyone there. Push reaches carers whose email is listed.</span>
            <textarea className={`${areaCls} mt-1`} value={emailsText} disabled={!canManage} onChange={e => setEmailsText(e.target.value)} aria-label="Allowed emails" placeholder={'@allforcare.co.uk\ntester@gmail.com'} />
          </label>
          <label className="text-sm">
            <span className="font-medium">Phone numbers</span>
            <span className="block text-xs text-muted-foreground">One per line, any UK format (07…, +44…). For texts and WhatsApp.</span>
            <textarea className={`${areaCls} mt-1`} value={phonesText} disabled={!canManage} onChange={e => setPhonesText(e.target.value)} aria-label="Allowed phone numbers" placeholder="07700 900123" />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Sign-in, password, CQC and safeguarding emails always reach the person or body they are for, so nobody is locked out and nothing statutory is lost.
        </p>
        <label className="block text-sm">
          <span className="font-medium">Held-emails inbox (optional)</span>
          <span className="block text-xs text-muted-foreground">
            Emails the allowed list holds back go here instead, with who they were for in the subject, so you can see exactly what would have gone. Empty: they
            are dropped.
          </span>
          <Input className="mt-1 h-9 max-w-sm" value={current.heldEmailsTo ?? ''} disabled={!canManage} placeholder="e.g. testing@allforcare.co.uk" onChange={e => set({ heldEmailsTo: e.target.value.trim() || null })} aria-label="Held-emails inbox" />
        </label>
      </Section>
    </div>
  )
}

/* ─── Send a test ────────────────────────────────────────────── */

function TestMessage() {
  const [channel, setChannel] = React.useState<'EMAIL' | 'TEXT' | 'PUSH'>('EMAIL')
  const [to, setTo] = React.useState('')
  const [result, setResult] = React.useState<{ ok: boolean; text: string } | null>(null)
  const qc = useQueryClient()
  const send = useMutation({
    mutationFn: () => sendTestMessage({ channel, to }),
    onSuccess: msg => setResult({ ok: true, text: msg }),
    onError: e => setResult({ ok: false, text: extractApiErrorMessage(e) }),
    onSettled: () => void qc.invalidateQueries({ queryKey: KEY }),
  })
  const hint = { EMAIL: 'An email address.', TEXT: 'A UK mobile number.', PUSH: 'The email of a carer who is signed in to the carer app.' }[channel]
  return (
    <Section title="Send a test" description="Goes through the settings you have saved (type “Test messages”), so you see exactly what happens to a real message. Then check the delivery log.">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={e => {
          e.preventDefault()
          setResult(null)
          send.mutate()
        }}
      >
        <label className="text-xs text-muted-foreground">
          Channel
          <select className={`${selectCls} mt-1 block`} value={channel} onChange={e => setChannel(e.target.value as typeof channel)} aria-label="Test channel">
            <option value="EMAIL">Email</option>
            <option value="TEXT">Text message</option>
            <option value="PUSH">Push notification</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          To
          <Input className="mt-1 h-9 w-72" placeholder={channel === 'TEXT' ? '07700 900123' : 'name@example.com'} value={to} onChange={e => setTo(e.target.value)} />
        </label>
        <Button type="submit" size="sm" disabled={!to.trim() || send.isPending} data-testid="send-test-message">
          <Send className="mr-1 h-4 w-4" /> {send.isPending ? 'Sending…' : 'Send test'}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {result ? <Banner variant={result.ok ? 'success' : 'warning'} message={result.text} /> : null}
    </Section>
  )
}

/* ─── Delivery log ───────────────────────────────────────────── */

function DeliveryLog({ days, kinds }: { days: number; kinds: MessageKind[] }) {
  const [channel, setChannel] = React.useState('')
  const [outcome, setOutcome] = React.useState('')
  const [q, setQ] = React.useState('')
  const [limit, setLimit] = React.useState(100)
  const kindLabel = React.useMemo(() => new Map(kinds.map(k => [k.id, k.label])), [kinds])
  const log = useQuery({
    queryKey: [...KEY, 'log', channel, outcome, q, limit],
    queryFn: () => fetchDeliveryLog({ channel: channel || undefined, outcome: outcome || undefined, q, limit }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
  const rows = log.data ?? []
  return (
    <Section title="Delivery log" description={`Everything sent, held back or not delivered in the last ${days} days, newest first. Times are UK time; phone numbers are partly hidden.`}>
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={channel} onChange={e => setChannel(e.target.value)} aria-label="Channel">
          <option value="">All channels</option>
          {CHANNELS.map(c => (
            <option key={c.channel} value={c.channel}>
              {c.label}
            </option>
          ))}
        </select>
        <select className={selectCls} value={outcome} onChange={e => setOutcome(e.target.value)} aria-label="Outcome">
          <option value="">All outcomes</option>
          {Object.entries(OUTCOME_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Input className="h-9 w-64" placeholder="Search recipient, subject or type" value={q} onChange={e => setQ(e.target.value)} aria-label="Search the log" />
        {log.isFetching ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm" data-testid="delivery-log">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Message</th>
              <th className="px-3 py-2">To</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t align-top">
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatOpsDateTimeNumeric(r.at)}</td>
                <td className="px-3 py-2">
                  <div>{kindLabel.get(`${r.channel}:${r.kind}`) ?? r.kind}</div>
                  <div className="text-xs text-muted-foreground">{CHANNEL_LABEL[r.channel] ?? r.channel}</div>
                </td>
                <td className="max-w-[220px] break-all px-3 py-2">{r.recipient}</td>
                <td className="max-w-[320px] px-3 py-2">
                  <span className="line-clamp-2" title={r.subject ?? ''}>
                    {r.subject ?? '—'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={r.outcome === 'SENT' ? 'success' : r.outcome === 'FAILED' ? 'destructive' : r.outcome === 'HELD' ? 'warning' : r.outcome === 'SKIPPED' ? 'default' : 'info'}
                  >
                    {OUTCOME_LABEL[r.outcome] ?? r.outcome}
                  </Badge>
                  {r.reason ? <div className="mt-1 max-w-[260px] text-xs text-muted-foreground">{r.reason}</div> : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  {log.isLoading ? 'Loading…' : channel || outcome || q ? 'Nothing matches these filters.' : 'Nothing sent yet.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rows.length >= limit && limit < 500 ? (
        <Button variant="outline" size="sm" onClick={() => setLimit(l => Math.min(500, l + 100))}>
          Show more
        </Button>
      ) : null}
    </Section>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function MessageDeliveryPage() {
  const canManage = useAuthStore(st => st.can('message_delivery.manage'))
  const qc = useQueryClient()
  const query = useQuery({ queryKey: KEY, queryFn: fetchMessageDelivery, refetchInterval: 60_000 })
  const saved = React.useMemo(() => (query.data ? rulesOf(query.data) : null), [query.data])
  const [draft, setDraft] = React.useState<DeliveryRules | null>(null)
  const [emailsText, setEmailsText] = React.useState('')
  const [phonesText, setPhonesText] = React.useState('')
  const [confirming, setConfirming] = React.useState(false)
  const [tab, setTab] = React.useState('messages')

  // Start (or restart after a save or undo) from what is saved.
  React.useEffect(() => {
    if (saved && !draft) {
      setDraft(saved)
      setEmailsText(saved.allowedEmails.join('\n'))
      setPhonesText(saved.allowedPhones.join('\n'))
    }
  }, [saved, draft])

  const current: DeliveryRules | null = draft ? { ...draft, allowedEmails: parseList(emailsText, true), allowedPhones: parseList(phonesText) } : null
  const patch = saved && current ? changedFields(saved, current) : {}
  const dirty = Object.keys(patch).length > 0
  const problems = current ? saveProblems(current) : []
  const changes = saved && current && query.data ? describeChanges(saved, current, query.data.kinds) : []

  // Leaving with unsaved changes asks first.
  React.useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: () => saveMessageDelivery(patch),
    onSuccess: data => {
      qc.setQueryData(KEY, data)
      setDraft(null)
      setConfirming(false)
      toastSuccess('Message delivery settings saved', 'Every server uses them within 30 seconds.')
    },
    onError: e => toastError('Not saved', extractApiErrorMessage(e)),
  })

  if (query.isError) {
    return (
      <div className="p-6">
        <Banner variant="destructive" title="Message delivery settings could not be loaded" message={extractApiErrorMessage(query.error)} />
      </div>
    )
  }
  if (query.isLoading || !query.data || !current) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  const s = query.data
  const set = (p: Partial<DeliveryRules>) => setDraft(d => (d ? { ...d, ...p } : d))
  const setKinds = (ids: string[], on: boolean) =>
    set({ disabledKinds: on ? current.disabledKinds.filter(k => !ids.includes(k)) : [...new Set([...current.disabledKinds, ...ids])] })
  const summary = deliverySummary(current)
  const counts: Counts = (c, kind, o) =>
    s.last24h.filter(x => x.channel === c && (kind === null || x.kind === kind) && x.outcome === o).reduce((n, x) => n + x.count, 0)
  const onSave = () => (s.environment.production ? setConfirming(true) : save.mutate())

  return (
    <div className="space-y-5 p-6" data-testid="message-delivery-page">
      <PageHeader
        title="Message delivery"
        description="Who CareFlow may email, text, WhatsApp or notify, and which messages are on. Use it to test safely and to pause sending during maintenance."
        icon={<Mail className="h-4 w-4 text-muted-foreground" aria-hidden />}
      />
      <Banner
        variant={summary.tone === 'success' ? 'success' : summary.tone === 'warning' ? 'warning' : 'destructive'}
        title={s.environment.production ? 'Live system: messages reach real people' : undefined}
        message={dirty ? `${summary.text} (not saved yet)` : summary.text}
      />
      {!canManage ? <Banner variant="info" message="You can look but not change these settings." /> : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="underline" className="w-full justify-start">
          <TabsTrigger variant="underline" value="messages">
            Who gets what
          </TabsTrigger>
          <TabsTrigger variant="underline" value="channels">
            Channels & testing
          </TabsTrigger>
          {canManage ? (
            <TabsTrigger variant="underline" value="test">
              Send a test
            </TabsTrigger>
          ) : null}
          <TabsTrigger variant="underline" value="log">
            Delivery log
          </TabsTrigger>
        </TabsList>
        <TabsContent value="messages" className="pt-4">
          <WhoGetsWhat s={s} current={current} canManage={canManage} counts={counts} setKinds={setKinds} />
        </TabsContent>
        <TabsContent value="channels" className="pt-4">
          <ChannelsAndTesting
            s={s}
            current={current}
            canManage={canManage}
            counts={counts}
            set={set}
            emailsText={emailsText}
            setEmailsText={setEmailsText}
            phonesText={phonesText}
            setPhonesText={setPhonesText}
          />
        </TabsContent>
        {canManage ? (
          <TabsContent value="test" className="pt-4">
            <TestMessage />
          </TabsContent>
        ) : null}
        <TabsContent value="log" className="pt-4">
          <DeliveryLog days={s.logDays} kinds={s.kinds} />
        </TabsContent>
      </Tabs>

      {canManage && (dirty || problems.length) ? (
        <div className="sticky bottom-0 z-20 -mx-6 border-t bg-background/95 px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur" data-testid="message-delivery-savebar">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 text-sm">
              {problems.length ? (
                <span className="text-destructive">{problems.join(' ')}</span>
              ) : (
                <span>
                  <strong>Not saved yet: </strong>
                  <span className="text-muted-foreground">{changes.slice(0, 3).join('; ')}{changes.length > 3 ? '…' : ''}</span>
                </span>
              )}
            </div>
            <Button variant="ghost" disabled={save.isPending} onClick={() => setDraft(null)}>
              Undo changes
            </Button>
            <Button onClick={onSave} disabled={!dirty || problems.length > 0 || save.isPending} data-testid="save-message-delivery">
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      ) : s.updatedAt ? (
        <p className="text-xs text-muted-foreground">Last changed {formatOpsDateTimeNumeric(s.updatedAt)}</p>
      ) : null}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save these changes on the live system?</DialogTitle>
            <DialogDescription>They apply to real service users, families, funders and staff within 30 seconds.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {changes.map(c => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="confirm-save-message-delivery">
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
