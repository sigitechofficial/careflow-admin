import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Copy, Mail, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useBranchOptions } from '@/features/crm/hooks/useBranchOptions'
import {
  addImapMailbox,
  addWebhookMailbox,
  checkOneMailbox,
  newWebhookAddress,
  removeMailbox,
  startGmailConnect,
  startMicrosoftConnect,
  testMailbox,
  turnMailboxOff,
  turnMailboxOn,
  updateMailbox,
  fetchMailboxFolders,
  createMailboxFolder,
  webhookUrl,
  type ImapSettings,
  type MailboxProvider,
  type ReferralMailbox,
  type ReferralMailboxStatus,
  type RelaySettings,
  type MailboxPurpose,
} from '@/features/crm/api/referral-inbox.api'

export const PROVIDER_LABEL: Record<MailboxProvider, string> = {
  GMAIL: 'Gmail',
  MICROSOFT: 'Microsoft 365',
  IMAP: 'IMAP / SMTP',
  INBOUND_WEBHOOK: 'Webhook',
}

const selectClass = 'block h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'never')
export const mailboxName = (m: Pick<ReferralMailbox, 'displayName' | 'emailAddress'>) => m.displayName || m.emailAddress

function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className ?? ''}`}>
      <span className="font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function BranchSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { options } = useBranchOptions()
  return (
    <select className={selectClass} value={value ?? ''} onChange={e => onChange(e.target.value || null)}>
      <option value="">The “no postcode” branch in Settings</option>
      {options.map(o => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/* ─── IMAP / SMTP ──────────────────────────────────────────────── */

type ImapPreset = { key: string; label: string; imap: (domain: string) => string; smtp: (domain: string) => string; note?: string }
const IMAP_PRESETS: ImapPreset[] = [
  { key: 'cpanel', label: 'cPanel hosting', imap: d => (d ? `mail.${d}` : ''), smtp: d => (d ? `mail.${d}` : ''), note: 'Use the full email address as the username. Your host may give a different server name in cPanel → Email Accounts → Connect Devices.' },
  { key: 'godaddy', label: 'GoDaddy Workspace Email', imap: () => 'imap.secureserver.net', smtp: () => 'smtpout.secureserver.net', note: 'For GoDaddy “Microsoft 365” email, use Microsoft 365 instead.' },
  { key: 'zoho', label: 'Zoho Mail (UK / EU)', imap: () => 'imap.zoho.eu', smtp: () => 'smtp.zoho.eu', note: 'Turn on IMAP in Zoho Mail settings. With two-step sign-in, use an app password.' },
  { key: 'ionos', label: 'IONOS', imap: () => 'imap.ionos.co.uk', smtp: () => 'smtp.ionos.co.uk' },
  { key: 'other', label: 'Other', imap: () => '', smtp: () => '' },
]

const blankImap: ImapSettings = { imapHost: '', imapPort: 993, imapSecure: true, smtpHost: '', smtpPort: 465, smtpSecure: true, username: '', sentFolder: '' }

function ImapFields({ value, onChange }: { value: ImapSettings; onChange: (v: ImapSettings) => void }) {
  const set = (p: Partial<ImapSettings>) => onChange({ ...value, ...p })
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_96px_150px]">
      <Field label="IMAP server (reading)">
        <Input value={value.imapHost} onChange={e => set({ imapHost: e.target.value })} placeholder="mail.example.co.uk" />
      </Field>
      <Field label="Port">
        <Input type="number" value={value.imapPort} onChange={e => set({ imapPort: Number(e.target.value) || 0 })} />
      </Field>
      <Field label="Security">
        <select className={selectClass} value={value.imapSecure ? 'ssl' : 'starttls'} onChange={e => set({ imapSecure: e.target.value === 'ssl' })}>
          <option value="ssl">SSL/TLS (993)</option>
          <option value="starttls">STARTTLS or none (143)</option>
        </select>
      </Field>
      <Field label="SMTP server (sending)">
        <Input value={value.smtpHost} onChange={e => set({ smtpHost: e.target.value })} placeholder="mail.example.co.uk" />
      </Field>
      <Field label="Port">
        <Input type="number" value={value.smtpPort} onChange={e => set({ smtpPort: Number(e.target.value) || 0 })} />
      </Field>
      <Field label="Security">
        <select className={selectClass} value={value.smtpSecure ? 'ssl' : 'starttls'} onChange={e => set({ smtpSecure: e.target.value === 'ssl' })}>
          <option value="ssl">SSL/TLS (465)</option>
          <option value="starttls">STARTTLS (587)</option>
        </select>
      </Field>
    </div>
  )
}

/* ─── relay ("send replies through") ───────────────────────────── */

const RELAY_PRESETS: Array<{ key: string; label: string; settings: Partial<RelaySettings>; note: string }> = [
  {
    key: 'zepto',
    label: 'ZeptoMail',
    settings: { host: 'smtp.zeptomail.eu', port: 587, secure: false, username: 'emailapikey' },
    note: 'Password: a “Send Mail token” from ZeptoMail → Mail Agents → SMTP. Accounts outside the EU use smtp.zeptomail.com. The sender address must be on a domain verified in ZeptoMail.',
  },
  {
    key: 'brevo',
    label: 'Brevo',
    settings: { host: 'smtp-relay.brevo.com', port: 587, secure: false },
    note: 'Username: your Brevo SMTP login. Password: an SMTP key (Brevo → SMTP & API). The sender address must be a verified Brevo sender.',
  },
  { key: 'other', label: 'Other (SendGrid, Mailgun, Postmark…)', settings: {}, note: 'Enter the relay’s SMTP details.' },
]

type RelayDraft = RelaySettings & { password: string }

function RelayFields({ value, onChange, hasPassword }: { value: RelayDraft; onChange: (v: RelayDraft) => void; hasPassword: boolean }) {
  const set = (p: Partial<RelayDraft>) => onChange({ ...value, ...p })
  const [preset, setPreset] = React.useState(() => RELAY_PRESETS.find(p => p.settings.host && p.settings.host === value.host)?.key ?? 'other')
  const note = RELAY_PRESETS.find(p => p.key === preset)?.note
  return (
    <div className="space-y-3">
      <Field label="Relay" hint={note}>
        <select
          className={selectClass}
          value={preset}
          onChange={e => {
            setPreset(e.target.value)
            const p = RELAY_PRESETS.find(x => x.key === e.target.value)
            if (p) set({ ...p.settings })
          }}
        >
          {RELAY_PRESETS.map(p => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_96px_150px]">
        <Field label="SMTP server">
          <Input value={value.host} onChange={e => set({ host: e.target.value })} />
        </Field>
        <Field label="Port">
          <Input type="number" value={value.port} onChange={e => set({ port: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Security">
          <select className={selectClass} value={value.secure ? 'ssl' : 'starttls'} onChange={e => set({ secure: e.target.value === 'ssl' })}>
            <option value="starttls">STARTTLS (587)</option>
            <option value="ssl">SSL/TLS (465)</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Username">
          <Input value={value.username} onChange={e => set({ username: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Password or API key" hint={hasPassword ? 'Leave empty to keep the saved one.' : undefined}>
          <Input type="password" value={value.password} onChange={e => set({ password: e.target.value })} autoComplete="new-password" />
        </Field>
        <Field label="Send as (optional)" hint="An address the relay accepts; the mailbox address otherwise.">
          <Input type="email" value={value.fromAddress ?? ''} onChange={e => set({ fromAddress: e.target.value })} placeholder="referrals@yourdomain" />
        </Field>
      </div>
    </div>
  )
}

/* ─── one mailbox: edit ────────────────────────────────────────── */

function EditMailbox({ m, onDone }: { m: ReferralMailbox; onDone: () => void }) {
  const qc = useQueryClient()
  const [displayName, setDisplayName] = React.useState(m.displayName ?? '')
  const [labelName, setLabelName] = React.useState(m.labelName)
  const [purpose, setPurpose] = React.useState<MailboxPurpose>(m.purpose ?? 'REFERRALS')
  const webhookBox = m.provider === 'INBOUND_WEBHOOK'
  // The mailbox's own labels or folders, to choose from instead of typing a name.
  const folders = useQuery({
    queryKey: ['referral-inbox', 'mailbox-folders', m.id],
    queryFn: () => fetchMailboxFolders(m.id),
    enabled: !webhookBox && m.isActive !== undefined,
    staleTime: 60_000,
    retry: false,
  })
  const [typeOwn, setTypeOwn] = React.useState(false)
  const [newLabel, setNewLabel] = React.useState<string | null>(null)
  const createLabel = useMutation({
    mutationFn: (name: string) => createMailboxFolder(m.id, name),
    onSuccess: (r, name) => {
      qc.setQueryData(['referral-inbox', 'mailbox-folders', m.id], r)
      setLabelName(r.folders.find(f => f.name.toLowerCase() === name.trim().toLowerCase())?.name ?? name.trim())
      setNewLabel(null)
      toastSuccess(m.provider === 'GMAIL' ? 'Label made in Gmail' : 'Folder made', 'It is chosen below: save to start reading it.')
    },
    onError: e => toastApiError(e, 'Could not make the label'),
  })
  const [branch, setBranch] = React.useState<string | null>(m.defaultLocationId)
  // Only the settings themselves go back to the server (not "hasPassword", which the server adds).
  const [imap, setImap] = React.useState<ImapSettings>(() => {
    if (!m.imap) return blankImap
    const { hasPassword: _hasPassword, ...settings } = m.imap
    return settings
  })
  const [imapPassword, setImapPassword] = React.useState('')
  const [sendVia, setSendVia] = React.useState<'MAILBOX' | 'SMTP_RELAY'>(m.sendVia)
  const [relay, setRelay] = React.useState<RelayDraft>({
    host: m.relay?.host ?? RELAY_PRESETS[0]!.settings.host!,
    port: m.relay?.port ?? 587,
    secure: m.relay?.secure ?? false,
    username: m.relay?.username ?? 'emailapikey',
    fromAddress: m.relay?.fromAddress ?? '',
    password: '',
  })
  const [apiKey, setApiKey] = React.useState('')
  const webhook = m.provider === 'INBOUND_WEBHOOK'

  const save = useMutation({
    mutationFn: () =>
      updateMailbox(m.id, {
        purpose,
        displayName: displayName.trim() || null,
        ...(webhook ? {} : { labelName: labelName.trim() }),
        defaultLocationId: branch,
        ...(m.provider === 'IMAP' ? { imap: { ...imap, password: imapPassword || null } } : {}),
        sendVia: webhook ? 'SMTP_RELAY' : sendVia,
        relay: webhook || sendVia === 'SMTP_RELAY' ? { ...relay, fromAddress: relay.fromAddress?.trim() || null, password: relay.password || null } : m.relay ? null : undefined,
        ...(webhook && apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      }),
    onSuccess: async () => {
      toastSuccess('Mailbox saved')
      await qc.invalidateQueries({ queryKey: ['referral-inbox'] })
      onDone()
    },
    onError: e => toastApiError(e, 'Could not save the mailbox'),
  })

  return (
    <div className="space-y-4" data-testid="mailbox-edit">
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="space-y-1 sm:col-span-2">
          <legend className="text-sm font-medium">Used for</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name={`purpose-${m.id}`} checked={purpose === 'REFERRALS'} onChange={() => setPurpose('REFERRALS')} /> Care referrals
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name={`purpose-${m.id}`} checked={purpose === 'RECRUITMENT'} onChange={() => setPurpose('RECRUITMENT')} /> Job applications (recruitment)
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {purpose === 'RECRUITMENT'
              ? 'Job applications: emails go to HR → Recruitment inbox, where a candidate is made from each one.'
              : 'Care referrals: emails go to this inbox and become enquiries.'}
          </p>
        </fieldset>
        <Field label="Name" hint="What staff call it, e.g. “Hammersmith referrals”.">
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={m.emailAddress} />
        </Field>
        {!webhook ? (
          <Field
            label={m.provider === 'GMAIL' ? 'Gmail label to read' : 'Folder to read'}
            hint={m.provider === 'GMAIL' ? 'Only emails with this label are read. Use INBOX to read every email that arrives (from the day before the mailbox was added), or a label a Gmail filter adds to referrals.' : 'Use INBOX for the Inbox, or a folder a mail rule moves referrals into.'}
          >
            {folders.data?.folders.length && !typeOwn ? (
              <div className="space-y-1">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={labelName}
                  onChange={e =>
                    e.target.value === '__own' ? setTypeOwn(true) : e.target.value === '__new' ? setNewLabel('') : setLabelName(e.target.value)
                  }
                  aria-label={m.provider === 'GMAIL' ? 'Gmail label to read' : 'Folder to read'}
                  data-testid="mailbox-folder-select"
                >
                  {folders.data.folders.some(f => f.name.toLowerCase() === labelName.toLowerCase()) ? null : (
                    <option value={labelName}>{labelName} (not found in the mailbox)</option>
                  )}
                  {folders.data.folders.map(f => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                      {f.hint ? ` — ${f.hint}` : ''}
                    </option>
                  ))}
                  <option value="__new">+ Make a new {m.provider === 'GMAIL' ? 'label' : 'folder'}…</option>
                  <option value="__own">Type another name…</option>
                </select>
                {newLabel !== null ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={newLabel}
                      placeholder="e.g. Referrals"
                      onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newLabel.trim()) {
                          e.preventDefault()
                          createLabel.mutate(newLabel)
                        }
                      }}
                      aria-label="New label name"
                    />
                    <Button type="button" size="sm" disabled={!newLabel.trim() || createLabel.isPending} onClick={() => createLabel.mutate(newLabel)}>
                      {createLabel.isPending ? 'Making…' : 'Make'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setNewLabel(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : null}
                {m.provider === 'GMAIL' && labelName.toUpperCase() !== 'INBOX' ? (
                  <p className="text-xs text-muted-foreground">Only emails with this label are read: add a Gmail filter that puts it on referral emails.</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1">
                <Input value={labelName} onChange={e => setLabelName(e.target.value)} />
                {folders.isLoading ? <p className="text-xs text-muted-foreground">Loading the mailbox’s labels…</p> : null}
                {folders.isError ? <p className="text-xs text-muted-foreground">Couldn’t list the mailbox’s labels; type the name.</p> : null}
              </div>
            )}
          </Field>
        ) : null}
        <Field label="Branch for emails with no postcode" className="sm:col-span-2">
          <BranchSelect value={branch} onChange={setBranch} />
        </Field>
      </div>

      {m.provider === 'IMAP' ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-sm font-semibold">Server settings</p>
          <ImapFields value={imap} onChange={setImap} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Username">
              <Input value={imap.username} onChange={e => setImap({ ...imap, username: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="New password" hint="Leave empty to keep the saved one.">
              <Input type="password" value={imapPassword} onChange={e => setImapPassword(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
        </div>
      ) : null}

      {webhook ? (
        <Field label="Brevo API key (to download attachments)" hint={m.webhook?.hasApiKey ? 'Saved. Enter a new one to replace it.' : 'Only needed for Brevo inbound parsing.'}>
          <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} autoComplete="new-password" />
        </Field>
      ) : null}

      <div className="space-y-3 rounded-md border border-border p-3">
        <p className="text-sm font-semibold">Send replies</p>
        {!webhook ? (
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={sendVia === 'MAILBOX'} onChange={() => setSendVia('MAILBOX')} /> From this mailbox
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={sendVia === 'SMTP_RELAY'} onChange={() => setSendVia('SMTP_RELAY')} /> Through a relay (ZeptoMail, Brevo…)
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">A webhook mailbox can’t send, so replies go through a relay.</p>
        )}
        {webhook || sendVia === 'SMTP_RELAY' ? <RelayFields value={relay} onChange={setRelay} hasPassword={Boolean(m.relay?.hasPassword)} /> : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

/* ─── one mailbox: card ────────────────────────────────────────── */

function MailboxCard({ m, onEdit, onAddress }: { m: ReferralMailbox; onEdit: () => void; onAddress: (path: string) => void }) {
  const qc = useQueryClient()
  const refresh = () => void qc.invalidateQueries({ queryKey: ['referral-inbox'] })
  const test = useMutation({ mutationFn: () => testMailbox(m.id), onSuccess: r => toastSuccess('Connection works', r.message), onError: e => toastApiError(e, 'Connection failed') })
  const check = useMutation({
    mutationFn: () => checkOneMailbox(m.id),
    onSuccess: r => {
      toastSuccess(r.busy ? 'Already checking' : r.saved ? `${r.saved} new email${r.saved === 1 ? '' : 's'}` : 'No new emails')
      refresh()
    },
    onError: e => {
      toastApiError(e, 'Could not check the mailbox')
      refresh()
    },
  })
  const address = useMutation({ mutationFn: () => newWebhookAddress(m.id), onSuccess: r => onAddress(r.data.path), onError: e => toastApiError(e, 'Could not make a new address') })
  const off = useMutation({
    mutationFn: () => turnMailboxOff(m.id),
    onSuccess: () => {
      toastSuccess('Mailbox turned off', 'It is not read until you turn it on again. Emails already read stay in the inbox.')
      refresh()
    },
    onError: e => toastApiError(e, 'Could not turn it off'),
  })
  const on = useMutation({
    mutationFn: () => turnMailboxOn(m.id),
    onSuccess: r => {
      toastSuccess('Mailbox turned on', r.message)
      refresh()
    },
    onError: e => toastApiError(e, 'Could not turn it on'),
  })
  const remove = useMutation({
    mutationFn: () => removeMailbox(m.id),
    onSuccess: () => {
      toastSuccess('Mailbox removed', 'Its sign-in and passwords are deleted. Emails already read stay in the inbox.')
      refresh()
    },
    onError: e => toastApiError(e, 'Could not remove it'),
  })
  const [confirm, setConfirm] = React.useState(false)
  const polled = m.provider !== 'INBOUND_WEBHOOK'

  return (
    <li className={`space-y-2 p-3 ${m.isActive ? '' : 'bg-muted/30'}`} data-testid={`mailbox-${m.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {mailboxName(m)}
            <Badge variant="info" size="sm">
              {PROVIDER_LABEL[m.provider]}
            </Badge>
            {m.purpose === 'RECRUITMENT' ? (
              <Badge variant="outline" size="sm">
                Recruitment
              </Badge>
            ) : null}
            {m.isActive ? null : (
              <Badge variant="warning" size="sm">
                Off
              </Badge>
            )}
            {m.sendVia === 'SMTP_RELAY' ? (
              <Badge variant="outline" size="sm">
                Replies via {m.relay?.host ?? 'relay (not set)'}
              </Badge>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {m.displayName ? `${m.emailAddress} · ` : ''}
            {polled ? `${m.provider === 'GMAIL' ? 'label' : 'folder'} “${m.labelName}” · last checked ${when(m.lastCheckedAt)}` : `emails posted to CareFlow · last received ${when(m.lastCheckedAt)}`}
            {m.defaultLocationName ? ` · no-postcode branch: ${m.defaultLocationName}` : ''}
            {m.imap ? ` · ${m.imap.imapHost}` : ''}
          </p>
          {!m.isActive ? (
            <p className="mt-1 text-xs text-muted-foreground">Turned off: not read, and posts to it are refused. Its settings are kept.</p>
          ) : null}
          {m.lastError && m.isActive ? (
            <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> {m.lastError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!m.isActive ? (
            <Button size="sm" onClick={() => on.mutate()} disabled={on.isPending}>
              {on.isPending ? 'Checking…' : 'Turn on'}
            </Button>
          ) : polled ? (
            <Button size="sm" variant="outline" onClick={() => check.mutate()} disabled={check.isPending}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${check.isPending ? 'animate-spin' : ''}`} aria-hidden /> Check now
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => address.mutate()} disabled={address.isPending}>
              New address
            </Button>
          )}
          {polled || m.relay ? (
            <Button size="sm" variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
              {test.isPending ? 'Testing…' : 'Test'}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          {m.isActive ? (
            <Button size="sm" variant="ghost" onClick={() => off.mutate()} disabled={off.isPending}>
              Turn off
            </Button>
          ) : null}
          {confirm ? (
            <>
              <Button size="sm" variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
                Remove for good
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                Keep
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirm(true)}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}

/* ─── adding a mailbox ─────────────────────────────────────────── */

function AddImap({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const [preset, setPreset] = React.useState('cpanel')
  const [emailAddress, setEmailAddress] = React.useState('')
  const [displayName, setDisplayName] = React.useState('')
  const [folder, setFolder] = React.useState('INBOX')
  const [imap, setImap] = React.useState<ImapSettings>(blankImap)
  const [password, setPassword] = React.useState('')
  const [branch, setBranch] = React.useState<string | null>(null)
  const p = IMAP_PRESETS.find(x => x.key === preset)!

  const applyPreset = (key: string, email = emailAddress) => {
    const pr = IMAP_PRESETS.find(x => x.key === key)!
    const domain = email.split('@')[1] ?? ''
    setImap(v => ({ ...v, imapHost: pr.imap(domain) || v.imapHost, smtpHost: pr.smtp(domain) || v.smtpHost, imapPort: 993, imapSecure: true, smtpPort: 465, smtpSecure: true }))
  }

  const add = useMutation({
    mutationFn: () =>
      addImapMailbox({
        ...imap,
        username: imap.username || emailAddress,
        emailAddress,
        displayName: displayName || null,
        folder,
        password,
        defaultLocationId: branch,
      }),
    onSuccess: async r => {
      toastSuccess('Mailbox connected', r.message)
      await qc.invalidateQueries({ queryKey: ['referral-inbox'] })
      onDone()
    },
    onError: e => toastApiError(e, 'Could not connect the mailbox'),
  })

  return (
    <div className="space-y-4" data-testid="mailbox-add-imap">
      <Field label="Email provider" hint={p.note}>
        <select
          className={selectClass}
          value={preset}
          onChange={e => {
            setPreset(e.target.value)
            applyPreset(e.target.value)
          }}
        >
          {IMAP_PRESETS.map(x => (
            <option key={x.key} value={x.key}>
              {x.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email address">
          <Input
            type="email"
            value={emailAddress}
            onChange={e => setEmailAddress(e.target.value)}
            onBlur={() => applyPreset(preset, emailAddress)}
            placeholder="referrals@yourdomain.co.uk"
          />
        </Field>
        <Field label="Name (optional)">
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Hammersmith referrals" />
        </Field>
        <Field label="Username" hint="Usually the full email address.">
          <Input value={imap.username} onChange={e => setImap({ ...imap, username: e.target.value })} placeholder={emailAddress} autoComplete="off" />
        </Field>
        <Field label="Password" hint="Stored encrypted. Use an app password where your provider offers one.">
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Folder to read" hint="INBOX, or a folder a mail rule moves referrals into.">
          <Input value={folder} onChange={e => setFolder(e.target.value)} />
        </Field>
        <Field label="Branch for emails with no postcode">
          <BranchSelect value={branch} onChange={setBranch} />
        </Field>
      </div>
      <ImapFields value={imap} onChange={setImap} />
      <p className="text-xs text-muted-foreground">
        CareFlow signs in to check these settings before saving. The first time, it reads emails from the last 14 days in the folder.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => add.mutate()} disabled={add.isPending || !emailAddress || !password || !imap.imapHost || !imap.smtpHost}>
          {add.isPending ? 'Checking the connection…' : 'Connect'}
        </Button>
      </div>
    </div>
  )
}

function AddWebhook({ onDone, onAddress }: { onDone: () => void; onAddress: (path: string) => void }) {
  const qc = useQueryClient()
  const [emailAddress, setEmailAddress] = React.useState('')
  const [displayName, setDisplayName] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [branch, setBranch] = React.useState<string | null>(null)
  const add = useMutation({
    mutationFn: () => addWebhookMailbox({ emailAddress, displayName: displayName || null, apiKey: apiKey || null, defaultLocationId: branch }),
    onSuccess: async r => {
      await qc.invalidateQueries({ queryKey: ['referral-inbox'] })
      onAddress(r.data.path)
    },
    onError: e => toastApiError(e, 'Could not add the mailbox'),
  })
  return (
    <div className="space-y-4" data-testid="mailbox-add-webhook">
      <p className="text-sm text-muted-foreground">
        For a service that receives your email and posts each one to CareFlow: Brevo inbound parsing, or anything that can post the raw email
        (Cloudflare Email Workers, SendGrid Inbound Parse “raw”, Mailgun). Replies go through a relay, which you set next.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="The address emails are sent to">
          <Input type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} placeholder="referrals@in.yourdomain.co.uk" />
        </Field>
        <Field label="Name (optional)">
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </Field>
        <Field label="Brevo API key (optional)" hint="Only for Brevo, to download attachments.">
          <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Branch for emails with no postcode">
          <BranchSelect value={branch} onChange={setBranch} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => add.mutate()} disabled={add.isPending || !emailAddress}>
          {add.isPending ? 'Adding…' : 'Add and show the address'}
        </Button>
      </div>
    </div>
  )
}

function WebhookAddress({ path, onDone }: { path: string; onDone: () => void }) {
  const url = webhookUrl(path)
  return (
    <div className="space-y-3" data-testid="mailbox-webhook-address">
      <p className="text-sm">
        Paste this address into the email service (in Brevo: <strong>Inbound parsing → webhook URL</strong>). It is shown <strong>only now</strong>;
        make a new one from the mailbox if it’s lost.
      </p>
      <div className="flex items-center gap-2">
        <Input readOnly value={url} className="font-mono text-xs" onFocus={e => e.currentTarget.select()} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void navigator.clipboard?.writeText(url).then(() => toastSuccess('Address copied'))}
        >
          <Copy className="mr-1 h-3.5 w-3.5" aria-hidden /> Copy
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        The service must reach CareFlow over the internet, so this only works once CareFlow runs on its public HTTPS address. Then open
        <strong> Edit</strong> on the mailbox to set the relay replies go through.
      </p>
      <div className="flex justify-end">
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  )
}

/* ─── the dialog ───────────────────────────────────────────────── */

type View = { kind: 'list' } | { kind: 'edit'; id: string } | { kind: 'imap' } | { kind: 'webhook' } | { kind: 'address'; path: string }

export function ReferralMailboxesDialog({
  open,
  onOpenChange,
  status,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  status: ReferralMailboxStatus | undefined
}) {
  const [view, setView] = React.useState<View>({ kind: 'list' })
  React.useEffect(() => {
    if (open) setView({ kind: 'list' })
  }, [open])
  const mailboxes = status?.mailboxes ?? []
  const signIn = useMutation({
    mutationFn: (p: 'GMAIL' | 'MICROSOFT') => (p === 'GMAIL' ? startGmailConnect() : startMicrosoftConnect()),
    onSuccess: r => {
      window.location.href = r.url
    },
    onError: e => toastApiError(e, 'Could not start signing in'),
  })
  const editing = view.kind === 'edit' ? mailboxes.find(m => m.id === view.id) : null
  const title =
    view.kind === 'edit' ? `Edit ${editing ? mailboxName(editing) : 'mailbox'}`
    : view.kind === 'imap' ? 'Add an IMAP / SMTP mailbox'
    : view.kind === 'webhook' ? 'Add a webhook mailbox'
    : view.kind === 'address' ? 'Webhook address'
    : 'Referral mailboxes'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {view.kind === 'list' ? (
            <DialogDescription>Every mailbox below is read the same way. Replies go back from the mailbox the email came into.</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogBody>
          {view.kind === 'list' ? (
            <div className="space-y-5">
              {mailboxes.length ? (
                <ul className="divide-y divide-border rounded-md border border-border" data-testid="mailbox-list">
                  {mailboxes.map(m => (
                    <MailboxCard key={m.id} m={m} onEdit={() => setView({ kind: 'edit', id: m.id })} onAddress={path => setView({ kind: 'address', path })} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No mailbox is connected yet.</p>
              )}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Add a mailbox</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <AddChoice
                    title="Gmail / Google Workspace"
                    text="Sign in with Google. Reads one label."
                    disabledReason={status?.gmailConfigured ? null : 'Not set up on the server (GOOGLE_OAUTH_* settings).'}
                    onClick={() => signIn.mutate('GMAIL')}
                  />
                  <AddChoice
                    title="Microsoft 365 / Outlook"
                    text="Sign in with Microsoft. Also GoDaddy’s Microsoft 365 email."
                    disabledReason={status?.microsoftConfigured ? null : 'Not set up on the server yet (MICROSOFT_OAUTH_* settings).'}
                    onClick={() => signIn.mutate('MICROSOFT')}
                  />
                  <AddChoice title="IMAP / SMTP" text="cPanel hosting, GoDaddy Workspace Email, Zoho, IONOS and most hosts." onClick={() => setView({ kind: 'imap' })} />
                  <AddChoice title="Webhook" text="Brevo inbound parsing, or any service that posts the email to CareFlow." onClick={() => setView({ kind: 'webhook' })} />
                </div>
              </div>
            </div>
          ) : view.kind === 'edit' && editing ? (
            <EditMailbox m={editing} onDone={() => setView({ kind: 'list' })} />
          ) : view.kind === 'imap' ? (
            <AddImap onDone={() => setView({ kind: 'list' })} />
          ) : view.kind === 'webhook' ? (
            <AddWebhook onDone={() => setView({ kind: 'list' })} onAddress={path => setView({ kind: 'address', path })} />
          ) : view.kind === 'address' ? (
            <WebhookAddress path={view.path} onDone={() => setView({ kind: 'list' })} />
          ) : null}
        </DialogBody>
        {view.kind === 'list' ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function AddChoice({ title, text, onClick, disabledReason }: { title: string; text: string; onClick: () => void; disabledReason?: string | null }) {
  return (
    <button
      type="button"
      disabled={Boolean(disabledReason)}
      onClick={onClick}
      className="flex items-start gap-2 rounded-md border border-border p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{disabledReason ?? text}</span>
      </span>
    </button>
  )
}

/** The bar above the inbox: the connected mailboxes, with any that need attention. */
export function ReferralMailboxesBar({ status, onManage, canManage }: { status: ReferralMailboxStatus; onManage: () => void; canManage: boolean }) {
  const boxes = status.mailboxes.filter(b => b.isActive)
  const offCount = status.mailboxes.length - boxes.length
  const first = boxes[0]
  const failing = boxes.filter(b => b.lastError)
  const lastChecked = boxes.map(b => b.lastCheckedAt).filter((x): x is string => Boolean(x)).sort().pop() ?? null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm" data-testid="referral-mailbox-status">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        {boxes.length === 0 ? (
          <span>
            <span className="font-medium">
              {status.mailboxes.length === 1 ? (status.mailboxes[0]?.emailAddress ?? 'Mailbox') : `${status.mailboxes.length} mailboxes`} turned off
            </span>
            <span className="text-muted-foreground"> · nothing is read and no Claude credits are used. Turn it on in Mailboxes.</span>
          </span>
        ) : boxes.length === 1 && first ? (
          <span className="truncate">
            <span className="font-medium">{first.emailAddress}</span>
            <span className="text-muted-foreground">
              {' '}
              · {PROVIDER_LABEL[first.provider]} · {first.provider === 'INBOUND_WEBHOOK' ? 'posted to CareFlow' : `“${first.labelName}”, checked every 2 minutes`}, last{' '}
              {when(lastChecked)}
            </span>
          </span>
        ) : (
          <span className="truncate">
            <span className="font-medium">{boxes.length} mailboxes</span>
            <span className="text-muted-foreground"> · {boxes.map(b => mailboxName(b)).join(', ')} · last checked {when(lastChecked)}</span>
          </span>
        )}
        {offCount && boxes.length ? <span className="text-muted-foreground">· {offCount} turned off</span> : null}
        {failing.length ? (
          <span className="text-destructive">
            · {failing.length === 1 && boxes.length === 1 ? `last check failed: ${failing[0]?.lastError}` : `${failing.length} need attention`}
          </span>
        ) : null}
      </div>
      {canManage ? (
        <Button type="button" variant="ghost" size="sm" onClick={onManage}>
          Mailboxes
        </Button>
      ) : null}
    </div>
  )
}
