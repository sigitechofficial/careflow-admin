import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { Combobox } from '@/shared/ui/combobox'
import {
  useCreateLearningTrainingEvent,
  useDeleteLearningTrainingEvent,
  useLearningCourses,
  useLearningTrainingEvents,
} from '@/features/learning/hooks/useLearning'
import { TrainingEventDetailDialog } from '@/features/learning/components/TrainingEventDetailDialog'
import { LEARNING_DELIVERY_METHOD_OPTIONS } from '@/features/learning/types/learning.types'
import type { LearningTrainingEventInput } from '@/features/learning/types/learning.types'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { trainingEventDisplayStatus } from '@/features/learning/lib/training-event-status'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'

const EMPTY_FORM: LearningTrainingEventInput = {
  title: '',
  startAt: '',
  endAt: '',
  deliveryMethod: 'FACE_TO_FACE',
}

export function TrainingEventsPanel() {
  const canManage = useAuthStore(s => s.can('learning.training_events.manage'))
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const createMut = useCreateLearningTrainingEvent()
  const deleteMut = useDeleteLearningTrainingEvent()
  const [form, setForm] = React.useState<LearningTrainingEventInput>(EMPTY_FORM)
  const submittingRef = React.useRef(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [openId, setOpenId] = React.useState<string | null>(null)
  // Sessions are for published training courses taught face to face, virtually or blended.
  const coursesQuery = useLearningCourses({ status: 'PUBLISHED', limit: 100 }, { alwaysFresh: true })
  const sessionCourses = (coursesQuery.data?.rows ?? []).filter(
    c =>
      c.courseType === 'COURSE' &&
      (c.deliveryMethod === 'FACE_TO_FACE' || c.deliveryMethod === 'VIRTUAL' || c.deliveryMethod === 'BLENDED'),
  )
  const deliveryLabel = (v?: string | null) => LEARNING_DELIVERY_METHOD_OPTIONS.find(o => o.value === v)?.label ?? ''

  const query = useLearningTrainingEvents({ page, limit: 20, search: search || undefined })
  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current || createMut.isPending) return
    submittingRef.current = true
    try {
      // datetime-local values carry no timezone: send them as organisation-time instants.
      await createMut.mutateAsync({
        ...form,
        location: form.location?.trim() || undefined,
        virtualMeetingUrl: form.virtualMeetingUrl?.trim() || undefined,
        trainerName: form.trainerName?.trim() || undefined,
        startAt: orgDatetimeLocalToIso(form.startAt) || form.startAt,
        endAt: orgDatetimeLocalToIso(form.endAt) || form.endAt,
      })
      toastSuccess('Session scheduled. Open it to book carers.')
      setForm(EMPTY_FORM)
      setDialogOpen(false)
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Create failed'))
    } finally {
      submittingRef.current = false
    }
  }

  const onDelete = async (id: string, title: string) => {
    if (deleteMut.isPending) return
    if (!window.confirm(`Delete training event “${title}”? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await deleteMut.mutateAsync(id)
      toastSuccess('Training event deleted')
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Delete failed'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4" data-testid="learning-training-events-panel">
      <ContentSectionHeader
        title="Training events"
        description="Classroom, virtual and blended sessions. Booked carers see the date, time and place in the app."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Schedule session
            </Button>
          ) : undefined
        }
      />

      <Input
        placeholder="Search events…"
        value={search}
        onChange={e => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="max-w-sm"
      />

      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No training events scheduled.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Carers</th>
                <th className="px-3 py-2">Status</th>
                {canManage ? <th className="px-3 py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isDeleting = deletingId === row.id && deleteMut.isPending
                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-border hover:bg-muted/40"
                    onClick={() => setOpenId(row.id)}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.title}</div>
                      {row.course ? (
                        <div className="text-xs text-muted-foreground">
                          {row.course.title} · {deliveryLabel(row.deliveryMethod)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatOrganisationDateTime(row.startAt)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.location || (row.virtualMeetingUrl ? 'Online meeting' : '—')}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.bookedCount ?? 0}
                      {row.capacity != null ? ` / ${row.capacity}` : ''} booked
                      {row.attendedCount ? ` · ${row.attendedCount} attended` : ''}
                      {row.cantAttendCount ? (
                        <span className="text-amber-700 dark:text-amber-300"> · {row.cantAttendCount} can&apos;t attend</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <LearningStatusBadge status={trainingEventDisplayStatus(row)} />
                    </td>
                    {canManage ? (
                      <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteMut.isPending}
                          onClick={() => void onDelete(row.id, row.title)}
                        >
                          {isDeleting ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                          )}
                          Delete
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.hasNextPage}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          if (createMut.isPending) return
          setDialogOpen(open)
          if (!open) setForm(EMPTY_FORM)
        }}
      >
        <DialogContent size="md">
          <form onSubmit={e => void onCreate(e)}>
            <DialogHeader>
              <DialogTitle>Schedule a session</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <FormField label="Course" required>
                <Combobox
                  options={sessionCourses.map(c => ({
                    value: c.id,
                    label: c.title,
                    description: `${c.code} · ${deliveryLabel(c.deliveryMethod)}`,
                  }))}
                  value={form.courseId ?? ''}
                  onChange={id => {
                    const course = sessionCourses.find(c => c.id === id)
                    setForm(p => ({
                      ...p,
                      courseId: id || undefined,
                      deliveryMethod: course?.deliveryMethod ?? p.deliveryMethod,
                      title: p.title || course?.title || '',
                    }))
                  }}
                  loading={coursesQuery.isLoading}
                  placeholder="Choose a course"
                  searchPlaceholder="Search courses…"
                  emptyText="No published face to face, virtual or blended courses"
                  disabled={createMut.isPending}
                />
              </FormField>
              <FormField label="Session title" required>
                <Input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  required
                  disabled={createMut.isPending}
                />
              </FormField>
              <FormField label="Start" required>
                <Input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={e => setForm(p => ({ ...p, startAt: e.target.value }))}
                  required
                  disabled={createMut.isPending}
                />
              </FormField>
              <FormField label="End" required>
                <Input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={e => setForm(p => ({ ...p, endAt: e.target.value }))}
                  required
                  disabled={createMut.isPending}
                />
              </FormField>
              <FormField label="Location">
                <Input
                  value={form.location ?? ''}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  disabled={createMut.isPending}
                />
              </FormField>
              <FormField label="Online meeting link">
                <Input
                  type="url"
                  placeholder="https://"
                  value={form.virtualMeetingUrl ?? ''}
                  onChange={e => setForm(p => ({ ...p, virtualMeetingUrl: e.target.value }))}
                  disabled={createMut.isPending}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Trainer">
                  <Input
                    value={form.trainerName ?? ''}
                    onChange={e => setForm(p => ({ ...p, trainerName: e.target.value }))}
                    disabled={createMut.isPending}
                  />
                </FormField>
                <FormField label="Places">
                  <Input
                    type="number"
                    min={1}
                    value={form.capacity ?? ''}
                    onChange={e =>
                      setForm(p => ({ ...p, capacity: e.target.value ? Number(e.target.value) : undefined }))
                    }
                    disabled={createMut.isPending}
                  />
                </FormField>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={createMut.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending || !form.courseId}>
                {createMut.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <TrainingEventDetailDialog eventId={openId} onOpenChange={open => !open && setOpenId(null)} />
    </div>
  )
}
