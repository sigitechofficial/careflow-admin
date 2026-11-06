import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import {
  previewEmployeeReviewNextDue,
  type EmployeeReviewRow,
} from '@/features/employees/api/employee-reviews-api'
import { useCreateEmployeeReview, useUpdateEmployeeReview } from '@/features/employees/hooks/useEmployeeReviews'
import { useUploadEmployeeDocument } from '@/features/employees/hooks/useEmployeeProfileExtras'
import { SKILL_DOCUMENT_ACCEPT } from '@/features/employees/components/EmployeeSkillDocumentCell'
import { describeSchedule, personName, type ReviewSchedule } from '@/features/supervision/api'
import { useSupervisors } from '@/features/supervision/hooks'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatDate } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { DatePicker } from '@/shared/ui/date-picker'
import { DictationProvider } from '@/shared/ui/dictation'
import { Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

export type ReviewTypeOption = Partial<ReviewSchedule> & { id: string; name: string }

const NOTES_MAX = 2000
const NOBODY = '__none__'

/** Date picker value (local midnight) → stored date (midday UTC, so no time zone moves the day). */
const toApiDate = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)).toISOString()
const fromApiDate = (iso: string | null | undefined) => {
  if (!iso) return undefined
  const d = new Date(iso)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * Record a review done outside a CareFlow supervision session (e.g. a signed paper form), or edit
 * one. Next due comes from the review type's schedule (asked from the API, so it matches reminders
 * and the dashboard) unless a different date is set by hand.
 */
export function RecordReviewDialog({
  open,
  onOpenChange,
  employeeId,
  reviewTypes,
  presetTypeId,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  reviewTypes: ReviewTypeOption[]
  /** "Record" on a review due from the schedule: that type, ready to fill in. */
  presetTypeId?: string
  /** Edit an existing record. */
  editing?: EmployeeReviewRow | null
}) {
  const canUploadDocs = useAuthStore(s => s.can('employees.documents.upload'))
  const canListSupervisors = useAuthStore(s => s.can('supervision.read'))
  const me = useAuthStore(s => s.user?.id)
  const supervisors = useSupervisors(open && canListSupervisors)
  const create = useCreateEmployeeReview(employeeId)
  const update = useUpdateEmployeeReview(employeeId)
  const upload = useUploadEmployeeDocument(employeeId)

  const [reviewTypeId, setReviewTypeId] = React.useState('')
  const [lastDone, setLastDone] = React.useState<Date | undefined>()
  const [overrideDue, setOverrideDue] = React.useState(false)
  const [nextDue, setNextDue] = React.useState<Date | undefined>()
  const [reviewedById, setReviewedById] = React.useState(NOBODY)
  const [notes, setNotes] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setReviewTypeId(editing?.reviewTypeId ?? presetTypeId ?? '')
    setLastDone(editing ? fromApiDate(editing.lastDone) : new Date())
    setOverrideDue(false)
    setNextDue(fromApiDate(editing?.nextDue))
    setReviewedById(editing?.reviewedById ?? me ?? NOBODY)
    setNotes(editing?.notes ?? '')
    setFile(null)
    setReason('')
  }, [open, editing, presetTypeId, me])

  const type = reviewTypes.find(t => t.id === reviewTypeId)
  const lastDoneIso = lastDone ? toApiDate(lastDone) : null
  const preview = useQuery({
    queryKey: ['employee-review-next-due', employeeId, reviewTypeId, lastDoneIso],
    queryFn: () => previewEmployeeReviewNextDue(employeeId, reviewTypeId, lastDoneIso),
    enabled: open && Boolean(reviewTypeId),
    staleTime: 60_000,
  })
  const scheduledDue = preview.data ?? null

  const saving = create.isPending || update.isPending || upload.isPending
  const day = (d: Date | undefined) => (d ? toApiDate(d).slice(0, 10) : null)
  // Changing what was reviewed or when corrects a compliance record: the API asks why.
  const correcting = Boolean(
    editing &&
      (reviewTypeId !== editing.reviewTypeId ||
        day(lastDone) !== (editing.lastDone ? editing.lastDone.slice(0, 10) : null) ||
        (overrideDue && day(nextDue) !== (editing.nextDue ? editing.nextDue.slice(0, 10) : null))),
  )
  const error = !reviewTypeId
    ? 'Choose the review type.'
    : correcting && reason.trim().length < 3
      ? 'Say why the review type or dates are changing.'
      : notes.length > NOTES_MAX
      ? `Notes can be up to ${NOTES_MAX} characters.`
      : overrideDue && !nextDue
        ? 'Pick the next due date, or use the schedule.'
        : null

  const onSave = async () => {
    if (error) return
    try {
      const documentUrl = file
        ? (await upload.mutateAsync({ file, name: file.name, description: `${type?.name ?? 'Staff review'} document` })).fileUrl
        : undefined
      const body = {
        reviewTypeId,
        lastDone: lastDoneIso,
        // Left out, the API sets next due from the schedule (the same date shown above).
        ...(overrideDue && nextDue ? { nextDue: toApiDate(nextDue) } : {}),
        notes: notes.trim() || null,
        reviewedById: reviewedById === NOBODY ? null : reviewedById,
        ...(documentUrl ? { documentUrl } : {}),
      }
      if (editing) {
        await update.mutateAsync({ reviewId: editing.id, body: { ...body, ...(correcting ? { reason: reason.trim() } : {}) } })
        toastSuccess('Review updated')
      } else {
        await create.mutateAsync({
          ...body,
          lastDone: body.lastDone ?? undefined,
          notes: body.notes ?? undefined,
          reviewedById: body.reviewedById ?? undefined,
        })
        toastSuccess('Review recorded')
      }
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, editing ? 'Could not update the review' : 'Could not record the review')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit review' : 'Record a review'}</DialogTitle>
          <DialogDescription>
            For a review held outside CareFlow, e.g. a signed paper form. To hold a supervision here, with its form and
            signatures, use Schedule supervision.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Review type</span>
            <Select value={reviewTypeId} onValueChange={setReviewTypeId}>
              <SelectTrigger aria-label="Review type">
                <SelectValue placeholder="Choose the review type" />
              </SelectTrigger>
              <SelectContent>
                {reviewTypes.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.scheduleKind ? (
                      <span className="ml-1 text-muted-foreground">({describeSchedule(t as ReviewSchedule).toLowerCase()})</span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Date held</span>
              <DatePicker value={lastDone} onChange={setLastDone} maxDate={new Date()} placeholder="When it was done" />
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Reviewed by</span>
              {canListSupervisors ? (
                <Select value={reviewedById} onValueChange={setReviewedById}>
                  <SelectTrigger aria-label="Reviewed by">
                    <SelectValue placeholder={supervisors.isLoading ? 'Loading…' : 'Who held it'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOBODY}>Not recorded</SelectItem>
                    {(supervisors.data ?? []).map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {personName(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="py-2 text-xs text-muted-foreground">Recorded as you</p>
              )}
            </label>
          </div>

          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm" data-testid="review-next-due">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="text-xs font-medium text-muted-foreground">Next due </span>
                {overrideDue ? (
                  <span className="text-xs text-muted-foreground">(set by hand)</span>
                ) : !reviewTypeId ? (
                  <span className="text-muted-foreground">— choose the review type</span>
                ) : preview.isFetching ? (
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                ) : scheduledDue ? (
                  <span className="font-medium">
                    {formatDate(scheduledDue)} <span className="text-xs font-normal text-muted-foreground">from the schedule</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">nothing more due (one-off or last milestone)</span>
                )}
              </span>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => {
                  setOverrideDue(v => !v)
                  if (!overrideDue && !nextDue && scheduledDue) setNextDue(fromApiDate(scheduledDue))
                }}
              >
                {overrideDue ? 'Use the schedule' : 'Set a different date'}
              </button>
            </div>
            {overrideDue ? <DatePicker value={nextDue} onChange={setNextDue} placeholder="Next due date" /> : null}
            {type?.scheduleKind ? (
              <p className="text-xs text-muted-foreground">Schedule: {describeSchedule(type as ReviewSchedule)}</p>
            ) : null}
          </div>

          <label className="block space-y-1 text-sm">
            <span className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Notes (optional)</span>
              <span className={notes.length > NOTES_MAX ? 'text-destructive' : ''}>
                {notes.length}/{NOTES_MAX}
              </span>
            </span>
            <DictationProvider>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Short note, e.g. outcome or where the signed form is kept (type or dictate)"
                aria-label="Notes"
              />
            </DictationProvider>
          </label>

          {canUploadDocs ? (
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {editing?.documentUrl ? 'Replace the document (optional)' : 'Document (optional), e.g. the signed form'}
              </span>
              <Input
                type="file"
                accept={SKILL_DOCUMENT_ACCEPT}
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                aria-label="Document"
              />
              <span className="block text-xs text-muted-foreground">Also saved in this carer&apos;s Documents.</span>
            </label>
          ) : null}

          {correcting ? (
            <label className="block space-y-1 rounded-md border border-amber-300 bg-amber-50/60 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/20">
              <span className="text-xs font-medium">Why are the review type or dates changing?</span>
              <DictationProvider>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. date entered wrongly; the signed form is dated 3 October"
                  aria-label="Reason for the change"
                />
              </DictationProvider>
              <span className="block text-xs text-muted-foreground">Kept in the review history with your name.</span>
            </label>
          ) : null}

          {error && reviewTypeId ? <p className="text-xs text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={Boolean(error) || saving} data-testid="save-review">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {editing ? 'Save' : 'Record review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
