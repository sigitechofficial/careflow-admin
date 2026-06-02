import * as React from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { fetchBodyMapRecordCqcEvidence } from '@/features/service-users/body-map/api'
import { recordTypeLabel } from '@/features/service-users/body-map/catalog/record-types'
import type { BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'
import { formatGbDateTime } from '@/features/service-users/medication/medication-event-display'

type Props = {
  recordId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BodyMapRecordInspectionDialog({ recordId, open, onOpenChange }: Props) {
  const [data, setData] = React.useState<Awaited<
    ReturnType<typeof fetchBodyMapRecordCqcEvidence>
  > | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open || !recordId) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchBodyMapRecordCqcEvidence(recordId)
      .then(d => {
        if (!cancelled) setData(d)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, recordId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CQC inspection — record evidence</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading inspection view…
            </p>
          ) : data ? (
            <div className="space-y-4 text-sm">
              <p className="text-xs text-muted-foreground">
                {data.serviceUser?.name} · generated {formatGbDateTime(data.generatedAt)}
              </p>
              <section>
                <h3 className="font-semibold">
                  {recordTypeLabel(data.record.recordType as BodyMapRecordTypeCode)}
                  {data.record.subType ? ` · ${data.record.subType}` : ''}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Risk {data.record.riskLevel} · {data.record.status}
                </p>
                {data.record.description ? (
                  <p className="mt-2 whitespace-pre-wrap">{data.record.description}</p>
                ) : null}
              </section>
              {data.outstandingGaps.length > 0 ? (
                <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs">
                  <p className="font-semibold text-amber-950">Gaps</p>
                  <ul className="mt-1 list-disc pl-4">
                    {data.outstandingGaps.map(g => (
                      <li key={g.code}>{g.message}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <section>
                <h4 className="font-semibold text-muted-foreground">Audit trail</h4>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
                  {data.auditTrail.map(e => (
                    <li key={e.id}>
                      {e.action} · {e.actorName ?? 'System'} ·{' '}
                      {formatGbDateTime(e.createdAt)}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
