import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useNotificationPreferences } from '@/features/notifications/hooks/useNotificationPreferences'
import { Button } from '@/shared/ui/button'
import { Switch } from '@/shared/ui/toggle-controls'
import { DialogFooter } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import type { NotificationPreferenceRow } from '@/features/notifications/types/notification.types'

function formatTypeLabel(type: string) {
  return type
    .toLowerCase()
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type Props = {
  enabled?: boolean
  onDone?: () => void
  className?: string
}

export function NotificationPreferencesPanel({ enabled = true, onDone, className }: Props) {
  const { data, isLoading, error, updatePreferences, updating } = useNotificationPreferences({ enabled })
  const [local, setLocal] = React.useState<NotificationPreferenceRow[] | null>(null)

  React.useEffect(() => {
    if (data) setLocal(data.map(r => ({ ...r })))
  }, [data])

  const rows = local ?? data ?? []

  const patchRow = (type: string, patch: Partial<NotificationPreferenceRow>) => {
    setLocal(prev => {
      const base = prev ?? data ?? []
      return base.map(r => (r.type === type ? { ...r, ...patch } : r))
    })
  }

  const onSave = async () => {
    if (!local) return
    await updatePreferences(local)
    onDone?.()
  }

  if (isLoading && !rows.length) {
    return (
      <div className={cn('flex flex-1 flex-col items-center justify-center gap-2 py-16', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading preferencesâ€¦</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className={cn('flex flex-1 flex-col items-center justify-center px-6 py-12', className)}>
        <p className="text-center text-sm text-destructive">Could not load preferences.</p>
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-3"
        role="list"
        aria-label="Notification types"
      >
        <div className="space-y-2.5 pb-1">
          {rows.map(row => (
            <div
              key={row.type}
              role="listitem"
              className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold leading-snug text-foreground">{formatTypeLabel(row.type)}</p>
                <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {row.type}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 sm:justify-end">
                <div className="flex items-center gap-2.5">
                  <Switch
                    id={`inapp-${row.type}`}
                    checked={row.inAppEnabled}
                    size="sm"
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                    onCheckedChange={(v: boolean) =>
                      patchRow(row.type, v ? { inAppEnabled: true } : { inAppEnabled: false, soundEnabled: false })
                    }
                  />
                  <label
                    htmlFor={`inapp-${row.type}`}
                    className="cursor-pointer select-none text-sm text-foreground"
                  >
                    In-app
                  </label>
                </div>
                <div className="flex items-center gap-2.5">
                  <Switch
                    id={`snd-${row.type}`}
                    checked={row.soundEnabled}
                    size="sm"
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                    onCheckedChange={(v: boolean) => patchRow(row.type, { soundEnabled: v })}
                    disabled={!row.inAppEnabled}
                  />
                  <label
                    htmlFor={`snd-${row.type}`}
                    className={cn(
                      'select-none text-sm',
                      row.inAppEnabled ? 'cursor-pointer text-foreground' : 'cursor-not-allowed text-muted-foreground',
                    )}
                  >
                    Sound
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:gap-3">
        <Button type="button" variant="outline" size="default" className="min-w-[5.5rem]" onClick={() => onDone?.()}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          size="default"
          className="min-w-[5.5rem]"
          disabled={updating || !local}
          onClick={() => void onSave()}
        >
          {updating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Savingâ€¦
            </>
          ) : (
            'Save'
          )}
        </Button>
      </DialogFooter>
    </div>
  )
}
