import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, ListChecks } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { StatCard } from '@/shared/ui/card'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { EmptyState } from '@/shared/ui/page-elements'
import { Skeleton } from '@/shared/ui/misc'
import { cn } from '@/shared/lib/utils'
import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import { PolicyAcknowledgementBadge } from '@/features/policies/components/PolicyAcknowledgementBadge'
import { useMyPolicyAcknowledgements } from '@/features/policies/hooks/usePolicyAcknowledgements'
import { formatPolicyDate } from '@/features/policies/policy-format'
import { policyErrorCopy } from '@/features/policies/policy-error'
import { POLICY_PATHS } from '@/features/policies/policy-routes'

export default function MyPoliciesPage() {
  const query = useMyPolicyAcknowledgements()
  const data = query.data

  return (
    <PolicySectionLayout
      title="My policies"
      description="Policies you need to read and acknowledge."
      testId="my-policies-page"
    >
      <div className="space-y-4">
        <ContentSectionHeader
          title="Policies to read and acknowledge"
          description={`When a policy that applies to you is published or has a major update, read it and confirm you understand it within ${data?.dueWithinDays ?? 14} days.`}
        />

        {query.isLoading ? (
          <div className="space-y-2" data-testid="my-policies-skeleton">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError || !data ? (
          <p className="py-8 text-center text-sm text-destructive" role="alert">
            {policyErrorCopy(query.error).message}
          </p>
        ) : !data.employeeLinked ? (
          <EmptyState title="No employee record" description={data.reason ?? 'Your account is not linked to an employee.'} />
        ) : data.items.length === 0 ? (
          <EmptyState title="Nothing to acknowledge" description="There are no policies you need to read and acknowledge." />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="To acknowledge"
                value={data.counts.outstanding}
                icon={<ListChecks className="h-5 w-5" aria-hidden />}
                tone={data.counts.outstanding ? 'warning' : 'muted'}
              />
              <StatCard
                label="Overdue"
                value={data.counts.overdue}
                icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
                tone={data.counts.overdue ? 'destructive' : 'muted'}
              />
              <StatCard
                label="Acknowledged"
                value={data.counts.acknowledged}
                icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
                tone="success"
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[760px] text-sm" data-testid="my-policies-table">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Policy</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Version</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Due</th>
                    <th className="px-3 py-2">Acknowledged</th>
                    <th className="px-3 py-2 text-right">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(item => (
                    <tr
                      key={item.documentId}
                      className={cn('border-t border-border', item.overdue && 'bg-destructive/5')}
                      data-testid="my-policy-row"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.title}</div>
                        {item.category ? <div className="text-xs text-muted-foreground">{item.category}</div> : null}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{item.reference}</td>
                      <td className="px-3 py-2">{item.versionLabel}</td>
                      <td className="px-3 py-2">
                        <PolicyAcknowledgementBadge status={item.status} overdue={item.overdue} />
                      </td>
                      <td className={cn('px-3 py-2', item.overdue && 'font-medium text-destructive')}>
                        {item.status === 'ACKNOWLEDGED' ? '—' : formatPolicyDate(item.dueAt)}
                      </td>
                      <td className="px-3 py-2">{formatPolicyDate(item.acknowledgedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant={item.status === 'ACKNOWLEDGED' ? 'outline' : 'default'} asChild>
                          <Link to={POLICY_PATHS.detail} params={{ policyId: item.documentId }}>
                            {item.status === 'ACKNOWLEDGED' ? 'Open' : 'Read and acknowledge'}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PolicySectionLayout>
  )
}
