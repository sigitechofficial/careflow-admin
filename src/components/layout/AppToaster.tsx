import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'
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

const iconMap = {
  default: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  destructive: XCircle,
} as const

export function AppToaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <ToastProvider swipeDirection="right" duration={5000} label="Notifications">
      {toasts.map((t) => {
        const Icon = iconMap[t.variant]
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
            <div className="flex-1 min-w-0 pr-6">
              <ToastTitle>{t.title}</ToastTitle>
              {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
