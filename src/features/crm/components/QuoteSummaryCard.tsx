import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PoundSterling } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { STAGE_LABELS } from '@/features/crm/crm-labels'
import {
  QUOTE_STATUS_CLASS,
  RESPONDABLE,
  RESPONSE_TYPE_LABELS,
  REVISABLE,
  SENDABLE,
  money,
} from '@/features/crm/quote-labels'
import {
  useDownloadQuotePdf,
  useEnquiryQuotations,
  useMakeQuotationCurrent,
  useQuoteAction,
  useReconcileLegacyQuote,
} from '@/features/crm/hooks/useQuotations'
import type { Enquiry, EnquiryStage } from '@/features/crm/types/crm.types'
import type { QuotationListItem, QuoteStatus, QuoteVersion } from '@/features/crm/types/quotation.types'

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—')

type QuoteActionKey = 'view' | 'edit' | 'preview' | 'download' | 'send' | 'revise' | 'response' | 'serviceUser'

/** The action whose turn it is for each status; it is highlighted. */
const NEXT_ACTION: Partial<Record<QuoteStatus, QuoteActionKey>> = {
  DRAFT: 'edit',
  PENDING_APPROVAL: 'view',
  APPROVED: 'send',
  SENT: 'response',
  UNDER_NEGOTIATION: 'response',
  CHANGES_REQUESTED: 'revise',
  EXPIRED: 'revise',
  ACCEPTED: 'serviceUser',
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

function LegacyReview({ enquiry }: { enquiry: Enquiry }) {
  const reconcile = useReconcileLegacyQuote(enquiry.id)
  const [stage, setStage] = React.useState<EnquiryStage | ''>('')
  const [note, setNote] = React.useState('')
  return (
    <div className="mt-2 flex flex-col gap-2">
      <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={stage} onChange={e => setStage(e.target.value as EnquiryStage | '')}>
        <option value="">Keep the current stage</option>
        {(['NEW', 'CONTACTED', 'ASSESSMENT'] as EnquiryStage[]).map(s => <option key={s} value={s}>Move back to {STAGE_LABELS[s]}</option>)}
      </select>
      <Input placeholder="What was found (required)" value={note} onChange={e => setNote(e.target.value)} />
      <Button
        size="sm"
        variant="outline"
        className="self-start"
        disabled={!note.trim() || reconcile.isPending}
        onClick={() =>
          reconcile.mutate(
            { action: stage ? 'MOVE_STAGE' : 'ACKNOWLEDGE', stage: stage || undefined, note: note.trim() },
            { onSuccess: () => toastSuccess('Legacy quote reviewed'), onError: e => toastApiError(e, 'Could not save the review') },
          )
        }
      >
        Save review
      </Button>
    </div>
  )
}

/**
 * The current quotation's actions (View, Edit, Preview, Download, Send, Revise, Record response):
 * text links in the Quote card, outline buttons in the page header.
 */
export function QuoteActions({
  enquiry,
  q,
  canManage,
  asButtons = false,
}: {
  enquiry: Enquiry
  q: QuotationListItem
  canManage: boolean
  asButtons?: boolean
}) {
  const navigate = useNavigate()
  const canCreateServiceUser = useAuthStore(s => s.can)('service_users.create')
  const v = q.latestVersion as QuoteVersion
  const lastIssued = q.versions.find(x => x.status !== 'DRAFT' && x.status !== 'PENDING_APPROVAL' && x.status !== 'CANCELLED')
  const pdf = useDownloadQuotePdf(enquiry.id, q.id, lastIssued?.id ?? v.id)
  const action = useQuoteAction(enquiry.id, q.id, v.id)
  // Accepted and not yet an active service user: making one is the next step.
  const serviceUserDue = v.status === 'ACCEPTED' && canCreateServiceUser && !(enquiry.stage === 'WON' && enquiry.convertedServiceUserId)
  const open = (versionId: string, section?: string) =>
    navigate({
      to: '/crm/$enquiryId/quotes/$quotationId/$versionId',
      params: { enquiryId: enquiry.id, quotationId: q.id, versionId },
      search: section ? { section } : {},
    })
  const items: Array<{ key: QuoteActionKey; label: string; onClick: () => void; disabled?: boolean }> = [
    ...(serviceUserDue
      ? [
          {
            key: 'serviceUser' as const,
            label: 'Create service user',
            onClick: () =>
              navigate({
                to: '/crm/$enquiryId/quotes/$quotationId/$versionId/service-user',
                params: { enquiryId: enquiry.id, quotationId: q.id, versionId: v.id },
              }),
          },
        ]
      : []),
    { key: 'view', label: asButtons ? 'View quote' : 'View', onClick: () => open(v.id) },
    ...(canManage && v.editable ? [{ key: 'edit' as const, label: asButtons ? 'Edit quote' : 'Edit', onClick: () => open(v.id, 'schedule') }] : []),
    ...(lastIssued
      ? [
          { key: 'preview' as const, label: 'Preview', onClick: () => open(lastIssued.id, 'review') },
          {
            key: 'download' as const,
            label: 'Download',
            disabled: pdf.isPending,
            onClick: () => pdf.mutate(undefined, { onError: e => toastApiError(e, 'Could not download the PDF') }),
          },
        ]
      : []),
    ...(canManage && SENDABLE.includes(v.status) ? [{ key: 'send' as const, label: 'Send', onClick: () => open(v.id, 'review') }] : []),
    ...(canManage && REVISABLE.includes(v.status)
      ? [
          {
            key: 'revise' as const,
            label: 'Revise',
            disabled: action.isPending,
            onClick: () =>
              action.mutate({ action: 'revise' }, { onSuccess: d => open(d.id, 'schedule'), onError: e => toastApiError(e, 'Could not revise') }),
          },
        ]
      : []),
    ...(canManage && RESPONDABLE.includes(v.status)
      ? [{ key: 'response' as const, label: 'Record response', onClick: () => open(v.id, 'responses') }]
      : []),
  ]
  const next = NEXT_ACTION[v.status]
  if (asButtons) {
    return (
      <>
        {items.map(i => (
          <Button
            key={i.key}
            variant={i.key === next ? 'default' : 'outline'}
            size="sm"
            disabled={i.disabled}
            onClick={i.onClick}
            title={i.key === next ? 'Next step' : undefined}
            data-next={i.key === next || undefined}
          >
            {i.label}
          </Button>
        ))}
      </>
    )
  }
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map(i => (
        <button
          key={i.key}
          type="button"
          className={
            i.key === next
              ? 'rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90'
              : 'text-xs font-medium text-primary hover:underline'
          }
          disabled={i.disabled}
          onClick={i.onClick}
          title={i.key === next ? 'Next step' : undefined}
          data-next={i.key === next || undefined}
        >
          {i.label}
        </button>
      ))}
    </div>
  )
}

function CurrentQuote({ enquiry, q, canManage }: { enquiry: Enquiry; q: QuotationListItem; canManage: boolean }) {
  const v = q.latestVersion as QuoteVersion
  const fu = q.summary.followUp
  return (
    <div className="flex flex-col gap-2 text-sm" data-testid="crm-quote-summary">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{v.label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${QUOTE_STATUS_CLASS[v.status]}`}>{v.statusLabel}</span>
      </div>
      <Row label="Per week">{money(q.summary.weeklyTotal)}</Row>
      <Row label="Average month">{money(q.summary.monthlyAverage)}</Row>
      <Row label="Sent">
        {q.summary.lastSend?.status === 'FAILED' ? (
          <span className="font-medium text-red-700 dark:text-red-300">Email failed · not sent</span>
        ) : q.summary.sentAt ? (
          fmtDate(q.summary.sentAt)
        ) : (
          'Not sent'
        )}
      </Row>
      <Row label="Response">{q.summary.responseType ? `${RESPONSE_TYPE_LABELS[q.summary.responseType]} (${fmtDate(q.summary.respondedAt)})` : 'None yet'}</Row>
      <Row label="Follow-up">
        {fu ? <span className={fu.overdue ? 'font-medium text-red-700' : undefined}>{fu.overdue ? 'Overdue · ' : ''}{fmtDate(fu.dueAt)}</span> : 'None'}
      </Row>
      <QuoteActions enquiry={enquiry} q={q} canManage={canManage} />
    </div>
  )
}

/**
 * Plan → Quote, from real quotation records. A legacy "Quote sent" enquiry without a quotation
 * is flagged (its old figures are shown as recorded, never turned into a quotation).
 */
export function QuoteSummary({ enquiry, canManage }: { enquiry: Enquiry; canManage: boolean }) {
  const navigate = useNavigate()
  const { data, isLoading } = useEnquiryQuotations(enquiry.id)
  const makeCurrent = useMakeQuotationCurrent(enquiry.id)
  const [reviewing, setReviewing] = React.useState(false)
  const quotations = data?.quotations ?? []
  const current = quotations.find(q => q.isCurrent) ?? quotations[0]
  const others = quotations.filter(q => q !== current)
  const create = () => navigate({ to: '/crm/$enquiryId/quotes/new', params: { enquiryId: enquiry.id } })

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <PoundSterling className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Quote</p>
        {isLoading ? (
          <p className="mt-0.5 text-sm text-muted-foreground">Loading…</p>
        ) : current?.latestVersion ? (
          <div className="mt-1 flex flex-col gap-3">
            <CurrentQuote enquiry={enquiry} q={current} canManage={canManage} />
            {others.length > 0 && (
              <div className="border-t border-border pt-2 text-xs text-muted-foreground">
                Other quotations:
                {others.map(o => (
                  <span key={o.id} className="ml-2 inline-flex items-center gap-1">
                    {o.quotationNumber} ({o.latestVersion?.statusLabel})
                    {canManage && (
                      <button type="button" className="font-medium text-primary hover:underline" onClick={() => makeCurrent.mutate(o.id, { onError: e => toastApiError(e, 'Could not change') })}>
                        make current
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {canManage && (
              <button type="button" className="self-start text-xs font-medium text-primary hover:underline" onClick={create}>
                Create another quotation
              </button>
            )}
          </div>
        ) : (
          <div className="mt-0.5 flex flex-col gap-1 text-sm">
            {data?.legacy.unlinked ? (
              <div className="rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-2 text-xs dark:border-amber-900 dark:bg-amber-950/30" data-testid="crm-legacy-quote">
                <p className="font-medium text-amber-800 dark:text-amber-300">Legacy / unlinked quote</p>
                <p className="text-muted-foreground">
                  This enquiry is at “{STAGE_LABELS[enquiry.stage]}” but has no quotation record.
                  {data.legacy.hasLegacyFields ? ' Figures recorded before quotations (not verified):' : ' No quote figures were recorded.'}
                </p>
                {data.legacy.hasLegacyFields && (
                  <p>
                    {[data.legacy.weeklyAmount != null && `${money(data.legacy.weeklyAmount)}/week`, data.legacy.hourlyRate != null && `${money(data.legacy.hourlyRate)}/hour`, data.legacy.sentAt && `sent ${fmtDate(data.legacy.sentAt)}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {canManage && (reviewing ? <LegacyReview enquiry={enquiry} /> : (
                  <button type="button" className="mt-1 font-medium text-primary hover:underline" onClick={() => setReviewing(true)}>Review legacy quote</button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No quotation yet</p>
            )}
            {data?.legacy.reconciledAt && (
              <p className="text-xs text-muted-foreground">Legacy quote reviewed {fmtDate(data.legacy.reconciledAt)}: {data.legacy.reconcileNote}</p>
            )}
            {canManage && (
              <button type="button" className="mt-1 self-start text-xs font-medium text-primary hover:underline" onClick={create}>
                Create quotation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
