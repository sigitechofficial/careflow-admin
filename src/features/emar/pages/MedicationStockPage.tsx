import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/data-table'
import { useStockMovements, type StockMovementType } from '@/features/emar/hooks/useEmar'
import {
  EmptyRows,
  FilterChip,
  MedicationPageHeader,
  RangePicker,
  ServiceUserMedicationLink,
  formatDateTime,
  personName,
  rangeFor,
  type RangePreset,
} from '@/features/emar/components/MedicationPageParts'

const TYPE_LABEL: Record<StockMovementType, string> = {
  ADDED: 'Added',
  USED: 'Used',
  ADJUSTED: 'Adjusted',
  WASTED: 'Wasted',
}
const TYPE_VARIANT: Record<StockMovementType, 'success' | 'secondary' | 'info' | 'destructive'> = {
  ADDED: 'success',
  USED: 'secondary',
  ADJUSTED: 'info',
  WASTED: 'destructive',
}

/** Medication stock movements (received, used, adjusted, wasted) across all service users. */
export default function MedicationStockPage() {
  const [preset, setPreset] = React.useState<RangePreset>('30')
  const [type, setType] = React.useState<StockMovementType | undefined>()
  const q = useStockMovements(rangeFor(preset))
  const all = q.data ?? []
  const counts = React.useMemo(() => {
    const c: Record<StockMovementType, number> = { ADDED: 0, USED: 0, ADJUSTED: 0, WASTED: 0 }
    for (const r of all) c[r.movementType] = (c[r.movementType] ?? 0) + 1
    return c
  }, [all])
  const rows = type ? all.filter((r) => r.movementType === type) : all

  return (
    <div className="space-y-5" data-testid="medication-stock-page">
      <MedicationPageHeader
        title="Stock movements"
        description="Medication received, used, adjusted and wasted, so counts can be checked against the MAR."
        illustration="package"
      >
        <RangePicker value={preset} onChange={setPreset} />
      </MedicationPageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={!type} onClick={() => setType(undefined)} count={all.length}>
          All
        </FilterChip>
        {(Object.keys(TYPE_LABEL) as StockMovementType[]).map((t) => (
          <FilterChip key={t} active={type === t} onClick={() => setType(t)} count={counts[t]}>
            {TYPE_LABEL[t]}
          </FilterChip>
        ))}
        {q.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" /> : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Medicine</TableHead>
              <TableHead>Movement</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Recorded by</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <EmptyRows colSpan={6} text="Loading stock movements…" />
            ) : rows.length === 0 ? (
              <EmptyRows colSpan={6} text="No stock movements recorded in this period." />
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(r.movementDate)}</TableCell>
                  <TableCell>
                    {r.medication?.serviceUserId ? (
                      <ServiceUserMedicationLink id={r.medication.serviceUserId}>{r.medication.medicationName}</ServiceUserMedicationLink>
                    ) : (
                      r.medication?.medicationName ?? '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={TYPE_VARIANT[r.movementType]} size="sm">{TYPE_LABEL[r.movementType]}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{r.quantity !== null && r.quantity !== undefined ? `${Number(r.quantity)} ${r.unit ?? ''}`.trim() : '—'}</TableCell>
                  <TableCell>{personName(r.recordedBy)}</TableCell>
                  <TableCell className="max-w-[300px] text-muted-foreground">{r.notes || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {all.length >= 200 ? (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Showing the latest 200 movements. Narrow the dates to see older ones.</p>
        ) : null}
      </div>
    </div>
  )
}
