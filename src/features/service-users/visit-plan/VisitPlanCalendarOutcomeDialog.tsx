import * as React from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { recordVisitPlanCalendarOutcome } from '@/features/service-users/visit-plan/api'
import {
  VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS,
  type VisitPlanCalendarOutcomeStatus,
} from '@/features/service-users/visit-plan/visit-plan-calendar-outcome.constants'
import type { VisitPlanCalendarVisit } from '@/features/service-users/visit-plan/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

export type VisitPlanCalendarSelection = {
  iso: string
  month: string
  day: number
  slot: VisitPlanSlot
  start: string
  end: string
  carerNames: string[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  planId: string
  selection: VisitPlanCalendarSelection | null
  existing?: VisitPlanCalendarVisit | null
  onSaved: (visit: VisitPlanCalendarVisit) => void
}

export function VisitPlanCalendarOutcomeDialog({
  open,
  onOpenChange,
  serviceUserId,
  planId,
  selection,
  existing,
  onSaved,
}: Props) {
  const [status, setStatus] = React.useState<VisitPlanCalendarOutcomeStatus>('PLANNED')
  const [notes, setNotes] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open || !selection) return
    setStatus((existing?.status as VisitPlanCalendarOutcomeStatus) ?? 'PLANNED')
    setNotes(existing?.notes ?? '')
  }, [open, selection, existing])

  const handleSave = async () => {
    if (!selection?.slot.id) return
    setSaving(true)
    try {
      const saved = await recordVisitPlanCalendarOutcome(serviceUserId, planId, {
        visitPlanSlotId: selection.slot.id,
        date: selection.iso,
        status,
        notes: notes.trim() || undefined,
      })
      toastSuccess('Visit outcome saved', 'Status updated for this visit.')
      onSaved(saved)
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, 'Could not save visit outcome')
    } finally {
      setSaving(false)
    }
  }

  if (!selection) return null

  const dateLabel = new Date(`${selection.iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>Record visit outcome</DialogTitle>
          <DialogDescription>
            {selection.slot.label} · {dateLabel} · {selection.start}–{selection.end}
            {selection.carerNames.length > 0 ? ` · ${selection.carerNames.join(', ')}` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {!selection.slot.id ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Save the visit plan before recording outcomes for this slot.
            </p>
          ) : (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Visit status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as VisitPlanCalendarOutcomeStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS.filter((o) => o.value !== 'NOT_GENERATED').map(
                      (option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS.find((o) => o.value === status)?.description}
                </p>
              </div>

              <div>
                <Label htmlFor="visit-outcome-notes" className="text-xs text-muted-foreground">
                  Description / notes
                </Label>
                <Textarea
                  id="visit-outcome-notes"
                  className="mt-1 min-h-[100px]"
                  placeholder="Add details about the visit, reason for non-attendance, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </DialogBody>
        <DialogFooter className="border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !selection.slot.id}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save outcome
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
