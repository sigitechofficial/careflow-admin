import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CheckCircle2,
  Circle,
  Download,
  Eye,
  FileText,
  HandHelping,
  Hourglass,
  Info,
  Mail,
  MailCheck,
  Mailbox,
  MessageSquareReply,
  MoreHorizontal,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { createClientUuid } from '@/shared/lib/create-client-uuid'
import { LOST_REASON_LABELS, LOST_REASON_OPTIONS } from '@/features/crm/crm-labels'
import { useEnquiry } from '@/features/crm/hooks/useCrm'
import {
  RESPONDABLE,
  RESPONSE_TYPE_LABELS,
  REVISABLE,
  SENDABLE,
  SEND_CHANNEL_LABELS,
  PAYER_TYPE_LABELS,
  money,
} from '@/features/crm/quote-labels'
import {
  useConfirmQuoteFunding,
  useConvertQuoteToCarePackage,
  useDownloadQuotePdf,
  useQuoteAction,
  useQuoteDiff,
  useQuoteFollowUps,
  useQuotePreview,
  useRecordQuoteResponse,
  useRetryQuoteEmail,
  useSendQuote,
} from '@/features/crm/hooks/useQuotations'
import type { EnquiryLostReason } from '@/features/crm/types/crm.types'
import { QuoteVersionCompare } from '@/features/crm/components/quote-editor/QuoteVersionCompare'
import type {
  QuoteResponseType,
  QuoteSendChannel,
  QuoteVersionDetail,
} from '@/features/crm/types/quotation.types'

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
const labelClass = 'text-sm font-medium text-foreground'
const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined)

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}

type Props = { enquiryId: string; detail: QuoteVersionDetail; onOpenVersion: (versionId: string) => void }

/* ─── Review & Send ───────────────────────────────────────────────────── */

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null

/** The latest send attempt for this version failed (and nothing was sent since). */
function lastAttemptFailed(detail: QuoteVersionDetail): boolean {
  const latest = detail.communications.find(c => c.versionId === detail.id)
  return latest?.status === 'FAILED'
}

/** Draft → Approved → Sent → Client response, with the date each was reached. */
function ProgressSteps({ detail }: { detail: QuoteVersionDetail }) {
  const s = detail.status
  const response = detail.responses.find(r => r.versionId === detail.id)
  const finalLabel =
    s === 'ACCEPTED' ? 'Accepted' : s === 'DECLINED' ? 'Declined' : s === 'CHANGES_REQUESTED' ? 'Changes requested' : s === 'UNDER_NEGOTIATION' ? 'Query' : 'Client response'
  const steps: Array<{ label: string; date: string | null; done: boolean; failed?: boolean }> = [
    { label: 'Draft', date: detail.createdAt, done: true },
    { label: 'Approved', date: detail.approvedAt, done: Boolean(detail.approvedAt) },
    { label: 'Sent', date: detail.sentAt, done: Boolean(detail.sentAt), failed: !detail.sentAt && lastAttemptFailed(detail) },
    { label: finalLabel, date: response?.respondedAt ?? detail.acceptedAt, done: Boolean(response) || s === 'ACCEPTED' || s === 'DECLINED' },
  ]
  const currentIndex = steps.findIndex(x => !x.done)
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Quote progress">
      {steps.map((step, i) => {
        const current = i === currentIndex
        return (
          <li
            key={step.label}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
              step.failed ? 'border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20' : step.done ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20' : current ? 'border-primary/40 bg-primary/5' : 'border-border'
            }`}
            aria-current={current ? 'step' : undefined}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step.failed ? 'bg-red-600 text-white' : step.done ? 'bg-emerald-600 text-white' : current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.failed ? <XCircle className="h-4 w-4" aria-hidden /> : step.done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`truncate text-sm ${step.done || current ? 'font-medium' : 'text-muted-foreground'}`}>{step.label}</p>
              <p className={`text-xs ${step.failed ? 'font-medium text-red-700 dark:text-red-300' : 'text-muted-foreground'}`}>
                {step.failed ? 'Email failed — not sent' : step.done ? fmtDate(step.date) ?? '—' : current ? 'Next' : 'Not yet'}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

const CHANNEL_ICONS: Record<QuoteSendChannel, typeof Mail> = {
  EMAIL: Mail,
  EXTERNAL_EMAIL: MailCheck,
  POST: Mailbox,
  HAND_DELIVERED: HandHelping,
  OTHER: MoreHorizontal,
}

function SendForm({ enquiryId, detail, onDone }: { enquiryId: string; detail: QuoteVersionDetail; onDone: () => void }) {
  const send = useSendQuote(enquiryId, detail.quotationId, detail.id)
  const key = React.useRef(createClientUuid())
  const [channel, setChannel] = React.useState<QuoteSendChannel>(detail.emailAvailable ? 'EMAIL' : 'EXTERNAL_EMAIL')
  const [name, setName] = React.useState(detail.defaultRecipient.name ?? '')
  const [email, setEmail] = React.useState(detail.defaultRecipient.email ?? '')
  const [message, setMessage] = React.useState('')
  const [sentAt, setSentAt] = React.useState('')
  const [followUp, setFollowUp] = React.useState('')
  const isEmail = channel === 'EMAIL'
  const submit = () =>
    send.mutate(
      {
        channel,
        recipientName: name.trim() || undefined,
        recipientEmail: email.trim() || undefined,
        message: message.trim() || undefined,
        sentAt: isEmail ? undefined : toIso(sentAt),
        followUpDate: toIso(followUp),
        idempotencyKey: key.current,
      },
      {
        onSuccess: () => {
          toastSuccess(isEmail ? 'Quotation emailed' : 'Send recorded')
          key.current = createClientUuid()
          onDone()
        },
        onError: e => {
          // A failed email is kept in the history (retry there); a new attempt gets a new key.
          key.current = createClientUuid()
          toastApiError(e, 'Could not send the quotation')
        },
      },
    )
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm" data-testid="quote-send-form">
      <div>
        <h4 className="text-base font-semibold">Send {detail.label}</h4>
        <p className="text-sm text-muted-foreground">Choose how the quotation reaches the client.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-5" role="radiogroup" aria-label="How it is sent">
        {(Object.keys(SEND_CHANNEL_LABELS) as QuoteSendChannel[]).map(c => {
          const Icon = CHANNEL_ICONS[c]
          const disabled = c === 'EMAIL' && !detail.emailAvailable
          const active = channel === c
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => setChannel(c)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                active ? 'border-primary bg-primary/5 font-semibold text-primary ring-1 ring-primary' : 'border-border hover:bg-muted'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {SEND_CHANNEL_LABELS[c]}
              {disabled && <span className="text-[10px] font-normal text-muted-foreground">Not set up</span>}
            </button>
          )
        })}
      </div>
      {!isEmail && (
        <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          CareFlow does not send anything — this records that the quotation was sent another way, and moves the enquiry to “Quote sent”.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Recipient name"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label={isEmail ? 'Recipient email *' : 'Recipient email'}><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        {!isEmail && <Field label="Sent at"><Input type="datetime-local" value={sentAt} onChange={e => setSentAt(e.target.value)} /></Field>}
        <Field label="Follow up on"><Input type="datetime-local" value={followUp} onChange={e => setFollowUp(e.target.value)} /></Field>
        {isEmail && <Field label="Message" className="sm:col-span-2"><Textarea value={message} placeholder="Optional covering message. The PDF is attached." onChange={e => setMessage(e.target.value)} /></Field>}
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button onClick={submit} disabled={send.isPending || (isEmail && !email.trim())}>
          <Send className="mr-1.5 h-4 w-4" aria-hidden />
          {send.isPending ? 'Sending…' : isEmail ? 'Send email' : 'Record send'}
        </Button>
      </div>
    </div>
  )
}

/** The client preview, laid out like the quotation document (no internal notes). */
function ClientPreview({ enquiryId, detail }: { enquiryId: string; detail: QuoteVersionDetail }) {
  const { data, isLoading, error } = useQuotePreview(enquiryId, detail.quotationId, detail.id, !detail.editable)
  if (detail.editable) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">No client preview yet</p>
        <p className="max-w-md text-sm text-muted-foreground">The preview and PDF are made from the approved version, so the client sees exactly what was approved.</p>
      </div>
    )
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading preview…</p>
  if (error || !data) return <p className="text-sm text-red-700">Preview not available.</p>
  const th = 'py-2 pr-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground'
  // "Total only": the visits by time of day, no times or per-visit prices.
  const summary = data.layout === 'SUMMARY'
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="h-4 w-4" aria-hidden />
        Client preview — exactly what the client receives. Internal notes are never included.
      </p>
      <article className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-white p-8 text-sm text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100" data-testid="quote-client-preview">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <div>
            <p className="text-lg font-semibold">{data.provider?.name ?? 'Care provider'}</p>
            <p className="text-xs text-zinc-500">{[data.provider?.email, data.provider?.phone].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Care quotation</p>
            <p className="text-base font-semibold">{data.quotationNumber}</p>
            <p className="text-xs text-zinc-500">Version {data.versionNumber} · {data.quoteTypeLabel}</p>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 py-5 sm:grid-cols-4">
          {[
            ['Prepared for', data.clientName],
            ['Issue date', data.issueDate ?? '—'],
            ['Valid until', data.validUntil ?? '—'],
            ['Proposed start', data.proposedStartDate ?? '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-zinc-500">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <h5 className="mb-1 mt-2 font-semibold">Proposed visits</h5>
        <table className="w-full" data-testid="quote-preview-visits">
          <thead className="border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className={th}>Visit</th>
              <th className={th}>{summary ? 'Days' : 'When'}</th>
              <th className={th}>Carers</th>
              {!summary && <th className={`${th} text-right`}>Price</th>}
            </tr>
          </thead>
          <tbody>
            {data.visits.map((v, i) => (
              <tr key={i} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                <td className="py-2 pr-3">
                  <p className="font-medium">{v.label}</p>
                  {v.activities.length > 0 && <p className="text-xs text-zinc-500">{v.activities.join(', ')}</p>}
                </td>
                <td className="py-2 pr-3">{v.when}{!summary && <span className="block text-xs text-zinc-500">{v.duration}</span>}</td>
                <td className="py-2 pr-3">{v.carers}</td>
                {!summary && (
                  <td className="py-2 text-right">{v.weekly}{v.perVisit && <span className="block text-xs text-zinc-500">{v.perVisit} per visit</span>}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {(data.rates?.length ?? 0) > 0 && (
          <>
            <h5 className="mb-1 mt-6 font-semibold">Rates used</h5>
            <table className="w-full" data-testid="quote-preview-rates">
              <tbody>
                {data.rates!.map(r => (
                  <tr key={r.label} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-3">{r.label}</td>
                    <td className="py-2 text-right">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {data.extras.length > 0 && (
          <>
            <h5 className="mb-1 mt-6 font-semibold">Other charges</h5>
            <table className="w-full">
              <tbody>
                {data.extras.map(e => (
                  <tr key={e.description} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-3">{e.description} <span className="text-xs text-zinc-500">({e.frequency})</span></td>
                    <td className="py-2 text-right">{e.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h5 className="mb-1 mt-6 font-semibold">Cost summary</h5>
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          {data.totals.map((t, i) => (
            <div key={t.label} className={`flex items-start justify-between gap-4 px-4 py-2.5 ${i === 0 ? 'bg-primary/5' : 'border-t border-zinc-200 dark:border-zinc-800'}`}>
              <div>
                <p className={i === 0 ? 'font-semibold' : 'font-medium'}>{t.label}</p>
                <p className="text-xs text-zinc-500">{t.method}</p>
              </div>
              <p className={i === 0 ? 'text-lg font-semibold' : 'font-medium'}>{t.amount}</p>
            </div>
          ))}
          {data.oneOffTotal && (
            <div className="flex justify-between border-t border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
              <p className="font-medium">One-off charges</p>
              <p className="font-medium">{data.oneOffTotal}</p>
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">{data.vatLabel}</p>

        {data.funding.length > 0 && (
          <>
            <h5 className="mb-1 mt-6 font-semibold">Funding</h5>
            <table className="w-full">
              <tbody>
                {data.funding.map(f => (
                  <tr key={f.payer + f.detail} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-3">{f.payer} <span className="text-xs text-zinc-500">· {f.detail} · {f.status}</span></td>
                    <td className="py-2 text-right">{f.weekly}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-3 font-semibold">You pay</td>
                  <td className="py-2 text-right font-semibold">{data.clientWeeklyLiability}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {data.clientNotes && (
          <>
            <h5 className="mb-1 mt-6 font-semibold">Notes</h5>
            <p className="whitespace-pre-wrap">{data.clientNotes}</p>
          </>
        )}
        {data.terms && (
          <>
            <h5 className="mb-1 mt-6 font-semibold">Terms</h5>
            <p className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">{data.terms}</p>
          </>
        )}
        <p className="mt-8 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
          This quotation is an estimate based on the visits described above. To accept, please contact us; acceptance is recorded by our office.
        </p>
      </article>
    </div>
  )
}

/** What to do now for this status: title, explanation and the main buttons. */
function nextStep(detail: QuoteVersionDetail): { icon: typeof Mail; title: string; text: string; tone: 'primary' | 'waiting' | 'done' | 'closed' } {
  switch (detail.status) {
    case 'DRAFT':
      return { icon: ShieldCheck, title: 'Approve this quote', text: 'Approving checks the price, locks this version and makes the PDF. You can then send it.', tone: 'primary' }
    case 'PENDING_APPROVAL':
      return { icon: Hourglass, title: 'Waiting for approval', text: 'Approve it, or send it back to draft to make changes.', tone: 'waiting' }
    case 'APPROVED':
      return { icon: Send, title: 'Send to the client', text: 'Email it from CareFlow or record that it was sent another way.', tone: 'primary' }
    case 'SENT':
    case 'UNDER_NEGOTIATION':
      return { icon: Hourglass, title: 'Waiting for the client', text: 'Record the client’s answer when it comes in, or send it again.', tone: 'waiting' }
    case 'CHANGES_REQUESTED':
      return { icon: RotateCcw, title: 'Changes requested', text: 'A new draft version was created from this one. Open it from the version list to make the changes.', tone: 'waiting' }
    case 'ACCEPTED':
      return { icon: CheckCircle2, title: 'Accepted by the client', text: 'Next: record the agreement, create the service user and the draft care package (Responses & Activity).', tone: 'done' }
    case 'DECLINED':
      return { icon: XCircle, title: 'Declined', text: 'The client declined this quote. You can revise it to offer a new version.', tone: 'closed' }
    case 'EXPIRED':
      return { icon: Hourglass, title: 'Expired', text: 'The valid-until date has passed. Revise it to send an updated quote.', tone: 'closed' }
    case 'SUPERSEDED':
      return { icon: RotateCcw, title: 'Replaced by a newer version', text: 'Open the latest version from the version list.', tone: 'closed' }
    default:
      return { icon: XCircle, title: 'Cancelled', text: 'This version is no longer in use.', tone: 'closed' }
  }
}

const TONE_CLASS = {
  primary: 'border-primary/30 bg-primary/5 text-primary',
  waiting: 'border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300',
  done: 'border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300',
  closed: 'border-border bg-muted/40 text-muted-foreground',
}

export function ReviewAndSendPanel({ enquiryId, detail, onOpenVersion, onRecordResponse }: Props & { onRecordResponse?: () => void }) {
  const canManage = useAuthStore(s => s.can)('crm.manage')
  const action = useQuoteAction(enquiryId, detail.quotationId, detail.id)
  const pdf = useDownloadQuotePdf(enquiryId, detail.quotationId, detail.id)
  const [note, setNote] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const run = (a: Parameters<typeof action.mutate>[0]['action'], done: string) =>
    action.mutate(
      { action: a, note: note.trim() || undefined },
      {
        onSuccess: d => {
          toastSuccess(done)
          setNote('')
          if (a === 'revise') onOpenVersion(d.id)
        },
        onError: e => toastApiError(e, 'Could not update the quotation'),
      },
    )
  const retry = useRetryQuoteEmail(enquiryId, detail.quotationId)
  const failedEmail = !detail.sentAt && lastAttemptFailed(detail) ? detail.communications.find(c => c.versionId === detail.id)! : null
  const s = detail.status
  const step = nextStep(detail)
  const StepIcon = step.icon
  const busy = action.isPending

  return (
    <div className="flex flex-col gap-6">
      <ProgressSteps detail={detail} />

      {failedEmail && SENDABLE.includes(s) && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50/70 p-4 text-sm dark:border-red-900 dark:bg-red-950/30" role="alert" data-testid="quote-send-failed">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold text-red-800 dark:text-red-200">The email was not sent</p>
              <p className="text-red-800/90 dark:text-red-200/90">
                Sending to {failedEmail.recipientEmail ?? 'the client'} failed on {fmtDateTime(failedEmail.createdAt)}. The client has not received this quote and the enquiry was not moved to “Quote sent”.
              </p>
              {failedEmail.failureReason && <p className="mt-1 break-words text-xs text-red-700/80 dark:text-red-300/80">Reason: {failedEmail.failureReason}</p>}
            </div>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {detail.emailAvailable && (
                <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(failedEmail.id, { onSuccess: () => toastSuccess('Quotation emailed'), onError: e => toastApiError(e, 'The email failed again') })}>
                  <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                  {retry.isPending ? 'Retrying…' : 'Retry email'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setSending(true)}>
                <Send className="mr-1.5 h-4 w-4" aria-hidden />
                Send another way
              </Button>
            </div>
          )}
        </div>
      )}

      <div className={`flex flex-col gap-4 rounded-xl border p-5 ${TONE_CLASS[step.tone]}`} data-testid="quote-next-step">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background shadow-sm">
            <StepIcon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-foreground">
            <p className="text-base font-semibold">{step.title}</p>
            <p className="text-sm text-muted-foreground">{step.text}</p>
          </div>
        </div>

        {canManage && (s === 'DRAFT' || s === 'PENDING_APPROVAL') && (
          <div className="text-foreground">
            <Field label="Approval note (optional)"><Input value={note} placeholder="e.g. Checked against the assessment" onChange={e => setNote(e.target.value)} /></Field>
          </div>
        )}

        {canManage && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-foreground">
            <div className="flex flex-wrap gap-2">
              {(s === 'DRAFT' || s === 'PENDING_APPROVAL') && (
                <Button disabled={busy} onClick={() => run('approve', 'Quotation approved')}>
                  <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden />
                  Approve
                </Button>
              )}
              {s === 'DRAFT' && <Button variant="outline" disabled={busy} onClick={() => run('submit', 'Submitted for approval')}>Submit for approval</Button>}
              {s === 'PENDING_APPROVAL' && <Button variant="outline" disabled={busy} onClick={() => run('reject-approval', 'Returned to draft')}>Return to draft</Button>}
              {SENDABLE.includes(s) && (
                <Button variant={s === 'APPROVED' ? 'default' : 'outline'} onClick={() => setSending(v => !v)}>
                  <Send className="mr-1.5 h-4 w-4" aria-hidden />
                  {s === 'APPROVED' ? 'Send to client' : 'Send again'}
                </Button>
              )}
              {RESPONDABLE.includes(s) && onRecordResponse && (
                <Button onClick={onRecordResponse}>
                  <MessageSquareReply className="mr-1.5 h-4 w-4" aria-hidden />
                  Record response
                </Button>
              )}
              {s === 'ACCEPTED' && onRecordResponse && <Button onClick={onRecordResponse}>Next steps</Button>}
            </div>
            <div className="flex flex-wrap gap-2">
              {!detail.editable && (
                <Button variant="outline" size="sm" disabled={pdf.isPending} onClick={() => pdf.mutate(undefined, { onError: e => toastApiError(e, 'Could not download the PDF') })}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden />
                  {pdf.isPending ? 'Preparing…' : 'Download PDF'}
                </Button>
              )}
              {REVISABLE.includes(s) && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => run('revise', 'New draft version created')}>
                  <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                  Revise
                </Button>
              )}
              {!['ACCEPTED', 'DECLINED', 'SUPERSEDED', 'CANCELLED'].includes(s) && (
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" disabled={busy} onClick={() => run('cancel', 'Quotation cancelled')}>
                  <XCircle className="mr-1.5 h-4 w-4" aria-hidden />
                  Cancel quote
                </Button>
              )}
            </div>
          </div>
        )}
        {s === 'DRAFT' && <p className="text-xs text-muted-foreground">A draft never moves the enquiry to “Quote sent” — only a send (or a recorded external send) does.</p>}
      </div>

      {sending && SENDABLE.includes(s) && <SendForm enquiryId={enquiryId} detail={detail} onDone={() => setSending(false)} />}

      <ClientPreview enquiryId={enquiryId} detail={detail} />
    </div>
  )
}

/* ─── Responses & Activity ────────────────────────────────────────────── */

function ResponseForm({ enquiryId, detail, onOpenVersion }: Props) {
  const navigate = useNavigate()
  const record = useRecordQuoteResponse(enquiryId, detail.quotationId, detail.id)
  const [type, setType] = React.useState<QuoteResponseType>('ACCEPTED')
  const [form, setForm] = React.useState({ responderName: '', responderRelationship: '', method: 'Phone', respondedAt: '', details: '', evidence: '', nextAction: '', followUpAt: '' })
  const [reason, setReason] = React.useState<EnquiryLostReason | ''>('')
  const [markLost, setMarkLost] = React.useState(true)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const needsReason = type === 'DECLINED'
  const canSubmit = !needsReason || (reason && (reason !== 'OTHER' || form.details.trim()))
  const submit = () =>
    record.mutate(
      {
        responseType: type,
        responderName: form.responderName.trim() || undefined,
        responderRelationship: form.responderRelationship.trim() || undefined,
        method: form.method.trim() || undefined,
        respondedAt: toIso(form.respondedAt),
        details: form.details.trim() || undefined,
        evidence: form.evidence.trim() || undefined,
        declineReasonCode: needsReason && reason ? reason : undefined,
        markEnquiryLost: needsReason ? markLost : undefined,
        nextAction: form.nextAction.trim() || undefined,
        followUpAt: toIso(form.followUpAt),
      },
      {
        onSuccess: d => {
          toastSuccess('Response recorded')
          // Accepted: on to the page that shows what is missing and creates the service user.
          if (type === 'ACCEPTED')
            navigate({
              to: '/crm/$enquiryId/quotes/$quotationId/$versionId/service-user',
              params: { enquiryId, quotationId: detail.quotationId, versionId: d.id },
            })
          else if (d.id !== detail.id) onOpenVersion(d.id)
        },
        onError: e => toastApiError(e, 'Could not record the response'),
      },
    )
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3" data-testid="quote-response-form">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Response">
          <select className={selectClass} value={type} onChange={e => setType(e.target.value as QuoteResponseType)}>
            {(Object.keys(RESPONSE_TYPE_LABELS) as QuoteResponseType[]).map(t => <option key={t} value={t}>{RESPONSE_TYPE_LABELS[t]}</option>)}
          </select>
        </Field>
        <Field label="Who responded"><Input value={form.responderName} onChange={set('responderName')} /></Field>
        <Field label="Relationship"><Input value={form.responderRelationship} onChange={set('responderRelationship')} placeholder="e.g. Daughter" /></Field>
        <Field label="How"><Input value={form.method} onChange={set('method')} /></Field>
        <Field label="When"><Input type="datetime-local" value={form.respondedAt} onChange={set('respondedAt')} /></Field>
        <Field label="Evidence"><Input value={form.evidence} onChange={set('evidence')} placeholder="e.g. Email saved to documents" /></Field>
      </div>
      {needsReason && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Reason (required)">
            <select className={selectClass} value={reason} onChange={e => setReason(e.target.value as EnquiryLostReason | '')}>
              <option value="">Select a reason…</option>
              {LOST_REASON_OPTIONS.map(r => <option key={r} value={r}>{LOST_REASON_LABELS[r]}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm sm:mt-6">
            <input type="checkbox" checked={markLost} onChange={e => setMarkLost(e.target.checked)} />
            Also mark the enquiry as lost
          </label>
        </div>
      )}
      <Field label={needsReason && reason === 'OTHER' ? 'Details (required)' : 'Details'}><Textarea value={form.details} onChange={set('details')} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Next action"><Input value={form.nextAction} onChange={set('nextAction')} /></Field>
        <Field label="Follow up on"><Input type="datetime-local" value={form.followUpAt} onChange={set('followUpAt')} /></Field>
      </div>
      {type === 'ACCEPTED' && (
        <p className="text-xs text-muted-foreground">Accepting marks this exact version. The enquiry is not marked Won automatically — create the service user to win it.</p>
      )}
      {type === 'CHANGES_REQUESTED' && <p className="text-xs text-muted-foreground">A new draft version is created from this one; this version is kept as it is.</p>}
      <Button className="self-start" disabled={record.isPending || !canSubmit} onClick={submit}>Record response</Button>
    </div>
  )
}

function FollowUps({ enquiryId, detail }: { enquiryId: string; detail: QuoteVersionDetail }) {
  const { create, update } = useQuoteFollowUps(enquiryId, detail.quotationId)
  const [dueAt, setDueAt] = React.useState('')
  const [note, setNote] = React.useState('')
  const [method, setMethod] = React.useState('Phone')
  const [moving, setMoving] = React.useState<{ id: string; dueAt: string } | null>(null)
  const err = (e: unknown) => toastApiError(e, 'Could not update the follow-up')
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold">Follow-ups</h4>
      <ul className="flex flex-col gap-1.5 text-sm">
        {detail.followUps.map(f => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
            <span>
              <span className={f.overdue ? 'font-medium text-red-700' : 'font-medium'}>{fmtDateTime(f.dueAt)}</span>
              {f.overdue && <span className="ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Overdue</span>}
              <span className="text-muted-foreground"> · {[f.method, f.note, f.assigneeName && `for ${f.assigneeName}`].filter(Boolean).join(' · ')}</span>
              {f.status !== 'OPEN' && <span className="text-muted-foreground"> · {f.status === 'DONE' ? 'Done' : 'Closed'}{f.outcome ? `: ${f.outcome}` : ''}{f.completedByName ? ` by ${f.completedByName}` : ''}</span>}
            </span>
            {f.status === 'OPEN' && (
              <span className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: f.id, body: { action: 'COMPLETE' } }, { onError: err })}>Done</Button>
                <Button size="sm" variant="outline" onClick={() => setMoving({ id: f.id, dueAt: '' })}>Reschedule</Button>
                <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: f.id, body: { action: 'CANCEL' } }, { onError: err })}>Cancel</Button>
              </span>
            )}
            {moving?.id === f.id && (
              <span className="flex w-full gap-2">
                <Input type="datetime-local" value={moving.dueAt} onChange={e => setMoving({ id: f.id, dueAt: e.target.value })} />
                <Button
                  size="sm"
                  disabled={!moving.dueAt}
                  onClick={() => update.mutate({ id: f.id, body: { action: 'RESCHEDULE', dueAt: toIso(moving.dueAt) } }, { onSuccess: () => setMoving(null), onError: err })}
                >
                  Save
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="grid items-end gap-2 sm:grid-cols-4">
        <Field label="Due"><Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} /></Field>
        <Field label="How"><Input value={method} onChange={e => setMethod(e.target.value)} /></Field>
        <Field label="Note"><Input value={note} onChange={e => setNote(e.target.value)} /></Field>
        <Button
          variant="outline"
          disabled={!dueAt || create.isPending}
          onClick={() =>
            create.mutate(
              { dueAt: toIso(dueAt)!, method: method.trim() || undefined, note: note.trim() || undefined, versionId: detail.id },
              { onSuccess: () => { setDueAt(''); setNote('') }, onError: err },
            )
          }
        >
          Schedule follow-up
        </Button>
      </div>
    </section>
  )
}

/**
 * A funder's share still waiting for approval on an accepted quote. Confirming records the
 * funder's reference; the price and the copy the client received do not change.
 */
export function PendingFunding({
  enquiryId,
  detail,
  funding,
}: {
  enquiryId: string
  detail: QuoteVersionDetail
  funding: QuoteVersionDetail['fundings'][number]
}) {
  const confirm = useConfirmQuoteFunding(enquiryId, detail.quotationId, detail.id)
  const [reference, setReference] = React.useState(funding.reference ?? '')
  const payer = funding.payerName?.trim() || PAYER_TYPE_LABELS[funding.payerType]
  // A fixed weekly amount is already the weekly figure, so only a % or per-visit share is shown.
  const share =
    funding.method === 'PERCENTAGE' ? `${funding.amount}% · ` : funding.method === 'PER_VISIT' ? `${money(funding.amount)} per visit · ` : ''
  return (
    <li className="flex flex-col gap-2 rounded-md border border-amber-200 bg-background p-2.5 sm:flex-row sm:items-center" data-testid="quote-pending-funding">
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{payer}</span>
        <span className="text-muted-foreground"> · {share}{money(funding.weeklyAmount)} / week · waiting for approval</span>
      </div>
      <Input
        className="h-9 sm:w-56"
        placeholder="Funder's reference (optional)"
        aria-label={`Funding reference for ${payer}`}
        value={reference}
        onChange={e => setReference(e.target.value)}
      />
      <Button
        variant="outline"
        className="h-9"
        disabled={confirm.isPending}
        onClick={() =>
          confirm.mutate(
            { fundingId: funding.id, reference: reference.trim() || undefined },
            {
              onSuccess: () => toastSuccess('Funding confirmed', payer),
              onError: e => toastApiError(e, 'Could not confirm the funding'),
            },
          )
        }
      >
        Confirm funding
      </Button>
    </li>
  )
}

function AcceptedNextSteps({ enquiryId, detail }: { enquiryId: string; detail: QuoteVersionDetail }) {
  const navigate = useNavigate()
  const can = useAuthStore(s => s.can)
  const { data: enquiry } = useEnquiry(enquiryId)
  // The Pre-admission record made for the initial assessment is linked too; Won means it was made active.
  const activeServiceUser = Boolean(detail.serviceUserId) && enquiry?.stage === 'WON'
  const agreement = useQuoteAction(enquiryId, detail.quotationId, detail.id)
  const convert = useConvertQuoteToCarePackage(enquiryId, detail.quotationId, detail.id)
  const [note, setNote] = React.useState('')
  const pendingFundings = detail.fundings.filter(f => f.payerType !== 'PRIVATE_CLIENT' && f.status !== 'CONFIRMED')
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
      <h4 className="text-sm font-semibold">Accepted — before care starts</h4>
      <ul className="flex flex-col gap-1 text-sm">
        {(detail.prerequisites ?? []).map(p => (
          <li key={p.key} className="flex items-center gap-2">
            {p.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> : <Circle className="h-4 w-4 text-amber-600" aria-hidden />}
            <span className="font-medium">{p.label}</span>
            <span className="text-muted-foreground">{p.done ? '' : 'Pending — '}{p.detail}</span>
          </li>
        ))}
      </ul>
      {pendingFundings.length > 0 && can('crm.manage') && (
        <ul className="flex flex-col gap-2">
          {pendingFundings.map(f => (
            <PendingFunding key={f.id} enquiryId={enquiryId} detail={detail} funding={f} />
          ))}
        </ul>
      )}
      {!detail.agreementReceivedAt && (
        <div className="flex gap-2">
          <Input placeholder="Where the signed agreement is kept" value={note} onChange={e => setNote(e.target.value)} />
          <Button variant="outline" disabled={agreement.isPending} onClick={() => agreement.mutate({ action: 'agreement', note: note.trim() || undefined }, { onSuccess: () => toastSuccess('Agreement recorded'), onError: e => toastApiError(e, 'Could not record the agreement') })}>
            Record agreement received
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!activeServiceUser && can('service_users.create') && (
          <Button
            variant="outline"
            onClick={() =>
              navigate({
                to: '/crm/$enquiryId/quotes/$quotationId/$versionId/service-user',
                params: { enquiryId, quotationId: detail.quotationId, versionId: detail.id },
              })
            }
          >
            Create service user
          </Button>
        )}
        {detail.serviceUserId && (
          <Button variant="outline" onClick={() => navigate({ to: '/service-users/$serviceUserId/view', params: { serviceUserId: detail.serviceUserId! } })}>View service user</Button>
        )}
        {detail.convertedVisitPlanId ? (
          <span className="self-center text-sm text-emerald-700">Draft care package created (not active, no carers assigned).</span>
        ) : (
          <Button
            disabled={!detail.serviceUserId || convert.isPending}
            title={detail.serviceUserId ? undefined : 'Create the service user first'}
            onClick={() =>
              convert.mutate(undefined, {
                onSuccess: r => toastSuccess(r.hasActivePackage ? 'Draft package created — the live package was not changed' : 'Draft care package created'),
                onError: e => toastApiError(e, 'Could not create the care package'),
              })
            }
          >
            Create draft care package from accepted quote
          </Button>
        )}
      </div>
    </section>
  )
}

function CompareVersions({ enquiryId, detail }: { enquiryId: string; detail: QuoteVersionDetail }) {
  const others = detail.allVersions.filter(v => v.id !== detail.id)
  const [other, setOther] = React.useState<string>(others.find(v => v.versionNumber < detail.versionNumber)?.id ?? '')
  const { data } = useQuoteDiff(enquiryId, detail.quotationId, detail.id, other || null)
  if (!others.length) return null
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold">Compare versions</h4>
      <select className={`${selectClass} max-w-xs`} value={other} onChange={e => setOther(e.target.value)}>
        <option value="">Choose a version…</option>
        {others.map(v => <option key={v.id} value={v.id}>V{v.versionNumber} ({v.statusLabel})</option>)}
      </select>
      {data && <QuoteVersionCompare diff={data} />}
    </section>
  )
}

export function ResponsesAndActivityPanel({ enquiryId, detail, onOpenVersion }: Props) {
  const retry = useRetryQuoteEmail(enquiryId, detail.quotationId)
  return (
    <div className="flex flex-col gap-6">
      {detail.status === 'ACCEPTED' && <AcceptedNextSteps enquiryId={enquiryId} detail={detail} />}
      {RESPONDABLE.includes(detail.status) && <ResponseForm enquiryId={enquiryId} detail={detail} onOpenVersion={onOpenVersion} />}
      <section className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">Responses</h4>
        {detail.responses.length === 0 ? <p className="text-sm text-muted-foreground">No response recorded.</p> : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {detail.responses.map(r => (
              <li key={r.id} className="rounded-md bg-muted/40 px-3 py-2">
                <span className="font-medium">{RESPONSE_TYPE_LABELS[r.responseType]}</span>
                <span className="text-muted-foreground"> · V{detail.allVersions.find(v => v.id === r.versionId)?.versionNumber} · {fmtDateTime(r.respondedAt)}
                  {r.responderName ? ` · ${r.responderName}${r.responderRelationship ? ` (${r.responderRelationship})` : ''}` : ''}
                  {r.method ? ` · ${r.method}` : ''}{r.recordedByName ? ` · recorded by ${r.recordedByName}` : ''}</span>
                {r.declineReasonCode && <p>Reason: {LOST_REASON_LABELS[r.declineReasonCode]}</p>}
                {r.details && <p className="whitespace-pre-wrap">{r.details}</p>}
                {r.evidence && <p className="text-xs text-muted-foreground">Evidence: {r.evidence}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">Communication history</h4>
        {detail.communications.length === 0 ? <p className="text-sm text-muted-foreground">Not sent yet.</p> : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {detail.communications.map(c => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
                <span>
                  <span className="font-medium">{SEND_CHANNEL_LABELS[c.channel]}</span>
                  <span className="text-muted-foreground"> · V{detail.allVersions.find(v => v.id === c.versionId)?.versionNumber} · {c.status === 'RECORDED' ? 'Recorded as sent' : c.status === 'SENT' ? 'Sent' : 'FAILED — not sent'} {fmtDateTime(c.sentAt ?? c.createdAt)}
                    {c.recipientEmail || c.recipientName ? ` · to ${[c.recipientName, c.recipientEmail].filter(Boolean).join(' ')}` : ''}
                    {c.senderName ? ` · by ${c.senderName}` : ''}{c.attemptCount > 1 ? ` · ${c.attemptCount} attempts` : ''}</span>
                  {c.failureReason && c.status === 'FAILED' && <span className="block text-xs text-red-700">{c.failureReason}</span>}
                </span>
                {c.status === 'FAILED' && c.channel === 'EMAIL' && (
                  <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(c.id, { onSuccess: () => toastSuccess('Quotation emailed'), onError: e => toastApiError(e, 'Retry failed') })}>Retry</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <FollowUps enquiryId={enquiryId} detail={detail} />
      <CompareVersions enquiryId={enquiryId} detail={detail} />
    </div>
  )
}
