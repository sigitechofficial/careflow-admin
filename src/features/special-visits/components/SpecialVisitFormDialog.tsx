import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  createSpecialVisit,
  specialVisitKeys,
  type CreateSpecialVisitBody,
} from '@/features/special-visits/api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Label, Textarea } from '@/shared/ui/form-field'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

/** Add N days to a 'YYYY-MM-DD' string and return 'YYYY-MM-DD'. */
function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

type Draft = {
  visitDate: string
  hours: string
  title: string
  notes: string
}

export function SpecialVisitFormDialog({
  open,
  onClose,
  employeeId,
  weekStart,
  remainingHours,
}: {
  open: boolean
  onClose: () => void
  employeeId: string
  /** 'YYYY-MM-DD' Monday of the selected week. */
  weekStart: string
  /** Remaining contracted hours for the week (for the soft over-limit warning). */
  remainingHours: number | undefined
}) {
  const weekEnd = React.useMemo(() => addDays(weekStart, 6), [weekStart])
  const qc = useQueryClient()

  const [draft, setDraft] = React.useState<Draft>({
    visitDate: weekStart,
    hours: '',
    title: '',
    notes: '',
  })
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setDraft({ visitDate: weekStart, hours: '', title: '', notes: '' })
      setError(null)
    }
  }, [open, weekStart])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  const createMutation = useMutation({
    mutationFn: (body: CreateSpecialVisitBody) => createSpecialVisit(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: specialVisitKeys.all() })
      toastSuccess('Special visit added')
      onClose()
    },
    onError: e => toastApiError(e, 'Could not add the special visit'),
  })

  const hoursNum = Number(draft.hours)
  const hoursValid = draft.hours.trim() !== '' && Number.isFinite(hoursNum) && hoursNum > 0
  const exceedsRemaining =
    hoursValid && remainingHours != null && hoursNum > remainingHours

  const handleSave = () => {
    setError(null)
    if (!draft.visitDate) {
      setError('Pick a visit date.')
      return
    }
    if (!hoursValid) {
      setError('Enter a duration greater than 0 hours.')
      return
    }
    if (!draft.title.trim()) {
      setError('A title is required.')
      return
    }
    createMutation.mutate({
      employeeId,
      visitDate: draft.visitDate,
      durationMinutes: Math.round(hoursNum * 60),
      title: draft.title.trim(),
      notes: draft.notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Add special visit</DialogTitle>
          <DialogDescription>
            Record a flexible visit to fill the carer’s remaining contracted hours for the week of{' '}
            {weekStart}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label required>Date</Label>
              <Input
                type="date"
                value={draft.visitDate}
                min={weekStart}
                max={weekEnd}
                onChange={e => set('visitDate', e.target.value)}
                data-testid="special-visit-date"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Duration (hours)</Label>
              <Input
                type="number"
                step="0.25"
                min={0}
                value={draft.hours}
                onChange={e => set('hours', e.target.value)}
                placeholder="e.g. 1.5"
                data-testid="special-visit-hours"
              />
              {exceedsRemaining ? (
                <p className="text-xs text-warning">
                  This exceeds the remaining contracted hours.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label required>Title</Label>
              <Input
                value={draft.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Shadowing, admin, client drop-in…"
                data-testid="special-visit-title"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Optional details…"
                data-testid="special-visit-notes"
              />
            </div>
          </div>

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={createMutation.isPending}
            data-testid="special-visit-save"
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Add special visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
