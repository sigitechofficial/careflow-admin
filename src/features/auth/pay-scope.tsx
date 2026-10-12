import * as React from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'

/** Permission that gives a branch-limited user pay access across every branch. */
export const PAYROLL_ORGANISATION_SCOPE_PERMISSION = 'payroll.scope.organisation'

type ScopedUser = { assignedLocationIds?: string[] | null; permissions?: readonly string[] } | null | undefined

/**
 * Pay runs, UK payroll runs, payout batches, pay items and payroll settings cover every branch.
 * A user sees them when they are not limited to branches, or hold the organisation-wide grant.
 * The server decides; this mirrors its rule so the menu and the pages do not offer dead ends.
 */
export function hasOrganisationPayScope(user: ScopedUser): boolean {
  if (!user) return false
  return user.assignedLocationIds == null || (user.permissions ?? []).includes(PAYROLL_ORGANISATION_SCOPE_PERMISSION)
}

export function useHasOrganisationPayScope(): boolean {
  return useAuthStore(s => hasOrganisationPayScope(s.user))
}

/** Shown instead of an organisation-wide pay screen to a user whose access is limited to branches. */
export function OrganisationPayScopeNotice() {
  return (
    <div
      className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 text-sm shadow-sm"
      role="alert"
      data-testid="organisation-pay-scope-notice"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <ShieldAlert className="h-4 w-4 text-warning" aria-hidden />
        This screen covers every branch
      </h2>
      <p className="mt-2 text-muted-foreground">
        Your access to pay is limited to your own branches, so this screen is not available to you. You can still use
        Visit reconciliation, Salary, Payslips and Employee setup for your branches. An administrator can grant
        organisation-wide pay access if your role needs it.
      </p>
    </div>
  )
}

/** Wraps a page that only makes sense with organisation-wide pay access. */
export function withOrganisationPayScope<P extends object>(Page: React.ComponentType<P>) {
  function Scoped(props: P) {
    const allowed = useHasOrganisationPayScope()
    return allowed ? <Page {...props} /> : <OrganisationPayScopeNotice />
  }
  Scoped.displayName = `OrganisationPayScope(${Page.displayName ?? Page.name ?? 'Page'})`
  return Scoped
}
