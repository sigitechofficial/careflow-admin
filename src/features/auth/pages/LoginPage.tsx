import * as React from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { SIGNED_OUT_MESSAGE_KEY, useAuthStore } from '@/features/auth/store'
import { INSPECTOR_SIGN_IN_SEARCH } from '@/features/auth/guard'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const redirect = useRouterState({
    select: s => (s.location.search as { redirect?: string }).redirect,
  })
  // Opened from the temporary inspector sign-in link (/auth/login?as=inspector).
  const inspectorLink = useRouterState({
    select: s => (s.location.search as { as?: unknown }).as === INSPECTOR_SIGN_IN_SEARCH.as,
  })
  const login = useAuthStore(s => s.login)
  const loginAsTemporaryInspector = useAuthStore(s => s.loginAsTemporaryInspector)
  // Someone is already signed in in this browser (only the inspector link shows this page then).
  const signedInAs = useAuthStore(s => (s.isAuthenticated() ? s.user : null))
  const apiUrl = getApiBaseUrl()
  const [mode, setMode] = React.useState<'staff' | 'inspector'>(apiUrl && inspectorLink ? 'inspector' : 'staff')

  // Pre-fill the local seed admin only under `npm run dev`. Production builds start empty,
  // and Vite drops the dev-only branch so these credentials never ship in the bundle.
  const [email, setEmail] = React.useState(
    import.meta.env.DEV ? (apiUrl ? 'admin@careadmin.local' : 'admin@care.local') : '',
  )
  const [inspectorUsername, setInspectorUsername] = React.useState('')
  const [password, setPassword] = React.useState(
    import.meta.env.DEV && !inspectorLink ? (apiUrl ? 'Admin@12345' : 'CareAdmin1!') : '',
  )
  const [error, setError] = React.useState<string | null>(null)
  // Why this browser was signed out (another device over the limit, password changed...), shown once.
  const [signedOutWhy] = React.useState<string | null>(() => {
    try {
      const m = sessionStorage.getItem(SIGNED_OUT_MESSAGE_KEY)
      sessionStorage.removeItem(SIGNED_OUT_MESSAGE_KEY)
      return m
    } catch {
      return null
    }
  })
  const [loading, setLoading] = React.useState(false)

  const onSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await login(email, password)
      if (!r.ok) {
        setError(r.error ?? 'Sign-in failed.')
        return
      }
      const to = redirect && redirect.startsWith('/') ? redirect : '/'
      navigate({ to })
    } finally {
      setLoading(false)
    }
  }

  const onSubmitInspector = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await loginAsTemporaryInspector(inspectorUsername, password)
      if (!r.ok) {
        setError(r.error ?? 'Sign-in failed.')
        return
      }
      const to = redirect && redirect.startsWith('/') ? redirect : '/'
      navigate({ to })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {apiUrl
          ? import.meta.env.DEV
            ? `API mode: ${apiUrl} — staff use email; temporary inspectors use the username issued by your organisation.`
            : 'Staff sign in with their email; temporary inspectors use the username issued by your organisation.'
          : 'Demo mode: local mock accounts. Set VITE_API_BASE_URL to sign in against the CareAdmin API.'}
      </p>

      {apiUrl ? (
        <div className="mt-4 flex rounded-lg border border-border p-0.5 bg-muted/40">
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md py-2 text-xs font-medium transition-colors',
              mode === 'staff' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => {
              setMode('staff')
              setError(null)
            }}
          >
            Staff (email)
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md py-2 text-xs font-medium transition-colors',
              mode === 'inspector'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => {
              setMode('inspector')
              setError(null)
            }}
          >
            Temporary inspector
          </button>
        </div>
      ) : null}

      {signedInAs ? (
        <p
          role="status"
          data-testid="login-already-signed-in"
          className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
        >
          You are signed in as {signedInAs.displayName || signedInAs.email}. Signing in here signs you out of CareFlow in this
          browser. To give an inspector access, send them this page's link to open on their own device, or{' '}
          <Link to="/" className="font-medium underline underline-offset-4">
            go back to CareFlow
          </Link>
          .
        </p>
      ) : null}

      {signedOutWhy ? (
        <p
          role="status"
          data-testid="login-signed-out-reason"
          className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
        >
          {signedOutWhy}
        </p>
      ) : null}

      {mode === 'staff' ? (
        <form onSubmit={onSubmitStaff} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              data-testid="login-email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm font-medium text-muted-foreground">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              data-testid="login-password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && (
            <p role="alert" data-testid="login-error" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      ) : (
        <form onSubmit={onSubmitInspector} className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border bg-muted/20 p-2">
            Use the <strong className="text-foreground">username</strong> and password an administrator created under
            Employee → Temporary Inspector Login. Access is only valid between the configured dates.
          </p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Username</label>
            <input
              type="text"
              data-testid="login-inspector-username"
              autoComplete="username"
              value={inspectorUsername}
              onChange={e => setInspectorUsername(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <input
              type="password"
              data-testid="login-inspector-password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading} data-testid="login-inspector-submit">
            {loading ? 'Signing in…' : 'Sign in as inspector'}
          </Button>
        </form>
      )}

      {mode === 'staff' && !apiUrl ? (
        <div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium text-foreground">Super admin:</span> admin@care.local / CareAdmin1!</p>
          <p><span className="font-medium text-foreground">Manager:</span> manager@care.local / CareAdmin1!</p>
          <p><span className="font-medium text-foreground">Staff:</span> staff@care.local / CareAdmin1!</p>
        </div>
      ) : null}

      {mode === 'staff' ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/auth/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </p>
      ) : null}

      <div className="mt-6 border-t border-border pt-4">
        <Button variant="outline" className="w-full" asChild data-testid="login-service-user">
          <Link to="/portal/login">Sign in as service user</Link>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Access your care portal, visits, and personal records.
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/legal/privacy-policy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  )
}
