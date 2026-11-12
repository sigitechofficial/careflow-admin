import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  RefreshCw,
  Settings2,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { UserAvatar } from '@/shared/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { fetchReferralMailbox } from '@/features/crm/api/referral-inbox.api'
import { ReferralMailboxesDialog, mailboxName } from '@/features/crm/components/ReferralMailboxes'
import { useVacancies } from '@/features/hr/recruitment/hooks/useRecruitment'
import { candidateStageLabel, formatDateTime } from '@/features/hr/recruitment/utils/recruitment-display.util'
import { Field, Textarea } from '@/features/hr/recruitment/components/flow/flow-ui'
import {
  createCandidateFromEmail,
  dismissRecruitmentEmail,
  fetchRecruitmentEmail,
  fetchRecruitmentInbox,
  openRecruitmentAttachment,
  readRecruitmentEmailAgain,
  reopenRecruitmentEmail,
  type ApplicationDraft,
  type RecruitmentEmailRow,
  type RecruitmentEmailStatus,
  type RecruitmentInboxTab,
} from '@/features/hr/recruitment/api/recruitment-inbox.api'

const keys = {
  all: ['recruitment-inbox'] as const,
  list: (tab: RecruitmentInboxTab) => ['recruitment-inbox', 'list', tab] as const,
  email: (id: string) => ['recruitment-inbox', 'email', id] as const,
}

const TABS: { value: RecruitmentInboxTab; label: string }[] = [
  { value: 'open', label: 'To review' },
  { value: 'created', label: 'Candidates created' },
  { value: 'closed', label: 'Set aside' },
]

const STATUS_CHIP: Partial<Record<RecruitmentEmailStatus, { label: string; className: string }>> = {
  RECEIVED: { label: 'Being read', className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  FAILED: { label: 'Not read', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  NOT_AN_APPLICATION: { label: 'Not an application', className: 'bg-muted text-muted-foreground' },
  DISMISSED: { label: 'Dismissed', className: 'bg-muted text-muted-foreground' },
  CANDIDATE_CREATED: { label: 'Candidate created', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
}

function receivedAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

const monthLabel = (ym: string | null) => {
  if (!ym) return 'now'
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function Chip({ status }: { status: RecruitmentEmailStatus }) {
  const chip = STATUS_CHIP[status]
  if (!chip) return null
  return <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', chip.className)}>{chip.label}</span>
}

function EmailListItem({ row, active, onSelect }: { row: RecruitmentEmailRow; active: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          active ? 'bg-primary/5' : 'hover:bg-muted/40',
        )}
      >
        <UserAvatar name={row.applicantName} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{row.applicantName}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{receivedAgo(row.receivedAt)}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">{row.summary || row.subject || '(no subject)'}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            {row.status === 'READ' ? null : <Chip status={row.status} />}
            {row.attachmentCount ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Paperclip className="h-3 w-3" aria-hidden /> {row.attachmentCount}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  )
}

const yesNoValue = (v: boolean | null) => (v === true ? 'YES' : v === false ? 'NO' : 'UNKNOWN')
const fromYesNo = (v: string) => (v === 'YES' ? true : v === 'NO' ? false : null)

function YesNoUnknown({ id, value, onChange }: { id: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <Select value={yesNoValue(value)} onValueChange={v => onChange(fromYesNo(v))}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="YES">Yes</SelectItem>
        <SelectItem value="NO">No</SelectItem>
        <SelectItem value="UNKNOWN">Not stated</SelectItem>
      </SelectContent>
    </Select>
  )
}

/** One email: what Claude read, as a form to check, then "Create candidate". */
function EmailDetail({ id, canCreate, canUpdate }: { id: string; canCreate: boolean; canUpdate: boolean }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: keys.email(id),
    queryFn: () => fetchRecruitmentEmail(id),
    // Claude is still reading it: look again shortly.
    refetchInterval: q => (q.state.data?.status === 'RECEIVED' ? 4000 : false),
  })
  const email = query.data
  const vacanciesQuery = useVacancies({ status: 'OPEN', page: 1, limit: 100 })
  const vacancies = vacanciesQuery.data?.data ?? []

  const [form, setForm] = React.useState<ApplicationDraft | null>(null)
  const [includeHistory, setIncludeHistory] = React.useState(true)
  const [attachments, setAttachments] = React.useState<number[]>([])
  const [cvFileName, setCvFileName] = React.useState('')
  // Fill the form once Claude has read the email (and again after "Read again").
  const filledFrom = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!email) return
    const stamp = `${email.id}:${email.status}:${email.extraction ? 'x' : '-'}`
    if (filledFrom.current === stamp) return
    filledFrom.current = stamp
    setForm(email.draft)
    setIncludeHistory(true)
    setAttachments(email.attachments.filter(a => a.available).map(a => a.index))
    setCvFileName(email.draft.cvFileName)
  }, [email])

  const refresh = () => void qc.invalidateQueries({ queryKey: keys.all })
  const readAgain = useMutation({
    mutationFn: () => readRecruitmentEmailAgain(id),
    onSuccess: () => {
      filledFrom.current = null
      toastSuccess('Read again')
      refresh()
    },
    onError: e => {
      toastApiError(e, 'Could not read the email')
      refresh()
    },
  })
  const dismiss = useMutation({
    mutationFn: () => dismissRecruitmentEmail(id),
    onSuccess: () => {
      toastSuccess('Email set aside')
      refresh()
    },
    onError: e => toastApiError(e, 'Could not dismiss the email'),
  })
  const reopen = useMutation({
    mutationFn: () => reopenRecruitmentEmail(id),
    onSuccess: () => {
      toastSuccess('Moved back to the inbox')
      refresh()
    },
    onError: e => toastApiError(e, 'Could not move it back'),
  })
  const create = useMutation({
    mutationFn: () =>
      createCandidateFromEmail(id, {
        ...form!,
        cvFileName,
        includeEmploymentHistory: includeHistory,
        attachmentIndexes: attachments,
      }),
    onSuccess: r => {
      toastSuccess(
        'Candidate created',
        [
          r.documentsCopied ? `${r.documentsCopied} file${r.documentsCopied === 1 ? '' : 's'} added to their documents.` : null,
          r.historyRows ? `${r.historyRows} job${r.historyRows === 1 ? '' : 's'} added to the employment history.` : null,
          r.emailed ? 'They were emailed that we received their application.' : null,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      )
      refresh()
      void navigate({ to: '/hr/candidates/$candidateId', params: { candidateId: r.candidateId } })
    },
    onError: e => toastApiError(e, 'Could not create the candidate'),
  })

  if (query.isLoading || !email) {
    return (
      <div className="space-y-3 p-5" aria-hidden>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    )
  }

  const editable = canCreate && (email.status === 'READ' || email.status === 'NOT_AN_APPLICATION' || email.status === 'FAILED')
  const set = (patch: Partial<ApplicationDraft>) => setForm(f => (f ? { ...f, ...patch } : f))
  const emailOk = !form?.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  const ready = !!form && form.firstName.trim() && form.lastName.trim() && form.vacancyId && emailOk

  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{email.subject || '(no subject)'}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {email.fromName ? `${email.fromName} · ` : ''}
            {email.fromEmail ?? 'unknown sender'} · {formatDateTime(email.receivedAt)}
          </p>
        </div>
        <Chip status={email.status} />
      </header>

      <div className="space-y-5 p-5">
        {email.status === 'CANDIDATE_CREATED' && email.candidate ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            <span className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Candidate created: {email.candidate.name}
            </span>
            <Link
              to="/hr/candidates/$candidateId"
              params={{ candidateId: email.candidate.id }}
              className="font-medium text-primary hover:underline"
            >
              Open candidate
            </Link>
          </div>
        ) : null}

        {email.status === 'RECEIVED' ? (
          <p className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2.5 text-sm text-sky-800 dark:text-sky-300">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Claude is reading the email and CV…
          </p>
        ) : null}

        {email.status === 'FAILED' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-sm text-rose-800 dark:text-rose-300">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Could not be read: {email.error ?? 'unknown error'}
            </span>
          </div>
        ) : null}

        {email.status === 'NOT_AN_APPLICATION' ? (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            Claude doesn&apos;t think this is a job application. You can still create a candidate from it, or leave it set aside.
          </p>
        ) : null}

        {email.existingEmployee ? (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              This email belongs to employee{' '}
              <Link
                to="/hr/employees/$employeeId"
                params={{ employeeId: email.existingEmployee.employeeId }}
                className="font-medium underline underline-offset-2"
              >
                {email.existingEmployee.name}
              </Link>
              . Each employee needs their own email, so a different one will be needed if they are hired.
            </span>
          </p>
        ) : null}

        {email.existingCandidates.filter(c => c.id !== email.candidate?.id).length ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" aria-hidden /> Already a candidate
            </p>
            <ul className="mt-1 space-y-0.5 pl-6">
              {email.existingCandidates
                .filter(c => c.id !== email.candidate?.id)
                .map(c => (
                  <li key={c.id}>
                    <Link to="/hr/candidates/$candidateId" params={{ candidateId: c.id }} className="underline underline-offset-2">
                      {c.name}
                    </Link>{' '}
                    · {c.vacancyTitle ?? 'Vacancy'} · {candidateStageLabel(c.stage)}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {email.extraction?.summary ? (
          <p className="flex items-start gap-2 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
            <span>{email.extraction.summary}</span>
          </p>
        ) : null}

        {form && email.status !== 'RECEIVED' ? (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Candidate details</h3>
            <fieldset disabled={!editable} className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" htmlFor="ri-first">
                <Input id="ri-first" value={form.firstName} onChange={e => set({ firstName: e.target.value })} />
              </Field>
              <Field label="Last name" htmlFor="ri-last">
                <Input id="ri-last" value={form.lastName} onChange={e => set({ lastName: e.target.value })} />
              </Field>
              <Field label="Email" htmlFor="ri-email" hint={emailOk ? undefined : 'Check the email address.'}>
                <Input id="ri-email" type="email" value={form.email} onChange={e => set({ email: e.target.value })} />
              </Field>
              <Field label="Phone" htmlFor="ri-phone">
                <Input id="ri-phone" value={form.phone} onChange={e => set({ phone: e.target.value })} />
              </Field>
              <Field label="Address" htmlFor="ri-address" className="sm:col-span-2">
                <Input id="ri-address" value={form.address} onChange={e => set({ address: e.target.value })} />
              </Field>
              <Field
                label="Vacancy"
                htmlFor="ri-vacancy"
                className="sm:col-span-2"
                hint={email.extraction?.vacancyReason || (form.vacancyId ? undefined : 'Choose the vacancy they are applying for.')}
              >
                <Select value={form.vacancyId || undefined} onValueChange={v => set({ vacancyId: v })} disabled={!editable}>
                  <SelectTrigger id="ri-vacancy">
                    <SelectValue placeholder={vacancies.length ? 'Choose a vacancy' : 'No open vacancies'} />
                  </SelectTrigger>
                  <SelectContent>
                    {vacancies.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.vacancyReference} — {v.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Right to work in the UK" htmlFor="ri-rtw">
                <YesNoUnknown id="ri-rtw" value={form.hasRightToWork} onChange={v => set({ hasRightToWork: v })} />
              </Field>
              <Field label="Drives for work" htmlFor="ri-drives">
                <YesNoUnknown id="ri-drives" value={form.drivesForWork} onChange={v => set({ drivesForWork: v })} />
              </Field>
              <Field label="Their message / cover letter" htmlFor="ri-cover" className="sm:col-span-2">
                <Textarea id="ri-cover" rows={4} value={form.coverLetter} onChange={e => set({ coverLetter: e.target.value })} />
              </Field>
            </fieldset>
          </section>
        ) : null}

        {email.status !== 'RECEIVED' ? (
          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Employment history from the CV</h3>
              {editable && email.employmentHistory.length ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={includeHistory} onChange={e => setIncludeHistory(e.target.checked)} />
                  Add to the candidate
                </label>
              ) : null}
            </div>
            {email.employmentHistory.length ? (
              <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                {email.employmentHistory.map((h, i) => (
                  <li key={`${h.from}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2">
                    <span className="min-w-0">
                      {h.kind === 'GAP' ? (
                        <span className="text-muted-foreground">Not working: {h.explanation || 'no reason given'}</span>
                      ) : (
                        <>
                          <span className="font-medium">{h.jobTitle || 'Job'}</span>
                          {h.employer ? <span className="text-muted-foreground"> · {h.employer}</span> : null}
                          {h.careRole ? (
                            <span className="ml-2 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                              Care role
                            </span>
                          ) : null}
                        </>
                      )}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {monthLabel(h.from)} – {monthLabel(h.to)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No jobs with dates were found in the email or CV.</p>
            )}
            {email.incompleteHistoryRows ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {email.incompleteHistoryRows} job{email.incompleteHistoryRows === 1 ? '' : 's'} had unclear dates and{' '}
                {email.incompleteHistoryRows === 1 ? 'is' : 'are'} not included: add {email.incompleteHistoryRows === 1 ? 'it' : 'them'} on
                the candidate.
              </p>
            ) : null}
          </section>
        ) : null}

        {email.attachments.length ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Attachments</h3>
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {email.attachments.map(a => (
                <li key={a.index} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {editable && a.available ? (
                      <input
                        type="checkbox"
                        aria-label={`Add ${a.fileName} to the candidate's documents`}
                        checked={attachments.includes(a.index)}
                        onChange={e =>
                          setAttachments(list => (e.target.checked ? [...list, a.index] : list.filter(x => x !== a.index)))
                        }
                      />
                    ) : (
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className="truncate">{a.fileName}</span>
                    {a.fileName === cvFileName ? (
                      <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[11px] text-violet-700 dark:text-violet-300">CV</span>
                    ) : null}
                    {!a.available ? <span className="text-xs text-muted-foreground">({a.skippedReason ?? 'not saved'})</span> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    {editable && a.available && a.fileName !== cvFileName ? (
                      <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setCvFileName(a.fileName)}>
                        Mark as CV
                      </button>
                    ) : null}
                    {a.available ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void openRecruitmentAttachment(email.id, a.index).catch(e => toastApiError(e, 'Could not open the file'))}
                      >
                        View
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            {editable ? <p className="text-xs text-muted-foreground">Ticked files are added to the candidate&apos;s documents.</p> : null}
          </section>
        ) : null}

        {email.extraction?.checkNotes?.length ? (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold">Worth checking</h3>
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              {email.extraction.checkNotes.map(n => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Original email</summary>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-border px-3 py-2 font-sans text-sm text-muted-foreground">
            {email.bodyText || '(no text)'}
          </pre>
        </details>
      </div>

      {canUpdate || canCreate ? (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          {canUpdate && email.status !== 'CANDIDATE_CREATED' && email.status !== 'RECEIVED' ? (
            <Button type="button" variant="ghost" disabled={readAgain.isPending} onClick={() => readAgain.mutate()}>
              <RefreshCw className={cn('mr-1.5 h-4 w-4', readAgain.isPending && 'animate-spin')} /> Read again
            </Button>
          ) : null}
          {canUpdate && (email.status === 'DISMISSED' || email.status === 'NOT_AN_APPLICATION') ? (
            <Button type="button" variant="outline" disabled={reopen.isPending} onClick={() => reopen.mutate()}>
              Move back to inbox
            </Button>
          ) : null}
          {canUpdate && (email.status === 'READ' || email.status === 'FAILED') ? (
            <Button type="button" variant="outline" disabled={dismiss.isPending} onClick={() => dismiss.mutate()}>
              <X className="mr-1.5 h-4 w-4" /> Dismiss
            </Button>
          ) : null}
          {editable ? (
            <Button type="button" disabled={!ready || create.isPending} onClick={() => create.mutate()}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              {create.isPending ? 'Creating…' : 'Create candidate'}
            </Button>
          ) : null}
        </footer>
      ) : null}
    </div>
  )
}

export default function RecruitmentInboxPage() {
  const can = useAuthStore(s => s.can)
  const canCreate = can('hr.candidates.create')
  const canUpdate = can('hr.candidates.update')
  const canManageMailboxes = can('crm.manage')
  const [tab, setTab] = React.useState<RecruitmentInboxTab>('open')
  const [selected, setSelected] = React.useState<string | null>(null)
  const [mailboxesOpen, setMailboxesOpen] = React.useState(false)

  const listQuery = useQuery({
    queryKey: keys.list(tab),
    queryFn: () => fetchRecruitmentInbox(tab),
    // New emails arrive with every mailbox check (every 2 minutes).
    refetchInterval: 60_000,
  })
  const rows = listQuery.data?.rows ?? []
  const counts = listQuery.data?.counts
  const mailboxQuery = useQuery({ queryKey: ['referral-inbox', 'mailbox'], queryFn: fetchReferralMailbox })
  const recruitmentMailboxes = (mailboxQuery.data?.mailboxes ?? []).filter(m => m.purpose === 'RECRUITMENT')

  React.useEffect(() => {
    if (!rows.length) return
    if (!selected || !rows.some(r => r.id === selected)) setSelected(rows[0]!.id)
  }, [rows, selected])

  return (
    <div className="flex flex-col gap-5" data-testid="hr-recruitment-inbox-page">
      <PageHeader
        title="Recruitment inbox"
        description="Job applications that arrive by email. Claude reads the email and CV; check the details and create the candidate."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Inbox className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Recruitment', href: '/hr/recruitment' },
          { label: 'Inbox' },
        ]}
        actions={
          canManageMailboxes
            ? [{ label: 'Mailboxes', icon: <Settings2 className="h-4 w-4" />, variant: 'outline' as const, onClick: () => setMailboxesOpen(true) }]
            : undefined
        }
      />

      {mailboxQuery.data ? (
        recruitmentMailboxes.length ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" aria-hidden />
            Reading{' '}
            {recruitmentMailboxes.map((m, i) => (
              <span key={m.id} className="font-medium text-foreground">
                {mailboxName(m)}
                {m.isActive ? '' : ' (off)'}
                {i < recruitmentMailboxes.length - 1 ? ',' : ''}
              </span>
            ))}
            <span>· checked every 2 minutes</span>
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <span className="text-amber-800 dark:text-amber-300">
              No mailbox is connected for job applications yet. Connect one under Mailboxes and set “Used for” to Job applications.
            </span>
            {canManageMailboxes ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setMailboxesOpen(true)}>
                <Settings2 className="mr-1.5 h-4 w-4" /> Mailboxes
              </Button>
            ) : null}
          </div>
        )
      ) : null}

      <section className="grid overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid-cols-5">
        <div className="min-w-0 border-b border-border lg:col-span-2 lg:border-b-0 lg:border-r">
          <div className="flex gap-1 overflow-x-auto border-b border-border px-2" role="tablist" aria-label="Inbox">
            {TABS.map(t => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => {
                  setTab(t.value)
                  setSelected(null)
                }}
                className={cn(
                  '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  tab === t.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                    tab === t.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {counts ? counts[t.value] : '–'}
                </span>
              </button>
            ))}
          </div>
          {listQuery.isLoading ? (
            <div className="space-y-2 p-4" aria-hidden>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/60" aria-hidden />
              <p className="text-sm font-medium">
                {tab === 'open' ? 'No applications to review' : tab === 'created' ? 'No candidates created from email yet' : 'Nothing set aside'}
              </p>
              {tab === 'open' ? (
                <p className="max-w-xs text-xs text-muted-foreground">New job applications sent to the recruitment mailbox appear here.</p>
              ) : null}
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {rows.map(r => (
                <EmailListItem key={r.id} row={r} active={r.id === selected} onSelect={() => setSelected(r.id)} />
              ))}
            </ul>
          )}
        </div>
        <div className="min-w-0 lg:col-span-3">
          {selected ? (
            <EmailDetail key={selected} id={selected} canCreate={canCreate} canUpdate={canUpdate} />
          ) : (
            <p className="px-6 py-14 text-center text-sm text-muted-foreground">Choose an email to see the applicant&apos;s details.</p>
          )}
        </div>
      </section>

      {canManageMailboxes ? (
        <ReferralMailboxesDialog open={mailboxesOpen} onOpenChange={setMailboxesOpen} status={mailboxQuery.data} purpose="RECRUITMENT" />
      ) : null}
    </div>
  )
}

