import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  fetchServiceUserPortalAccount,
  setServiceUserPortalPassword,
  upsertServiceUserPortalAccount,
} from '@/features/service-user-portal/api/portal.api'

export function ServiceUserPortalAccessSection({
  serviceUserId,
  defaultEmail,
}: {
  serviceUserId: string
  defaultEmail?: string | null
}) {
  const canManage = useAuthStore(s => s.can('service_users.portal.manage'))
  const canRead = useAuthStore(s => s.can('service_users.portal.read'))
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['service-user-portal-account', serviceUserId],
    queryFn: () => fetchServiceUserPortalAccount(serviceUserId),
    enabled: canRead && Boolean(serviceUserId),
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
    mutationFn: () => upsertServiceUserPortalAccount(serviceUserId, { email: email.trim(), isEnabled: enabled }),
    onSuccess: () => {
      toastSuccess('Portal access updated')
      void qc.invalidateQueries({ queryKey: ['service-user-portal-account', serviceUserId] })
    },
    onError: e => toastApiError(e, 'Update failed'),
  })

  const passwordMutation = useMutation({
    mutationFn: () => setServiceUserPortalPassword(serviceUserId, password),
    onSuccess: () => {
      toastSuccess('Portal password set')
      setPassword('')
    },
    onError: e => toastApiError(e, 'Password update failed'),
  })

  if (!canRead) return null

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Portal access</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Allow this service user to sign in at <code className="rounded bg-muted px-1">/portal/login</code> to view their
        dashboard and update profile and About Me.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading portal status…</p>
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
            <span className="font-medium">Portal enabled</span>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Portal email</span>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!canManage}
              placeholder="resident@example.com"
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
                Save portal settings
              </Button>
              <div className="border-t border-border pt-4">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Set / reset portal password</span>
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
                  disabled={passwordMutation.isPending || password.length < 8}
                  onClick={() => passwordMutation.mutate()}
                >
                  Set password
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
