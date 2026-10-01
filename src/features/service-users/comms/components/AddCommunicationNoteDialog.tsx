import * as React from 'react'
import { Calendar, ClipboardList, Loader2, UserCircle, Users } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { ApiError } from '@/shared/api/api-client'
import { useCreateServiceUserCommunicationNote } from '@/features/service-users/hooks/useServiceUserCommunicationNotes'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import { SignaturePad } from '@/shared/ui/signature-pad'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  datetimeLocalToIso,
  toDatetimeLocalValue,
} from '@/features/service-users/comms/communication-note-format'
import {
  COMMUNICATION_NOTE_POSITIONS,
  type CommunicationNoteShareTarget,
} from '@/features/service-users/comms/types'

const SHARE_TARGETS: { id: CommunicationNoteShareTarget; label: string; icon: React.ElementType }[] = [
  { id: 'handover', label: 'Handover', icon: ClipboardList },
  { id: 'manager', label: 'Manager', icon: UserCircle },
  { id: 'family', label: 'Family', icon: Users },
]

type Props = {
  serviceUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function emptyForm() {
  return {
    name: '',
    position: '',
    reason: '',
    outcome: '',
    signature: null as string | null,
    recordedAtLocal: toDatetimeLocalValue(new Date()),
    isPrivate: false,
    shareWith: new Set<CommunicationNoteShareTarget>(),
  }
}

export function AddCommunicationNoteDialog({ serviceUserId, open, onOpenChange }: Props) {
  const createMutation = useCreateServiceUserCommunicationNote(serviceUserId)
  const [form, setForm] = React.useState(emptyForm)
  const [signatureKey, setSignatureKey] = React.useState(0)
  const [formError, setFormError] = React.useState<string | null>(null)
  const saving = createMutation.isPending
  const dateInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) return
    setForm(emptyForm())
    setSignatureKey(k => k + 1)
    setFormError(null)
  }, [open])

  const toggleShare = (target: CommunicationNoteShareTarget) => {
    setForm(current => {
      const next = new Set(current.shareWith)
      if (next.has(target)) next.delete(target)
      else next.add(target)
      return { ...current, shareWith: next }
    })
  }

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required'
    if (!form.position.trim()) return 'Position is required'
    if (!form.reason.trim()) return 'Reason for communication is required'
    if (!form.outcome.trim()) return 'Outcome is required'
    if (!form.signature) return 'Signature is required'
    return null
  }

  const handleSave = async () => {
    const error = validate()
    if (error) {
      setFormError(error)
      toastError(error)
      return
    }

    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        position: form.position.trim(),
        reason: form.reason.trim(),
        outcome: form.outcome.trim(),
        signature: form.signature,
        recordedAt: datetimeLocalToIso(form.recordedAtLocal),
        isPrivate: form.isPrivate,
        shareWith: [...form.shareWith],
      })
      toastSuccess('Communication note saved')
      onOpenChange(false)
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Failed to save communication note'
      setFormError(message)
      toastApiError(e, 'Could not save communication note')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-xl" data-testid="add-communication-note-dialog">
        <DialogHeader>
          <DialogTitle className="text-teal-700 dark:text-teal-300">Add a Communication Note</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <FormField label="Name" htmlFor="comm-note-name" required>
            <Input
              id="comm-note-name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Enter name"
            />
          </FormField>

          <FormField label="Position" htmlFor="comm-note-position" required>
            <select
              id="comm-note-position"
              value={form.position}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select Position</option>
              {COMMUNICATION_NOTE_POSITIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Reason for communication" htmlFor="comm-note-reason" required>
            <Input
              id="comm-note-reason"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Enter reason"
            />
          </FormField>

          <FormField label="Outcome" htmlFor="comm-note-outcome" required>
            <Textarea
              id="comm-note-outcome"
              value={form.outcome}
              onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
              rows={3}
            />
          </FormField>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground">
                Signature<span className="ml-0.5 text-destructive">*</span>
              </label>
              <button
                type="button"
                className="text-sm font-medium text-destructive hover:underline"
                onClick={() => {
                  setForm(f => ({ ...f, signature: null }))
                  setSignatureKey(k => k + 1)
                }}
              >
                Clear
              </button>
            </div>
            <SignaturePad
              key={signatureKey}
              className="w-full rounded-md border border-border"
              onChange={dataUrl => setForm(f => ({ ...f, signature: dataUrl }))}
            />
          </div>

          <FormField label="Date / Time" htmlFor="comm-note-recorded-at">
            <div className="flex w-full">
              <Input
                ref={dateInputRef}
                id="comm-note-recorded-at"
                type="datetime-local"
                value={form.recordedAtLocal}
                onChange={e => setForm(f => ({ ...f, recordedAtLocal: e.target.value }))}
                className="min-w-0 flex-1 rounded-r-none"
              />
              <button
                type="button"
                onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.focus()}
                className="inline-flex items-center rounded-r-md bg-primary px-3 text-primary-foreground hover:bg-primary/90"
                aria-label="Open calendar"
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>
          </FormField>

          <div className="rounded-md border border-foreground/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <span id="comm-note-private-label" className="text-sm font-medium text-foreground">
                Private Note
              </span>
              <NoYesToggle
                id="comm-note-private-toggle"
                value={form.isPrivate}
                onChange={v => setForm(f => ({ ...f, isPrivate: v }))}
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Share with:</p>
            <div className="flex flex-wrap gap-8">
              {SHARE_TARGETS.map(target => {
                const on = form.shareWith.has(target.id)
                const Icon = target.icon
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => toggleShare(target.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 text-xs font-medium',
                      on ? 'text-foreground' : 'text-muted-foreground opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full border-2',
                        on ? 'border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/40' : 'border-muted bg-muted/40',
                      )}
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    {target.label}
                  </button>
                )
              })}
            </div>
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
