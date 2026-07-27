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
import {
  useCreateLearningTrainingEvent,
  useDeleteLearningTrainingEvent,
  useLearningTrainingEvents,
} from '@/features/learning/hooks/useLearning'
import type { LearningTrainingEventInput } from '@/features/learning/types/learning.types'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
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

  const query = useLearningTrainingEvents({ page, limit: 20, search: search || undefined })
  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current || createMut.isPending) return
    submittingRef.current = true
    try {
      await createMut.mutateAsync(form)
      toastSuccess('Training event created')
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
        description="Schedule classroom and blended training sessions."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Schedule event
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
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Status</th>
                {canManage ? <th className="px-3 py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isDeleting = deletingId === row.id && deleteMut.isPending
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{row.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(row.startAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.location ?? row.virtualMeetingUrl ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <LearningStatusBadge status={row.status ?? 'SCHEDULED'} />
                    </td>
                    {canManage ? (
                      <td className="px-3 py-2 text-right">
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
              <DialogTitle>Schedule training event</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <FormField label="Title" required>
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
              <FormField label="Virtual meeting URL">
                <Input
                  value={form.virtualMeetingUrl ?? ''}
                  onChange={e => setForm(p => ({ ...p, virtualMeetingUrl: e.target.value }))}
                  disabled={createMut.isPending}
                />
              </FormField>
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
              <Button type="submit" disabled={createMut.isPending}>
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
    </div>
  )
}
