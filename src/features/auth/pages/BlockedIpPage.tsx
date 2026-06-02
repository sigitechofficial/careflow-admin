import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'

export default function BlockedIpPage() {
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const ip = useAuthStore(s => s.simulatedClientIp)

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm text-center">
      <h1 className="text-lg font-semibold text-foreground">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your current IP (<span className="font-mono text-foreground">{ip}</span>) is not on the organisation allowlist,
        or IP restriction has been enabled while your session was active.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Ask a security administrator to update IP rules, or sign out and try again from an approved network.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          variant="destructive"
          onClick={() => {
            logout('ip_blocked')
            navigate({ to: '/auth/login' })
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  )
}
