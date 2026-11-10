import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, ChevronDown, CircleHelp, Paperclip, Send, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
import { SummernoteEditor } from '@/shared/ui/summernote-editor'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  fetchReferralSettings,
  saveReferralSettings,
  sendReferralReply,
  type ReferralAutomationSettings,
  type ReferralEmail,
  type ReferralStandardRate,
} from '@/features/crm/api/referral-inbox.api'
import { ReferralRulesTab } from './ReferralRulesTab'
import { ReferralSelect } from './ReferralSelect'

export const DECISION: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'destructive'; dot: string }> = {
  YES: { label: 'Yes, subject to assessment', variant: 'success', dot: 'bg-emerald-500' },
  POSSIBLY: { label: 'Possibly', variant: 'info', dot: 'bg-sky-500' },
  NEED_INFO: { label: 'Need more information', variant: 'warning', dot: 'bg-amber-500' },
  NO: { label: 'Can’t take it', variant: 'destructive', dot: 'bg-red-500' },
}

/** Short names for the kind of email (badges in the inbox). */
export const EMAIL_KIND: Record<string, string> = {
  NEW_REFERRAL: 'Referral',
  BROKERAGE_OFFER: 'Package offer',
  PRIVATE_ENQUIRY: 'Family enquiry',
  PRICE_ENQUIRY: 'Price enquiry',
  GENERAL_QUESTION: 'Question',
  FOLLOW_UP: 'Follow-up',
  REFERRAL_WITHDRAWN: 'Withdrawn',
  EXISTING_CLIENT: 'Current client',
  COMPLAINT: 'Complaint',
  SAFEGUARDING_CONCERN: 'Safeguarding',
  JOB_APPLICATION: 'Job application',
  SUPPLIER_OR_MARKETING: 'Supplier / advert',
  OTHER: 'Other',
}

export const REQUEST_TYPE: Record<string, string> = {
  CARE_REFERRAL: 'Referral',
  PRICE_ENQUIRY: 'Price enquiry',
  GENERAL_QUESTION: 'Question',
  NOT_CARE: 'Not about care',
}

const ICON = {
  PASS: <Check className="h-4 w-4 text-emerald-600" aria-hidden />,
  WARN: <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden />,
  FAIL: <X className="h-4 w-4 text-destructive" aria-hidden />,
  UNKNOWN: <CircleHelp className="h-4 w-4 text-muted-foreground" aria-hidden />,
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** A plain-text draft (older replies) as simple HTML for the editor: paragraphs, line breaks and lists. */
export function replyTextToHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map(block => {
      const lines = block.split('\n')
      if (lines.every(l => /^\s*[-•*]\s+/.test(l))) return `<ul>${lines.map(l => `<li>${esc(l.replace(/^\s*[-•*]\s+/, ''))}</li>`).join('')}</ul>`
      if (lines.every(l => /^\s*\d+[.)]\s+/.test(l))) return `<ol>${lines.map(l => `<li>${esc(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`
      return `<p>${lines.map(esc).join('<br>')}</p>`
    })
    .join('')
}

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

/** What CareFlow checked: problems first, the passed checks folded away. */
export function ReferralChecks({ email }: { email: ReferralEmail }) {
  const [showAll, setShowAll] = React.useState(false)
  if (!email.checks?.length) return null
  const problems = email.checks.filter(c => c.result !== 'PASS')
  const passed = email.checks.filter(c => c.result === 'PASS')
  const Row = ({ c }: { c: NonNullable<ReferralEmail['checks']>[number] }) => (
    <li className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0">{ICON[c.result]}</span>
      <span>
        <span className="font-medium">{c.label}:</span> {c.detail}
      </span>
    </li>
  )
  return (
    <div className="space-y-2" data-testid="referral-checks">
      {problems.length ? (
        <ul className="space-y-1.5">
          {problems.map(c => (
            <Row key={c.key} c={c} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Every check passed.</p>
      )}
      {passed.length ? (
        <div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowAll(v => !v)}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden />
            {showAll ? 'Hide' : 'Show'} {passed.length} check{passed.length === 1 ? '' : 's'} that passed
          </button>
          {showAll ? (
            <ul className="mt-2 space-y-1.5">
              {passed.map(c => (
                <Row key={c.key} c={c} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** Gmail-like formatting: bold, italic, underline, size, colour, lists, indent, link, undo. */
const REPLY_TOOLBAR: unknown[] = [
  ['misc', ['undo', 'redo']],
  ['font', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
  ['fontsize', ['fontsize']],
  ['forecolor', ['forecolor']],
  ['backcolor', ['backcolor']],
  ['para', ['ul', 'ol', 'paragraph']],
  ['insert', ['link', 'hr']],
]

/** The reply: a composer (To, Cc, subject, formatted body, the attached quote) or, once sent, what went out. */
export function ReferralReplyPanel({
  email,
  testMode,
  mailboxAddress,
  copyTo,
}: {
  email: ReferralEmail
  testMode: boolean
  mailboxAddress: string | null
  copyTo: string[]
}) {
  const qc = useQueryClient()
  const canManage = useAuthStore(s => s.can('crm.manage'))
  const initialHtml = email.replyHtml ?? (email.replyText ? replyTextToHtml(email.replyText) : '')
  const [subject, setSubject] = React.useState(email.replySubject ?? '')
  const [html, setHtml] = React.useState(initialHtml)
  React.useEffect(() => {
    setSubject(email.replySubject ?? '')
    setHtml(initialHtml)
  }, [email.id, email.replySubject, email.replyHtml]) // eslint-disable-line react-hooks/exhaustive-deps
  const send = useMutation({
    mutationFn: () => sendReferralReply(email.id, { subject, html }),
    onSuccess: r => {
      toastSuccess('Reply sent', r.message)
      void qc.invalidateQueries({ queryKey: ['referral-inbox'] })
    },
    onError: e => {
      toastApiError(e, 'Could not send the reply')
      void qc.invalidateQueries({ queryKey: ['referral-inbox'] })
    },
  })

  const quoteLink =
    email.enquiryId && email.quotationId && email.quotationVersionId ? (
      <Link
        to="/crm/$enquiryId/quotes/$quotationId/$versionId"
        params={{ enquiryId: email.enquiryId, quotationId: email.quotationId, versionId: email.quotationVersionId }}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-medium hover:bg-muted"
      >
        <Paperclip className="h-3.5 w-3.5" aria-hidden /> Quotation (PDF) — open
      </Link>
    ) : null

  const sender = email.fromEmail ?? ''
  const Header = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-[64px_1fr] items-center gap-x-2 gap-y-1.5 border-b border-border px-3 py-2 text-sm">{children}</div>
  )

  if (email.replySentAt) {
    return (
      <div className="overflow-hidden rounded-lg border border-border" data-testid="referral-reply-sent">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-emerald-500/10 px-3 py-2 text-sm">
          <Check className="h-4 w-4 text-emerald-600" aria-hidden />
          <span className="font-medium">Sent {fmt(email.replySentAt)}</span>
          {testMode ? <Badge variant="warning" size="sm">Test: went to {email.replySentTo}</Badge> : null}
        </div>
        <Header>
          <span className="text-muted-foreground">To</span>
          <span className="truncate">{testMode ? `${email.replySentTo} (instead of ${sender})` : email.replySentTo}</span>
          {email.replyCopiedTo?.length ? (
            <>
              <span className="text-muted-foreground">{testMode ? 'Cc' : 'Bcc'}</span>
              <span className="truncate">{email.replyCopiedTo.join(', ')}</span>
            </>
          ) : null}
          <span className="text-muted-foreground">Subject</span>
          <span className="truncate">{email.replySubject}</span>
        </Header>
        <div className="max-h-[420px] overflow-auto px-4 py-3 text-sm">
          {email.replyHtml ? (
            <RichTextHtml
              html={email.replyHtml}
              className="max-w-none leading-relaxed [&_a]:text-primary [&_a]:underline [&_li]:my-0.5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans">{email.replyText}</pre>
          )}
        </div>
        {quoteLink ? <div className="border-t border-border px-3 py-2">{quoteLink}</div> : null}
      </div>
    )
  }

  if (!email.replyHtml && !email.replyText) {
    return <p className="text-sm text-muted-foreground">No reply has been drafted for this email.</p>
  }

  return (
    <div className="space-y-3" data-testid="referral-reply-draft">
      {email.decision === 'NO' ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <p className="font-medium">This is a decline, so it was not sent automatically.</p>
          <p className="text-muted-foreground">Check the reasons on the Overview tab, edit the wording if needed, then send — or call the referrer.</p>
        </div>
      ) : null}
      {email.replyError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">Sending failed: {email.replyError}</p>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border">
        <Header>
          <span className="text-muted-foreground">To</span>
          <span className="truncate">
            {sender}
            {testMode && mailboxAddress ? <span className="text-amber-700 dark:text-amber-400"> — while testing it goes to {mailboxAddress}</span> : null}
          </span>
          {copyTo.length ? (
            <>
              <span className="text-muted-foreground">{testMode ? 'Cc' : 'Bcc'}</span>
              <span className="truncate">{copyTo.join(', ')}</span>
            </>
          ) : null}
          <span className="text-muted-foreground">Subject</span>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            aria-label="Reply subject"
            disabled={!canManage}
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </Header>
        <SummernoteEditor
          value={html}
          onChange={v => setHtml(v)}
          disabled={!canManage}
          minHeight={280}
          toolbar={REPLY_TOOLBAR}
          className="referral-reply-editor"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <Button type="button" disabled={send.isPending || !html.trim()} onClick={() => send.mutate()} className="gap-1.5">
                <Send className="h-4 w-4" aria-hidden />
                {send.isPending ? 'Sending…' : 'Send'}
              </Button>
            ) : null}
            {quoteLink}
          </div>
          <span className="text-xs text-muted-foreground">Drafted by Claude from the checks — check it before sending.</span>
        </div>
      </div>
    </div>
  )
}

/* ─── settings ──────────────────────────────────────────────────────── */

const DECISIONS = ['YES', 'POSSIBLY', 'NEED_INFO'] as const

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-start gap-2.5 rounded-md border border-border p-3 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  )
}

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v))

/** One row of standard private rates as the simple fields staff fill in. */
function RateRow({
  row,
  onChange,
  disabled,
}: {
  row: ReferralStandardRate
  onChange: (r: ReferralStandardRate) => void
  disabled: boolean
}) {
  const r = row.rates ?? {}
  const short = r.shortVisits?.[0]
  const set = (patch: Partial<NonNullable<ReferralStandardRate['rates']>>) => onChange({ ...row, rates: { ...r, ...patch } })
  const cell = 'px-2 py-2'
  return (
    <tr className="border-b border-border last:border-0 align-middle">
      <td className={`${cell} font-medium`}>{row.branchName}</td>
      <td className={cell}>
        <Input
          type="number"
          step="0.01"
          min={0}
          placeholder="—"
          aria-label={`Hourly rate ${row.branchName}`}
          className="h-8 w-24"
          value={row.hourlyRate ?? ''}
          disabled={disabled}
          onChange={e => onChange({ ...row, hourlyRate: numOrNull(e.target.value) })}
        />
      </td>
      <td className={cell}>
        <Input
          type="number"
          step="0.01"
          min={0}
          placeholder="—"
          aria-label={`30-minute visit ${row.branchName}`}
          className="h-8 w-24"
          value={short?.pricePerVisit ?? ''}
          disabled={disabled}
          onChange={e => {
            const v = numOrNull(e.target.value)
            set({ shortVisits: v ? [{ upToMinutes: 30, pricePerVisit: v }] : [] })
          }}
        />
      </td>
      <td className={cell}>
        <Input
          type="number"
          min={0}
          placeholder="—"
          aria-label={`Weekend uplift ${row.branchName}`}
          className="h-8 w-20"
          value={r.weekend?.value ?? ''}
          disabled={disabled}
          onChange={e => {
            const v = numOrNull(e.target.value)
            set({ weekend: v ? { mode: 'PERCENT', value: v } : null })
          }}
        />
      </td>
      <td className={cell}>
        <Input
          type="number"
          min={0}
          placeholder="—"
          aria-label={`Bank holiday uplift ${row.branchName}`}
          className="h-8 w-20"
          value={r.bankHoliday?.value ?? ''}
          disabled={disabled}
          onChange={e => {
            const v = numOrNull(e.target.value)
            set({ bankHoliday: v ? { mode: 'PERCENT', value: v } : null })
          }}
        />
      </td>
    </tr>
  )
}

/** Settings in one dialog: what happens automatically, prices, areas and sign-off, copies. */
export function ReferralSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const canManage = useAuthStore(s => s.can('crm.manage'))
  const q = useQuery({ queryKey: ['referral-inbox', 'settings'], queryFn: fetchReferralSettings, enabled: open })
  const [draft, setDraft] = React.useState<ReferralAutomationSettings | null>(null)
  const [copies, setCopies] = React.useState('')
  React.useEffect(() => {
    if (q.data && open) {
      // Every covered branch gets a rates row (empty until filled in), plus the all-branches row first.
      const rates = q.data.standardRates
      const all = rates.find(r => !r.locationId) ?? { locationId: null, branchName: 'All branches (default)', hourlyRate: null, rates: null }
      const perBranch = q.data.coverage.map(
        c => rates.find(r => r.locationId === c.locationId) ?? { locationId: c.locationId, branchName: c.branchName, hourlyRate: null, rates: null },
      )
      setDraft({ ...q.data, standardRates: [{ ...all, branchName: 'All branches (default)' }, ...perBranch] })
      setCopies(q.data.copyRepliesTo.join(', '))
    }
  }, [q.data, open])
  const save = useMutation({
    mutationFn: (s: ReferralAutomationSettings) =>
      saveReferralSettings({
        autoCreateEnquiry: s.autoCreateEnquiry,
        autoReply: s.autoReply,
        autoReplyDecisions: s.autoReplyDecisions,
        minNoticeDays: s.minNoticeDays,
        answerPriceQuestions: s.answerPriceQuestions,
        availabilityMode: s.availabilityMode,
        travelBufferMinutes: s.travelBufferMinutes,
        autoQuote: s.autoQuote,
        quoteValidDays: s.quoteValidDays,
        unplacedLocationId: s.unplacedLocationId ?? null,
        // Empty written rules are dropped.
        rules: { ...s.rules, custom: s.rules.custom.filter(c => c.text.trim()) },
        copyRepliesTo: copies
          .split(/[,;\s]+/)
          .map(x => x.trim())
          .filter(Boolean),
        standardRates: s.standardRates.map(r => ({ locationId: r.locationId, hourlyRate: r.hourlyRate, rates: r.rates, notes: r.notes ?? null })),
        coverage: s.coverage.map(c => ({
          locationId: c.locationId,
          localAuthorities: c.localAuthorities.filter(Boolean),
          replyManagerName: c.replyManagerName,
          replyManagerTitle: c.replyManagerTitle,
          replyPhone: c.replyPhone,
          isActive: c.isActive,
        })),
      }),
    onSuccess: () => {
      toastSuccess('Referral settings saved')
      void qc.invalidateQueries({ queryKey: ['referral-inbox'] })
      onOpenChange(false)
    },
    onError: e => toastApiError(e, 'Could not save'),
  })
  const set = (patch: Partial<ReferralAutomationSettings>) => setDraft(d => (d ? { ...d, ...patch } : d))
  const setRow = (i: number, patch: Partial<ReferralAutomationSettings['coverage'][number]>) =>
    setDraft(d => (d ? { ...d, coverage: d.coverage.map((r, n) => (n === i ? { ...r, ...patch } : r)) } : d))
  const setRate = (i: number, r: ReferralStandardRate) =>
    setDraft(d => (d ? { ...d, standardRates: d.standardRates.map((x, n) => (n === i ? r : x)) } : d))
  const disabled = !canManage

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Referral inbox settings</DialogTitle>
          <DialogDescription>What CareFlow does automatically with referral emails, the prices it gives, and who signs replies.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {!draft ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Tabs defaultValue="automation" className="space-y-4">
              <TabsList>
                <TabsTrigger value="automation">Automation</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="rates">Prices and quotes</TabsTrigger>
                <TabsTrigger value="areas">Areas and sign-off</TabsTrigger>
                <TabsTrigger value="copies">Copies</TabsTrigger>
              </TabsList>

              <TabsContent value="automation" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Create or link the enquiry"
                    hint="When the postcode is in a branch’s area. Existing people are linked, not duplicated."
                    checked={draft.autoCreateEnquiry}
                    disabled={disabled}
                    onChange={v => set({ autoCreateEnquiry: v })}
                  />
                  <Toggle
                    label="Send replies automatically"
                    hint="Off: every reply waits in the inbox for someone to press Send."
                    checked={draft.autoReply}
                    disabled={disabled}
                    onChange={v => set({ autoReply: v })}
                  />
                </div>
                {draft.autoReply ? (
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="mb-2 font-medium">Send automatically when the decision is</p>
                    <div className="flex flex-wrap gap-4">
                      {DECISIONS.map(dc => (
                        <label key={dc} className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={draft.autoReplyDecisions.includes(dc)}
                            onChange={e =>
                              set({
                                autoReplyDecisions: e.target.checked
                                  ? [...draft.autoReplyDecisions, dc]
                                  : draft.autoReplyDecisions.filter(x => x !== dc),
                              })
                            }
                          />
                          {DECISION[dc]?.label}
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">“Can’t take it” replies always wait for a manager.</p>
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="text-sm">
                    <span className="font-medium">Carer availability</span>
                    <ReferralSelect
                      triggerClassName="mt-1 h-9 w-full"
                      ariaLabel="Carer availability"
                      value={draft.availabilityMode}
                      disabled={disabled}
                      onChange={v => set({ availabilityMode: v as ReferralAutomationSettings['availabilityMode'] })}
                      options={[
                        { value: 'ANY_CARER_EACH_DAY', label: 'Different carers on different days is fine' },
                        { value: 'SAME_CARER', label: 'Same carer on every day' },
                      ]}
                    />
                  </div>
                  <label className="text-sm">
                    <span className="font-medium">Travel time either side (minutes)</span>
                    <Input
                      type="number"
                      min={0}
                      max={90}
                      className="mt-1 h-9"
                      value={draft.travelBufferMinutes}
                      disabled={disabled}
                      onChange={e => set({ travelBufferMinutes: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="font-medium">Minimum notice for a start (days)</span>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      className="mt-1 h-9"
                      value={draft.minNoticeDays}
                      disabled={disabled}
                      onChange={e => set({ minNoticeDays: Number(e.target.value) || 0 })}
                    />
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="rules">
                <ReferralRulesTab settings={draft} rules={draft.rules} disabled={disabled} onChange={rules => set({ rules })} />
              </TabsContent>

              <TabsContent value="rates" className="space-y-4">
                <div className="rounded-md border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
                  <p className="font-medium">Where prices come from</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
                    <li>Council or NHS funded care: the funder’s standard charge card (Settings → Funders). Never a quote — the funder agrees the cost.</li>
                    <li>Everyone else (paying privately, direct payments, people just asking our prices): the branch’s rates below, or the all-branches row.</li>
                    <li>No rates set: the reply says our rates will follow.</li>
                  </ol>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Answer price questions"
                    hint="Give our standard rates when someone asks what we charge."
                    checked={draft.answerPriceQuestions}
                    disabled={disabled}
                    onChange={v => set({ answerPriceQuestions: v })}
                  />
                  <Toggle
                    label="Attach a provisional quotation"
                    hint="When the visits are clear, a quotation is made with these rates and attached as a PDF."
                    checked={draft.autoQuote}
                    disabled={disabled}
                    onChange={v => set({ autoQuote: v })}
                  />
                </div>
                <label className="block text-sm">
                  <span className="font-medium">Quotations are valid for (days)</span>
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    className="mt-1 h-9 w-28"
                    value={draft.quoteValidDays}
                    disabled={disabled}
                    onChange={e => set({ quoteValidDays: Number(e.target.value) || 30 })}
                  />
                </label>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs">
                        <th className="px-2 py-2 font-medium">Standard private rates</th>
                        <th className="px-2 py-2 font-medium">£ per hour</th>
                        <th className="px-2 py-2 font-medium">£ per 30-min visit</th>
                        <th className="px-2 py-2 font-medium">Weekend +%</th>
                        <th className="px-2 py-2 font-medium">Bank holiday +%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.standardRates.map((r, i) => (
                        <RateRow key={r.locationId ?? 'all'} row={r} disabled={disabled} onChange={v => setRate(i, v)} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Rates are per carer. Leave a branch empty to use the all-branches row. Automatic quotations are priced with these rates.
                </p>
              </TabsContent>

              <TabsContent value="areas" className="space-y-3">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs">
                        <th className="px-2 py-2 font-medium">Branch</th>
                        <th className="px-2 py-2 font-medium">Councils it takes referrals from</th>
                        <th className="px-2 py-2 font-medium">Replies signed by</th>
                        <th className="px-2 py-2 font-medium">Title</th>
                        <th className="px-2 py-2 font-medium">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.coverage.map((r, i) => (
                        <tr key={r.locationId} className="border-b border-border last:border-0 align-top">
                          <td className="px-2 py-2 font-medium">{r.branchName}</td>
                          <td className="px-2 py-2">
                            <Input
                              className="h-8"
                              aria-label={`Councils for ${r.branchName}`}
                              value={r.localAuthorities.join(', ')}
                              disabled={disabled}
                              onChange={e => setRow(i, { localAuthorities: e.target.value.split(',').map(x => x.trim()) })}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input className="h-8" value={r.replyManagerName ?? ''} disabled={disabled} onChange={e => setRow(i, { replyManagerName: e.target.value })} aria-label="Manager" />
                          </td>
                          <td className="px-2 py-2">
                            <Input className="h-8" value={r.replyManagerTitle ?? ''} disabled={disabled} onChange={e => setRow(i, { replyManagerTitle: e.target.value })} aria-label="Title" />
                          </td>
                          <td className="px-2 py-2">
                            <Input className="h-8 w-36" value={r.replyPhone ?? ''} disabled={disabled} onChange={e => setRow(i, { replyPhone: e.target.value })} aria-label="Phone" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Council names as postcodes.io gives them, e.g. “Hammersmith and Fulham”. Separate with commas.
                </p>
                <div className="text-sm">
                  <span className="font-medium">Branch for emails with no postcode</span>
                  <ReferralSelect
                    triggerClassName="mt-1 h-9 w-full max-w-sm"
                    ariaLabel="Branch for emails with no postcode"
                    value={draft.unplacedLocationId ?? ''}
                    disabled={disabled}
                    onChange={v => set({ unplacedLocationId: v || null })}
                    options={[
                      { value: '', label: `First branch in the list${draft.coverage[0] ? ` (${draft.coverage[0].branchName})` : ''}` },
                      ...draft.coverage.map(c => ({ value: c.locationId, label: c.branchName })),
                    ]}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  When an email gives no usable postcode (often “what do you charge?”), its enquiry is recorded here until the address is
                  known. Emails from outside your areas never become enquiries.
                </p>
              </TabsContent>

              <TabsContent value="copies" className="space-y-3">
                <label className="block text-sm">
                  <span className="font-medium">Send a copy of every reply to</span>
                  <Input
                    className="mt-1"
                    placeholder="name@allforcare.co.uk"
                    value={copies}
                    disabled={disabled}
                    onChange={e => setCopies(e.target.value)}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Separate addresses with commas. In live use they are copied in secretly (Bcc). While testing they are copied
                  in openly (Cc), only @allforcare.co.uk addresses get copies, and they also get a copy of each test referral email.
                </p>
              </TabsContent>
            </Tabs>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canManage ? (
            <Button type="button" disabled={!draft || save.isPending} onClick={() => draft && save.mutate(draft)}>
              {save.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


