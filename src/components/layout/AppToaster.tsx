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

const iconMap = {
  default: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  destructive: AlertTriangle,
} as const

function toastCopyText(title: string, description?: string): string {
  return description?.trim() ? `${title}\n${description}` : title
}

export function AppToaster() {
  const navigate = useNavigate()
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
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
                t.href ? 'cursor-pointer' : 'cursor-text select-text',
              )}
              role={t.href ? 'link' : undefined}
              tabIndex={t.href ? 0 : undefined}
              onClick={() => {
                if (!t.href) return
                const search = parseEcmLiveHref(t.href)
                dismiss(t.id)
                if (search) {
                  void navigate({ to: '/ecm/live', search })
                  return
                }
                void navigate({ to: t.href as never })
              }}
              onKeyDown={event => {
                if (!t.href) return
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                const search = parseEcmLiveHref(t.href)
                dismiss(t.id)
                if (search) {
                  void navigate({ to: '/ecm/live', search })
                  return
                }
                void navigate({ to: t.href as never })
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
