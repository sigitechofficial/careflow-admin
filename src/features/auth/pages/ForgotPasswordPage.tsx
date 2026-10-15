import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useForgotPassword } from '@/features/auth/hooks/usePasswordReset'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'

const CONFIRMATION_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password. The link expires in 60 minutes."
const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests. Please wait a few minutes and try again.'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

export default function ForgotPasswordPage() {
  const forgotPasswordDemo = useAuthStore(s => s.forgotPassword)
  const apiUrl = getApiBaseUrl()
  const forgotPassword = useForgotPassword()
  const [email, setEmail] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [submitted, setSubmitted] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!apiUrl) {
      // Demo mode: records a local audit event only; nothing is sent.
      forgotPasswordDemo(email)
      setSubmitted(true)
      return
    }
    try {
      await forgotPassword.mutateAsync(email)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? TOO_MANY_REQUESTS_MESSAGE : GENERIC_ERROR_MESSAGE)
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Forgot password</h1>
      {submitted ? (
        <div className="mt-4 space-y-2">
          <p role="status" data-testid="forgot-confirmation" className="text-sm text-foreground">
            {CONFIRMATION_MESSAGE}
          </p>
          {!apiUrl ? (
            <p className="text-xs text-muted-foreground">
              Demo mode: no email is sent. Set VITE_API_BASE_URL to reset passwords through the CareAdmin API.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the email address you sign in with and we&apos;ll send you a link to reset your password.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                data-testid="forgot-email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && (
              <p role="alert" data-testid="forgot-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={forgotPassword.isPending} data-testid="forgot-submit">
              {forgotPassword.isPending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/auth/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
