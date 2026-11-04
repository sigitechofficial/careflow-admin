import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { useAuthStore } from '@/features/auth/store'
import { fetchLookupList } from '@/features/settings/api/lookups-admin-api'
import { computeNextDueFromLastDone } from '@/features/employees/api/employee-reviews-api'
import {
  useCreateEmployeeReview,
  useDeleteEmployeeReview,
  useEmployeeReviews,
  useUpdateEmployeeReview,
} from '@/features/employees/hooks/useEmployeeReviews'
import { useUploadEmployeeDocument } from '@/features/employees/hooks/useEmployeeProfileExtras'
import { SKILL_DOCUMENT_ACCEPT } from '@/features/employees/components/EmployeeSkillDocumentCell'
import { ReviewStatusBadge } from '@/features/employees/components/ReviewStatusBadge'
import { Button } from '@/shared/ui/button'
import { formatDate } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

type ReviewTypeOption = {
  id: string
  name: string
  defaultIntervalDays?: number | null
}

function intervalLabel(days: number | null | undefined): string {
  if (!days) return ''
  if (days % 365 === 0) return days === 365 ? 'yearly' : `every ${days / 365} years`
  if (days % 7 === 0 && days < 365) return days === 7 ? 'weekly' : `every ${days / 7} weeks`
  return `every ${days} days`
}

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
  const queryEnabled = apiConfigured && jwtPresent && Boolean(employeeId)

  const reviewsQuery = useEmployeeReviews(employeeId, queryEnabled)
  const createMutation = useCreateEmployeeReview(employeeId)
  const deleteMutation = useDeleteEmployeeReview(employeeId)
  const updateMutation = useUpdateEmployeeReview(employeeId)
  const uploadMutation = useUploadEmployeeDocument(employeeId)
  const canUploadDocs = useAuthStore(s => s.can('employees.documents.upload'))
  const [uploadingReviewId, setUploadingReviewId] = React.useState<string | null>(null)

  const [reviewTypes, setReviewTypes] = React.useState<ReviewTypeOption[]>([])
  const [reviewTypeId, setReviewTypeId] = React.useState('')
  const [lastDone, setLastDone] = React.useState('')
  const [nextDue, setNextDue] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = React.useState(0)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  React.useEffect(() => {
    if (!queryEnabled) return
    void fetchLookupList('review-types').then(rows => {
      setReviewTypes(rows as ReviewTypeOption[])
    })
  }, [queryEnabled])

  const reviews = reviewsQuery.data ?? []
  const loading = reviewsQuery.isLoading
  const error =
    reviewsQuery.error instanceof ApiError
      ? reviewsQuery.error.message
      : reviewsQuery.error
        ? 'Could not load reviews.'
        : null

  const onReviewTypeChange = (id: string) => {
    setReviewTypeId(id)
    if (lastDone.trim()) {
      const rt = reviewTypes.find(r => r.id === id)
      const computed = computeNextDueFromLastDone(`${lastDone.trim()}T12:00:00.000Z`, rt?.defaultIntervalDays)
      if (computed) setNextDue(computed.slice(0, 10))
    }
  }

  const onLastDoneChange = (value: string) => {
    setLastDone(value)
    if (value.trim() && reviewTypeId) {
      const rt = reviewTypes.find(r => r.id === reviewTypeId)
      const computed = computeNextDueFromLastDone(`${value.trim()}T12:00:00.000Z`, rt?.defaultIntervalDays)
      if (computed) setNextDue(computed.slice(0, 10))
    }
  }

  const onAdd = async () => {
    if (!reviewTypeId.trim()) {
      setBanner({ type: 'error', text: 'Select a review type.' })
      return
    }
    setBanner(null)
    try {
      const body: {
        reviewTypeId: string
        lastDone?: string
        nextDue?: string
        notes?: string
        documentUrl?: string
      } = { reviewTypeId: reviewTypeId.trim() }
      if (lastDone.trim()) body.lastDone = `${lastDone.trim()}T12:00:00.000Z`
      // Left empty, the API sets next due from last done + the review type interval.
      if (nextDue.trim()) body.nextDue = `${nextDue.trim()}T12:00:00.000Z`
      if (notes.trim()) body.notes = notes.trim()
      if (file) body.documentUrl = await uploadReviewDocument(file)
      await createMutation.mutateAsync(body)
      setReviewTypeId('')
      setLastDone('')
      setNextDue('')
      setNotes('')
      setFile(null)
      setFileInputKey(k => k + 1)
      setBanner({ type: 'success', text: 'Review added.' })
    } catch (e) {
      setBanner({
        type: 'error',
        text: e instanceof ApiError ? e.message : 'Could not add review.',
      })
    }
  }

  /** Saved in the employee's Documents too, so it is listed with their other records. */
  const uploadReviewDocument = async (doc: File) => {
    const uploaded = await uploadMutation.mutateAsync({
      file: doc,
      name: doc.name,
      description: 'Staff review document',
    })
    return uploaded.fileUrl
  }

  const onRowUpload = async (reviewId: string, doc: File) => {
    setBanner(null)
    setUploadingReviewId(reviewId)
    try {
      const documentUrl = await uploadReviewDocument(doc)
      await updateMutation.mutateAsync({ reviewId, body: { documentUrl } })
      setBanner({ type: 'success', text: 'Document uploaded.' })
    } catch (e) {
      setBanner({
        type: 'error',
        text: e instanceof ApiError ? e.message : 'Could not upload document.',
      })
    } finally {
      setUploadingReviewId(null)
    }
  }

  const onDelete = async (reviewId: string) => {
    if (!window.confirm('Remove this review record?')) return
    try {
      await deleteMutation.mutateAsync(reviewId)
    } catch (e) {
      setBanner({
        type: 'error',
        text: e instanceof ApiError ? e.message : 'Could not delete review.',
      })
    }
  }

  return (
    <div className="space-y-4" data-testid="employee-edit-reviews-panel">
      <h2 className="text-sm font-semibold text-foreground">Staff reviews</h2>
      <p className="text-sm text-muted-foreground">
        Supervision, appraisal and probation (CQC Regulation 18). Next due is set from last done and the review
        type interval (Settings → Review types), e.g. supervision every 90 days (NICE QS123).
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {banner ? (
        <p className={banner.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-700'}>
          {banner.text}
        </p>
      ) : null}

      {canUpdate ? (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium">Add review</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={reviewTypeId} onValueChange={onReviewTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Review type" />
              </SelectTrigger>
              <SelectContent>
                {reviewTypes.map(rt => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name}
                    {rt.defaultIntervalDays ? (
                      <span className="ml-1 text-muted-foreground">({intervalLabel(rt.defaultIntervalDays)})</span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="review-last-done">
                Last done
              </label>
              <Input
                id="review-last-done"
                type="date"
                value={lastDone}
                onChange={e => onLastDoneChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="review-next-due">
                Next due (filled from the interval)
              </label>
              <Input id="review-next-due" type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} />
            </div>
            {canUploadDocs ? (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground" htmlFor="review-document">
                  Document (optional) — e.g. signed supervision or appraisal form
                </label>
                <Input
                  key={fileInputKey}
                  id="review-document"
                  type="file"
                  accept={SKILL_DOCUMENT_ACCEPT}
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  data-testid="review-document-input"
                />
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void onAdd()}
            disabled={createMutation.isPending || uploadMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add review
          </Button>
        </div>
      ) : null}

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
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-muted-foreground">
                  No review records yet.
                </td>
              </tr>
            ) : (
              reviews.map(row => (
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
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">{row.notes ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <ReviewDocumentCell
                      documentUrl={row.documentUrl ?? null}
                      canUpload={canUpdate && canUploadDocs}
                      uploading={uploadingReviewId === row.id}
                      onUpload={doc => void onRowUpload(row.id, doc)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {canUpdate ? (
                      <Button type="button" variant="ghost" size="icon" onClick={() => void onDelete(row.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
