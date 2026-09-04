import { Link } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { useApplicablePolicies } from '@/features/policies/hooks/usePolicies'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import type { ApplicablePoliciesParams } from '@/features/policies/types/policy.types'
import { Skeleton } from '@/shared/ui/misc'
import { cn } from '@/shared/lib/utils'

type Props = ApplicablePoliciesParams & {
  className?: string
  enabled?: boolean
}

export function PolicyContextPanel({
  className,
  enabled = true,
  page: _page,
  limit: _limit,
  ...params
}: Props) {
  const can = useAuthStore(s => s.can)
  const canRead = can('policies.read')
  const query = useApplicablePolicies(params, enabled && canRead && Boolean(params.moduleType))

  if (!canRead || !enabled) return null

  const rows = query.data?.rows ?? []

  return (
    <section
      className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)}
      data-testid="policy-context-panel"
    >
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold">Policies & Guidance</h2>
      </div>

      {query.isLoading ? (
        <div className="space-y-2" data-testid="policy-context-panel-loading">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Policies could not be loaded.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No policies or guidance are currently linked to this area.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(policy => (
            <li
              key={policy.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{policy.title}</p>
                <p className="text-xs text-muted-foreground">{policy.reference}</p>
              </div>
              <Link
                to={POLICY_PATHS.detail}
                params={{ policyId: policy.id }}
                className="shrink-0 text-sm font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-200"
              >
                View Policy
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
