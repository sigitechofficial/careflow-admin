import * as React from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

export default function PortalLoginPage() {
  const navigate = useNavigate()
  const redirect = useRouterState({
    select: s => (s.location.search as { redirect?: string }).redirect,
  })
  const loginAsServiceUser = useAuthStore(s => s.loginAsServiceUser)
  const apiUrl = getApiBaseUrl()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await loginAsServiceUser(email, password)
      if (!r.ok) {
        setError(r.error ?? 'Sign-in failed.')
        return
      }
      const to = redirect && redirect.startsWith('/portal') ? redirect : '/portal'
      navigate({ to })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Service user sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {apiUrl
            ? 'Sign in with the portal email and password set by your care team.'
            : 'Portal sign-in requires VITE_API_BASE_URL (API mode).'}
        </p>
        <form onSubmit={e => void onSubmit(e)} className="mt-6 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Email</span>
            <Input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Password</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !apiUrl}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Staff member?{' '}
          <Link to="/auth/login" className="text-sky-600 hover:underline">
            Admin sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
