import * as React from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, Smartphone, Trash2, UserPlus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatDateTimeGb } from '@/shared/lib/time-format'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { useAuthStore } from '@/features/auth/store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { accountReviewKey, useAccountReview, useDecideDeletion, useDecideSignup } from '@/features/employees/hooks/useAccountReview'
import type { AccountReview, ReviewPerson, SetupItem } from '@/features/employees/types'


const personText = (p: ReviewPerson) => (p ? `${p.name}${p.roles.length ? ` (${p.roles.join(', ')})` : ''}` : null)

/** "Created …" line for every staff record: by whom and how (office, or the carer in the Care app). */
function CreatedLine({ review }: { review: AccountReview }) {
  const when = formatDateTimeGb(review.createdAt)
  const text =
    review.creationSource === 'CARE_APP_SIGNUP'
      ? `Created by the carer in the Care app (sign-up) · ${when}`
      : review.createdBy
        ? `Created by ${personText(review.createdBy)} · ${when}`
        : `Created by the office · ${when}`
  return (
    <p className="text-xs text-muted-foreground" data-testid="employee-created-by">
      {text}
    </p>
  )
}

function NoteField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        Note (optional)
      </label>
      <textarea
        id={id}
        rows={2}
        maxLength={1000}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  )
}

function LookupSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ id: string; name: string }>
  testId: string
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger data-testid={testId} aria-label={label}>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Staff record: how the record was made, and the office's decisions on a carer's own Care app sign-up
 * and on a carer's request to delete their account (19 Nov 2026).
 */
export function EmployeeAccountReviewCard({ employeeId }: { employeeId: string }) {
  const canRead = useAuthStore(s => s.can('employees.read'))
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const canDelete = useAuthStore(s => s.can('employees.delete'))
  const qc = useQueryClient()
  const navigate = useNavigate()
  const key = accountReviewKey(employeeId)
  const { data } = useAccountReview(employeeId, canRead)
  const pendingSignup = data?.signup?.status === 'PENDING'
  const lookups = useEmployeeLookups(pendingSignup)
  const L = lookups.data

  const [locationId, setLocationId] = React.useState('')
  const [roleId, setRoleId] = React.useState('')
  const [rbacLevelId, setRbacLevelId] = React.useState('')
  const [signupNote, setSignupNote] = React.useState('')
  const [hours, setHours] = React.useState('')
  /** Approve was clicked with no contracted hours: ask the office to acknowledge first. */
  const [hoursWarningOpen, setHoursWarningOpen] = React.useState(false)
  /** After approval: what is still missing (dialog). */
  const [setupItems, setSetupItems] = React.useState<SetupItem[] | null>(null)
  const [deleteNote, setDeleteNote] = React.useState('')

  React.useEffect(() => {
    const s = data?.signup
    if (!s || s.status !== 'PENDING') return
    setLocationId(s.current.locationId ?? '')
    setRoleId(s.current.roleId ?? s.defaults?.roleId ?? '')
    setRbacLevelId(s.current.rbacLevelId ?? s.defaults?.rbacLevelId ?? '')
    setHours(s.current.contractedWeeklyHours != null ? String(s.current.contractedWeeklyHours) : '')
  }, [data?.signup])

  const hoursNumber = Number(hours)
  const hasHours = hours.trim() !== '' && Number.isFinite(hoursNumber) && hoursNumber > 0
  const goToTab = (tab: string) => {
    setSetupItems(null)
    void navigate({ to: '/employee/$employeeId/edit', params: { employeeId }, search: { tab } })
  }

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: key })
    void qc.invalidateQueries({ queryKey: ['employees'] })
    void qc.invalidateQueries({ queryKey: ['role-tasks'] })
  }
  const decideSignupMutation = useDecideSignup(employeeId)
  const signupMutation = useMutation({
    mutationFn: (decision: 'approve' | 'decline') =>
      decideSignupMutation.mutateAsync({
        decision,
        ...(decision === 'approve'
          ? {
              locationId: locationId || undefined,
              roleId: roleId || undefined,
              rbacLevelId: rbacLevelId || undefined,
              ...(hasHours ? { contractedWeeklyHours: hoursNumber } : {}),
            }
          : {}),
        note: signupNote.trim() || undefined,
      }),
    onSuccess: (r, decision) => {
      toastSuccess(r.message)
      setHoursWarningOpen(false)
      refresh()
      if (decision === 'approve' && r.missing.length) setSetupItems(r.missing)
    },
    onError: e => toastApiError(e, 'Decision not saved'),
  })
  const decideDeletionMutation = useDecideDeletion(employeeId)
  const deletionMutation = useMutation({
    mutationFn: (decision: 'approve' | 'decline') =>
      decideDeletionMutation.mutateAsync({ decision, note: deleteNote.trim() || undefined }),
    onSuccess: (r, decision) => {
      toastSuccess(r.message)
      refresh()
      // The record no longer exists: leave its edit page.
      if (decision === 'approve') void navigate({ to: '/employee/staff-list' })
    },
    onError: e => toastApiError(e, 'Decision not saved'),
  })

  if (!canRead || !data) return null
  // The server decides who may approve (review roles too, not only staff editors); fall back to permissions.
  const mayDecideSignup = data.canDecide?.signup ?? canUpdate
  const mayDecideDeletion = data.canDecide?.deletion ?? canDelete
  const s = data.signup
  const d = data.deletionRequest

  return (
    <div className="space-y-3" data-testid="employee-account-review">
      <CreatedLine review={data} />

      {s && s.status === 'PENDING' ? (
        <section className="rounded-xl border border-warning/50 bg-warning/10 p-4" data-testid="carer-signup-review">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-foreground" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Care app sign-up waiting for approval</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            This carer made their own account in the Care app
            {s.submitted ? ` on ${formatDateTimeGb(s.submitted.signedUpAt)}` : ''}. Until you approve, they can’t log in or be
            given visits.
          </p>
          {s.submitted ? <SubmittedDetails submitted={s.submitted} /> : null}
          {mayDecideSignup ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs font-medium text-foreground">Before approving, set:</p>
              <div className="grid gap-3 md:grid-cols-4">
                <LookupSelect
                  label="Branch"
                  value={locationId}
                  onChange={setLocationId}
                  options={s.branchOptions?.map(b => ({ id: b.id, name: b.label })) ?? L?.locations ?? []}
                  testId="signup-branch"
                />
                <LookupSelect label="Role" value={roleId} onChange={setRoleId} options={L?.roles ?? []} testId="signup-role" />
                <LookupSelect
                  label="CareFlow access level"
                  value={rbacLevelId}
                  onChange={setRbacLevelId}
                  options={L?.rbacLevels ?? []}
                  testId="signup-rbac"
                />
                <div className="space-y-1">
                  <label htmlFor="signup-hours" className="text-xs font-medium text-foreground">
                    Contracted hours per week
                  </label>
                  <input
                    id="signup-hours"
                    type="number"
                    min={0}
                    step="0.5"
                    inputMode="decimal"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    placeholder="e.g. 20"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    data-testid="signup-hours"
                  />
                </div>
              </div>
              <NoteField id="signup-note" value={signupNote} onChange={setSignupNote} />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => (hasHours ? signupMutation.mutate('approve') : setHoursWarningOpen(true))}
                  disabled={signupMutation.isPending || !locationId}
                  data-testid="signup-approve"
                >
                  Approve carer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => signupMutation.mutate('decline')}
                  disabled={signupMutation.isPending}
                  data-testid="signup-decline"
                >
                  Decline
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Only a manager, branch admin or admin can approve or decline.</p>
          )}
        </section>
      ) : s && s.status !== 'PENDING' ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="carer-signup-decided">
          <Smartphone className="h-3.5 w-3.5" aria-hidden />
          Care app sign-up {s.status === 'APPROVED' ? 'approved' : 'declined'}
          {s.decidedBy ? ` by ${personText(s.decidedBy)}` : ''}
          {s.decidedAt ? ` · ${formatDateTimeGb(s.decidedAt)}` : ''}
          {s.note ? ` · “${s.note}”` : ''}
        </p>
      ) : null}
      {s && s.status === 'APPROVED' && s.missing?.length ? (
        <SetupChecklist items={s.missing} onOpen={canUpdate ? goToTab : undefined} />
      ) : null}

      {d && d.status === 'PENDING' ? (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4" data-testid="carer-deletion-review">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Account delete request</h2>
            <Badge variant="outline">Waiting</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Asked in the Care app · {formatDateTimeGb(d.requestedAt)}</p>
          <p className="mt-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">“{d.reason}”</p>
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              {d.futureVisits?.count
                ? `${d.futureVisits.count} future visit${d.futureVisits.count === 1 ? '' : 's'} will be unassigned and need another carer:`
                : 'No future visits are assigned to this carer.'}
            </p>
            {d.futureVisits?.visits.length ? (
              <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-xs text-muted-foreground" data-testid="deletion-future-visits">
                {d.futureVisits.visits.map(v => (
                  <li key={v.jobId}>
                    {formatDateTimeGb(v.start)} · {v.client || 'Client'}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">Their past visits and records are kept.</p>
          </div>
          {mayDecideDeletion ? (
            <div className="mt-3 space-y-3">
              <NoteField id="deletion-note" value={deleteNote} onChange={setDeleteNote} />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deletionMutation.mutate('approve')}
                  disabled={deletionMutation.isPending}
                  data-testid="deletion-approve"
                >
                  Approve and delete account
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deletionMutation.mutate('decline')}
                  disabled={deletionMutation.isPending}
                  data-testid="deletion-decline"
                >
                  Decline
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : d ? (
        <p className="text-xs text-muted-foreground" data-testid="carer-deletion-decided">
          Account delete request {d.status === 'APPROVED' ? 'approved' : 'declined'}
          {d.decidedBy ? ` by ${personText(d.decidedBy)}` : ''}
          {d.decidedAt ? ` · ${formatDateTimeGb(d.decidedAt)}` : ''}
        </p>
      ) : null}

      <Dialog open={hoursWarningOpen} onOpenChange={setHoursWarningOpen}>
        <DialogContent
          data-testid="signup-hours-warning"
          onOpenAutoFocus={e => {
            // Start in the hours box, so the office can type them straight away.
            e.preventDefault()
            document.getElementById('signup-hours-dialog')?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>Contracted hours not added</DialogTitle>
            <DialogDescription>Add this carer’s contracted weekly hours here, or approve without them.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-1">
              <label htmlFor="signup-hours-dialog" className="text-xs font-medium text-foreground">
                Contracted hours per week
              </label>
              <input
                id="signup-hours-dialog"
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                value={hours}
                onChange={e => setHours(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && hasHours) signupMutation.mutate('approve')
                }}
                placeholder="e.g. 20"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                data-testid="signup-hours-dialog"
              />
            </div>
            <p
              className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100"
              role="note"
              data-testid="signup-hours-no-visits"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              If you approve without hours, no visits can be assigned to this carer until their contracted hours are added on
              the Employment tab.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => signupMutation.mutate('approve')}
              disabled={signupMutation.isPending}
              data-testid="signup-hours-acknowledge"
            >
              Approve without hours
            </Button>
            <Button
              onClick={() => signupMutation.mutate('approve')}
              disabled={signupMutation.isPending || !hasHours}
              data-testid="signup-hours-approve"
            >
              Approve with these hours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={setupItems !== null} onOpenChange={open => (open ? null : setSetupItems(null))}>
        <DialogContent data-testid="signup-setup-dialog">
          <DialogHeader>
            <DialogTitle>Carer approved — still to add</DialogTitle>
            <DialogDescription>
              They can log in to the Care app now. Add these on their record before they can work and be paid.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {setupItems ? <SetupChecklist items={setupItems} onOpen={canUpdate ? goToTab : undefined} bare /> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupItems(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const TAB_LABEL: Record<string, string> = {
  employment: 'Employment',
  'working-pattern': 'Working pattern',
  'employment-compliance': 'Employment compliance',
  salary: 'Salary',
}

/** What is still missing after approval, each with a button to the tab where it is added. */
function SetupChecklist({
  items,
  onOpen,
  bare,
}: {
  items: SetupItem[]
  /** Missing when the user cannot open the staff record: no "Go to" buttons, a note instead. */
  onOpen?: (tab: string) => void
  bare?: boolean
}) {
  return (
    <section
      className={bare ? 'space-y-2' : 'space-y-2 rounded-xl border border-border bg-card p-4'}
      data-testid="signup-setup-checklist"
    >
      {bare ? null : <h2 className="text-sm font-semibold text-foreground">Still to add for this carer</h2>}
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-foreground">{item.label}</span>
            {onOpen ? (
              <Button size="sm" variant="outline" onClick={() => onOpen(item.tab)} data-testid={`signup-setup-${item.key}`}>
                Go to {TAB_LABEL[item.tab] ?? 'tab'} <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">{TAB_LABEL[item.tab] ?? 'Staff record'} tab</span>
            )}
          </li>
        ))}
      </ul>
      {onOpen ? null : (
        <p className="text-xs text-muted-foreground">Someone who can edit staff records adds these on the carer’s record.</p>
      )}
    </section>
  )
}

/** What the carer typed in the Care app, so the office can check it without scrolling the form. */
function SubmittedDetails({ submitted }: { submitted: NonNullable<NonNullable<AccountReview['signup']>['submitted']> }) {
  const { formatDate } = useOrganisationDisplayFormat()
  const dash = (v: string | null) => v || '—'
  const rows: Array<[string, string]> = [
    ['Name', dash([submitted.firstName, submitted.lastName].filter(Boolean).join(' '))],
    ['Email', dash(submitted.email)],
    ['Mobile', dash(submitted.mobile)],
    ['Branch chosen', dash(submitted.branch)],
    ['Date of birth', submitted.dateOfBirth ? formatDate(submitted.dateOfBirth.slice(0, 10)) : '—'],
    ['Address', dash(submitted.address)],
    ['National Insurance number', dash(submitted.nationalInsuranceNo)],
  ]
  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3" data-testid="signup-submitted">
      <p className="text-xs font-semibold text-foreground">What the carer entered</p>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-1">
            <dt className="text-muted-foreground">{k}:</dt>
            <dd className="text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
