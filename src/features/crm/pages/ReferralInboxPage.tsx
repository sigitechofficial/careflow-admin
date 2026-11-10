import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { FlaskConical, Inbox, Loader2, Mail, MoreHorizontal, RefreshCw, Settings2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useBranchOptions } from '@/features/crm/hooks/useBranchOptions'
import { CrmSectionLayout } from '@/features/crm/components/CrmSectionLayout'
import {
  DECISION,
  REQUEST_TYPE,
  ReferralChecks,
  ReferralReplyPanel,
  ReferralSettingsDialog,
  EMAIL_KIND,
} from '@/features/crm/components/ReferralAutomationPanels'
import { ReferralFullDetails } from '@/features/crm/components/ReferralFullDetails'
import { ReferralAttachments } from '@/features/crm/components/ReferralAttachments'
import { ReferralMailboxesBar, ReferralMailboxesDialog, mailboxName } from '@/features/crm/components/ReferralMailboxes'
import {
  checkOneMailbox,
  checkReferralMailbox,
  createEnquiryFromReferral,
  dismissReferral,
  fetchReferralEmail,
  fetchReferralEmails,
  fetchReferralMailbox,
  fetchReferralSettings,
  fetchTestScenarios,
  insertTestReferral,
  readReferralAgain,
  recheckReferral,
  type ReferralEmail,
  type ReferralExtraction,
  type ReferralMailboxStatus,
} from '@/features/crm/api/referral-inbox.api'


/** Kinds of email staff act on themselves (see the API's referral-rules.util). */
const STAFF_KINDS: string[] = ['FOLLOW_UP', 'REFERRAL_WITHDRAWN', 'EXISTING_CLIENT', 'COMPLAINT', 'SAFEGUARDING_CONCERN']
const STAFF_KIND_ADVICE: Record<string, string> = {
  FOLLOW_UP: 'more about a referral we already have — update the enquiry.',
  REFERRAL_WITHDRAWN: 'the referral is no longer needed — check the enquiry and close it if right.',
  EXISTING_CLIENT: 'about someone we already care for — pass it to their coordinator.',
  COMPLAINT: 'follow the complaints procedure and contact the person.',
  SAFEGUARDING_CONCERN: 'follow the safeguarding procedure today and tell the safeguarding lead.',
}
const keys = {
  mailbox: ['referral-inbox', 'mailbox'] as const,
  list: ['referral-inbox', 'list', 'all'] as const,
  email: (id: string) => ['referral-inbox', 'email', id] as const,
  settings: ['referral-inbox', 'settings'] as const,
}

const URGENCY: Record<string, string> = { ROUTINE: 'Routine', URGENT: 'Urgent', EMERGENCY: 'Emergency' }

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

/** "3 Nov" for older emails, "14:20" for today's. */
function shortWhen(iso: string) {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

type Folder = 'attention' | 'handled' | 'dismissed' | 'all'

/** Needs a person: not handled yet, a reply waiting (e.g. a decline), a referrer's reply, or a failure. */
function folderOf(r: ReferralEmail): Exclude<Folder, 'all'> {
  if (r.status === 'DISMISSED') return 'dismissed'
  if (['RECEIVED', 'READ', 'FAILED', 'NOT_A_REFERRAL', 'FOLLOW_UP'].includes(r.status)) return 'attention'
  if ((r.replyText || r.replyHtml) && !r.replySentAt) return 'attention'
  return 'handled'
}

const personName = (e: ReferralExtraction | null) =>
  e ? [e.person.firstName, e.person.lastName].filter(Boolean).join(' ') : ''

/** What the row and the header say about where an email stands. */
function stateOf(r: ReferralEmail): { label: string; tone: 'muted' | 'warning' | 'destructive' | 'success' | 'info' } {
  if (r.status === 'RECEIVED') return { label: 'Claude is reading…', tone: 'muted' }
  if (r.status === 'FAILED') return { label: 'Could not read', tone: 'destructive' }
  if (r.status === 'DISMISSED') return { label: 'Dismissed', tone: 'muted' }
  if (r.status === 'FOLLOW_UP') return { label: 'Reply from referrer', tone: 'info' }
  if (r.status === 'NOT_A_REFERRAL') return { label: 'Not a referral?', tone: 'warning' }
  if (r.replySentAt) return { label: 'Replied', tone: 'success' }
  if (r.replyText || r.replyHtml) return { label: r.decision === 'NO' ? 'Decline waiting' : 'Reply waiting', tone: 'warning' }
  return { label: 'To review', tone: 'info' }
}

const TONE: Record<string, string> = {
  muted: 'text-muted-foreground',
  warning: 'text-amber-700 dark:text-amber-400',
  destructive: 'text-destructive',
  success: 'text-emerald-700 dark:text-emerald-400',
  info: 'text-sky-700 dark:text-sky-400',
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const v = value?.trim()
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={v ? 'text-sm' : 'text-sm text-muted-foreground/60'}>{v || '—'}</dd>
    </div>
  )
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Bullets({ items, empty }: { items: string[]; empty?: string }) {
  if (!items.length) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((i, n) => (
        <li key={n}>{i}</li>
      ))}
    </ul>
  )
}

/** Everything Claude read, laid out for checking. */
function DetailsTab({ e }: { e: ReferralExtraction }) {
  return (
    <div className="space-y-4" data-testid="referral-extraction">
      <Section title="Person">
        <dl className="grid gap-3 sm:grid-cols-3">
          <Field label="Name" value={personName(e)} />
          <Field label="Date of birth" value={e.person.dateOfBirth} />
          <Field label="Lives alone" value={e.person.livesAlone} />
          <Field label="Address" value={[e.person.addressLine, e.person.postcode].filter(Boolean).join(', ')} />
          <Field label="Phone" value={e.person.phone} />
          <Field label="NHS number" value={e.person.nhsNumber} />
          <Field label="Family contact" value={[e.contact.name, e.contact.relationship].filter(Boolean).join(' — ')} />
          <Field label="Contact phone" value={e.contact.phone} />
          <Field label="Contact email" value={e.contact.email} />
        </dl>
      </Section>
      <Section title="Referred by">
        <dl className="grid gap-3 sm:grid-cols-3">
          <Field label="Organisation" value={e.referrer.organisation} />
          <Field label="Name and role" value={[e.referrer.name, e.referrer.role].filter(Boolean).join(' — ')} />
          <Field label="Their reference" value={e.referrer.reference} />
          <Field label="Email" value={e.referrer.email} />
          <Field label="Phone" value={e.referrer.phone} />
        </dl>
      </Section>
      <Section title="Care asked for">
        <p className="mb-3 text-sm">{e.careNeeds || <span className="text-muted-foreground">Not given</span>}</p>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Field label="Hours a week" value={e.care.hoursPerWeek} />
          <Field label="Visits a day" value={e.care.visitsPerDay} />
          <Field label="Carers per visit" value={e.care.carersPerVisit} />
          <Field label="Visit times" value={e.care.visitTimes} />
          <Field label="Start date" value={e.care.requestedStartDate} />
          <Field label="Carer preference" value={e.care.genderPreference} />
          <Field label="Language / culture" value={e.care.languageOrCulture} />
          <Field label="Funding" value={[e.funding.funderName, e.funding.details].filter(Boolean).join(' — ')} />
        </dl>
        {e.visits?.length ? (
          <div className="mt-4 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs">
                  <th className="px-2 py-1.5 font-medium">Visit</th>
                  <th className="px-2 py-1.5 font-medium">Time</th>
                  <th className="px-2 py-1.5 font-medium">Length</th>
                  <th className="px-2 py-1.5 font-medium">Days</th>
                  <th className="px-2 py-1.5 font-medium">Carers</th>
                  {e.visits.some(v => v.tasks) ? <th className="px-2 py-1.5 font-medium">Tasks</th> : null}
                </tr>
              </thead>
              <tbody>
                {e.visits.map((v, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5">{v.label || `Visit ${i + 1}`}</td>
                    <td className="px-2 py-1.5">{v.startTime || '—'}</td>
                    <td className="px-2 py-1.5">{v.durationMinutes ? `${v.durationMinutes} min` : '—'}</td>
                    <td className="px-2 py-1.5">{v.days.length ? v.days.join(', ') : 'Every day'}</td>
                    <td className="px-2 py-1.5">{v.carers || 1}</td>
                    {e.visits!.some(x => x.tasks) ? <td className="px-2 py-1.5">{v.tasks || '—'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Conditions">
          <Bullets items={e.conditions} empty="None given" />
        </Section>
        <Section title="Risks">
          <Bullets items={e.risks} empty="None given" />
        </Section>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Full referral details</h3>
        <ReferralFullDetails e={e} />
      </div>
    </div>
  )
}

function EmailDetail({
  id,
  testMode,
  mailboxAddress,
  copyTo,
}: {
  id: string
  testMode: boolean
  mailboxAddress: string | null
  copyTo: string[]
}) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('crm.manage'))
  const { locationId: headerLocationId } = useGlobalLocationScope()
  const branches = useBranchOptions()
  const [branchId, setBranchId] = React.useState(headerLocationId ?? '')
  const q = useQuery({
    queryKey: keys.email(id),
    queryFn: () => fetchReferralEmail(id),
    // Keep checking while Claude reads it.
    refetchInterval: query => (query.state.data?.status === 'RECEIVED' ? 4000 : false),
  })
  const m = q.data
  const [tab, setTab] = React.useState('overview')
  React.useEffect(() => {
    // Open on the reply when one is waiting for a person.
    if (m && (m.replyText || m.replyHtml) && !m.replySentAt) setTab('reply')
  }, [m?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => void qc.invalidateQueries({ queryKey: ['referral-inbox'] })
  const readAgain = useMutation({
    mutationFn: () => readReferralAgain(id),
    onSuccess: () => {
      toastSuccess('Read again')
      refresh()
    },
    onError: e => {
      toastApiError(e, 'Could not read the email')
      refresh()
    },
  })
  const recheck = useMutation({
    mutationFn: () => recheckReferral(id),
    onSuccess: () => {
      toastSuccess('Checked again')
      refresh()
    },
    onError: e => toastApiError(e, 'Could not run the checks'),
  })
  const create = useMutation({
    mutationFn: () => createEnquiryFromReferral(id, branchId),
    onSuccess: r => {
      toastSuccess(`Enquiry ${r.referenceNumber} created`)
      refresh()
      void navigate({ to: '/crm/$enquiryId', params: { enquiryId: r.enquiryId } })
    },
    onError: e => toastApiError(e, 'Could not create the enquiry'),
  })
  const dismiss = useMutation({
    mutationFn: () => dismissReferral(id),
    onSuccess: () => {
      toastSuccess('Dismissed')
      refresh()
    },
    onError: e => toastApiError(e, 'Could not dismiss'),
  })

  if (q.isLoading || !m) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    )
  }
  const e = m.extraction
  const state = stateOf(m)
  const d = m.decision ? DECISION[m.decision] : null
  const name = personName(e)
  // Complaints, safeguarding, follow-ups…: for staff to act on, never an enquiry or a referral decision.
  const staffKind = !!e?.emailKind && STAFF_KINDS.includes(e.emailKind)
  const canCreate = canManage && !m.enquiryId && m.status !== 'DISMISSED' && !!e && !staffKind

  return (
    <div className="flex h-full flex-col" data-testid="referral-detail">
      {/* Header: who, what, where it stands, and the one thing to do next. */}
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{name || m.fromName || m.fromEmail || 'Unknown sender'}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {m.subject || '(no subject)'} · from {m.fromName || m.fromEmail} · {fmt(m.receivedAt)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!m.replySentAt && m.extraction ? (
                    <DropdownMenuItem disabled={recheck.isPending} onSelect={() => recheck.mutate()}>
                      Run the checks again
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem disabled={readAgain.isPending} onSelect={() => readAgain.mutate()}>
                    Ask Claude to read it again
                  </DropdownMenuItem>
                  {m.status !== 'DISMISSED' && (!m.enquiryId || m.status === 'FOLLOW_UP') ? (
                    <DropdownMenuItem disabled={dismiss.isPending} onSelect={() => dismiss.mutate()}>
                      {m.status === 'FOLLOW_UP' || staffKind ? 'Mark as handled' : 'Dismiss'}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {d ? <Badge variant={d.variant}>{d.label}</Badge> : null}
          {e?.emailKind ? (
            e.emailKind !== 'NEW_REFERRAL' ? <Badge variant={['COMPLAINT', 'SAFEGUARDING_CONCERN'].includes(e.emailKind) ? 'destructive' : 'secondary'}>{EMAIL_KIND[e.emailKind]}</Badge> : null
          ) : e?.requestType && e.requestType !== 'CARE_REFERRAL' ? (
            <Badge variant="secondary">{REQUEST_TYPE[e.requestType]}</Badge>
          ) : null}
          {e && e.urgency !== 'ROUTINE' ? <Badge variant="warning">{URGENCY[e.urgency]}</Badge> : null}
          <span className={cn('text-sm font-medium', TONE[state.tone])}>{state.label}</span>
          {m.enquiryId ? (
            <Link to="/crm/$enquiryId" params={{ enquiryId: m.enquiryId }} className="text-sm font-medium text-primary hover:underline">
              Open enquiry →
            </Link>
          ) : null}
        </div>
        {m.status === 'FOLLOW_UP' ? (
          <p className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm">
            The referrer replied in the thread of an earlier referral. It was added to the enquiry’s history, and Claude read
            the referral again with it: what changed is noted on the enquiry, and its checks and decision were worked out again.
            It is not answered automatically — check the enquiry, then mark it as handled.
          </p>
        ) : null}
        {m.status === 'FOLLOW_UP' && m.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Claude could not read the referral again with this reply: {m.error}.
            {m.nextReadAt ? ` It will try again at ${fmt(m.nextReadAt)}.` : ''}
          </p>
        ) : null}
        {staffKind && e?.emailKind && m.status !== 'FOLLOW_UP' ? (
          <p
            className={cn(
              'rounded-md border px-3 py-2 text-sm',
              e.emailKind === 'SAFEGUARDING_CONCERN' || e.emailKind === 'COMPLAINT'
                ? 'border-destructive/40 bg-destructive/10'
                : 'border-sky-500/40 bg-sky-500/10',
            )}
            data-testid="referral-staff-kind"
          >
            <span className="font-medium">{EMAIL_KIND[e.emailKind]}:</span> {STAFF_KIND_ADVICE[e.emailKind]} No enquiry, decision or reply
            was made automatically. Mark it as handled when done.
          </p>
        ) : null}
        {m.status === 'FAILED' ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Claude could not read this email: {m.error}.{' '}
            {m.nextReadAt
              ? `It will try again automatically at ${fmt(m.nextReadAt)}, or use “Ask Claude to read it again”.`
              : 'Use “Ask Claude to read it again”.'}
          </p>
        ) : null}
        {e?.attachmentsNotRead?.length ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm" data-testid="referral-not-read">
            <p className="font-medium">Not read by Claude — open these yourself:</p>
            <ul className="mt-1 list-disc pl-5">
              {e.attachmentsNotRead.map(n => (
                <li key={n.fileName}>
                  {n.fileName} <span className="text-muted-foreground">({n.reason})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {canCreate ? (
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-3">
            <div className="mr-auto text-sm">
              <p className="font-medium">No enquiry yet</p>
              <p className="text-muted-foreground">
                {m.checks?.find(c => c.key === 'area')?.result === 'PASS'
                  ? 'Automatic enquiries are switched off.'
                  : 'The area could not be matched to a branch. Choose the branch to record it.'}
              </p>
            </div>
            <select
              aria-label="Branch"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={branchId}
              onChange={ev => setBranchId(ev.target.value)}
            >
              <option value="">Choose a branch…</option>
              {branches.options.map(b => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <Button type="button" disabled={!branchId || create.isPending} onClick={() => create.mutate()} data-testid="referral-create-enquiry">
              {create.isPending ? 'Creating…' : 'Create enquiry'}
            </Button>
          </div>
        ) : null}
      </div>

      {m.status === 'RECEIVED' ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Claude is reading the email and its attachments…
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="flex-1 p-4">
          <TabsList variant="underline" className="mb-4">
            <TabsTrigger variant="underline" value="overview">
              Overview
            </TabsTrigger>
            <TabsTrigger variant="underline" value="reply">
              Reply
              {(m.replyText || m.replyHtml) && !m.replySentAt ? <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-500" aria-label="waiting" /> : null}
            </TabsTrigger>
            {e ? (
              <TabsTrigger variant="underline" value="details">
                What Claude read
              </TabsTrigger>
            ) : null}
            <TabsTrigger variant="underline" value="email">
              Original email{m.attachments.length ? ` (${m.attachments.length})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {e ? (
              <Section title="Summary">
                <p className="text-sm">{e.summary}</p>
                {!e.isReferral && !staffKind ? (
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">Claude thinks this is not about care for a person.</p>
                ) : null}
              </Section>
            ) : null}
            {m.checks?.length ? (
              <Section title={d ? 'Decision' : 'Checks'} aside={d ? <Badge variant={d.variant}>{d.label}</Badge> : null}>
                <ReferralChecks email={m} />
              </Section>
            ) : null}
            {e ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Section title="They asked">
                  <Bullets items={e.questionsAsked} empty="No questions" />
                </Section>
                <Section title="Still needed">
                  <Bullets items={e.missingInformation} empty="Nothing missing" />
                </Section>
              </div>
            ) : null}
            {m.extractionCostUsd != null ? (
              <p className="text-xs text-muted-foreground">Claude’s reading and reply cost about ${m.extractionCostUsd.toFixed(2)}.</p>
            ) : null}
          </TabsContent>

          <TabsContent value="reply">
            <ReferralReplyPanel email={m} testMode={testMode} mailboxAddress={mailboxAddress} copyTo={copyTo} />
          </TabsContent>

          {e ? (
            <TabsContent value="details">
              <DetailsTab e={e} />
            </TabsContent>
          ) : null}

          <TabsContent value="email" className="space-y-3">
            <ReferralAttachments email={m} />
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-4 font-sans text-sm">
              {m.bodyText || '(no text)'}
            </pre>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function TestReferralDialog({
  open,
  onOpenChange,
  mailboxes,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mailboxes: ReferralMailboxStatus['mailboxes']
}) {
  const qc = useQueryClient()
  const scenarios = useQuery({ queryKey: ['referral-inbox', 'test-scenarios'], queryFn: fetchTestScenarios, enabled: open })
  const [busy, setBusy] = React.useState<number | 'all' | null>(null)
  const usable = mailboxes.filter(m => m.isActive && m.provider !== 'MICROSOFT')
  const [mailboxId, setMailboxId] = React.useState<string>('')
  const target = usable.find(m => m.id === mailboxId) ?? usable[0]
  const add = async (indexes: number[]) => {
    try {
      for (const i of indexes) await insertTestReferral(i, target?.id)
      if (target && target.provider !== 'INBOUND_WEBHOOK') await checkOneMailbox(target.id)
      toastSuccess(
        indexes.length === 1 ? 'Test referral added' : `${indexes.length} test referrals added`,
        target?.provider === 'GMAIL' ? 'Claude is reading them now; a copy of each went to the reply-copy addresses.' : 'Claude is reading them now.',
      )
      void qc.invalidateQueries({ queryKey: ['referral-inbox'] })
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'Could not add the test referral')
    } finally {
      setBusy(null)
    }
  }
  const rows = scenarios.data ?? []
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a test referral</DialogTitle>
          <DialogDescription>
            Made-up emails (fictional people) placed in the mailbox as if they had arrived. Each one costs about 10–15p of Claude
            time to read and answer.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {usable.length > 1 ? (
            <label className="mb-3 block text-sm">
              <span className="font-medium">Put it in</span>
              <select
                className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={target?.id ?? ''}
                onChange={e => setMailboxId(e.target.value)}
              >
                {usable.map(m => (
                  <option key={m.id} value={m.id}>
                    {mailboxName(m)} ({m.provider === 'INBOUND_WEBHOOK' ? 'posted as if from the email service' : m.labelName})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map(s => (
              <li key={s.index} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{s.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.audience}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy != null}
                  onClick={() => {
                    setBusy(s.index)
                    void add([s.index])
                  }}
                >
                  {busy === s.index ? 'Adding…' : 'Add'}
                </Button>
              </li>
            ))}
          </ul>
          {rows.length ? (
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                disabled={busy != null}
                onClick={() => {
                  setBusy('all')
                  void add(rows.map(r => r.index))
                }}
              >
                {busy === 'all' ? 'Adding all…' : `Add all ${rows.length}`}
              </Button>
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default function ReferralInboxPage() {
  const qc = useQueryClient()
  const canManage = useAuthStore(s => s.can('crm.manage'))
  const search = useSearch({ strict: false }) as { gmail?: string; microsoft?: string }
  const [folder, setFolder] = React.useState<Folder>('attention')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [testOpen, setTestOpen] = React.useState(false)
  const [mailboxesOpen, setMailboxesOpen] = React.useState(false)

  const mailboxQ = useQuery({ queryKey: keys.mailbox, queryFn: fetchReferralMailbox })
  const settingsQ = useQuery({ queryKey: keys.settings, queryFn: fetchReferralSettings, enabled: !!mailboxQ.data?.mailbox })
  const listQ = useQuery({
    queryKey: keys.list,
    queryFn: () => fetchReferralEmails(''),
    // Faster while something is being read.
    refetchInterval: query => (query.state.data?.some(r => r.status === 'RECEIVED') ? 5000 : 60_000),
  })
  const all = listQ.data ?? []
  const counts = React.useMemo(() => {
    const c = { attention: 0, handled: 0, dismissed: 0, all: all.length }
    for (const r of all) c[folderOf(r)] += 1
    return c
  }, [all])
  const rows = folder === 'all' ? all : all.filter(r => folderOf(r) === folder)
  React.useEffect(() => {
    if (!rows.some(r => r.id === selectedId)) setSelectedId(rows[0]?.id ?? null)
  }, [rows, selectedId])

  React.useEffect(() => {
    const r = search.gmail
    if (!r) return
    if (r === 'connected') toastSuccess('Gmail connected', 'CareFlow will read emails with the referrals label.')
    else if (r === 'cancelled') toastApiError(new Error('Google sign-in was cancelled.'), 'Gmail not connected')
    else toastApiError(new Error(`Google sign-in did not finish (${r}). Try again.`), 'Gmail not connected')
  }, [search.gmail])

  React.useEffect(() => {
    const r = search.microsoft
    if (!r) return
    if (r === 'connected') toastSuccess('Microsoft 365 connected', 'CareFlow will read the chosen folder (Referrals by default).')
    else if (r === 'cancelled') toastApiError(new Error('Microsoft sign-in was cancelled.'), 'Mailbox not connected')
    else toastApiError(new Error(`Microsoft sign-in did not finish (${r}). Try again.`), 'Mailbox not connected')
  }, [search.microsoft])

  const refreshAll = () => void qc.invalidateQueries({ queryKey: ['referral-inbox'] })
  const check = useMutation({
    mutationFn: checkReferralMailbox,
    onSuccess: r => {
      toastSuccess(
        r.busy ? 'Already checking' : r.saved ? `${r.saved} new email${r.saved === 1 ? '' : 's'}` : 'No new emails',
        r.errors?.length ? `Not checked: ${r.errors.join(' · ')}` : undefined,
      )
      refreshAll()
    },
    onError: e => {
      toastApiError(e, 'Could not check the mailbox')
      refreshAll()
    },
  })

  const st = mailboxQ.data
  const mb = st?.mailbox ?? null
  const mailboxes = st?.mailboxes ?? []
  const byId = React.useMemo(() => new Map(mailboxes.map(m => [m.id, m])), [mailboxes])
  const selectedRow = all.find(r => r.id === selectedId)
  const selectedMailbox = (selectedRow?.mailboxId ? byId.get(selectedRow.mailboxId) : null) ?? mb
  const testMode = Boolean(st?.testMode)
  const copyTo = settingsQ.data?.copyRepliesTo ?? []

  return (
    <CrmSectionLayout
      title="Referral inbox"
      description="Emails to the referrals mailbox, read by Claude. CareFlow checks each one, records it as an enquiry, prices it and replies."
      testId="referral-inbox-page"
      breadcrumbTail={[{ label: 'Referral inbox' }]}
      actions={
        canManage && mb
          ? [
              ...(testMode
                ? [
                    {
                      label: 'Add test referral',
                      variant: 'outline' as const,
                      icon: <FlaskConical className="h-3.5 w-3.5" aria-hidden />,
                      onClick: () => setTestOpen(true),
                    },
                  ]
                : []),
              {
                label: 'Settings',
                variant: 'outline' as const,
                icon: <Settings2 className="h-3.5 w-3.5" aria-hidden />,
                onClick: () => setSettingsOpen(true),
              },
              {
                label: check.isPending ? 'Checking…' : 'Check now',
                icon: <RefreshCw className={`h-3.5 w-3.5 ${check.isPending ? 'animate-spin' : ''}`} aria-hidden />,
                onClick: () => {
                  if (!check.isPending) check.mutate()
                },
              },
            ]
          : undefined
      }
    >
      <div className="space-y-4">
        {mb && testMode ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm" data-testid="referral-test-mode">
            <span className="font-semibold">Testing mode.</span> Replies are not sent to the people who wrote in: they go to{' '}
            <strong>{mailboxes.filter(m => m.isActive).length > 1 ? 'the mailbox the email came into' : mb.emailAddress}</strong>
            {copyTo.length ? (
              <>
                , copied to <strong>{copyTo.join(', ')}</strong>
              </>
            ) : null}
            .
          </div>
        ) : null}

        {mailboxQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : st && st.mailboxes.length ? (
          <ReferralMailboxesBar status={st} canManage={canManage} onManage={() => setMailboxesOpen(true)} />
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-medium">No referrals mailbox connected</p>
            <p className="text-muted-foreground">
              Connect the mailboxes referrals arrive in: Gmail, Microsoft 365, any IMAP/SMTP host (cPanel, GoDaddy, Zoho…), or an email service
              that posts to CareFlow (Brevo). CareFlow reads one label or folder in each, so a mail rule can move referrals there.
            </p>
            {!st?.aiConfigured ? <p className="text-destructive">Claude is not set up on the server yet (AI_API_KEY).</p> : null}
            {canManage ? (
              <Button type="button" onClick={() => setMailboxesOpen(true)}>
                Add a mailbox
              </Button>
            ) : null}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <div className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border p-2">
              <div className="grid grid-cols-4 gap-1 rounded-md bg-muted p-1 text-xs" role="tablist" aria-label="Folders">
                {(
                  [
                    ['attention', 'To do'],
                    ['handled', 'Done'],
                    ['dismissed', 'Dismissed'],
                    ['all', 'All'],
                  ] as Array<[Folder, string]>
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={folder === k}
                    className={cn(
                      'rounded px-2 py-1.5 font-medium transition-colors',
                      folder === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setFolder(k)}
                  >
                    {label}
                    <span className={cn('ml-1', k === 'attention' && counts.attention ? 'text-amber-600' : 'opacity-60')}>{counts[k]}</span>
                  </button>
                ))}
              </div>
            </div>
            {listQ.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-40" aria-hidden />
                {folder === 'attention' ? 'Nothing needs you. New referrals are handled automatically.' : 'No emails here.'}
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-border overflow-y-auto" data-testid="referral-list">
                {rows.map(r => {
                  const s = stateOf(r)
                  const name = personName(r.extraction)
                  const dc = r.decision ? DECISION[r.decision] : null
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={cn(
                          'relative w-full px-3 py-2.5 pl-5 text-left transition-colors hover:bg-muted/40',
                          selectedId === r.id && 'bg-primary/5 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary',
                        )}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <span className={cn('absolute left-2 top-4 h-1.5 w-1.5 rounded-full', dc?.dot ?? 'bg-muted-foreground/30')} aria-hidden />
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{name || r.fromName || r.fromEmail || 'Unknown'}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{shortWhen(r.receivedAt)}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {name ? `${r.fromName || r.fromEmail} · ` : ''}
                          {r.subject || '(no subject)'}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          <span className={cn('font-medium', TONE[s.tone])}>{s.label}</span>
                          {dc ? <span className="text-muted-foreground">· {dc.label}</span> : null}
                          {r.extraction?.emailKind && r.extraction.emailKind !== 'NEW_REFERRAL' ? (
                            <span className={cn(['COMPLAINT', 'SAFEGUARDING_CONCERN'].includes(r.extraction.emailKind) ? 'font-medium text-red-600' : 'text-muted-foreground')}>
                              · {EMAIL_KIND[r.extraction.emailKind]}
                            </span>
                          ) : !r.extraction?.emailKind && r.extraction?.requestType === 'PRICE_ENQUIRY' ? (
                            <span className="text-muted-foreground">· Price enquiry</span>
                          ) : null}
                          {r.quotationId ? <span className="text-muted-foreground">· Quote attached</span> : null}
                          {mailboxes.length > 1 && r.mailboxId && byId.get(r.mailboxId) ? (
                            <span className="text-muted-foreground">· {mailboxName(byId.get(r.mailboxId)!)}</span>
                          ) : null}
                          {r.extraction && r.extraction.urgency !== 'ROUTINE' ? (
                            <span className="font-medium text-red-600">· {URGENCY[r.extraction.urgency]}</span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="min-h-[520px] overflow-hidden rounded-lg border border-border bg-card">
            {selectedId ? (
              <EmailDetail
                key={selectedId}
                id={selectedId}
                testMode={testMode}
                mailboxAddress={selectedMailbox?.emailAddress ?? null}
                copyTo={copyTo}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">Choose an email on the left.</div>
            )}
          </div>
        </div>
      </div>
      {mb ? <ReferralSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} /> : null}
      {mb && testMode ? <TestReferralDialog open={testOpen} onOpenChange={setTestOpen} mailboxes={mailboxes} /> : null}
      <ReferralMailboxesDialog open={mailboxesOpen} onOpenChange={setMailboxesOpen} status={st} />
    </CrmSectionLayout>
  )
}
