import * as React from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, PauseCircle, PlayCircle, Send } from 'lucide-react'
import { PageHeader, Section } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Banner } from '@/shared/ui/banner'
import { Switch } from '@/shared/ui/toggle-controls'
import { Skeleton } from '@/shared/ui/misc'
import { extractApiErrorMessage, toastError, toastSuccess } from '@/shared/lib/toast'
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
} from './message-delivery.api'
import {
  CHANNELS,
  CHANNEL_LABEL,
  OUTCOME_LABEL,
  changedFields,
  deliverySummary,
  parseList,
  rulesOf,
  saveProblems,
} from './message-delivery.lib'

const KEY = ['message-delivery'] as const
const selectCls = 'h-9 rounded-md border border-input bg-background px-2 text-sm'
const areaCls = 'min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono'

function EnvironmentNotes({ s }: { s: MessageDeliverySettings }) {
  const e = s.environment
  return (
    <div className="space-y-2">
      {e.production ? (
        <Banner variant="warning" title="This is the live system" message="Messages here go to real people: service users, families, referrers, funders and staff." />
      ) : null}
      {e.email.redirectTo.length ? (
        <Banner
          variant="info"
          title="This server redirects every email"
          message={`Whatever is set below, every email this server sends goes to ${e.email.redirectTo.join(', ')} (MAIL_REDIRECT_TO in the server settings).`}
        />
      ) : null}
      {e.email.mode === 'log' ? (
        <Banner variant="info" message="Email is in log mode on this server: emails are written to the server log, not sent." />
      ) : null}
      {e.text.mode !== 'live' ? (
        <Banner
          variant="info"
          message={
            e.text.mode === 'off'
              ? 'Text messages are switched off on this server (TEXT_MESSAGE_MODE=off).'
              : 'No text message provider is set up yet: texts are written to the server log only.'
          }
        />
      ) : null}
      {!e.push.ready ? <Banner variant="info" message="Push notifications are not set up on this server (no Firebase key), so none are sent." /> : null}
      <Banner variant="info" message="WhatsApp: no WhatsApp sender is set up yet. Its switch is ready and will apply as soon as one is added." />
    </div>
  )
}

function DeliveryLog({ days }: { days: number }) {
  const [channel, setChannel] = React.useState('')
  const [outcome, setOutcome] = React.useState('')
  const [q, setQ] = React.useState('')
  const log = useQuery({
    queryKey: [...KEY, 'log', channel, outcome, q],
    queryFn: () => fetchDeliveryLog({ channel: channel || undefined, outcome: outcome || undefined, q, limit: 200 }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
  const rows = log.data ?? []
  return (
    <Section title="Delivery log" description={`Everything sent or held back in the last ${days} days (newest first). Phone numbers are partly hidden.`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
        <Input className="h-9 w-64" placeholder="Search recipient, subject or type" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm" data-testid="delivery-log">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Channel</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">To</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t align-top">
                <td className="whitespace-nowrap px-3 py-2">{new Date(r.at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td className="px-3 py-2">{CHANNEL_LABEL[r.channel] ?? r.channel}</td>
                <td className="px-3 py-2">{r.kind}</td>
                <td className="px-3 py-2 break-all">{r.recipient}</td>
                <td className="px-3 py-2">{r.subject ?? '—'}</td>
                <td className="px-3 py-2">
                  <Badge variant={r.outcome === 'SENT' ? 'success' : r.outcome === 'FAILED' ? 'destructive' : r.outcome === 'HELD' ? 'warning' : 'info'}>
                    {OUTCOME_LABEL[r.outcome] ?? r.outcome}
                  </Badge>
                  {r.reason ? <div className="mt-1 text-xs text-muted-foreground">{r.reason}</div> : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  {log.isLoading ? 'Loading…' : 'Nothing yet.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function TestMessage() {
  const [channel, setChannel] = React.useState<'EMAIL' | 'TEXT' | 'PUSH'>('EMAIL')
  const [to, setTo] = React.useState('')
  const qc = useQueryClient()
  const send = useMutation({
    mutationFn: () => sendTestMessage({ channel, to }),
    onSuccess: msg => toastSuccess('Test sent', msg),
    onError: e => toastError('Test not sent', extractApiErrorMessage(e)),
    onSettled: () => void qc.invalidateQueries({ queryKey: KEY }),
  })
  return (
    <Section title="Send a test" description="Goes through the same settings as everything else (type “Test messages”), then shows in the delivery log.">
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={channel} onChange={e => setChannel(e.target.value as typeof channel)} aria-label="Test channel">
          <option value="EMAIL">Email</option>
          <option value="TEXT">Text message</option>
          <option value="PUSH">Push (carer with this email)</option>
        </select>
        <Input
          className="h-9 w-72"
          placeholder={channel === 'TEXT' ? 'Mobile number' : 'Email address'}
          value={to}
          onChange={e => setTo(e.target.value)}
        />
        <Button size="sm" onClick={() => send.mutate()} disabled={!to.trim() || send.isPending} data-testid="send-test-message">
          <Send className="mr-1 h-4 w-4" /> {send.isPending ? 'Sending…' : 'Send test'}
        </Button>
      </div>
    </Section>
  )
}

export default function MessageDeliveryPage() {
  const canManage = useAuthStore(s => s.can('message_delivery.manage'))
  const qc = useQueryClient()
  const query = useQuery({ queryKey: KEY, queryFn: fetchMessageDelivery, refetchInterval: 60_000 })
  const saved = React.useMemo(() => (query.data ? rulesOf(query.data) : null), [query.data])
  const [draft, setDraft] = React.useState<DeliveryRules | null>(null)
  const [emailsText, setEmailsText] = React.useState('')
  const [phonesText, setPhonesText] = React.useState('')

  // Start (or restart after a save) from what is saved.
  React.useEffect(() => {
    if (saved && !draft) {
      setDraft(saved)
      setEmailsText(saved.allowedEmails.join('\n'))
      setPhonesText(saved.allowedPhones.join('\n'))
    }
  }, [saved, draft])

  const current: DeliveryRules | null = draft
    ? { ...draft, allowedEmails: parseList(emailsText, true), allowedPhones: parseList(phonesText) }
    : null
  const patch = saved && current ? changedFields(saved, current) : {}
  const dirty = Object.keys(patch).length > 0
  const problems = current ? saveProblems(current) : []

  const save = useMutation({
    mutationFn: () => saveMessageDelivery(patch),
    onSuccess: data => {
      qc.setQueryData(KEY, data)
      setDraft(null)
      toastSuccess('Message delivery settings saved', 'Every server uses them within 30 seconds.')
    },
    onError: e => toastError('Not saved', extractApiErrorMessage(e)),
  })

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
  const summary = deliverySummary(current)
  const count = (c: MessageChannel, o: string) => s.last24h.filter(x => x.channel === c && x.outcome === o).reduce((n, x) => n + x.count, 0)
  const kindOn = (id: string) => !current.disabledKinds.includes(id)
  const setKind = (id: string, on: boolean) =>
    set({ disabledKinds: on ? current.disabledKinds.filter(k => k !== id) : [...current.disabledKinds, id] })
  const allOff = CHANNELS.every(c => !current[c.enabledKey])

  return (
    <div className="space-y-6 p-6" data-testid="message-delivery-page">
      <PageHeader
        title="Message delivery"
        description="Who CareFlow may email, text, WhatsApp or notify, and which messages are switched on. Use it for testing and maintenance."
        icon={<Mail className="h-4 w-4 text-muted-foreground" aria-hidden />}
      />

      <Banner variant={summary.tone === 'success' ? 'success' : summary.tone === 'warning' ? 'warning' : 'destructive'} message={summary.text} />
      <EnvironmentNotes s={s} />

      <Section
        title="Channels"
        description="Switch a whole channel off (maintenance), or send only to the allowed list below (testing). WhatsApp uses the text message setting and phone list."
      >
        {canManage ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {allOff ? (
              <Button size="sm" variant="outline" onClick={() => set({ emailEnabled: true, textEnabled: true, whatsappEnabled: true, pushEnabled: true })}>
                <PlayCircle className="mr-1 h-4 w-4" /> Resume all channels
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => set({ emailEnabled: false, textEnabled: false, whatsappEnabled: false, pushEnabled: false })}>
                <PauseCircle className="mr-1 h-4 w-4" /> Pause all channels
              </Button>
            )}
          </div>
        ) : null}
        <div className="divide-y rounded-md border">
          {CHANNELS.map(c => {
            const on = current[c.enabledKey] as boolean
            const audience = (c.audienceKey ? current[c.audienceKey] : current.textAudience) as MessageAudience
            return (
              <div key={c.channel} className="flex flex-wrap items-center gap-4 px-4 py-3" data-testid={`channel-${c.channel}`}>
                <div className="flex min-w-[240px] items-center gap-3">
                  <Switch checked={on} disabled={!canManage} onCheckedChange={v => set({ [c.enabledKey]: v } as Partial<DeliveryRules>)} aria-label={`${c.label} on`} />
                  <span className="font-medium">{c.label}</span>
                  {!on ? <Badge variant="destructive">Off</Badge> : null}
                </div>
                {c.audienceKey ? (
                  <select
                    className={selectCls}
                    value={audience}
                    disabled={!canManage || !on}
                    onChange={e => set({ [c.audienceKey!]: e.target.value } as Partial<DeliveryRules>)}
                    aria-label={`${c.label}: who receives`}
                  >
                    <option value="EVERYONE">Everyone (open to the public)</option>
                    <option value="ALLOWED_ONLY">Only the allowed list</option>
                  </select>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {audience === 'ALLOWED_ONLY' ? 'Only the allowed phone numbers (as texts)' : 'Everyone (as texts)'}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  Last 24 h: {count(c.channel, 'SENT')} sent · {count(c.channel, 'HELD') + count(c.channel, 'REDIRECTED')} held · {count(c.channel, 'FAILED')} failed
                </span>
              </div>
            )
          })}
        </div>
      </Section>

      <Section
        title="Allowed list"
        description="Used only by channels set to “Only the allowed list”. Sign-in and password emails always reach the person who asked, so nobody gets locked out."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Emails and domains</span>
            <span className="block text-xs text-muted-foreground">One per line. A domain like @allforcare.co.uk allows everyone there. Push goes to carers whose email is listed.</span>
            <textarea className={areaCls} value={emailsText} disabled={!canManage} onChange={e => setEmailsText(e.target.value)} aria-label="Allowed emails" />
          </label>
          <label className="text-sm">
            <span className="font-medium">Phone numbers</span>
            <span className="block text-xs text-muted-foreground">One per line, any UK format (07…, +44…). For texts and WhatsApp.</span>
            <textarea className={areaCls} value={phonesText} disabled={!canManage} onChange={e => setPhonesText(e.target.value)} aria-label="Allowed phone numbers" />
          </label>
        </div>
        <label className="mt-4 block text-sm">
          <span className="font-medium">Held-emails inbox (optional)</span>
          <span className="block text-xs text-muted-foreground">
            Emails held back by the allowed list go here instead, with who they were for in the subject, so testers can see exactly what would have gone. Leave empty to drop them.
          </span>
          <Input
            className="mt-1 h-9 max-w-sm"
            value={current.heldEmailsTo ?? ''}
            disabled={!canManage}
            placeholder="testing@allforcare.co.uk"
            onChange={e => set({ heldEmailsTo: e.target.value.trim() || null })}
          />
        </label>
      </Section>

      <Section title="Message types" description="Switch off one kind of message without stopping the rest. A switched-off message is held back and shows in the delivery log.">
        <div className="grid gap-4 lg:grid-cols-2">
          {CHANNELS.map(c => (
            <div key={c.channel} className="rounded-md border">
              <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">{c.label}</div>
              <div className="divide-y">
                {s.kinds
                  .filter(k => k.channel === c.channel)
                  .map(k => (
                    <div key={k.id} className="flex items-start gap-3 px-4 py-2" data-testid={`kind-${k.id}`}>
                      <Switch className="mt-0.5" checked={kindOn(k.id)} disabled={!canManage} onCheckedChange={v => setKind(k.id, v)} aria-label={k.label} />
                      <div className="text-sm">
                        <div className="font-medium">{k.label}</div>
                        <div className="text-xs text-muted-foreground">{k.description}</div>
                        {k.essential && !kindOn(k.id) ? (
                          <div className="mt-1 text-xs font-medium text-destructive">Staff can’t reset passwords or accept invitations while this is off.</div>
                        ) : null}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {canManage ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t bg-background/95 py-3">
          <Button onClick={() => save.mutate()} disabled={!dirty || problems.length > 0 || save.isPending} data-testid="save-message-delivery">
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="ghost" disabled={!dirty || save.isPending} onClick={() => setDraft(null)}>
            Undo changes
          </Button>
          {problems.length ? <span className="text-sm text-destructive">{problems.join(' ')}</span> : dirty ? <span className="text-sm text-muted-foreground">Unsaved changes</span> : null}
          {s.updatedAt ? <span className="ml-auto text-xs text-muted-foreground">Last changed {new Date(s.updatedAt).toLocaleString('en-GB')}</span> : null}
        </div>
      ) : null}

      {canManage ? <TestMessage /> : null}
      <DeliveryLog days={s.logDays} />
    </div>
  )
}
