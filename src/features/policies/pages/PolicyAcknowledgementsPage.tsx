import { Link } from '@tanstack/react-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/data-table'
import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import { usePolicyAcknowledgementSummary } from '@/features/policies/hooks/usePolicies'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import { cn } from '@/shared/lib/utils'

/** Read-and-sign compliance across the organisation: per policy and per member of staff. */
export default function PolicyAcknowledgementsPage() {
  const q = usePolicyAcknowledgementSummary()
  const d = q.data
  return (
    <PolicySectionLayout
      title="Read and sign tracking"
      description="Who has read and acknowledged the current version of each policy that requires it."
      testId="policy-acknowledgements-page"
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Overall signed" value={d?.pct === null || d?.pct === undefined ? '—' : `${d.pct}%`} hint={d ? `${d.acknowledged} of ${d.required} signatures` : undefined} tone={toneFor(d?.pct ?? null)} />
          <Stat label="Policies to sign" value={d ? String(d.policiesRequiringAcknowledgement) : '…'} hint="Published, acknowledgement required" />
          <Stat label="Staff with policies outstanding" value={d ? String(d.staffWithOutstanding) : '…'} hint={d ? `Of ${d.staffInScope} staff with a sign-in` : undefined} tone={d && d.staffWithOutstanding > 0 ? 'warn' : undefined} />
          <Stat label="Signatures outstanding" value={d ? String(d.required - d.acknowledged) : '…'} tone={d && d.required - d.acknowledged > 0 ? 'warn' : undefined} />
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">By policy</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead className="w-[220px]">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.isLoading ? (
                  <Empty text="Loading…" />
                ) : !d?.policies.length ? (
                  <Empty text="No published policy asks staff to read and sign it yet. Turn on “Staff must read and acknowledge” when editing a policy." />
                ) : (
                  d.policies.map(p => (
                    <TableRow key={p.versionId}>
                      <TableCell>
                        <Link to={POLICY_PATHS.detail} params={{ policyId: p.documentId }} className="font-medium hover:text-primary hover:underline">
                          {p.title}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{p.reference}</span>
                      </TableCell>
                      <TableCell>{p.versionLabel}</TableCell>
                      <TableCell className="tabular-nums">{p.audience}</TableCell>
                      <TableCell className="tabular-nums">{p.acknowledged}</TableCell>
                      <TableCell>
                        <Progress pct={p.pct} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Staff with policies to sign</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff member</TableHead>
                  <TableHead>Policies outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.isLoading ? (
                  <Empty text="Loading…" colSpan={2} />
                ) : !d?.staffOutstanding.length ? (
                  <Empty text="Everyone has signed the policies assigned to them." colSpan={2} />
                ) : (
                  d.staffOutstanding.map(s => (
                    <TableRow key={s.employeeId}>
                      <TableCell>
                        <Link to="/employee/$employeeId/edit" params={{ employeeId: s.employeeId }} className="font-medium hover:text-primary hover:underline">
                          {s.name}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">{s.outstanding}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </PolicySectionLayout>
  )
}

function toneFor(pct: number | null): 'good' | 'warn' | 'bad' | undefined {
  if (pct === null) return undefined
  return pct >= 95 ? 'good' : pct >= 80 ? 'warn' : 'bad'
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold tabular-nums',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'warn' && 'text-amber-600 dark:text-amber-400',
          tone === 'bad' && 'text-rose-600 dark:text-rose-400',
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Progress({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-sm text-muted-foreground">No staff in scope</span>
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn('block h-full rounded-full', pct >= 95 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-500' : 'bg-rose-500')}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-10 text-right text-sm tabular-nums">{pct}%</span>
    </div>
  )
}

function Empty({ text, colSpan = 5 }: { text: string; colSpan?: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  )
}
