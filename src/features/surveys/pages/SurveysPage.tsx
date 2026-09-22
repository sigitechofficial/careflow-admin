import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ClipboardList, Eye, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useCreateSurvey, useDeleteSurvey, useSurveys } from '@/features/surveys/hooks/useSurveys'
import { SurveyPreviewDialog } from '@/features/surveys/components/SurveyPreviewDialog'
import type { SurveyListItem, SurveyStatus } from '@/features/surveys/types'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'

const STATUS_TONE: Record<SurveyStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  CLOSED: 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
}

export default function SurveysPage() {
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const navigate = useNavigate()
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const formatInstant = (iso: string) => {
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }
  const { data: surveys = [], isLoading, isError } = useSurveys()
  const createMut = useCreateSurvey()
  const deleteMut = useDeleteSurvey()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isAnonymous, setIsAnonymous] = React.useState(false)
  const [toDelete, setToDelete] = React.useState<SurveyListItem | null>(null)
  const [previewId, setPreviewId] = React.useState<string | null>(null)

  const resetCreate = () => {
    setTitle('')
    setDescription('')
    setIsAnonymous(false)
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    try {
      const survey = await createMut.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        targetKind: 'EMPLOYEE',
        isAnonymous,
      })
      toastSuccess('Survey created')
      setCreateOpen(false)
      resetCreate()
      void navigate({ to: '/surveys/$surveyId', params: { surveyId: survey.id } })
    } catch (e) {
      toastApiError(e, 'Could not create survey')
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteMut.mutateAsync(toDelete.id)
      toastSuccess('Survey deleted')
      setToDelete(null)
    } catch (e) {
      toastApiError(e, 'Could not delete survey')
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700 dark:text-teal-300">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Surveys</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Create survey forms and send them to employees. Responses feed quality assurance.
            </p>
          </div>
        </div>
        {canManage ? (
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New survey
          </Button>
        ) : null}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading surveys…
          </div>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">Could not load surveys.</p>
        ) : surveys.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">No surveys yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first employee survey to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Questions</th>
                  <th className="px-4 py-2.5 text-right">Recipients</th>
                  <th className="px-4 py-2.5">Updated</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map(s => (
                  <tr key={s.id} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        to="/surveys/$surveyId"
                        params={{ surveyId: s.id }}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {s.title}
                      </Link>
                      {s.isAnonymous ? (
                        <span className="ml-2 text-xs text-muted-foreground">· Anonymous</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[s.status]}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.questionCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.recipientCount}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {formatInstant(s.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label={`Preview ${s.title}`}
                          title="Preview survey form"
                          onClick={() => setPreviewId(s.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/surveys/$surveyId" params={{ surveyId: s.id }}>
                            Open
                          </Link>
                        </Button>
                        {canManage ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            aria-label={`Delete ${s.title}`}
                            onClick={() => setToDelete(s)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={o => {
          setCreateOpen(o)
          if (!o) resetCreate()
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>New employee survey</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Title *</span>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Staff satisfaction Q3" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Description</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optional context shown to recipients"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Anonymous responses (recommended for honest staff feedback)
            </label>
            <p className="text-xs text-muted-foreground">Audience: Employees</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!title.trim() || createMut.isPending} onClick={() => void handleCreate()}>
              {createMut.isPending ? 'Creating…' : 'Create & add questions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form-style preview */}
      <SurveyPreviewDialog
        surveyId={previewId}
        open={previewId != null}
        onOpenChange={o => !o && setPreviewId(null)}
      />

      {/* Delete confirm */}
      <AlertDialog open={toDelete != null} onOpenChange={o => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the survey and its questions. Recipients and any responses are kept in the
              audit trail. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={e => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete survey'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
