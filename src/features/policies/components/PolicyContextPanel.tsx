import { Link } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { useApplicablePolicies } from '@/features/policies/hooks/usePolicies'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import type { ApplicablePoliciesParams } from '@/features/policies/types/policy.types'
import { cn } from '@/shared/lib/utils'

type Props = ApplicablePoliciesParams & {
  className?: string
  enabled?: boolean
}

/**
 * Policies and guidance linked to the page's area (and record). Nothing is shown while loading or
 * when nothing is linked, so it never takes space for nothing; people who manage policies get a
 * one-line prompt to link one instead.
 */
export function PolicyContextPanel({
  className,
  enabled = true,
  page: _page,
  limit: _limit,
  ...params
}: Props) {
  const can = useAuthStore(s => s.can)
  const canRead = can('policies.read')
  const canManage = can('policies.create') || can('policies.update')
  const query = useApplicablePolicies(params, enabled && canRead && Boolean(params.moduleType))

  if (!canRead || !enabled || query.isLoading) return null

  const rows = query.data?.rows ?? []
  if (rows.length === 0 || query.isError) {
    if (!canManage) return null
    return (
      <p
        className={cn('flex flex-wrap items-center gap-2 text-xs text-muted-foreground', className)}
        data-testid="policy-context-panel-empty"
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden />
        {query.isError ? 'Policies could not be loaded.' : 'No policies are linked to this area yet.'}
        <Link to={POLICY_PATHS.library} className="font-medium text-primary underline-offset-2 hover:underline">
          {query.isError ? 'Open the policy library' : 'Link one from the policy library'}
        </Link>
      </p>
    )
  }

  return (
    <section
      className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)}
      data-testid="policy-context-panel"
    >
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold">Policies & Guidance</h2>
      </div>

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
    </section>
  )
}
