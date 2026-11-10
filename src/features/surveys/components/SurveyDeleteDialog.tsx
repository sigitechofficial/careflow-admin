import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { ApiError } from '@/shared/api/api-client'
import { extractApiErrorMessage, toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { useDeleteSurvey, useDeleteSurveyWithoutEvidence } from '@/features/surveys/hooks/useSurveys'
import {
  DELETE_WITHOUT_EVIDENCE_REASON_MAX,
  DELETE_WITHOUT_EVIDENCE_REASON_MIN,
  SURVEY_EVIDENCE_CAPTURE_FAILED,
} from '@/features/surveys/api/surveys.api'

type DeleteTarget = { id: string; title: string; isTemplate: boolean }

/** The API refused the delete because the survey's CQC evidence could not be taken: its message says why. */
function evidenceFailure(e: unknown): string | null {
  if (!(e instanceof ApiError) || !e.body || typeof e.body !== 'object') return null
  if ((e.body as { code?: unknown }).code !== SURVEY_EVIDENCE_CAPTURE_FAILED) return null
  return extractApiErrorMessage(e)
}

/**
 * Delete a survey or template. A closed survey's CQC evidence (totals only) is taken first; when that fails the
 * dialog shows the real reason, and only then offers a company-wide Admin "Delete without CQC evidence", with a
 * reason (5–300 characters) kept in the audit trail.
 */
export function SurveyDeleteDialog({ target, onClose }: { target: DeleteTarget | null; onClose: () => void }) {
  const deleteMut = useDeleteSurvey()
  const anywayMut = useDeleteSurveyWithoutEvidence()
  const user = useAuthStore(s => s.user)
  // Same rule as the API: Admin or Super Admin, not limited to branches.
  const companyAdmin = Boolean(
    user &&
      (user.backendRoles ?? []).some(r => r === 'Admin' || r === 'Super Admin') &&
      !Array.isArray(user.assignedLocationIds),
  )
  const [failure, setFailure] = React.useState<string | null>(null)
  const [reason, setReason] = React.useState('')
  React.useEffect(() => {
    setFailure(null)
    setReason('')
  }, [target?.id])

  const pending = deleteMut.isPending || anywayMut.isPending
  const trimmed = reason.trim()
  const reasonOk = trimmed.length >= DELETE_WITHOUT_EVIDENCE_REASON_MIN && trimmed.length <= DELETE_WITHOUT_EVIDENCE_REASON_MAX

  const handleDelete = async () => {
    if (!target) return
    try {
      await deleteMut.mutateAsync(target.id)
      toastSuccess(target.isTemplate ? 'Template deleted' : 'Survey deleted')
      onClose()
    } catch (e) {
      const why = evidenceFailure(e)
      if (why) setFailure(why)
      else toastApiError(e, 'Could not delete')
    }
  }

  const handleDeleteAnyway = async () => {
    if (!target || !reasonOk) return
    try {
      await anywayMut.mutateAsync({ id: target.id, reason: trimmed })
      toastSuccess('Survey deleted without CQC evidence')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not delete')
    }
  }

  return (
    <AlertDialog open={target != null} onOpenChange={o => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{target?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.isTemplate
              ? 'This removes the template. Surveys already created from it are not affected.'
              : 'This removes the survey and its questions from the list. Recipients and responses are kept in the audit trail. This cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failure ? (
          <div className="space-y-3 text-sm" data-testid="delete-evidence-failure">
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive" role="alert">
              {failure}
            </p>
            {companyAdmin ? (
              <label className="block space-y-1">
                <span className="font-medium">Why delete it without CQC evidence?</span>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  maxLength={DELETE_WITHOUT_EVIDENCE_REASON_MAX}
                  aria-describedby="delete-anyway-hint"
                />
                <span id="delete-anyway-hint" className="block text-xs text-muted-foreground">
                  No CQC evidence will be kept from this survey. Your reason ({DELETE_WITHOUT_EVIDENCE_REASON_MIN}–
                  {DELETE_WITHOUT_EVIDENCE_REASON_MAX} characters) is kept in the audit trail.
                </span>
              </label>
            ) : (
              <p className="text-muted-foreground">
                Put the problem right and try again, or ask an Admin with access to every branch to delete it without its CQC
                evidence.
              </p>
            )}
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {failure && companyAdmin ? (
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending || !reasonOk}
              onClick={() => void handleDeleteAnyway()}
            >
              {anywayMut.isPending ? 'Deleting…' : 'Delete without CQC evidence'}
            </Button>
          ) : (
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={e => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {deleteMut.isPending ? 'Deleting…' : failure ? 'Try again' : 'Delete'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
