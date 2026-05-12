import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const forgotPassword = useAuthStore(s => s.forgotPassword)
  const message = useAuthStore(s => s.forgotMessage)
  const [email, setEmail] = React.useState('')

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">Forgot password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email. In production a reset link would be sent (demo stores an audit event only).
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={e => {
          e.preventDefault()
          forgotPassword(email)
        }}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" className="w-full">
          Send reset instructions
        </Button>
      </form>
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
      <p className="mt-6 text-center text-sm">
        <Link to="/auth/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
