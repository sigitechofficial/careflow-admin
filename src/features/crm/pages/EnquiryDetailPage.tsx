import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  AlarmClock,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  PoundSterling,
  Mail,
  MessageSquarePlus,
  Phone,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState, LoadingSpinner } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { CrmSectionLayout } from '@/features/crm/components/CrmSectionLayout'
import {
  useAddEnquiryNote,
  useEnquiry,
  useMoveEnquiry,
} from '@/features/crm/hooks/useCrm'
import {
  ENQUIRY_TYPE_LABELS,
  LOST_REASON_LABELS,
  LOST_REASON_OPTIONS,
  OPEN_STAGES,
  RECEIVED_VIA_LABELS,
  SOURCE_LABELS,
  STAGE_CLASS,
  STAGE_LABELS,
  URGENCY_LABELS,
  isFollowUpOverdue,
} from '@/features/crm/crm-labels'
import type { Enquiry, EnquiryLostReason, EnquiryStage } from '@/features/crm/types/crm.types'

const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—')

function initialsOf(e: Enquiry): string {
  return `${e.firstName?.[0] ?? ''}${e.lastName?.[0] ?? ''}`.toUpperCase() || '?'
}

/* ─── Summary header ──────────────────────────────────────────────────── */

function SummaryHeader({ enquiry }: { enquiry: Enquiry }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {initialsOf(enquiry)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {enquiry.firstName} {enquiry.lastName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground">{enquiry.referenceNumber}</span>
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${STAGE_CLASS[enquiry.stage]}`}>
                {STAGE_LABELS[enquiry.stage]}
              </span>
              {enquiry.urgency === 'URGENT' && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                  Urgent
                </span>
              )}
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                {SOURCE_LABELS[enquiry.source]}
              </span>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:text-right">
          <dt className="text-muted-foreground">Branch</dt>
          <dd className="font-medium">{enquiry.locationName || '—'}</dd>
          <dt className="text-muted-foreground">Owner</dt>
          <dd className="font-medium">{enquiry.ownerName || 'Unassigned'}</dd>
          <dt className="text-muted-foreground">Added by</dt>
          <dd className="font-medium">{enquiry.recordedByName || '—'}</dd>
          <dt className="text-muted-foreground">Added on</dt>
          <dd className="font-medium">{fmtDate(enquiry.createdAt)}</dd>
        </dl>
      </CardContent>
    </Card>
  )
}

/* ─── Details ─────────────────────────────────────────────────────────── */

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function DetailsCard({ enquiry }: { enquiry: Enquiry }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enquiry details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Section title="Person">
          <Field label="Name">
            {enquiry.firstName} {enquiry.lastName}
          </Field>
          <Field label="Date of birth">{fmtDate(enquiry.dateOfBirth)}</Field>
          <Field label="Address" wide>
            {[enquiry.addressLine, enquiry.postcode].filter(Boolean).join(', ') || '—'}
          </Field>
          <Field label="Needs" wide>
            <span className="whitespace-pre-wrap">{enquiry.needs || '—'}</span>
          </Field>
        </Section>

        <div className="border-t border-border" />

        <Section title="Received from">
          <Field label="Name">
            {enquiry.contactName || '—'}
            {enquiry.contactRelationship ? (
              <span className="text-muted-foreground"> · {enquiry.contactRelationship}</span>
            ) : null}
          </Field>
          <Field label="Source">{SOURCE_LABELS[enquiry.source]}</Field>
          <Field label="Phone">
            {enquiry.contactPhone ? (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {enquiry.contactPhone}
              </span>
            ) : (
              '—'
            )}
          </Field>
          <Field label="Email">
            {enquiry.contactEmail ? (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {enquiry.contactEmail}
              </span>
            ) : (
              '—'
            )}
          </Field>
        </Section>

        <div className="border-t border-border" />

        <Section title="Intake">
          <Field label="How received">
            {enquiry.receivedVia ? RECEIVED_VIA_LABELS[enquiry.receivedVia] : '—'}
          </Field>
          <Field label="Enquiry type">
            {enquiry.enquiryType ? ENQUIRY_TYPE_LABELS[enquiry.enquiryType] : '—'}
          </Field>
          <Field label="Urgency">{URGENCY_LABELS[enquiry.urgency]}</Field>
          <Field label="Source detail">{enquiry.sourceDetail || '—'}</Field>
          <Field label="Sent at (by referrer)">{fmtDateTime(enquiry.sentAt)}</Field>
          <Field label="Received at">{fmtDateTime(enquiry.receivedAt)}</Field>
          <Field label="Added by">{enquiry.recordedByName || '—'}</Field>
          <Field label="Added to system">{fmtDateTime(enquiry.createdAt)}</Field>
        </Section>

        <div className="border-t border-border" />

        <Section title="Care requirements & funding">
          <Field label="Hours per week">{enquiry.hoursPerWeek != null ? `${enquiry.hoursPerWeek} h` : '—'}</Field>
          <Field label="Visits per day">{enquiry.visitsPerDay ?? '—'}</Field>
          <Field label="Requested start date">{fmtDate(enquiry.requestedStartDate)}</Field>
          <Field label="Funding type">{enquiry.fundingTypeName || '—'}</Field>
          <Field label="Funder" wide>{enquiry.funderName || '—'}</Field>
        </Section>
      </CardContent>
    </Card>
  )
}

/* ─── Actions (sidebar) ───────────────────────────────────────────────── */

function ActionsCard({ enquiry }: { enquiry: Enquiry }) {
  const move = useMoveEnquiry(enquiry.id)
  const navigate = useNavigate()
  const canCreateServiceUser = useAuthStore(s => s.can)('service_users.create')
  const [nextStage, setNextStage] = React.useState<EnquiryStage | ''>('')
  const [losing, setLosing] = React.useState(false)
  const [reasonCode, setReasonCode] = React.useState<EnquiryLostReason | ''>('')
  const [reason, setReason] = React.useState('')
  const needsDetail = reasonCode === 'OTHER'
  const canConfirmLost = Boolean(reasonCode) && (!needsDetail || reason.trim() !== '')

  const moveTo = (stage: EnquiryStage, onDone?: () => void) =>
    move.mutate(
      { stage },
      {
        onSuccess: () => {
          toastSuccess(`Moved to ${STAGE_LABELS[stage]}`)
          onDone?.()
        },
        onError: e => toastApiError(e, 'Could not move enquiry'),
      },
    )

  const markLost = () =>
    move.mutate(
      { stage: 'LOST', lostReasonCode: reasonCode || undefined, lostReason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toastSuccess('Enquiry marked lost')
          setLosing(false)
          setReasonCode('')
          setReason('')
        },
        onError: e => toastApiError(e, 'Could not update enquiry'),
      },
    )

  const createServiceUser = () =>
    navigate({
      to: '/service-users/add',
      search: {
        firstName: enquiry.firstName,
        lastName: enquiry.lastName,
        dob: enquiry.dateOfBirth ? enquiry.dateOfBirth.slice(0, 10) : undefined,
        enquiryId: enquiry.id,
      },
    })

  const stageOptions = OPEN_STAGES.filter(s => s !== enquiry.stage)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Change stage
          </label>
          <div className="flex gap-2">
            <select
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              value={nextStage}
              onChange={e => setNextStage(e.target.value as EnquiryStage | '')}
            >
              <option value="">Select stage…</option>
              {stageOptions.map(s => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!nextStage || move.isPending}
              onClick={() => nextStage && moveTo(nextStage, () => setNextStage(''))}
            >
              Update
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {enquiry.stage !== 'WON' && (
            <Button className="w-full justify-start" onClick={() => moveTo('WON')} disabled={move.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
              Mark as won
            </Button>
          )}
          {enquiry.stage !== 'LOST' && (
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => setLosing(v => !v)}
            >
              <XCircle className="mr-2 h-4 w-4" aria-hidden />
              Mark as lost
            </Button>
          )}
          {enquiry.convertedServiceUserId ? (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() =>
                navigate({
                  to: '/service-users/$serviceUserId/view',
                  params: { serviceUserId: enquiry.convertedServiceUserId! },
                })
              }
            >
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              View service user
            </Button>
          ) : (
            canCreateServiceUser && (
              <Button variant="outline" className="w-full justify-start" onClick={createServiceUser}>
                <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                Create service user
              </Button>
            )
          )}
        </div>

        {losing && (
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/30">
            <label className="text-sm font-medium">Why was it lost? (required)</label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={reasonCode}
              onChange={e => setReasonCode(e.target.value as EnquiryLostReason | '')}
            >
              <option value="">Select a reason…</option>
              {LOST_REASON_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {LOST_REASON_LABELS[r]}
                </option>
              ))}
            </select>
            <label className="text-sm font-medium">
              Details {needsDetail ? '(required)' : '(optional)'}
            </label>
            <textarea
              className="min-h-[56px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={markLost}
                disabled={move.isPending || !canConfirmLost}
              >
                Confirm lost
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLosing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FollowUpCard({ enquiry, canManage }: { enquiry: Enquiry; canManage: boolean }) {
  const navigate = useNavigate()
  const overdue = isFollowUpOverdue(enquiry)
  const hasFollowUp = Boolean(enquiry.nextFollowUpAt || enquiry.nextAction)
  return (
    <Card className={overdue ? 'border-red-300 dark:border-red-900' : undefined}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlarmClock className={`h-4 w-4 ${overdue ? 'text-red-600' : 'text-muted-foreground'}`} aria-hidden />
          Next follow-up
        </CardTitle>
        {overdue && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
            Overdue
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {hasFollowUp ? (
          <>
            <p className="font-medium">{enquiry.nextAction || 'Follow up'}</p>
            <p className={overdue ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'}>
              {fmtDateTime(enquiry.nextFollowUpAt)}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">No follow-up scheduled.</p>
        )}
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 w-full"
            onClick={() => navigate({ to: '/crm/$enquiryId/edit', params: { enquiryId: enquiry.id } })}
          >
            {hasFollowUp ? 'Change follow-up' : 'Schedule follow-up'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

const money = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

function AssessmentCard({ enquiry, canManage }: { enquiry: Enquiry; canManage: boolean }) {
  const navigate = useNavigate()
  const booked = Boolean(enquiry.assessmentAt)
  const hasAny = booked || Boolean(enquiry.assessorName || enquiry.assessmentLocation)
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
          Assessment
        </CardTitle>
        {booked && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Booked
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {hasAny ? (
          <>
            <InfoRow label="When">{fmtDateTime(enquiry.assessmentAt)}</InfoRow>
            <InfoRow label="Assessor">{enquiry.assessorName || '—'}</InfoRow>
            <InfoRow label="Where">{enquiry.assessmentLocation || '—'}</InfoRow>
          </>
        ) : (
          <p className="text-muted-foreground">No assessment booked.</p>
        )}
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 w-full"
            onClick={() => navigate({ to: '/crm/$enquiryId/edit', params: { enquiryId: enquiry.id } })}
          >
            {booked ? 'Change assessment' : 'Book assessment'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function QuoteCard({ enquiry, canManage }: { enquiry: Enquiry; canManage: boolean }) {
  const navigate = useNavigate()
  const hasQuote =
    enquiry.quoteWeeklyAmount != null || enquiry.quoteHourlyRate != null || Boolean(enquiry.quoteSentAt)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PoundSterling className="h-4 w-4 text-muted-foreground" aria-hidden />
          Quote
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {hasQuote ? (
          <>
            <InfoRow label="Per week">{money(enquiry.quoteWeeklyAmount)}</InfoRow>
            <InfoRow label="Hourly rate">{money(enquiry.quoteHourlyRate)}</InfoRow>
            <InfoRow label="Sent on">{fmtDate(enquiry.quoteSentAt)}</InfoRow>
            {enquiry.quoteNotes && (
              <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 text-muted-foreground">
                {enquiry.quoteNotes}
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">No quote recorded.</p>
        )}
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 w-full"
            onClick={() => navigate({ to: '/crm/$enquiryId/edit', params: { enquiryId: enquiry.id } })}
          >
            {hasQuote ? 'Change quote' : 'Record quote'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function OutcomeCard({ enquiry }: { enquiry: Enquiry }) {
  const lost = enquiry.stage === 'LOST' && Boolean(enquiry.lostReasonCode || enquiry.lostReason)
  if (!enquiry.convertedServiceUserId && !lost) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Outcome</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {enquiry.convertedServiceUserId && (
          <Link
            to="/service-users/$serviceUserId/view"
            params={{ serviceUserId: enquiry.convertedServiceUserId }}
            className="font-medium text-primary hover:underline"
          >
            View linked service user →
          </Link>
        )}
        {lost && (
          <p>
            <span className="text-muted-foreground">Lost reason: </span>
            {[enquiry.lostReasonCode ? LOST_REASON_LABELS[enquiry.lostReasonCode] : null, enquiry.lostReason]
              .filter(Boolean)
              .join(' — ')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/* ─── Activity timeline ───────────────────────────────────────────────── */

/** Dot colour for a timeline event, by its action text. */
function eventTone(action: string): string {
  const a = action.toLowerCase()
  if (a.includes('won') || a.includes('converted')) return 'bg-emerald-500'
  if (a.includes('lost')) return 'bg-red-500'
  if (a.startsWith('moved')) return 'bg-amber-500'
  if (a.includes('created')) return 'bg-sky-500'
  if (a.startsWith('assigned') || a === 'unassigned') return 'bg-indigo-500'
  if (a.startsWith('follow-up')) return 'bg-orange-500'
  if (a.includes('updated')) return 'bg-violet-500'
  return 'bg-muted-foreground'
}

/** Turn "Moved to OFFER" into "Moved to Quote sent" using the stage labels. */
function eventLabel(action: string): string {
  const stage = /^Moved to (\w+)$/.exec(action)?.[1]
  if (stage && stage in STAGE_LABELS) return `Moved to ${STAGE_LABELS[stage as EnquiryStage]}`
  return action
}

function ActivityCard({ enquiry }: { enquiry: Enquiry }) {
  const addNote = useAddEnquiryNote(enquiry.id)
  const [note, setNote] = React.useState('')
  const canManage = useAuthStore(s => s.can)('crm.manage')

  const submit = () => {
    if (!note.trim()) return
    addNote.mutate(note.trim(), {
      onSuccess: () => {
        toastSuccess('Note added')
        setNote('')
      },
      onError: e => toastApiError(e, 'Could not add note'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {canManage && (
          <div className="flex gap-2">
            <input
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Add a note…"
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submit()
              }}
            />
            <Button size="sm" className="h-9" onClick={submit} disabled={addNote.isPending || !note.trim()}>
              <MessageSquarePlus className="mr-1.5 h-4 w-4" aria-hidden />
              Add note
            </Button>
          </div>
        )}
        {enquiry.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative ml-1.5 flex flex-col gap-5 border-l border-border pl-6">
            {[...enquiry.events].reverse().map(ev => (
              <li key={ev.id} className="relative">
                <span
                  className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-card ${eventTone(ev.action)}`}
                  aria-hidden
                />
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="text-sm font-medium">{eventLabel(ev.action)}</p>
                  <p className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" aria-hidden />
                    {fmtDateTime(ev.at)}
                  </p>
                </div>
                {ev.note && (
                  <p className="mt-1 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{ev.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function EnquiryDetailPage() {
  const params = useParams({ strict: false }) as { enquiryId?: string }
  const { data: enquiry, isLoading } = useEnquiry(params.enquiryId)
  const canManage = useAuthStore(s => s.can)('crm.manage')
  const navigate = useNavigate()

  const backButton = (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate({ to: '/crm' })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
        Back to enquiries
      </Button>
      {enquiry && canManage && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: '/crm/$enquiryId/edit', params: { enquiryId: enquiry.id } })}
        >
          <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
          Edit enquiry
        </Button>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <CrmSectionLayout title="Enquiry" description="Loading…" testId="crm-detail-loading">
        <LoadingSpinner />
      </CrmSectionLayout>
    )
  }

  if (!enquiry) {
    return (
      <CrmSectionLayout title="Enquiry not found" description="" testId="crm-detail-missing">
        <div className="flex flex-col gap-4">
          {backButton}
          <EmptyState title="Enquiry not found" description="This enquiry may have been removed." />
        </div>
      </CrmSectionLayout>
    )
  }

  return (
    <CrmSectionLayout
      title={enquiry.referenceNumber}
      description="Enquiry record"
      testId="crm-detail-page"
      breadcrumbTail={[
        { label: 'Enquiries', href: '/crm' },
        { label: enquiry.referenceNumber },
      ]}
    >
      <div className="flex flex-col gap-4">
        {backButton}
        <SummaryHeader enquiry={enquiry} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailsCard enquiry={enquiry} />
            <ActivityCard enquiry={enquiry} />
          </div>
          <div className="flex flex-col gap-6">
            {canManage && <ActionsCard enquiry={enquiry} />}
            <FollowUpCard enquiry={enquiry} canManage={canManage} />
            <AssessmentCard enquiry={enquiry} canManage={canManage} />
            <QuoteCard enquiry={enquiry} canManage={canManage} />
            <OutcomeCard enquiry={enquiry} />
          </div>
        </div>
      </div>
    </CrmSectionLayout>
  )
}
