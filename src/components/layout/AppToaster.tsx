import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Copy, Info } from 'lucide-react'
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from '@/shared/ui/feedback'
import { useToastStore } from '@/store/toast.store'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { parseEcmLiveHref } from '@/features/notifications/utils/notification-deep-link'
import { useAuthStore } from '@/features/auth/store'

const iconMap = {
  default: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  destructive: AlertTriangle,
} as const

/**
 * Toasts that name a screen open it when tapped (e.g. "… see Hours approvals"), also for messages
 * that come from the API. Only when the user may open that screen.
 */
const SCREEN_LINKS: Array<{ pattern: RegExp; href: (text: string) => string; permission: string }> = [
  { pattern: /hours approvals/i, href: text => `/hours-approvals?tab=${hoursApprovalsTab(text)}`, permission: 'hours_approvals.read' },
]

/**
 * The Hours approvals tab a toast is about: Expired when it says a request expired, Rejected or
 * Cancelled when that is what happened, Approved only when everything was approved; else Pending.
 */
function hoursApprovalsTab(text: string): string {
  if (/expired/i.test(text)) return 'expired'
  if (/could not be approved|waiting|sent to hours approvals|go(es)? to hours approvals|once a manager approves/i.test(text)) return 'pending'
  if (/\brejected\b/i.test(text)) return 'rejected'
  if (/\bcancelled\b/i.test(text)) return 'cancelled'
  if (/^(\d+ )?(requests? )?approved\b/i.test(text.trim())) return 'approved'
  return 'pending'
}

function screenHref(
  title: string,
  description: string | undefined,
  can: (permission: string) => boolean,
): string | undefined {
  const text = `${title} ${description ?? ''}`
  return SCREEN_LINKS.find(l => l.pattern.test(text) && can(l.permission))?.href(text)
}

function toastCopyText(title: string, description?: string): string {
  return description?.trim() ? `${title}\n${description}` : title
}

export function AppToaster() {
  const navigate = useNavigate()
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const can = useAuthStore((s) => s.can)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const copyToast = React.useCallback(async (id: string, title: string, description?: string) => {
    const text = toastCopyText(title, description)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000)
    }
  }, [])

  return (
    <ToastProvider swipeDirection="down" duration={5000} label="Notifications">
      {toasts.map((t) => {
        const Icon = iconMap[t.variant]
        const copied = copiedId === t.id
        const href = t.href ?? screenHref(t.title, t.description, p => can(p as never))
        return (
          <Toast
            key={t.id}
            variant={t.variant}
            duration={t.duration ?? 5000}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id)
            }}
          >
            <Icon
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                t.variant === 'success' && 'text-success',
                t.variant === 'destructive' && 'text-destructive',
                t.variant === 'warning' && 'text-warning',
                t.variant === 'default' && 'text-muted-foreground',
              )}
            />
            <div
              className={cn(
                'flex-1 min-w-0 pe-14',
                href ? 'cursor-pointer' : 'cursor-text select-text',
              )}
              role={href ? 'link' : undefined}
              tabIndex={href ? 0 : undefined}
              onClick={() => {
                if (!href) return
                const search = parseEcmLiveHref(href)
                dismiss(t.id)
                if (search) {
                  void navigate({ to: '/ecm/live', search })
                  return
                }
                void navigate({ href })
              }}
              onKeyDown={event => {
                if (!href) return
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                const search = parseEcmLiveHref(href)
                dismiss(t.id)
                if (search) {
                  void navigate({ to: '/ecm/live', search })
                  return
                }
                void navigate({ href })
              }}
            >
              <ToastTitle>{t.title}</ToastTitle>
              {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
            </div>
            <div className="absolute right-2 top-2 flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label={copied ? 'Copied' : 'Copy message'}
                title={copied ? 'Copied' : 'Copy message'}
                onClick={() => void copyToast(t.id, t.title, t.description)}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <ToastClose className="static opacity-100" />
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
