import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { fetchLookupList } from '@/features/settings/api/lookups-admin-api'
import { computeNextDueFromLastDone } from '@/features/employees/api/employee-reviews-api'
import {
  useCreateEmployeeReview,
  useDeleteEmployeeReview,
  useEmployeeReviews,
} from '@/features/employees/hooks/useEmployeeReviews'
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

function isOverdue(nextDue: string | null | undefined): boolean {
  if (!nextDue) return false
  const d = new Date(nextDue)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
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

  const [reviewTypes, setReviewTypes] = React.useState<ReviewTypeOption[]>([])
  const [reviewTypeId, setReviewTypeId] = React.useState('')
  const [lastDone, setLastDone] = React.useState('')
  const [nextDue, setNextDue] = React.useState('')
  const [notes, setNotes] = React.useState('')
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
        status?: string
      } = { reviewTypeId: reviewTypeId.trim() }
      if (lastDone.trim()) body.lastDone = `${lastDone.trim()}T12:00:00.000Z`
      if (nextDue.trim()) body.nextDue = `${nextDue.trim()}T12:00:00.000Z`
      if (notes.trim()) body.notes = notes.trim()
      if (body.nextDue && new Date(body.nextDue).getTime() < Date.now()) {
        body.status = 'OVERDUE'
      } else {
        body.status = 'SCHEDULED'
      }
      await createMutation.mutateAsync(body)
      setReviewTypeId('')
      setLastDone('')
      setNextDue('')
      setNotes('')
      setBanner({ type: 'success', text: 'Review added.' })
    } catch (e) {
      setBanner({
        type: 'error',
        text: e instanceof ApiError ? e.message : 'Could not add review.',
      })
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
        Supervision, appraisal, and probation cycles (Reg 18). Next due dates use review type default intervals when
        last done is set.
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
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={lastDone} onChange={e => onLastDoneChange(e.target.value)} aria-label="Last done" />
            <Input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} aria-label="Next due" />
            <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button type="button" size="sm" onClick={() => void onAdd()} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Add review
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Review type', 'Status', 'Last done', 'Next due', 'Notes', ''].map(h => (
                <th key={h || 'actions'} className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                  No review records yet.
                </td>
              </tr>
            ) : (
              reviews.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 font-medium">{row.reviewType?.name ?? '—'}</td>
                  <td className="px-3 py-2.5">{row.status ?? '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{formatDate(row.lastDone)}</td>
                  <td
                    className={
                      isOverdue(row.nextDue)
                        ? 'px-3 py-2.5 font-medium text-destructive'
                        : 'px-3 py-2.5 text-muted-foreground'
                    }
                  >
                    {formatDate(row.nextDue)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">{row.notes ?? '—'}</td>
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
