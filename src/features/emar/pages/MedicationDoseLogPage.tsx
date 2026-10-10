import * as React from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/data-table'
import { useDoseReport } from '@/features/emar/hooks/useEmar'
import {
  EmptyRows,
  MedicationPageHeader,
  RangePicker,
  ServiceUserMedicationLink,
  formatDateTime,
  personName,
  serviceUserName,
  type RangePreset,
  rangeFor,
} from '@/features/emar/components/MedicationPageParts'

const PAGE_SIZE = 50

/** Given doses across all service users (`administered`) or only those given late (`late-administrations`). */
function DoseLog({ kind }: { kind: 'administered' | 'late-administrations' }) {
  const late = kind === 'late-administrations'
  const [preset, setPreset] = React.useState<RangePreset>(late ? '7' : 'today')
  const [page, setPage] = React.useState(1)
  React.useEffect(() => setPage(1), [preset])

  const q = useDoseReport(kind, { ...rangeFor(preset), page, limit: PAGE_SIZE })
  const rows = q.data?.rows ?? []
  const total = q.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const cols = 7

  return (
    <div className="space-y-5" data-testid={late ? 'medication-late-page' : 'medication-administered-page'}>
      <MedicationPageHeader
        title={late ? 'Late doses' : 'Administration log'}
        description={
          late
            ? 'Doses given later than allowed after their due time. Check time-critical medicines first.'
            : 'Every dose recorded as given, with who gave it, the support level and any witness.'
        }
        illustration={late ? 'alarm-clock' : 'clipboard'}
      >
        <RangePicker value={preset} onChange={setPreset} />
      </MedicationPageHeader>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {q.isLoading ? 'Loading…' : `${total.toLocaleString('en-GB')} ${late ? 'late dose' : 'dose'}${total === 1 ? '' : 's'}`}
          {q.isFetching && !q.isLoading ? <Loader2 className="ml-2 inline h-4 w-4 animate-spin" aria-label="Loading" /> : null}
        </span>
        {pages > 1 ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums">
              {page} / {pages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Due</TableHead>
              <TableHead>Given</TableHead>
              <TableHead>Service user</TableHead>
              <TableHead>Medicine</TableHead>
              <TableHead>{late ? 'Late by' : 'Dose'}</TableHead>
              <TableHead>Given by</TableHead>
              <TableHead>{late ? 'Notes' : 'Support / witness'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <EmptyRows colSpan={cols} text="Loading doses…" />
            ) : rows.length === 0 ? (
              <EmptyRows colSpan={cols} text={late ? 'No late doses in this period.' : 'No doses recorded in this period.'} />
            ) : (
              rows.map((r) => {
                const su = r.serviceUser
                const name = r.medicationNameSnapshot ?? r.medication?.medicationName ?? '—'
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{formatDateTime(r.scheduledDateTime)}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(r.actualDateTime)}</TableCell>
                    <TableCell>
                      {su?.id ? <ServiceUserMedicationLink id={su.id}>{serviceUserName(su)}</ServiceUserMedicationLink> : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{name}</span>
                        {r.isPrn ? <Badge variant="secondary" size="sm">PRN</Badge> : null}
                        {r.medication?.timeCritical ? <Badge variant="info" size="sm">Time-critical</Badge> : null}
                        {r.medication?.isControlledMedication ? <Badge variant="warning" size="sm">Controlled</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {late ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">{formatDelay(r.delayMinutes)}</span>
                      ) : (
                        r.doseGiven ?? r.doseSnapshot ?? '—'
                      )}
                    </TableCell>
                    <TableCell>{personName(r.administeredBy)}</TableCell>
                    <TableCell className="max-w-[260px] text-muted-foreground">
                      {late
                        ? r.notes || '—'
                        : [r.supportLevel, r.isPrn && r.prnReason ? `PRN: ${r.prnReason}` : null, r.witnessPresent ? `Witness: ${r.witnessName ?? 'yes'}` : null]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Covers all service users you can see. The branch filter does not apply to this report yet.</p>
    </div>
  )
}

function formatDelay(min?: number): string {
  if (min === undefined || min === null) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function MedicationAdministeredPage() {
  return <DoseLog kind="administered" />
}

export function MedicationLatePage() {
  return <DoseLog kind="late-administrations" />
}
