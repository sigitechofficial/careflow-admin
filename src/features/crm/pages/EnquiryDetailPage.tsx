import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  AlarmClock,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  Pencil,
  PoundSterling,
  Mail,
  MessageSquarePlus,
  Phone,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState, LoadingSpinner } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { CrmSectionLayout } from '@/features/crm/components/CrmSectionLayout'
import { QuoteSummary } from '@/features/crm/components/QuoteSummaryCard'
import { EnquiryInitialAssessment, useInitialAssessmentAction } from '@/features/crm/components/EnquiryInitialAssessment'
import { useEnquiryQuotations } from '@/features/crm/hooks/useQuotations'
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

/* ─── Header (summary + stage stepper) ─────────────────────────────────── */

/** When each stage was last entered, from "Moved to X" events (NEW = created). */
function stageReachedAt(enquiry: Enquiry): Partial<Record<EnquiryStage, string>> {
  const reached: Partial<Record<EnquiryStage, string>> = { NEW: enquiry.createdAt }
  for (const ev of enquiry.events) {
    const stage = /^Moved to (\w+)$/.exec(ev.action)?.[1]
    if (stage && stage in STAGE_LABELS) reached[stage as EnquiryStage] = ev.at
  }
  // Conversion moves to WON without a "Moved to" event; stageChangedAt covers it.
  reached[enquiry.stage] = enquiry.stageChangedAt
  return reached
}

function StageStepper({ enquiry }: { enquiry: Enquiry }) {
  const steps: EnquiryStage[] = [...OPEN_STAGES, enquiry.stage === 'LOST' ? 'LOST' : 'WON']
  const currentIndex = steps.indexOf(enquiry.stage)
  const reached = stageReachedAt(enquiry)

  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:gap-0" data-testid="crm-stage-timeline">
      {steps.map((stage, i) => {
        const current = i === currentIndex
        const passed = i < currentIndex
        // A stage the enquiry jumped over (e.g. Contacted → Quote sent) has no date of its own.
        const skipped = passed && !reached[stage]
        const done = passed && !skipped
        const final = current && (stage === 'WON' || stage === 'LOST')
        return (
          <li key={stage} className="relative flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
            {i > 0 && (
              <span
                className={`absolute hidden h-0.5 sm:left-[-50%] sm:right-1/2 sm:top-4 sm:block ${
                  i <= currentIndex ? 'bg-primary' : 'bg-border'
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-card ${
                current
                  ? stage === 'LOST'
                    ? 'bg-red-600 text-white'
                    : stage === 'WON'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary text-primary-foreground outline outline-2 outline-offset-2 outline-primary/30'
                  : done
                    ? 'bg-primary text-primary-foreground'
                    : skipped
                      ? 'border border-dashed border-primary/50 bg-card text-muted-foreground'
                      : 'border border-border bg-card text-muted-foreground'
              }`}
              aria-hidden
            >
              {final && stage === 'LOST' ? (
                <X className="h-4 w-4" strokeWidth={3} />
              ) : done || final ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : (
                i + 1
              )}
            </span>
            <div className="flex flex-col gap-0.5 sm:mt-2 sm:items-center">
              <span
                className={`text-sm ${
                  current ? 'font-semibold text-foreground' : done ? 'font-medium text-foreground' : 'text-muted-foreground'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                {STAGE_LABELS[stage]}
              </span>
              {(done || current) && (
                <span className="text-xs text-muted-foreground">{fmtDate(reached[stage] ?? null)}</span>
              )}
              {skipped && <span className="text-xs italic text-muted-foreground">Skipped</span>}
              {current && (
                <span className={`mt-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${STAGE_CLASS[stage]}`}>
                  Current
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{children}</dd>
    </div>
  )
}

/** The assessment and quote, reachable from the top of the page as well as from the Plan card. */
function HeaderShortcuts({ enquiry, canManage }: { enquiry: Enquiry; canManage: boolean }) {
  const navigate = useNavigate()
  const assessment = useInitialAssessmentAction(enquiry, canManage)
  const { data } = useEnquiryQuotations(enquiry.id)
  const quotations = data?.quotations ?? []
  const currentQuotation = quotations.find(q => q.isCurrent) ?? quotations[0]
  const current = currentQuotation?.latestVersion
  return (
    <>
      {assessment.visible && (
        <Button variant="outline" size="sm" disabled={assessment.pending} onClick={assessment.onClick}>
          {assessment.pending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden />
          )}
          {assessment.label}
        </Button>
      )}
      {current && currentQuotation ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigate({
              to: '/crm/$enquiryId/quotes/$quotationId/$versionId',
              params: { enquiryId: enquiry.id, quotationId: currentQuotation.id, versionId: current.id },
            })
          }
        >
          <PoundSterling className="mr-1.5 h-4 w-4" aria-hidden />
          View quote
        </Button>
      ) : (
        canManage &&
        data && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/crm/$enquiryId/quotes/new', params: { enquiryId: enquiry.id } })}
          >
            <PoundSterling className="mr-1.5 h-4 w-4" aria-hidden />
            Create quotation
          </Button>
        )
      )}
    </>
  )
}

function EnquiryHeader({ enquiry, canManage }: { enquiry: Enquiry; canManage: boolean }) {
  const navigate = useNavigate()
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
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
                {enquiry.kind === 'REFERRAL' && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Referral
                  </span>
                )}
                {enquiry.urgency !== 'ROUTINE' && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                    {URGENCY_LABELS[enquiry.urgency]}
                  </span>
                )}
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                  {SOURCE_LABELS[enquiry.source]}
                </span>
                {enquiry.enquiryType && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                    {ENQUIRY_TYPE_LABELS[enquiry.enquiryType]}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 self-start lg:justify-end">
            <HeaderShortcuts enquiry={enquiry} canManage={canManage} />
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/crm/$enquiryId/edit', params: { enquiryId: enquiry.id } })}
              >
                <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
                {enquiry.kind === 'REFERRAL' ? 'Edit referral' : 'Edit enquiry'}
              </Button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-muted/40 px-4 py-3 sm:grid-cols-4">
          <MetaItem label="Branch">
            {enquiry.locationName || (
              <span className="text-amber-700 dark:text-amber-300">
                Not set
                {canManage && (
                  <button
                    type="button"
                    className="ml-1.5 font-medium text-primary hover:underline"
                    onClick={() => navigate({ to: '/crm/$enquiryId/edit', params: { enquiryId: enquiry.id } })}
                  >
                    Set branch
                  </button>
                )}
              </span>
            )}
          </MetaItem>
          <MetaItem label="Owner">{enquiry.ownerName || 'Unassigned'}</MetaItem>
          <MetaItem label="Added">
            {fmtDate(enquiry.createdAt)}
            {enquiry.recordedByName ? <span className="font-normal text-muted-foreground"> by {enquiry.recordedByName}</span> : null}
          </MetaItem>
          <MetaItem label="In this stage since">{fmtDate(enquiry.stageChangedAt)}</MetaItem>
        </dl>

        <div className="border-t border-border pt-5">
          <StageStepper enquiry={enquiry} />
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Details ─────────────────────────────────────────────────────────── */

/** A detail with its value, or null when nothing is recorded. */
type Detail = { label: string; value: React.ReactNode | null; wide?: boolean }

/**
 * Shows only the details that have a value; the empty ones are listed on one muted line
 * (with a link to add them) instead of a grid of dashes.
 */
function DetailSection({
  title,
  details,
  onAdd,
}: {
  title: string
  details: Detail[]
  onAdd?: () => void
}) {
  const filled = details.filter(d => d.value != null && d.value !== '')
  const missing = details.filter(d => d.value == null || d.value === '')
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {filled.length > 0 && (
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {filled.map(d => (
            <div key={d.label} className={d.wide ? 'sm:col-span-2 xl:col-span-3' : undefined}>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.label}</dt>
              <dd className="mt-1 text-sm">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {missing.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Not recorded: {missing.map(d => d.label.toLowerCase()).join(', ')}
          {onAdd && (
            <>
              {' · '}
              <button type="button" className="font-medium text-primary hover:underline" onClick={onAdd}>
                Add
              </button>
            </>
          )}
        </p>
      )}
    </section>
  )
}

const orNull = <T,>(v: T | null | undefined, render: (v: T) => React.ReactNode = x => x as React.ReactNode) =>
  v == null || v === '' ? null : render(v)

function DetailsCard({ enquiry, canManage }: { enquiry: Enquiry; canManage: boolean }) {
  const navigate = useNavigate()
  const onAdd = canManage
    ? () => navigate({ to: '/crm/$enquiryId/edit', params: { enquiryId: enquiry.id } })
    : undefined
  const address = [enquiry.addressLine, enquiry.postcode].filter(Boolean).join(', ')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{enquiry.kind === 'REFERRAL' ? 'Referral details' : 'Enquiry details'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <DetailSection
          title="Person"
          onAdd={onAdd}
          details={[
            { label: 'Date of birth', value: orNull(enquiry.dateOfBirth, fmtDate) },
            { label: 'Address', value: address || null, wide: true },
            {
              label: 'Care plans',
              value: enquiry.carePlans?.length ? (
                <span className="flex flex-wrap gap-1.5">
                  {enquiry.carePlans.map(c => (
                    <span key={c.id} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {c.name}
                    </span>
                  ))}
                </span>
              ) : null,
              wide: true,
            },
            {
              label: 'Needs',
              value: orNull(enquiry.needs, v => <span className="whitespace-pre-wrap">{v}</span>),
              wide: true,
            },
          ]}
        />

        <div className="border-t border-border" />

        {enquiry.kind === 'REFERRAL' && (
          <>
            <DetailSection
              title="Referral"
              onAdd={onAdd}
              details={[
                { label: 'Referring organisation', value: orNull(enquiry.referringOrganisation), wide: true },
                { label: 'Referral reference', value: orNull(enquiry.referralReference) },
                { label: 'Referral date', value: orNull(enquiry.referralDate, fmtDate) },
              ]}
            />
            <div className="border-t border-border" />
          </>
        )}

        <DetailSection
          title={enquiry.kind === 'REFERRAL' ? 'Referrer' : 'Received from'}
          onAdd={onAdd}
          details={[
            {
              label: 'Contact',
              value: orNull(enquiry.contactName, v => {
                const role = enquiry.kind === 'REFERRAL' ? enquiry.referrerRole : enquiry.contactRelationship
                return (
                  <>
                    {v}
                    {role ? <span className="text-muted-foreground"> · {role}</span> : null}
                  </>
                )
              }),
            },
            {
              label: 'Phone',
              value: orNull(enquiry.contactPhone, v => (
                <a href={`tel:${v}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {v}
                </a>
              )),
            },
            {
              label: 'Email',
              value: orNull(enquiry.contactEmail, v => (
                <a href={`mailto:${v}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {v}
                </a>
              )),
            },
          ]}
        />

        <div className="border-t border-border" />

        <DetailSection
          title="Intake"
          onAdd={onAdd}
          details={[
            { label: 'How received', value: orNull(enquiry.receivedVia, v => RECEIVED_VIA_LABELS[v]) },
            { label: 'Urgency', value: URGENCY_LABELS[enquiry.urgency] },
            { label: 'Source detail', value: orNull(enquiry.sourceDetail) },
            // No longer asked for on the form; shown only on older enquiries that have it.
            ...(enquiry.sentAt ? [{ label: 'Sent by referrer', value: fmtDateTime(enquiry.sentAt) }] : []),
            { label: 'Received', value: orNull(enquiry.receivedAt, fmtDateTime) },
          ]}
        />

        <div className="border-t border-border" />

        <DetailSection
          title="Care requirements & funding"
          onAdd={onAdd}
          details={[
            { label: 'Hours per week', value: orNull(enquiry.hoursPerWeek, v => `${v} h`) },
            { label: 'Visits per day', value: orNull(enquiry.visitsPerDay) },
            { label: 'Requested start', value: orNull(enquiry.requestedStartDate, fmtDate) },
            { label: 'Funding type', value: orNull(enquiry.fundingTypeName) },
            ...(enquiry.funderName ? [{ label: 'Funder', value: enquiry.funderName }] : []),
          ]}
        />
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
      // Only the enquiry id goes in the URL; the add page fills the name and date of birth from it.
      search: { enquiryId: enquiry.id },
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

/** One step of the plan: what is booked (or that nothing is), and a link to change it. */
function PlanRow({
  icon,
  title,
  badge,
  empty,
  lines,
  note,
  actionLabel,
  onAction,
  children,
}: {
  icon: React.ReactNode
  title: string
  badge?: React.ReactNode
  empty: string
  lines: (React.ReactNode | null)[]
  note?: string | null
  actionLabel: string
  onAction?: () => void
  children?: React.ReactNode
}) {
  const shown = lines.filter(Boolean)
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{title}</p>
          {badge}
        </div>
        {shown.length ? (
          <div className="mt-0.5 flex flex-col gap-0.5 text-sm">{shown.map((l, k) => <div key={k}>{l}</div>)}</div>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">{empty}</p>
        )}
        {note && (
          <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">{note}</p>
        )}
        {onAction && (
          <button type="button" className="mt-1 text-xs font-medium text-primary hover:underline" onClick={onAction}>
            {actionLabel}
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

function PlanCard({ enquiry, canManage }: { enquiry: Enquiry; canManage: boolean }) {
  const navigate = useNavigate()
  const edit = canManage
    ? () => navigate({ to: '/crm/$enquiryId/edit', params: { enquiryId: enquiry.id } })
    : undefined
  const overdue = isFollowUpOverdue(enquiry)
  const hasFollowUp = Boolean(enquiry.nextFollowUpAt || enquiry.nextAction)
  const booked = Boolean(enquiry.assessmentAt)
  const hasAssessment = booked || Boolean(enquiry.assessorName || enquiry.assessmentLocation)
  // The Assessment stage on the board is separate from an assessment actually booked.
  const stageReached = ['ASSESSMENT', 'OFFER', 'WON'].includes(enquiry.stage)
  const muted = (label: string, value: React.ReactNode) => (
    <>
      <span className="text-muted-foreground">{label} </span>
      {value}
    </>
  )

  return (
    <Card className={overdue ? 'border-red-300 dark:border-red-900' : undefined}>
      <CardHeader>
        <CardTitle className="text-base">Plan</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PlanRow
          icon={<AlarmClock className={`h-4 w-4 ${overdue ? 'text-red-600' : ''}`} aria-hidden />}
          title="Next follow-up"
          badge={
            overdue ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                Overdue
              </span>
            ) : null
          }
          empty="Nothing scheduled"
          lines={
            hasFollowUp
              ? [
                  enquiry.nextAction || 'Follow up',
                  enquiry.nextFollowUpAt ? (
                    <span className={overdue ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'}>
                      {fmtDateTime(enquiry.nextFollowUpAt)}
                    </span>
                  ) : null,
                ]
              : []
          }
          actionLabel={hasFollowUp ? 'Change follow-up' : 'Schedule follow-up'}
          onAction={edit}
        />
        <div className="border-t border-border" />
        <PlanRow
          icon={<ClipboardCheck className="h-4 w-4" aria-hidden />}
          title="Assessment"
          badge={
            booked ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Booked
              </span>
            ) : null
          }
          empty={stageReached ? 'Assessment stage reached — no assessment booked yet' : 'Not booked'}
          lines={
            hasAssessment
              ? [
                  enquiry.assessmentAt ? fmtDateTime(enquiry.assessmentAt) : null,
                  enquiry.assessorName ? muted('with', enquiry.assessorName) : null,
                  enquiry.assessmentLocation ? muted('at', enquiry.assessmentLocation) : null,
                ]
              : []
          }
          actionLabel={booked ? 'Change assessment visit' : 'Book assessment visit'}
          onAction={edit}
        >
          <EnquiryInitialAssessment enquiry={enquiry} canManage={canManage} />
        </PlanRow>
        <div className="border-t border-border" />
        <QuoteSummary enquiry={enquiry} canManage={canManage} />
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
    <div>
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate({ to: '/crm' })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
        Back to enquiries &amp; referrals
      </Button>
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
      description={enquiry.kind === 'REFERRAL' ? 'Referral record' : 'Enquiry record'}
      testId="crm-detail-page"
      breadcrumbTail={[
        { label: 'Enquiries & Referrals', href: '/crm' },
        { label: enquiry.referenceNumber },
      ]}
    >
      <div className="flex flex-col gap-4">
        {backButton}
        <EnquiryHeader enquiry={enquiry} canManage={canManage} />

        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailsCard enquiry={enquiry} canManage={canManage} />
            <ActivityCard enquiry={enquiry} />
          </div>
          <div className="flex flex-col gap-6">
            {canManage && <ActionsCard enquiry={enquiry} />}
            <OutcomeCard enquiry={enquiry} />
            <PlanCard enquiry={enquiry} canManage={canManage} />
          </div>
        </div>
      </div>
    </CrmSectionLayout>
  )
}
