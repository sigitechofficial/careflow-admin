import { cn, formatDate as formatOrgDate } from '@/shared/lib/utils'
import {
  recordTypeLabel,
  type BodyMapRecordTypeCode,
} from '@/features/service-users/body-map/catalog/record-types'
import type { BodyMapRecordRow } from '@/features/service-users/body-map/types'

type Props = {
  records: BodyMapRecordRow[]
  selectedRecordId: string | null
  onSelect: (record: BodyMapRecordRow) => void
}

function formatDate(iso: string | null): string {
  return formatOrgDate(iso)
}

function riskBadgeClass(risk: string): string {
  switch (risk) {
    case 'URGENT':
      return 'bg-red-100 text-red-800'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800'
    case 'LOW':
      return 'bg-emerald-100 text-emerald-800'
    default:
      return 'bg-amber-100 text-amber-800'
  }
}

export function BodyMapRecordsTable({ records, selectedRecordId, onSelect }: Props) {
  if (records.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No active body map records. Use Add record and tap the diagram to place the first marker.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Type</th>
            <th className="px-3 py-2 font-semibold">Location</th>
            <th className="px-3 py-2 font-semibold">Risk</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Review due</th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => {
            const marker = r.markers[0]
            return (
              <tr
                key={r.id}
                className={cn(
                  'cursor-pointer border-b border-border/60 hover:bg-muted/40',
                  selectedRecordId === r.id && 'bg-indigo-50/80 dark:bg-indigo-950/30',
                )}
                onClick={() => onSelect(r)}
              >
                <td className="px-3 py-2.5 font-medium">
                  {recordTypeLabel(r.recordType as BodyMapRecordTypeCode)}
                  {r.subType ? (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {r.subType}
                    </span>
                  ) : null}
                  {r.medicationSite?.medicineNameSnapshot ? (
                    <span className="mt-0.5 block text-xs font-normal text-blue-800">
                      {r.medicationSite.medicineNameSnapshot}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {marker?.bodyPart ?? '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                      riskBadgeClass(r.riskLevel),
                    )}
                  >
                    {r.riskLevel}
                  </span>
                </td>
                <td className="px-3 py-2.5">{r.status.replace(/_/g, ' ')}</td>
                <td className="px-3 py-2.5">{formatDate(r.nextReviewAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
