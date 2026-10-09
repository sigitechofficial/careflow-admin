import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, ChevronDown, ChevronRight, FilePlus2, FileText, PenLine, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
} from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUserEnterpriseFundings } from '@/features/service-users/hooks/useServiceUserTabs'
import {
  QUOTATION_DOCUMENT_LINK,
  REFERRAL_DOCUMENT_LINK,
  useQuotation,
  useQuotationMutations,
  useQuotations,
  useReferral,
  useReferralHistory,
  useReferralMutations,
  useReferrals,
} from '@/features/service-users/referrals/useReferrals'
import type {
  QuotationAction,
  QuotationDetail,
  ReferralDetail,
  ReferralStatus,
} from '@/features/service-users/referrals/referral-types'
import {
  CHARGE_FREQUENCY_LABEL,
  PAYER_TYPE_LABEL,
  QUOTATION_STATUS_LABEL,
  REFERRAL_PRIORITY_LABEL,
  REFERRAL_SOURCE_LABEL,
  REFERRAL_STATUS_LABEL,
  REFERRAL_VIA_LABEL,
  formatGbp,
  priorityVariant,
  quotationStatusVariant,
  referralStatusVariant,
} from '@/features/service-users/referrals/referral-labels'
import {
  ReferralFollowUpDialog,
  ReferralFormDialog,
  ReferralStatusDialog,
  nextReferralStatuses,
} from '@/features/service-users/referrals/components/ReferralDialogs'
import {
  QuotationEditorDialog,
  QuotationStatusDialog,
} from '@/features/service-users/referrals/components/QuotationDialogs'
import { LinkedDocumentsPanel, ReferralHistoryList } from '@/features/service-users/referrals/components/ReferralShared'
import { referralTextareaClass } from '@/features/service-users/referrals/components/ReferralFormFields'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { toastApiError } from '@/shared/lib/toast'

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children || '—'}</dd>
    </div>
  )
}

function Card({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  )
}

function Collapsible({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-foreground"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

// ----------------------------------------------------------------- referral detail

function ReferralDetailPanel({
  serviceUserId,
  referral,
  canEdit,
  canQuote,
  onNewQuotation,
  onOpenQuotation,
}: {
  serviceUserId: string
  referral: ReferralDetail
  canEdit: boolean
  canQuote: boolean
  onNewQuotation: (referralId: string) => void
  onOpenQuotation: (id: string) => void
}) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [followUpOpen, setFollowUpOpen] = React.useState(false)
  const [statusTarget, setStatusTarget] = React.useState<ReferralStatus | null>(null)
  const [note, setNote] = React.useState('')
  const m = useReferralMutations(serviceUserId)
  const fundings = useServiceUserEnterpriseFundings(serviceUserId).data?.rows ?? []
  const activeFundings = fundings.filter(f => f.isActive)
  const r = referral
  const nextStatuses = nextReferralStatuses(r.status)
  const isPrivate = ['PRIVATE', 'SELF_FUNDED', 'FAMILY_FUNDED'].includes(r.fundingType?.code ?? '')

  const onAddNote = async () => {
    if (!note.trim()) return
    try {
      await m.note.mutateAsync({ id: r.id, note: note.trim() })
      setNote('')
    } catch (e) {
      toastApiError(e, 'Could not add note.')
    }
  }

  return (
    <div className="space-y-4" data-testid="referral-detail">
      <Card
        title={`Referral ${r.referenceNumber}`}
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-1.5">
              {nextStatuses.map(s => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={s === 'ACCEPTED' ? 'default' : 'outline'}
                  onClick={() => setStatusTarget(s)}
                  data-testid={`referral-status-${s.toLowerCase()}`}
                >
                  {r.status === 'ACCEPTED' || r.status === 'DECLINED' || r.status === 'WITHDRAWN'
                    ? 'Reopen'
                    : REFERRAL_STATUS_LABEL[s]}
                </Button>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setFollowUpOpen(true)} data-testid="referral-follow-up">
                Follow-up
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditOpen(true)} data-testid="referral-edit">
                <PenLine className="mr-1 h-4 w-4" /> Edit
              </Button>
            </div>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5" data-testid="referral-badges">
          <Badge variant={referralStatusVariant(r.status)}>{REFERRAL_STATUS_LABEL[r.status]}</Badge>
          <Badge variant={priorityVariant(r.priority)}>{REFERRAL_PRIORITY_LABEL[r.priority]}</Badge>
          {r.followUpOverdue ? (
            <Badge variant="destructive">Follow-up overdue</Badge>
          ) : r.nextFollowUpAt ? (
            <Badge variant="outline">Follow up {formatOrganisationDateTime(r.nextFollowUpAt)}</Badge>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Item label="Source">{REFERRAL_SOURCE_LABEL[r.sourceType]}</Item>
            <Item label="Referring organisation">{r.referringOrganisation}</Item>
            <Item label="Contact person">
              {r.referrerName}
              {r.referrerRole ? <span className="text-muted-foreground"> · {r.referrerRole}</span> : null}
            </Item>
            <Item label="Contact details">
              {[r.referrerPhone, r.referrerEmail].filter(Boolean).join(' · ')}
            </Item>
            <Item label="Referral date">{r.referralDate ? formatOrganisationDateTime(r.referralDate) : null}</Item>
            <Item label="Received">
              {formatOrganisationDateTime(r.receivedAt)} · {REFERRAL_VIA_LABEL[r.receivedVia]}
            </Item>
            <Item label="Received by">{r.receivedBy?.name}</Item>
            <Item label="Recorded in system">
              {r.recordedByName ?? '—'} · {formatOrganisationDateTime(r.createdAt)}
            </Item>
            <Item label="Last changed">
              {formatOrganisationDateTime(r.updatedAt)}
              {r.updatedByName ? ` · ${r.updatedByName}` : ''}
            </Item>
          </dl>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Item label="Assigned branch">{r.location?.name}</Item>
            <Item label="Responsible employee">{r.responsibleEmployee?.name}</Item>
            <Item label="Expected start">{r.expectedStartDate ? formatOrganisationDate(r.expectedStartDate) : null}</Item>
            <Item label="Hours per week requested">{r.requestedHoursPerWeek != null ? String(r.requestedHoursPerWeek) : null}</Item>
            <Item label="Funding arrangement">{r.fundingType?.name ?? 'To be confirmed'}</Item>
            <Item label="Funding organisation">{r.funder?.name}</Item>
            {r.decisionAt ? (
              <Item label="Decision">
                {REFERRAL_STATUS_LABEL[r.status]} · {formatOrganisationDateTime(r.decisionAt)}
                {r.decisionByName ? ` · ${r.decisionByName}` : ''}
                {r.decisionReason ? <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{r.decisionReason}</p> : null}
              </Item>
            ) : null}
          </dl>
        </div>
        {r.careRequirements || r.fundingNotes || r.notes ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <Item label="Initial care requirements">
              {r.careRequirements ? <p className="whitespace-pre-wrap">{r.careRequirements}</p> : null}
            </Item>
            <Item label="Funding notes">{r.fundingNotes ? <p className="whitespace-pre-wrap">{r.fundingNotes}</p> : null}</Item>
            <Item label="Notes">{r.notes ? <p className="whitespace-pre-wrap">{r.notes}</p> : null}</Item>
          </dl>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Funding and payer"
          actions={
            <Link
              to="/service-users/$serviceUserId/profile"
              params={{ serviceUserId }}
              search={{ tab: 'funding' }}
              className="text-xs text-primary hover:underline"
            >
              Open Funding tab
            </Link>
          }
        >
          <p className="mb-2 text-xs text-muted-foreground">
            Referrer, funding organisation and actual payer are kept separate. Payers and invoice details live on the
            Funding tab{isPrivate ? '; for private care the payer is on the quotation' : ''}.
          </p>
          {activeFundings.length ? (
            <ul className="space-y-1.5 text-sm">
              {activeFundings.map(f => (
                <li key={f.id} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{f.fundingType.name}</span>
                  {f.funder ? <span className="text-muted-foreground">· {f.funder.name}</span> : null}
                  {f.splitPercent ? <span className="text-muted-foreground">· {f.splitPercent}%</span> : null}
                  {f.billingContactName ? <span className="text-muted-foreground">· invoices to {f.billingContactName}</span> : null}
                  {f.isPrimary ? <Badge size="sm" variant="outline">Primary</Badge> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No funding lines set up yet.</p>
          )}
        </Card>

        <Card
          title="Quotations for this referral"
          actions={
            canQuote ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onNewQuotation(r.id)} data-testid="referral-new-quotation">
                <FilePlus2 className="mr-1 h-4 w-4" /> New quotation
              </Button>
            ) : null
          }
        >
          {r.quotations.length ? (
            <ul className="space-y-1.5 text-sm">
              {r.quotations.map(q => (
                <li key={q.id}>
                  <button type="button" className="flex flex-wrap items-center gap-1.5 text-left hover:underline" onClick={() => onOpenQuotation(q.id)}>
                    <span className="font-medium text-primary">
                      {q.referenceNumber} rev {q.revision}
                    </span>
                    <Badge size="sm" variant={quotationStatusVariant(q.status)}>
                      {QUOTATION_STATUS_LABEL[q.status]}
                    </Badge>
                    <span className="text-muted-foreground">{formatGbp(q.weeklyTotal)} / week</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No quotations yet.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Supporting documents">
          <LinkedDocumentsPanel
            serviceUserId={serviceUserId}
            linkType={REFERRAL_DOCUMENT_LINK}
            linkId={r.id}
            documentTypeCode="REFERRAL_DOCUMENT"
            documents={r.documents}
            canUpload={canEdit}
          />
        </Card>
        <Card title="Referral history">
          {canEdit ? (
            <div className="mb-3 flex gap-2">
              <textarea
                rows={1}
                className={referralTextareaClass}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note"
                data-testid="referral-note-input"
              />
              <Button type="button" size="sm" variant="outline" disabled={!note.trim() || m.note.isPending} onClick={() => void onAddNote()}>
                Add
              </Button>
            </div>
          ) : null}
          <div className="max-h-96 overflow-y-auto pr-1">
            <ReferralHistoryList events={r.events} />
          </div>
        </Card>
      </div>

      <ReferralFormDialog serviceUserId={serviceUserId} open={editOpen} onOpenChange={setEditOpen} editing={r} />
      <ReferralFollowUpDialog serviceUserId={serviceUserId} referral={r} open={followUpOpen} onOpenChange={setFollowUpOpen} />
      <ReferralStatusDialog
        serviceUserId={serviceUserId}
        referral={r}
        target={statusTarget}
        onOpenChange={open => !open && setStatusTarget(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------- quotation detail

function QuotationDetailPanel({
  serviceUserId,
  quotation: q,
  canQuote,
  onEdit,
  onSelect,
}: {
  serviceUserId: string
  quotation: QuotationDetail
  canQuote: boolean
  onEdit: () => void
  onSelect: (id: string) => void
}) {
  const m = useQuotationMutations(serviceUserId)
  const [action, setAction] = React.useState<QuotationAction | null>(null)
  const actions: QuotationAction[] =
    q.status === 'DRAFT' ? ['SEND', 'WITHDRAW'] : q.status === 'SENT' ? ['ACCEPT', 'DECLINE', 'WITHDRAW'] : []
  const latest = Math.max(...q.revisions.map(r => r.revision))
  const canRevise = q.status !== 'DRAFT' && !q.revisions.some(r => r.status === 'DRAFT') && q.revision === latest

  const onRevise = async () => {
    const note = window.prompt('Why is this quotation being revised? (optional)') ?? undefined
    if (note === undefined) return
    try {
      const created = await m.revise.mutateAsync({ id: q.id, note: note || undefined })
      onSelect(created.id)
    } catch (e) {
      toastApiError(e, 'Could not create revision.')
    }
  }

  return (
    <div className="space-y-4" data-testid="quotation-detail">
      <Card
        title={`Quotation ${q.referenceNumber} · revision ${q.revision}`}
        actions={
          canQuote ? (
            <div className="flex flex-wrap gap-1.5">
              {q.status === 'DRAFT' ? (
                <Button type="button" size="sm" variant="ghost" onClick={onEdit} data-testid="quotation-edit">
                  <PenLine className="mr-1 h-4 w-4" /> Edit draft
                </Button>
              ) : null}
              {actions.map(a => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant={a === 'SEND' || a === 'ACCEPT' ? 'default' : 'outline'}
                  onClick={() => setAction(a)}
                  data-testid={`quotation-action-${a.toLowerCase()}`}
                >
                  {a === 'SEND' ? 'Mark as sent' : a === 'ACCEPT' ? 'Accepted' : a === 'DECLINE' ? 'Declined' : 'Withdraw'}
                </Button>
              ))}
              {canRevise ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void onRevise()} data-testid="quotation-revise">
                  Create revision
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge variant={quotationStatusVariant(q.status)}>{QUOTATION_STATUS_LABEL[q.status]}</Badge>
          {q.expired ? <Badge variant="destructive">Validity expired</Badge> : null}
          {q.status !== 'DRAFT' ? (
            <span className="text-xs text-muted-foreground">Locked — changes need a new revision.</span>
          ) : null}
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Created">
            {formatOrganisationDateTime(q.createdAt)}
            {q.createdByName ? ` · ${q.createdByName}` : ''}
          </Item>
          <Item label="Responsible employee">{q.responsibleEmployee?.name}</Item>
          <Item label="Referral">{q.referral?.referenceNumber}</Item>
          <Item label="Care package">
            {q.visitPlan ? `${q.visitPlan.status} · from ${formatOrganisationDate(q.visitPlan.effectiveFrom)}` : null}
          </Item>
          <Item label="Payer">
            {q.payerName}
            <div className="text-xs text-muted-foreground">
              {PAYER_TYPE_LABEL[q.payerType]}
              {q.payerRelationship ? ` · ${q.payerRelationship}` : ''}
            </div>
          </Item>
          <Item label="Payer contact">{[q.payerPhone, q.payerEmail].filter(Boolean).join(' · ')}</Item>
          <Item label="Proposed start">{q.startDate ? formatOrganisationDate(q.startDate) : null}</Item>
          <Item label="Valid until">{q.validUntil ? formatOrganisationDate(q.validUntil) : null}</Item>
          {q.sentAt ? (
            <Item label="Sent">
              {formatOrganisationDateTime(q.sentAt)}
              {q.sentByName ? ` · ${q.sentByName}` : ''}
            </Item>
          ) : null}
          {q.acceptedAt ? (
            <Item label="Accepted">
              {formatOrganisationDateTime(q.acceptedAt)} · {q.acceptedByName}
              {q.acceptanceMethod ? ` (${q.acceptanceMethod})` : ''}
              {q.acceptanceRecordedByName ? (
                <div className="text-xs text-muted-foreground">Recorded by {q.acceptanceRecordedByName}</div>
              ) : null}
            </Item>
          ) : null}
          {q.declinedAt ? (
            <Item label="Declined">
              {formatOrganisationDateTime(q.declinedAt)}
              {q.declineReason ? <div className="text-xs text-muted-foreground">{q.declineReason}</div> : null}
            </Item>
          ) : null}
          {q.supersededAt ? <Item label="Superseded">{formatOrganisationDateTime(q.supersededAt)}</Item> : null}
        </dl>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="quotation-lines">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Schedule</th>
                <th className="px-3 py-2 text-right font-medium">£ / hour</th>
                <th className="px-3 py-2 text-right font-medium">Hours / wk</th>
                <th className="px-3 py-2 text-right font-medium">£ / week</th>
              </tr>
            </thead>
            <tbody>
              {q.lines.map(l => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{l.description}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {l.visitsPerWeek} visits × {l.durationMinutes} min × {l.numberOfCarers} carer{l.numberOfCarers > 1 ? 's' : ''}
                    {l.daysOfWeek.length ? ` · ${l.daysOfWeek.map(d => d.slice(0, 2)).join(' ')}` : ''}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatGbp(l.hourlyRate)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{l.weeklyHours?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatGbp(l.weeklyCost)}</td>
                </tr>
              ))}
              {q.charges.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 text-muted-foreground">
                  <td className="px-3 py-2">{c.description}</td>
                  <td className="px-3 py-2">{CHARGE_FREQUENCY_LABEL[c.frequency]}</td>
                  <td colSpan={3} className="px-3 py-2 text-right tabular-nums">
                    {formatGbp(c.amount)}
                  </td>
                </tr>
              ))}
              {!q.lines.length && !q.charges.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    No services added yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <dl className="mt-3 grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-4" data-testid="quotation-detail-totals">
          <Item label="Carer-hours per week">{q.weeklyHours.toFixed(2)}</Item>
          <Item label="Estimated weekly cost">{formatGbp(q.weeklyTotal)}</Item>
          <Item label="Estimated monthly cost">{formatGbp(q.monthlyTotal)}</Item>
          <Item label="One-off charges">{formatGbp(q.oneOffChargesCost)}</Item>
        </dl>
        {q.terms || q.notes ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Item label="Terms">{q.terms ? <p className="whitespace-pre-wrap">{q.terms}</p> : null}</Item>
            <Item label="Notes">{q.notes ? <p className="whitespace-pre-wrap">{q.notes}</p> : null}</Item>
          </dl>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Revisions">
          <ul className="space-y-1.5 text-sm" data-testid="quotation-revisions">
            {q.revisions.map(r => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelect(r.id)}
                  className={cn('flex flex-wrap items-center gap-1.5 text-left', r.id === q.id ? 'font-semibold' : 'hover:underline')}
                >
                  Revision {r.revision}
                  <Badge size="sm" variant={quotationStatusVariant(r.status)}>
                    {QUOTATION_STATUS_LABEL[r.status]}
                  </Badge>
                  <span className="text-muted-foreground">{formatGbp(r.weeklyTotal)} / wk</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Supporting documents">
          <LinkedDocumentsPanel
            serviceUserId={serviceUserId}
            linkType={QUOTATION_DOCUMENT_LINK}
            linkId={q.id}
            documentTypeCode="CARE_QUOTATION"
            documents={q.documents}
            canUpload={canQuote}
          />
        </Card>
        <Card title="Quotation history">
          <div className="max-h-80 overflow-y-auto pr-1">
            <ReferralHistoryList events={q.events} />
          </div>
        </Card>
      </div>

      <QuotationStatusDialog
        serviceUserId={serviceUserId}
        quotation={q}
        action={action}
        onOpenChange={open => !open && setAction(null)}
      />
    </div>
  )
}

// --------------------------------------------------------------------------- tab

/** Service user → Referral & Quotes: referrals, private care quotations and their full history. */
export function ServiceUserReferralsTab({ serviceUserId, displayName }: { serviceUserId: string; displayName: string }) {
  const canEdit = useAuthStore(s => s.can('service_users.update'))
  const canQuote = useAuthStore(s => s.can(['service_users.funding.update', 'service_users.update']))
  const referralsQuery = useReferrals(serviceUserId)
  const quotationsQuery = useQuotations(serviceUserId)
  const referrals = React.useMemo(() => referralsQuery.data ?? [], [referralsQuery.data])
  const quotations = quotationsQuery.data ?? []
  const [selectedReferralId, setSelectedReferralId] = React.useState<string | null>(null)
  const [selectedQuotationId, setSelectedQuotationId] = React.useState<string | null>(null)
  const [referralFormOpen, setReferralFormOpen] = React.useState(false)
  const [quoteEditor, setQuoteEditor] = React.useState<{ open: boolean; referralId?: string | null; editing?: QuotationDetail | null }>({
    open: false,
  })
  const historyQuery = useReferralHistory(serviceUserId)

  // Default to the most recent referral.
  React.useEffect(() => {
    if (!selectedReferralId && referrals[0]) setSelectedReferralId(referrals[0].id)
  }, [referrals, selectedReferralId])

  const referralQuery = useReferral(serviceUserId, selectedReferralId)
  const quotationQuery = useQuotation(serviceUserId, selectedQuotationId)

  const openQuotation = (id: string) => {
    setSelectedQuotationId(id)
    setTimeout(() => document.querySelector('[data-testid=quotation-detail]')?.scrollIntoView({ behavior: 'smooth' }), 300)
  }

  return (
    <div className="space-y-6" data-testid="service-user-referrals-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Referral &amp; Quotes</h2>
          <p className="text-sm text-muted-foreground">
            Who referred {displayName}, how the referral is progressing, private care quotations and the full history.
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit ? (
            <Button type="button" size="sm" onClick={() => setReferralFormOpen(true)} data-testid="referral-new">
              <Plus className="mr-1 h-4 w-4" /> New referral
            </Button>
          ) : null}
          {canQuote ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setQuoteEditor({ open: true, referralId: selectedReferralId })}
              data-testid="quotation-new"
            >
              <FilePlus2 className="mr-1 h-4 w-4" /> New quotation
            </Button>
          ) : null}
        </div>
      </div>

      {/* Referrals */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Referrals</h3>
        {referralsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : referrals.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" /> No referral recorded for this service user yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2" role="tablist" data-testid="referral-list">
            {referrals.map(r => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={r.id === selectedReferralId}
                onClick={() => setSelectedReferralId(r.id)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  r.id === selectedReferralId ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/30',
                )}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {r.referenceNumber}
                  <Badge size="sm" variant={referralStatusVariant(r.status)}>
                    {REFERRAL_STATUS_LABEL[r.status]}
                  </Badge>
                  {r.followUpOverdue ? <Badge size="sm" variant="destructive">Follow-up due</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {REFERRAL_SOURCE_LABEL[r.sourceType]}
                  {r.referringOrganisation ? ` · ${r.referringOrganisation}` : ''} · received {formatOrganisationDate(r.receivedAt)}
                </div>
              </button>
            ))}
          </div>
        )}
        {referralQuery.data ? (
          <ReferralDetailPanel
            serviceUserId={serviceUserId}
            referral={referralQuery.data}
            canEdit={canEdit}
            canQuote={canQuote}
            onNewQuotation={id => setQuoteEditor({ open: true, referralId: id })}
            onOpenQuotation={openQuotation}
          />
        ) : null}
      </section>

      {/* Quotations */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Private care quotations</h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="quotation-list">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Payer</th>
                <th className="px-3 py-2 font-medium">Referral</th>
                <th className="px-3 py-2 text-right font-medium">Weekly</th>
                <th className="px-3 py-2 text-right font-medium">Monthly</th>
                <th className="px-3 py-2 font-medium">Valid until</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {quotationsQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    No quotations. Use “New quotation” for privately funded care.
                  </td>
                </tr>
              ) : (
                quotations.map(q => (
                  <tr
                    key={q.id}
                    className={cn(
                      'cursor-pointer border-b border-border last:border-0 hover:bg-muted/20',
                      q.id === selectedQuotationId && 'bg-primary/5',
                    )}
                    onClick={() => openQuotation(q.id)}
                    data-testid="quotation-row"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-primary">
                      {q.referenceNumber} <span className="text-xs text-muted-foreground">rev {q.revision}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge size="sm" variant={quotationStatusVariant(q.status)}>
                        {QUOTATION_STATUS_LABEL[q.status]}
                      </Badge>
                      {q.expired ? <Badge size="sm" variant="destructive" className="ml-1">Expired</Badge> : null}
                    </td>
                    <td className="px-3 py-2">{q.payerName ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{q.referral?.referenceNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatGbp(q.weeklyTotal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatGbp(q.monthlyTotal)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {q.validUntil ? formatOrganisationDate(q.validUntil) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatOrganisationDate(q.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {quotationQuery.data ? (
          <QuotationDetailPanel
            serviceUserId={serviceUserId}
            quotation={quotationQuery.data}
            canQuote={canQuote}
            onEdit={() => setQuoteEditor({ open: true, editing: quotationQuery.data })}
            onSelect={openQuotation}
          />
        ) : null}
      </section>

      {/* Everything */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Collapsible title="All referral & quotation history">
          <div className="max-h-[32rem] overflow-y-auto pr-1">
            <ReferralHistoryList events={historyQuery.data ?? []} showReference />
          </div>
        </Collapsible>
      </section>

      <ReferralFormDialog
        serviceUserId={serviceUserId}
        open={referralFormOpen}
        onOpenChange={setReferralFormOpen}
        onSaved={id => setSelectedReferralId(id)}
      />
      <QuotationEditorDialog
        serviceUserId={serviceUserId}
        open={quoteEditor.open}
        onOpenChange={open => setQuoteEditor(prev => ({ ...prev, open }))}
        editing={quoteEditor.editing}
        referrals={referrals}
        defaultReferralId={quoteEditor.referralId}
        defaultPayerName={displayName}
        onSaved={openQuotation}
      />
    </div>
  )
}
