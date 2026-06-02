import * as React from 'react'
import { Bell, Loader2, Settings2, Volume2, VolumeX } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useUnreadNotificationCount'
import { NotificationDropdown } from '@/features/notifications/components/NotificationDropdown'
import { NotificationPreferencesPanel } from '@/features/notifications/components/NotificationPreferencesPanel'
import { useNotificationPreferences } from '@/features/notifications/hooks/useNotificationPreferences'
import { cn } from '@/shared/lib/utils'

export function NotificationBell() {
  const can = useAuthStore(s => s.can('notifications.read'))
  const hasApi = !!getApiBaseUrl()
  const { data: unread = 0, isLoading } = useUnreadNotificationCount()
  const canRead = useAuthStore(s => s.can('notifications.preferences.read'))
  const { data: prefs } = useNotificationPreferences({ enabled: hasApi && canRead })
  const [prefsOpen, setPrefsOpen] = React.useState(false)
  const [pulse, setPulse] = React.useState(false)

  React.useEffect(() => {
    if (!unread) return
    setPulse(true)
    const t = window.setTimeout(() => setPulse(false), 900)
    return () => window.clearTimeout(t)
  }, [unread])

  if (!hasApi || !can) return null

  const anySoundOn = prefs?.some(p => p.soundEnabled) ?? true

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative transition-transform', pulse && 'scale-110 motion-safe:animate-pulse')}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {isLoading ? (
              <Loader2 className="absolute top-1.5 right-1.5 h-3 w-3 animate-spin text-muted-foreground" />
            ) : unread > 0 ? (
              <span className="absolute top-1.5 right-1.5 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
            {anySoundOn ? (
              <Volume2 className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-muted-foreground/80" aria-hidden />
            ) : (
              <VolumeX className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-muted-foreground/60" aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96 p-0" onCloseAutoFocus={e => e.preventDefault()}>
          <NotificationDropdown onOpenPreferences={() => setPrefsOpen(true)} />
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent
          size="lg"
          className="flex max-h-[min(88vh,640px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]"
        >
          <DialogHeader className="shrink-0 space-y-2 border-b border-border px-6 pb-4 pt-6 pr-14 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold leading-tight">
              <Settings2 className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              Notification preferences
            </DialogTitle>
            <DialogDescription className="text-left text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Email, SMS, and push channels are not configured yet — only in-app delivery and optional sound apply.
            </DialogDescription>
          </DialogHeader>
          <NotificationPreferencesPanel
            className="min-h-0 flex-1"
            enabled={prefsOpen}
            onDone={() => setPrefsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
