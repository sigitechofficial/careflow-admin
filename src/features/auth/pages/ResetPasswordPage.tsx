import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useResetPassword } from '@/features/auth/hooks/usePasswordReset'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'

const INVALID_LINK_MESSAGE = 'This reset link is invalid or has expired.'
const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests. Please wait a few minutes and try again.'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'
const SUCCESS_MESSAGE = 'Your password has been reset. You can now sign in.'
/** Same rule as change-password / the API's MinLength(8). */
const MIN_PASSWORD_LENGTH = 8

export default function ResetPasswordPage() {
  const resetPasswordDemo = useAuthStore(s => s.resetPassword)
  const resetPassword = useResetPassword()
  const apiUrl = getApiBaseUrl()
  // Read the raw query string: the router's default search parser JSON-decodes values,
  // which would turn an all-digit token into a number. The token is never rendered or logged.
  const token = useRouterState({
    select: s => new URLSearchParams(s.location.searchStr).get('token')?.trim() ?? '',
  })
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!apiUrl) {
      // Demo mode: local audit only; no password is changed anywhere.
      const r = resetPasswordDemo(token, password)
      if (!r.ok) {
        setError(r.error ?? GENERIC_ERROR_MESSAGE)
        return
      }
      setDone(true)
      return
    }
    try {
      await resetPassword.mutateAsync({ token, newPassword: password })
      setPassword('')
      setConfirm('')
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setError(err.message || INVALID_LINK_MESSAGE)
      else if (err instanceof ApiError && err.status === 429) setError(TOO_MANY_REQUESTS_MESSAGE)
      else setError(GENERIC_ERROR_MESSAGE)
    }
  }

  const requestNewLink = (
    <Link to="/auth/forgot-password" className="text-primary hover:underline">
      Request a new reset link
    </Link>
  )

  let content: React.ReactNode
  if (!token) {
    content = (
      <div className="mt-4 space-y-3">
        <p role="alert" data-testid="reset-invalid-link" className="text-sm text-destructive">
          {INVALID_LINK_MESSAGE}
        </p>
        <p className="text-sm">{requestNewLink}</p>
      </div>
    )
  } else if (done) {
    content = (
      <div className="mt-4 space-y-4">
        <p role="status" data-testid="reset-success" className="text-sm text-foreground">
          {SUCCESS_MESSAGE}
        </p>
        {!apiUrl ? (
          <p className="text-xs text-muted-foreground">
            Demo mode: no password was changed. Set VITE_API_BASE_URL to reset passwords through the CareAdmin API.
          </p>
        ) : null}
        <Button className="w-full" asChild data-testid="reset-go-to-login">
          <Link to="/auth/login">Go to sign in</Link>
        </Button>
      </div>
    )
  } else {
    content = (
      <>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a new password of at least {MIN_PASSWORD_LENGTH} characters.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="reset-password" className="text-sm font-medium text-muted-foreground">
              New password
            </label>
            <input
              id="reset-password"
              type="password"
              required
              data-testid="reset-password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reset-password-confirm" className="text-sm font-medium text-muted-foreground">
              Confirm new password
            </label>
            <input
              id="reset-password-confirm"
              type="password"
              required
              data-testid="reset-password-confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && (
            <div className="space-y-1">
              <p role="alert" data-testid="reset-error" className="text-sm text-destructive">
                {error}
              </p>
              {error === INVALID_LINK_MESSAGE ? <p className="text-sm">{requestNewLink}</p> : null}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={resetPassword.isPending} data-testid="reset-submit">
            {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      </>
    )
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Reset password</h1>
      {content}
      <p className="mt-6 text-center text-sm">
        <Link to="/auth/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
