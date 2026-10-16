import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { useAuthStore } from '@/features/auth/store'
import { useSalariedHoursMethodActions, useSalariedHoursMethods } from '@/features/payroll/hooks/usePayroll'
import type { SalariedHoursMethod } from '@/features/payroll/types/payroll.types'

const STATUS_LABELS: Record<SalariedHoursMethod['status'], string> = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  WITHDRAWN: 'Withdrawn',
}
const STATUS_BADGE: Record<SalariedHoursMethod['status'], 'warning' | 'success' | 'secondary'> = {
  DRAFT: 'warning',
  APPROVED: 'success',
  WITHDRAWN: 'secondary',
}

const inputClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
const day = (value: string | null | undefined) => (value ? value.slice(0, 10) : '—')

/** The method in words: the contract's weekly hours stay as they are; this is only the multiplier. */
export function salariedHoursMethodLabel(m: Pick<SalariedHoursMethod, 'weeksPerYear' | 'isSynthetic'>): string {
  return `Contracted weekly hours × ${m.weeksPerYear} weeks${m.isSynthetic ? ' (synthetic test method)' : ''}`
}

/**
 * How contracted weekly hours become the basic hours of a year, for the minimum wage on salaried
 * hours work. One user enters a method and a different user approves it; without an approved
 * method UK payroll does not assess salaried staff.
 */
export function SalariedHoursAnnualisationSection() {
  const canEnter = useAuthStore(s => s.can('payroll.settings.manage'))
  const canApprove = useAuthStore(s => s.can('payroll.pay_agreements.approve'))
  const currentUserId = useAuthStore(s => s.user?.id ?? null)
  const query = useSalariedHoursMethods()
  const { enter, approve, withdraw } = useSalariedHoursMethodActions()
  const [weeks, setWeeks] = React.useState('')
  const [effectiveFrom, setEffectiveFrom] = React.useState('')
  const [basis, setBasis] = React.useState('')
  const [withdrawId, setWithdrawId] = React.useState<string | null>(null)
  const [withdrawNote, setWithdrawNote] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const data = query.data
  const weeksNumber = Number(weeks)
  const canSave = weeks.trim() !== '' && weeksNumber >= 1 && weeksNumber <= 53 && !!effectiveFrom && basis.trim().length >= 20
  const busy = enter.isPending || approve.isPending || withdraw.isPending

  const run = async (action: () => Promise<{ message: string }>, fallback: string, after?: () => void) => {
    setError(null)
    try {
      const res = await action()
      toastSuccess(res.message)
      after?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallback)
    }
  }
  const onEnter = () =>
    run(
      () => enter.mutateAsync({ weeksPerYear: weeksNumber, basis: basis.trim(), effectiveFrom }),
      'Could not enter the method.',
      () => {
        setWeeks('')
        setEffectiveFrom('')
        setBasis('')
      },
    )
  const onApprove = (m: SalariedHoursMethod) => run(() => approve.mutateAsync(m.id), 'Could not approve the method.')
  const onWithdraw = (m: SalariedHoursMethod) =>
    run(
      () => withdraw.mutateAsync({ id: m.id, note: withdrawNote.trim() }),
      'Could not withdraw the method.',
      () => {
        setWithdrawId(null)
        setWithdrawNote('')
      },
    )

  return (
    <div className="space-y-4 rounded-xl border border-border p-4" data-testid="salaried-hours-annualisation">
      <div>
        <p className="text-sm font-semibold text-foreground">Salaried hours annualisation</p>
        <p className="text-xs text-muted-foreground">
          Pay agreements record contracted weekly hours only, and that does not change. This is the employer's method for
          turning them into basic hours for a year, which the minimum wage check for salaried staff needs. HMRC accepts a
          multiplier such as 52, 52.14 or 52.18; the employer must be able to show how it was arrived at.
        </p>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading methods…</p>
      ) : query.error || !data ? (
        <p className="text-sm text-destructive">Could not load the annualisation methods.</p>
      ) : (
        <>
          {data.inForce ? (
            <p
              className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
              data-testid="annualisation-in-force"
            >
              In use today: {salariedHoursMethodLabel(data.inForce)}, from {day(data.inForce.effectiveFrom)}.
            </p>
          ) : (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
              data-testid="annualisation-none"
              role="status"
            >
              No approved method applies today. UK payroll does not assess salaried staff against the minimum wage without
              one: each is reported as “policy review required”, nothing is topped up, and the run cannot be closed without
              a review. Nothing is assumed in its place.
            </p>
          )}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[980px] text-left text-sm" data-testid="annualisation-methods">
              <thead className="border-b border-border bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Effective from</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Entered by</th>
                  <th className="px-3 py-2 font-medium">Approved by</th>
                  <th className="px-3 py-2 font-medium">Policy reference</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.methods.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      No method has been entered.
                    </td>
                  </tr>
                ) : (
                  data.methods.map(m => {
                    const own = m.createdById != null && m.createdById === currentUserId
                    return (
                      <tr key={m.id} className="border-b border-border/70 align-top last:border-0" data-testid="annualisation-method-row">
                        <td className="px-3 py-2 font-medium">{salariedHoursMethodLabel(m)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{day(m.effectiveFrom)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={STATUS_BADGE[m.status]}>{STATUS_LABELS[m.status]}</Badge>
                          {m.status === 'WITHDRAWN' ? (
                            <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                              {day(m.withdrawnAt)}
                              {m.withdrawnByName ? ` by ${m.withdrawnByName}` : ''}: {m.withdrawnNote ?? '—'}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <p>{m.createdByName ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{day(m.createdAt)}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p>{m.approvedByName ?? (m.approvedAt ? 'Approved' : '—')}</p>
                          {m.approvedAt ? <p className="text-xs text-muted-foreground">{day(m.approvedAt)}</p> : null}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{m.basis}</td>
                        <td className="px-3 py-2">
                          {canApprove && m.status !== 'WITHDRAWN' ? (
                            <div className="flex flex-col items-start gap-1">
                              {m.status === 'DRAFT' ? (
                                own ? (
                                  <p className="max-w-[180px] text-xs text-muted-foreground" data-testid="annualisation-own-entry">
                                    You entered this method, so a different user must approve it.
                                  </p>
                                ) : (
                                  <Button size="sm" className="h-8" disabled={busy} onClick={() => void onApprove(m)}>
                                    Approve
                                  </Button>
                                )
                              ) : null}
                              {withdrawId === m.id ? (
                                <div className="space-y-1">
                                  <label className="block space-y-1 text-xs">
                                    <span className="font-medium text-foreground/90">Reason for withdrawing</span>
                                    <input className={inputClass} value={withdrawNote} onChange={e => setWithdrawNote(e.target.value)} />
                                  </label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    disabled={withdrawNote.trim().length < 5 || busy}
                                    onClick={() => void onWithdraw(m)}
                                  >
                                    Confirm withdrawal
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8"
                                  onClick={() => {
                                    setWithdrawId(m.id)
                                    setWithdrawNote('')
                                  }}
                                >
                                  Withdraw
                                </Button>
                              )}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {canEnter ? (
            <div className="space-y-2 rounded-lg border border-border p-3" data-testid="annualisation-entry-form">
              <p className="text-sm font-medium">Enter a proposed method</p>
              <p className="text-xs text-muted-foreground">
                It is used only once a different user with the power to approve pay agreements has approved it, for pay
                periods that start on or after its effective date.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-medium text-foreground/90">Weeks in a year</span>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={53}
                    step="0.001"
                    value={weeks}
                    onChange={e => setWeeks(e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs font-medium text-foreground/90">Effective from</span>
                  <input className={inputClass} type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
                </label>
              </div>
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-medium text-foreground/90">Policy reference (where it is written down, and why)</span>
                <textarea
                  className="flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={basis}
                  onChange={e => setBasis(e.target.value)}
                />
              </label>
              <Button size="sm" disabled={!canSave || busy} onClick={() => void onEnter()}>
                Enter method
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="annualisation-read-only">
              You can view the methods. Entering one needs payroll settings manage; approving or withdrawing one needs the
              power to approve pay agreements.
            </p>
          )}
        </>
      )}
    </div>
  )
}
