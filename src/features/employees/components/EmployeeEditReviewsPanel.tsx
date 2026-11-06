import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, ClipboardPlus, Eye, ListChecks, Pencil, Settings2, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { useAuthStore } from '@/features/auth/store'
import { fetchLookupList } from '@/features/settings/api/lookups-admin-api'
import type { EmployeeReviewRow } from '@/features/employees/api/employee-reviews-api'
import { useEmployeeReviews, useUpdateEmployeeReview } from '@/features/employees/hooks/useEmployeeReviews'
import { useUploadEmployeeDocument } from '@/features/employees/hooks/useEmployeeProfileExtras'
import { SKILL_DOCUMENT_ACCEPT } from '@/features/employees/components/EmployeeSkillDocumentCell'
import { ReviewStatusBadge } from '@/features/employees/components/ReviewStatusBadge'
import { RecordReviewDialog, type ReviewTypeOption } from '@/features/employees/components/RecordReviewDialog'
import { RemoveReviewDialog, ViewReviewDialog } from '@/features/employees/components/ReviewDetailDialogs'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { formatDate } from '@/shared/lib/utils'

/** View / upload / replace the supporting document on one review row. */
function ReviewDocumentCell({
  documentUrl,
  canUpload,
  uploading,
  onUpload,
}: {
  documentUrl: string | null
  canUpload: boolean
  uploading: boolean
  onUpload: (file: File) => void
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const href = resolveMediaUrl(documentUrl)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-2 hover:underline"
          data-testid="review-document-view"
        >
          View
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
      {canUpload ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept={SKILL_DOCUMENT_ACCEPT}
            className="sr-only"
            onChange={e => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) onUpload(file)
            }}
          />
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            data-testid="review-document-upload"
          >
            {uploading ? 'Uploading…' : href ? 'Replace' : 'Upload'}
          </button>
        </>
      ) : null}
    </div>
  )
}

export function EmployeeEditReviewsPanel({ employeeId }: { employeeId: string }) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const canUploadDocs = useAuthStore(s => s.can('employees.documents.upload'))
  const canOpenSchedules = useAuthStore(s => s.can('supervision.settings') || s.can('lookups.manage'))
  const queryEnabled = apiConfigured && jwtPresent && Boolean(employeeId)

  const reviewsQuery = useEmployeeReviews(employeeId, queryEnabled)
  const updateMutation = useUpdateEmployeeReview(employeeId)
  const uploadMutation = useUploadEmployeeDocument(employeeId)
  const [uploadingReviewId, setUploadingReviewId] = React.useState<string | null>(null)
  const [reviewTypes, setReviewTypes] = React.useState<ReviewTypeOption[]>([])
  const [viewing, setViewing] = React.useState<EmployeeReviewRow | null>(null)
  const [removing, setRemoving] = React.useState<EmployeeReviewRow | null>(null)
  const [dialog, setDialog] = React.useState<{ open: boolean; presetTypeId?: string; editing?: EmployeeReviewRow | null }>({
    open: false,
  })

  React.useEffect(() => {
    if (!queryEnabled) return
    void fetchLookupList('review-types').then(rows => setReviewTypes(rows as ReviewTypeOption[]))
  }, [queryEnabled])

  const reviews = reviewsQuery.data?.rows ?? []
  const upcoming = reviewsQuery.data?.upcoming ?? []
  const loading = reviewsQuery.isLoading
  const error =
    reviewsQuery.error instanceof ApiError
      ? reviewsQuery.error.message
      : reviewsQuery.error
        ? 'Could not load reviews.'
        : null

  const onRowUpload = async (reviewId: string, doc: File) => {
    setUploadingReviewId(reviewId)
    try {
      // Saved in the employee's Documents too, so it is listed with their other records.
      const uploaded = await uploadMutation.mutateAsync({ file: doc, name: doc.name, description: 'Staff review document' })
      await updateMutation.mutateAsync({ reviewId, body: { documentUrl: uploaded.fileUrl } })
      toastSuccess('Document uploaded')
    } catch (e) {
      toastApiError(e, 'Could not upload the document')
    } finally {
      setUploadingReviewId(null)
    }
  }

  return (
    <div className="space-y-4" data-testid="employee-edit-reviews-panel">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Staff reviews</h2>
          <div className="flex items-center gap-1">
            {canUpdate ? (
              <Button type="button" size="sm" onClick={() => setDialog({ open: true })} data-testid="record-review">
                <ClipboardPlus className="mr-1 h-4 w-4" />
                Record a review
              </Button>
            ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="ghost" data-testid="staff-review-more">
                More
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/employee/review-status">
                  <ListChecks className="mr-2 h-4 w-4" />
                  Review status for all staff
                </Link>
              </DropdownMenuItem>
              {canOpenSchedules ? (
                <DropdownMenuItem asChild>
                  <Link to="/settings/general" search={{ tab: 'supervision' }}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Review schedules and reminders
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Supervision, spot checks, appraisal, probation and other reviews for this carer (CQC Regulation 18). Each is due
          on its own schedule, for example supervision at least every 3 months (NICE QS123) and probation reviews 1, 3
          and 6 months after the start date. To hold a supervision in CareFlow, use Schedule supervision below.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Review type', 'Status', 'Last done', 'Next due', 'Notes', 'Document', ''].map(h => (
                <th key={h || 'actions'} className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : reviews.length === 0 && upcoming.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-muted-foreground">
                  Nothing recorded or due yet. Add the start date in Employment so reviews come due from it.
                </td>
              </tr>
            ) : null}
            {!loading
              ? upcoming.map(u => (
                  <tr key={`upcoming-${u.reviewTypeId}`} className="border-b border-border bg-muted/20" data-testid="upcoming-review">
                    <td className="px-3 py-2.5 font-medium">
                      {u.reviewType.name}
                      <span className="block text-xs font-normal text-muted-foreground">Due from the schedule · nothing recorded yet</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <ReviewStatusBadge status={u.status} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">—</td>
                    <td
                      className={
                        u.status === 'OVERDUE' ? 'px-3 py-2.5 font-medium text-destructive' : 'px-3 py-2.5 text-muted-foreground'
                      }
                    >
                      {formatDate(u.nextDue)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">—</td>
                    <td className="px-3 py-2.5 text-muted-foreground">—</td>
                    <td className="px-3 py-2.5">
                      {canUpdate ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDialog({ open: true, presetTypeId: u.reviewTypeId })}
                        >
                          Record
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              : null}
            {loading
              ? null
              : reviews.map(row => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 font-medium">{row.reviewType?.name ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <ReviewStatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(row.lastDone)}</td>
                    <td
                      className={
                        row.status === 'OVERDUE'
                          ? 'px-3 py-2.5 font-medium text-destructive'
                          : 'px-3 py-2.5 text-muted-foreground'
                      }
                    >
                      {formatDate(row.nextDue)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[220px] truncate" title={row.notes ?? undefined}>
                      {row.notes ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <ReviewDocumentCell
                        documentUrl={row.documentUrl ?? null}
                        canUpload={canUpdate && canUploadDocs}
                        uploading={uploadingReviewId === row.id}
                        onUpload={doc => void onRowUpload(row.id, doc)}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewing(row)}
                          aria-label={`View ${row.reviewType?.name ?? 'review'}`}
                          data-testid="view-review"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      {canUpdate ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDialog({ open: true, editing: row })}
                            aria-label={`Edit ${row.reviewType?.name ?? 'review'}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setRemoving(row)}
                            aria-label={`Remove ${row.reviewType?.name ?? 'review'}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <ViewReviewDialog
        review={viewing}
        employeeId={employeeId}
        reviewTypes={reviewTypes}
        onClose={() => setViewing(null)}
        onEdit={
          canUpdate
            ? row => {
                setViewing(null)
                setDialog({ open: true, editing: row })
              }
            : undefined
        }
      />
      {canUpdate ? <RemoveReviewDialog review={removing} employeeId={employeeId} onClose={() => setRemoving(null)} /> : null}
      {canUpdate ? (
        <RecordReviewDialog
          open={dialog.open}
          onOpenChange={open => setDialog(d => ({ ...d, open }))}
          employeeId={employeeId}
          reviewTypes={reviewTypes}
          presetTypeId={dialog.presetTypeId}
          editing={dialog.editing}
        />
      ) : null}
    </div>
  )
}
