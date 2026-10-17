import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import { useFinancialAuthority } from '@/features/settings/hooks/useRolesPermissions'

/**
 * Who can prepare, approve, close, pay and audit carer pay today. Read-only: powers are given by
 * ticking a role in the table below and by assigning that role to a user.
 */
export function FinancialAuthorityCard() {
  const { data, isLoading, isError } = useFinancialAuthority()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading pay authorisation…
      </div>
    )
  }
  if (isError || !data) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm text-destructive shadow-sm">
        Could not load who holds the pay authorisation powers.
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm" data-testid="financial-authority">
      <div className="max-w-3xl space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
          Pay authorisation — who can do it today
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Approving pay, closing payroll and recording a payment are not part of any admin role. They belong to the
          roles ticked for “Approve pay and record payments” below, and only to the users who hold such a role. The
          person who prepares a record cannot approve it.
        </p>
      </div>

      {data.warnings.length > 0 ? (
        <ul
          className="space-y-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-2"
          role="alert"
          data-testid="financial-authority-warnings"
        >
          {data.warnings.map(w => (
            <li key={`${w.powerKey}-${w.kind}`} className="flex items-start gap-2 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Power</th>
              <th className="py-2 font-medium">Users who hold it</th>
            </tr>
          </thead>
          <tbody>
            {data.powers.map(power => (
              <tr
                key={power.key}
                className="border-b border-border align-top last:border-0"
                data-testid={`financial-power-${power.key}`}
              >
                <td className="py-2 pr-4 font-medium text-foreground">{power.label}</td>
                <td className="py-2">
                  {power.users.length === 0 ? (
                    <span className={power.requiredForPayroll ? 'font-medium text-warning' : 'text-muted-foreground'}>
                      Nobody
                    </span>
                  ) : (
                    <ul className="flex flex-wrap gap-x-3 gap-y-1">
                      {power.users.map(user => (
                        <li key={user.id}>
                          {user.name}
                          <span className="text-xs text-muted-foreground"> ({user.roles.join(', ')})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
