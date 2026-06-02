import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'

export default function ResetPasswordPage() {
  const resetPassword = useAuthStore(s => s.resetPassword)
  const token = useRouterState({
    select: s => (s.location.search as { token?: string }).token ?? '',
  })
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [msg, setMsg] = React.useState<string | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Reset password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Demo accepts any token in the URL. Set a new password at least 8 characters.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={e => {
          e.preventDefault()
          setErr(null)
          setMsg(null)
          if (password !== confirm) {
            setErr('Passwords do not match.')
            return
          }
          const r = resetPassword(token || 'demo-token', password)
          if (!r.ok) setErr(r.error ?? 'Reset failed')
          else setMsg('Password updated. You can sign in with your new password.')
        }}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Reset token (from email)</label>
          <input
            readOnly
            value={token || '(add ?token= in URL for demo)'}
            className="h-10 w-full rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {msg && <p className="text-sm text-success">{msg}</p>}
        <Button type="submit" className="w-full">
          Update password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/auth/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
