import * as React from 'react'
import { Undo2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  useWageRecoveries,
  useWageRecovery,
  useWageRecoveryActions,
  useWageRecoveryPolicy,
} from '@/features/billing/hooks/useWageRecoveries'
import {
  RECOVERY_AUTHORITY_TYPES,
  WAGE_RECOVERY_KIND_LABELS,
  WAGE_RECOVERY_STATUS_LABELS,
  type WageRecovery,
} from '@/features/billing/api/wage-recoveries.api'
import { formatBillingDate } from '@/features/billing/types/billing-cards.types'

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'PROPOSED', label: 'Awaiting decision' },
  { value: 'APPROVED', label: 'Authorised' },
  { value: 'APPLIED', label: 'Deducted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: '', label: 'All' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary' | 'info'> = {
  PROPOSED: 'warning',
  APPROVED: 'info',
  APPLIED: 'success',
  REJECTED: 'destructive',
  WITHDRAWN: 'secondary',
}

const inputClass = 'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function money(value: number | null | undefined): string {
  return value == null ? '—' : `£${Number(value).toFixed(2)}`
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

/** A recovery put back for a decision because its amount changed after the last one. */
function proposedAgain(r: WageRecovery): boolean {
  return r.status === 'PROPOSED' && !!r.decisionNote
}

function RecoveryPolicyCard({ canApprove }: { canApprove: boolean }) {
  const policy = useWageRecoveryPolicy().data
  const { recordPolicy, withdrawPolicy } = useWageRecoveryActions()
  const [reference, setReference] = React.useState('')
  const [withdrawNote, setWithdrawNote] = React.useState('')
  if (!policy) return null

  const onRecord = async () => {
    try {
      const res = await recordPolicy.mutateAsync(reference.trim())
      toastSuccess(res.message)
      setReference('')
    } catch (err) {
      toastApiError(err, 'Could not record the recovery policy.')
    }
  }
  const onWithdraw = async () => {
    try {
      const res = await withdrawPolicy.mutateAsync(withdrawNote.trim())
      toastSuccess(res.message)
      setWithdrawNote('')
    } catch (err) {
      toastApiError(err, 'Could not withdraw the recovery policy.')
    }
  }

  return (
    <ContentCard className="space-y-3" data-testid="recovery-policy">
      {policy.inForce ? (
        <>
          <p className="text-sm">
            <span className="font-medium">Recovery policy on record:</span> {policy.reference}
          </p>
          <p className="text-xs text-muted-foreground">
            Recorded {formatBillingDate(policy.recordedAt)}
            {policy.recordedByName ? ` by ${policy.recordedByName}` : ''}. An authorised recovery is deducted, once, by the next
            calculation of the open pay run that covers it.
          </p>
          {canApprove ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[260px] flex-1 space-y-1 text-sm">
                <span className="text-xs font-medium text-foreground/90">Reason for withdrawing the policy</span>
                <input className={inputClass} value={withdrawNote} onChange={e => setWithdrawNote(e.target.value)} />
              </label>
              <Button
                size="sm"
                variant="outline"
                disabled={withdrawNote.trim().length < 5 || withdrawPolicy.isPending}
                onClick={() => void onWithdraw()}
              >
                Withdraw policy
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300" role="status">
            No approved recovery policy of the employer is on record. Recoveries can be reviewed and authorised, but nothing is
            deducted from wages until the policy and its legal authority are recorded.
          </p>
          {canApprove ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[260px] flex-1 space-y-1 text-sm">
                <span className="text-xs font-medium text-foreground/90">
                  Where the approved policy and its legal authority are recorded
                </span>
                <input className={inputClass} value={reference} onChange={e => setReference(e.target.value)} />
              </label>
              <Button size="sm" disabled={reference.trim().length < 10 || recordPolicy.isPending} onClick={() => void onRecord()}>
                Record policy
              </Button>
            </div>
          ) : null}
        </>
      )}
    </ContentCard>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function RecoveryDetail({
  id,
  canApprove,
  policyInForce,
  onClose,
}: {
  id: string
  canApprove: boolean
  policyInForce: boolean
  onClose: () => void
}) {
  const currentUserId = useAuthStore(s => s.user?.id ?? null)
  const query = useWageRecovery(id)
  const { approve, reject } = useWageRecoveryActions()
  const [authorityType, setAuthorityType] = React.useState('')
  const [authorityReference, setAuthorityReference] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [rejectNote, setRejectNote] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const r = query.data

  if (query.error) return <p className="text-sm text-destructive">{errorText(query.error, 'Could not load this recovery.')}</p>
  if (!r) return <p className="text-sm text-muted-foreground">Loading recovery…</p>

  const ownProposal = r.proposedById != null && r.proposedById === currentUserId
  const authorityLabel = RECOVERY_AUTHORITY_TYPES.find(a => a.value === authorityType)?.label
  const canSaveApproval = !!authorityLabel && authorityReference.trim().length >= 10 && reason.trim().length >= 5
  const busy = approve.isPending || reject.isPending

  const onApprove = async () => {
    setError(null)
    try {
      const res = await approve.mutateAsync({
        id: r.id,
        authorityBasis: `${authorityLabel}: ${authorityReference.trim()}`,
        reason: reason.trim(),
      })
      toastSuccess(res.message)
    } catch (err) {
      setError(errorText(err, 'Could not authorise this recovery.'))
    }
  }
  const onReject = async () => {
    setError(null)
    try {
      const res = await reject.mutateAsync({ id: r.id, note: rejectNote.trim() })
      toastSuccess(res.message)
    } catch (err) {
      setError(errorText(err, 'Could not reject this recovery.'))
    }
  }

  return (
    <ContentCard className="space-y-4" data-testid="recovery-detail">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">
            {r.employeeName} — {WAGE_RECOVERY_KIND_LABELS[r.kind] ?? r.kind}
          </h3>
          <p className="text-sm text-muted-foreground">{r.reason}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Original payment">{r.originalReference ?? '—'}</Field>
        <Field label="Originally paid">{money(r.paidAmount)}</Field>
        <Field label="Now due">{money(r.dueAmount)}</Field>
        <Field label="Recovery proposed">{money(r.amount)}</Field>
        <Field label="Status">{WAGE_RECOVERY_STATUS_LABELS[r.status] ?? r.status}</Field>
        <Field label="Proposed">
          {formatBillingDate(r.proposedAt)}
          {r.proposedByName ? ` by ${r.proposedByName}` : ''}
          {r.proposedInRun ? ` (${r.proposedInRun})` : ''}
        </Field>
        <Field label={r.status === 'REJECTED' ? 'Rejected by' : 'Authorised by'}>
          {r.decidedByName ? `${r.decidedByName}, ${formatBillingDate(r.decidedAt)}` : '—'}
        </Field>
        <Field label="Authority recorded">{r.authorityBasis ?? '—'}</Field>
        <Field label="Deducted in">{r.appliedInRun ? `${r.appliedInRun}, ${formatBillingDate(r.appliedAt)}` : 'Not deducted'}</Field>
      </dl>

      {proposedAgain(r) ? (
        <p className="text-sm text-amber-700 dark:text-amber-300" data-testid="recovery-proposed-again">
          The amount changed after the last decision, so that decision no longer applies: {r.decisionNote}
        </p>
      ) : null}
      {r.status === 'APPROVED' && !policyInForce ? (
        <p className="text-sm text-amber-700 dark:text-amber-300" data-testid="recovery-policy-blocked">
          Authorised, but not deducted: no approved recovery policy of the employer is on record.
        </p>
      ) : null}
      {r.status === 'APPLIED' ? (
        <p className="text-sm text-muted-foreground" data-testid="recovery-applied">
          Deducted once, in {r.appliedInRun ?? 'a pay run'}. It cannot be deducted again or changed here; a mistake is put right
          with a pay correction.
        </p>
      ) : null}

      <div>
        <h4 className="text-sm font-medium">History</h4>
        <ol className="mt-1 space-y-1 text-sm" data-testid="recovery-history">
          {r.history.map((h, i) => (
            <li key={`${h.event}-${i}`}>
              <span className="tabular-nums text-muted-foreground">{formatBillingDate(h.at)}</span>{' '}
              <span className="font-medium">{h.event.replace('_', ' ').toLowerCase()}</span>
              {h.by ? ` by ${h.by}` : ''}
              {h.detail ? ` — ${h.detail}` : ''}
            </li>
          ))}
        </ol>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!canApprove ? (
        r.status === 'PROPOSED' || r.status === 'APPROVED' ? (
          <p className="text-sm text-muted-foreground" data-testid="recovery-no-permission">
            You can view this recovery. Authorising or rejecting it needs the pay run approval permission.
          </p>
        ) : null
      ) : (
        <>
          {r.status === 'PROPOSED' ? (
            ownProposal ? (
              <p className="text-sm text-muted-foreground" data-testid="recovery-own-proposal">
                Your calculation proposed this recovery, so a different user must authorise it.
              </p>
            ) : (
              <div className="space-y-2 rounded-md border border-border p-3" data-testid="recovery-authorise-form">
                <h4 className="text-sm font-medium">Authorise recovery of {money(r.amount)}</h4>
                <p className="text-xs text-muted-foreground">
                  The amount comes from the pay calculation and cannot be changed here. Choosing an authority records what you
                  relied on; it is not proof that the deduction is lawful.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-foreground/90">Authority for the deduction</span>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={authorityType}
                      onChange={e => setAuthorityType(e.target.value)}
                    >
                      <option value="">Choose…</option>
                      {RECOVERY_AUTHORITY_TYPES.map(a => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-foreground/90">Reference (clause, document, date)</span>
                    <input className={inputClass} value={authorityReference} onChange={e => setAuthorityReference(e.target.value)} />
                  </label>
                </div>
                <label className="block space-y-1 text-sm">
                  <span className="text-xs font-medium text-foreground/90">Reason for authorising</span>
                  <input className={inputClass} value={reason} onChange={e => setReason(e.target.value)} />
                </label>
                <Button size="sm" disabled={!canSaveApproval || busy} onClick={() => void onApprove()}>
                  Authorise recovery
                </Button>
              </div>
            )
          ) : null}
          {r.status === 'PROPOSED' || r.status === 'APPROVED' ? (
            <div className="space-y-2 rounded-md border border-border p-3" data-testid="recovery-reject-form">
              <h4 className="text-sm font-medium">Reject and write off</h4>
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-medium text-foreground/90">Reason for not recovering</span>
                <input className={inputClass} value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
              </label>
              <Button size="sm" variant="outline" disabled={rejectNote.trim().length < 5 || busy} onClick={() => void onReject()}>
                Reject and write off
              </Button>
            </div>
          ) : null}
        </>
      )}
    </ContentCard>
  )
}

/** Overpayments found by pay calculations: nothing is taken from wages until one is authorised. */
export default function WageRecoveriesPage() {
  const canApprove = useAuthStore(s => s.can('billing.payroll_runs.approve' as never))
  const [status, setStatus] = React.useState('PROPOSED')
  const [openId, setOpenId] = React.useState<string | null>(null)
  const listQuery = useWageRecoveries(status || undefined)
  const policyInForce = useWageRecoveryPolicy().data?.inForce ?? false
  const rows = listQuery.data ?? []

  return (
    <div className="min-w-0 space-y-6 pb-10" data-testid="wage-recoveries-page">
      <ContentSectionHeader
        icon={<Undo2 className="h-5 w-5" />}
        iconClassName="bg-teal-500/10 text-teal-700 dark:text-teal-300"
        title="Wage recoveries"
        description="Overpayments found by pay calculations. Nothing is deducted from an employee's wages until a recovery is authorised by a different user, with the reason and the authority for the deduction. Amounts come from the calculation and cannot be edited here."
      />

      <RecoveryPolicyCard canApprove={canApprove} />

      <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1" role="tablist" aria-label="Status">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              status === f.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {listQuery.error ? <p className="text-sm text-destructive">{errorText(listQuery.error, 'Could not load wage recoveries.')}</p> : null}

      <ContentCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[1200px] text-sm" data-testid="wage-recoveries-table">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Original payment</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Originally paid</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Recovery proposed</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Reason</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Proposed</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Decision</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Deducted in</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">Loading wage recoveries…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">No wage recoveries.</td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} className="border-b border-border align-top last:border-0" data-testid="wage-recovery-row">
                  <td className="px-3 py-2.5 font-medium">{r.employeeName}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.originalReference ?? '—'}</td>
                  <td className="px-3 py-2.5">{WAGE_RECOVERY_KIND_LABELS[r.kind] ?? r.kind}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(r.paidAmount)}</td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">{money(r.amount)}</td>
                  <td className="px-3 py-2.5">{r.reason}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={STATUS_BADGE[r.status] ?? 'secondary'}>{WAGE_RECOVERY_STATUS_LABELS[r.status] ?? r.status}</Badge>
                    {proposedAgain(r) ? <p className="mt-1 text-xs text-muted-foreground">Amount changed: needs a fresh decision</p> : null}
                    {r.status === 'APPROVED' && !policyInForce ? (
                      <p className="mt-1 text-xs text-muted-foreground">Not deducted: no recovery policy on record</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="whitespace-nowrap">{formatBillingDate(r.proposedAt)}</p>
                    <p className="text-xs text-muted-foreground">{r.proposedByName ?? '—'}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p>{r.decidedByName ?? '—'}</p>
                    {r.authorityBasis ? <p className="text-xs text-muted-foreground">{r.authorityBasis}</p> : null}
                  </td>
                  <td className="px-3 py-2.5">{r.appliedInRun ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setOpenId(r.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ContentCard>

      {openId ? (
        <RecoveryDetail key={openId} id={openId} canApprove={canApprove} policyInForce={policyInForce} onClose={() => setOpenId(null)} />
      ) : null}
    </div>
  )
}
