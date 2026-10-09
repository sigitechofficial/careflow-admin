import * as React from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/data-table'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Textarea } from '@/shared/ui/form-field'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import {
  useDoseExceptions,
  useReviewDose,
  type DoseException,
  type DoseExceptionStatus,
} from '@/features/emar/hooks/useEmar'
import {
  EmptyRows,
  FilterChip,
  MedicationPageHeader,
  RangePicker,
  ServiceUserMedicationLink,
  formatDateTime,
  rangeFor,
  type RangePreset,
} from '@/features/emar/components/MedicationPageParts'

const STATUS_LABEL: Record<DoseExceptionStatus, string> = {
  MISSED: 'Missed',
  REFUSED: 'Refused',
  NOT_GIVEN: 'Not given',
  HELD: 'Held',
}
const STATUS_VARIANT: Record<DoseExceptionStatus, 'destructive' | 'warning' | 'secondary'> = {
  MISSED: 'destructive',
  NOT_GIVEN: 'destructive',
  REFUSED: 'warning',
  HELD: 'secondary',
}

/** Every missed, refused, not given or held dose across service users, with manager review. */
export default function MedicationExceptionsPage() {
  const { locationId } = useGlobalLocationScope()
  const can = useAuthStore((s) => s.can)
  const canReview = can('service_users.update')
  const [preset, setPreset] = React.useState<RangePreset>('7')
  const [status, setStatus] = React.useState<DoseExceptionStatus | undefined>()
  const [unreviewedOnly, setUnreviewedOnly] = React.useState(true)
  const [reviewing, setReviewing] = React.useState<DoseException | null>(null)

  const range = rangeFor(preset)
  const q = useDoseExceptions({ ...range, locationId, status, unreviewedOnly })
  const d = q.data
  const items = d?.items ?? []

  return (
    <div className="space-y-5" data-testid="medication-exceptions-page">
      <MedicationPageHeader
        title="Missed & refused doses"
        description="Doses that were due but not given as planned. Review each one and record what was done."
        illustration="pill"
      >
        <RangePicker value={preset} onChange={setPreset} />
      </MedicationPageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={!status} onClick={() => setStatus(undefined)} count={d?.total}>
          All
        </FilterChip>
        {(Object.keys(STATUS_LABEL) as DoseExceptionStatus[]).map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => setStatus(s)} count={d?.byStatus[s]}>
            {STATUS_LABEL[s]}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <FilterChip active={unreviewedOnly} onClick={() => setUnreviewedOnly((v) => !v)} count={d?.awaitingReview}>
          Not reviewed yet
        </FilterChip>
        {q.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" /> : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Due</TableHead>
              <TableHead>Service user</TableHead>
              <TableHead>Medicine</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Reason / notes</TableHead>
              <TableHead>Manager review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <EmptyRows colSpan={6} text="Loading doses…" />
            ) : items.length === 0 ? (
              <EmptyRows colSpan={6} text={unreviewedOnly ? 'Nothing waiting for review in this period.' : 'No missed or refused doses in this period.'} />
            ) : (
              items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(r.dueAt)}</TableCell>
                  <TableCell>
                    <ServiceUserMedicationLink id={r.serviceUserId}>{r.serviceUserName}</ServiceUserMedicationLink>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{r.medicationName}</span>
                      {r.timeCritical ? <Badge variant="info" size="sm">Time-critical</Badge> : null}
                      {r.controlled ? <Badge variant="warning" size="sm">Controlled</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]} size="sm">{STATUS_LABEL[r.status]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] text-muted-foreground">
                    {[r.reason, r.notes].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell>
                    {r.reviewed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400" title={r.reviewNotes ?? undefined}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Reviewed {formatDateTime(r.reviewedAt)}
                      </span>
                    ) : canReview ? (
                      <Button size="sm" variant="outline" onClick={() => setReviewing(r)}>
                        Mark reviewed
                      </Button>
                    ) : (
                      <span className="text-xs text-amber-700 dark:text-amber-400">Waiting for review</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {items.length >= 200 ? (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Showing the latest 200. Narrow the dates or filters to see more.</p>
        ) : null}
      </div>

      <ReviewDialog dose={reviewing} onClose={() => setReviewing(null)} />
    </div>
  )
}

function ReviewDialog({ dose, onClose }: { dose: DoseException | null; onClose: () => void }) {
  const review = useReviewDose()
  const [notes, setNotes] = React.useState('')
  React.useEffect(() => setNotes(''), [dose?.id])

  const submit = () => {
    if (!dose) return
    review.mutate(
      { serviceUserId: dose.serviceUserId, eventId: dose.id, notes },
      {
        onSuccess: () => {
          toastSuccess('Dose marked as reviewed')
          onClose()
        },
        onError: (e) => toastApiError(e, 'Could not mark the dose as reviewed'),
      },
    )
  }

  return (
    <Dialog open={!!dose} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Review dose</DialogTitle>
          <DialogDescription>
            {dose ? `${dose.medicationName} for ${dose.serviceUserName}, due ${formatDateTime(dose.dueAt)} (${STATUS_LABEL[dose.status].toLowerCase()}).` : null}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <label htmlFor="dose-review-notes" className="text-sm font-medium text-foreground">
            What was done? <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id="dose-review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="For example: GP contacted, dose given late with advice, family informed."
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={review.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={review.isPending}>
            {review.isPending ? 'Saving…' : 'Mark reviewed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
