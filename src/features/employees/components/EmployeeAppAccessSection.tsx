import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  fetchEmployeePortalAccount,
  setEmployeePortalPassword,
  upsertEmployeePortalAccount,
} from '@/features/employees/api/employee-portal.api'

export function EmployeeAppAccessSection({
  employeeId,
  defaultEmail,
}: {
  employeeId: string
  defaultEmail?: string | null
}) {
  const canManage = useAuthStore(s => s.can('employees.update'))
  const canRead = useAuthStore(s => s.can('employees.read'))
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['employee-portal-account', employeeId],
    queryFn: () => fetchEmployeePortalAccount(employeeId),
    enabled: canRead && Boolean(employeeId),
  })

  const [email, setEmail] = React.useState(defaultEmail ?? '')
  const [enabled, setEnabled] = React.useState(false)
  const [password, setPassword] = React.useState('')

  React.useEffect(() => {
    if (!data) return
    setEmail(data.email ?? defaultEmail ?? '')
    setEnabled(data.isEnabled)
  }, [data, defaultEmail])

  const saveMutation = useMutation({
    mutationFn: () => upsertEmployeePortalAccount(employeeId, { email: email.trim(), isEnabled: enabled }),
    onSuccess: () => {
      toastSuccess('Employee app access updated')
      void qc.invalidateQueries({ queryKey: ['employee-portal-account', employeeId] })
    },
    onError: e => toastApiError(e, 'Update failed'),
  })

  const passwordMutation = useMutation({
    mutationFn: () => setEmployeePortalPassword(employeeId, password),
    onSuccess: () => {
      toastSuccess('Employee app password set')
      setPassword('')
      void qc.invalidateQueries({ queryKey: ['employee-portal-account', employeeId] })
    },
    onError: e => toastApiError(e, 'Password update failed'),
  })

  if (!canRead) return null

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Employee app access</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Allow this carer to sign in to the employee app with email and password (
        <code className="rounded bg-muted px-1">POST /employee-app/auth/login</code>).
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading app access status…</p>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              disabled={!canManage}
            />
            <span className="font-medium">App login enabled</span>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Login email</span>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!canManage}
              placeholder="carer@example.com"
            />
          </label>
          {data?.lastLoginAt && (
            <p className="text-xs text-muted-foreground">
              Last sign-in: {new Date(data.lastLoginAt).toLocaleString()}
            </p>
          )}
          {canManage && (
            <>
              <Button
                type="button"
                size="sm"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="gap-1.5"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Save app access
              </Button>
              <div className="border-t border-border pt-4">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Set / reset password</span>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={passwordMutation.isPending || password.length < 8 || !data?.configured}
                  onClick={() => passwordMutation.mutate()}
                >
                  {passwordMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  Set password
                </Button>
                {!data?.configured && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Save app access with an email first, then set a password.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
