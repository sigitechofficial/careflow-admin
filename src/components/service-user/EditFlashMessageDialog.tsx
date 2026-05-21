import * as React from 'react'
import { Calendar, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/api-base'
import { ApiError } from '@/lib/api-client'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { useAuthStore } from '@/store/auth.store'
import {
  clearServiceUserFlashMessage,
  fetchServiceUserFlashMessage,
  upsertServiceUserFlashMessage,
  type ServiceUserListRow,
} from '@/lib/service-users-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const MAX_MESSAGE_LENGTH = 150

function displayName(row: ServiceUserListRow): string {
  const legal = [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  if (row.preferredName?.trim()) {
    return legal ? `${legal} (${row.preferredName.trim()})` : row.preferredName.trim()
  }
  return legal || 'Service user'
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayUtcDateInput(): string {
  const n = new Date()
  const y = n.getUTCFullYear()
  const m = String(n.getUTCMonth() + 1).padStart(2, '0')
  const day = String(n.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Props = {
  user: ServiceUserListRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditFlashMessageDialog({ user, open, onOpenChange }: Props) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const can = useAuthStore((s) => s.can)

  const canRead = can('service_users.flash_message.read') || can('service_users.read')
  const canUpdate = can('service_users.flash_message.update') || can('service_users.update')
  const canDelete = can('service_users.flash_message.delete') || can('service_users.update')

  const [message, setMessage] = React.useState('')
  const [displayUntil, setDisplayUntil] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [clearing, setClearing] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const dateInputRef = React.useRef<HTMLInputElement>(null)

  const serviceUserId = user?.id ?? ''
  const name = user ? displayName(user) : 'Service user'
  const minDate = todayUtcDateInput()

  React.useEffect(() => {
    if (!open || !user || !apiConfigured || !canRead) {
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setFormError(null)
      try {
        const row = await fetchServiceUserFlashMessage(serviceUserId)
        if (cancelled) return
        setMessage(row?.message ?? '')
        setDisplayUntil(isoToDateInput(row?.displayUntil) || minDate)
      } catch (e) {
        if (!cancelled) {
          setMessage('')
          setDisplayUntil(minDate)
          setFormError(e instanceof ApiError ? e.message : 'Failed to load flash message')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, user, serviceUserId, apiConfigured, canRead, minDate])

  const validate = (): string | null => {
    const trimmed = message.trim()
    if (!trimmed) return 'Flash message is required'
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return `Flash message must be ${MAX_MESSAGE_LENGTH} characters or fewer`
    }
    if (!displayUntil) return 'Message display until date is required'
    if (displayUntil < minDate) return 'Display until must be today or a future date'
    return null
  }

  const handleSave = async () => {
    if (!user || !canUpdate) return
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await upsertServiceUserFlashMessage(serviceUserId, {
        message: message.trim(),
        displayUntil,
      })
      toastSuccess('Flash message saved')
      onOpenChange(false)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Failed to save flash message')
      toastApiError(e, 'Could not save flash message')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!user || !canDelete) return
    setClearing(true)
    setFormError(null)
    try {
      await clearServiceUserFlashMessage(serviceUserId)
      setMessage('')
      setDisplayUntil(minDate)
      toastSuccess('Flash message cleared')
      onOpenChange(false)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Failed to clear flash message')
      toastApiError(e, 'Could not clear flash message')
    } finally {
      setClearing(false)
    }
  }

  const busy = loading || saving || clearing

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-lg" data-testid="edit-flash-message-dialog">
        <DialogHeader className="border-b border-border/80">
          <DialogTitle className="text-base font-semibold text-sky-700 dark:text-sky-400">
            Edit Flash Message for {name}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {!apiConfigured && (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Set <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> to load and save flash messages.
            </p>
          )}
          {apiConfigured && !canRead && (
            <p className="text-sm text-destructive">You do not have permission to view flash messages.</p>
          )}
          {formError && <p className="text-sm text-destructive">{formError}</p>}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[11rem_1fr] sm:gap-x-4">
                <label htmlFor="flash-message-text" className="pt-2 text-sm font-medium text-foreground">
                  Flash Message
                </label>
                <div className="space-y-1">
                  <textarea
                    id="flash-message-text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={MAX_MESSAGE_LENGTH}
                    rows={4}
                    disabled={busy || !canUpdate}
                    placeholder="Flash Message.."
                    data-testid="flash-message-input"
                    className={cn(
                      'flex min-h-[5.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm',
                      'ring-offset-background placeholder:text-muted-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                    )}
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {message.trim().length}/{MAX_MESSAGE_LENGTH}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[11rem_1fr] sm:gap-x-4">
                <label htmlFor="flash-message-display-until" className="text-sm font-medium text-foreground">
                  Message Display Until
                </label>
                <div className="flex gap-2">
                  <Input
                    id="flash-message-display-until"
                    ref={dateInputRef}
                    type="date"
                    value={displayUntil}
                    min={minDate}
                    onChange={(e) => setDisplayUntil(e.target.value)}
                    disabled={busy || !canUpdate}
                    placeholder="Message Date"
                    data-testid="flash-message-display-until"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 border-rose-400/80 bg-rose-500 text-white hover:bg-rose-600 hover:text-white"
                    disabled={busy || !canUpdate}
                    title="Open calendar"
                    onClick={() => dateInputRef.current?.showPicker?.()}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-sky-600 text-sky-700 hover:bg-sky-50 dark:text-sky-400"
            disabled={busy || !canDelete || !apiConfigured}
            onClick={() => void handleClear()}
            data-testid="flash-message-clear"
          >
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Clear'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-sky-600 text-sky-700 hover:bg-sky-50 dark:text-sky-400"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            data-testid="flash-message-close"
          >
            Close
          </Button>
          <Button
            type="button"
            className="bg-sky-600 text-white hover:bg-sky-700"
            disabled={busy || !canUpdate || !apiConfigured || loading}
            onClick={() => void handleSave()}
            data-testid="flash-message-save"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
