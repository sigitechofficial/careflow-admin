import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardCheck, Clock, Loader2, Package, Pill } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/features/auth/store'
import { useMedicationRegularChart } from '@/features/service-users/hooks/useMedicationMarChart'
import { useMedicationPacks } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import {
  useMedicationPackCompartments,
  useMedicationPackMembers,
} from '@/features/service-users/hooks/useMedicationPackLifecycle'
import type { MarChartCell, MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import type {
  MedicationPackCompartmentRow,
  MedicationPackMemberRow,
  MedicationPackRow,
} from '@/features/service-users/types'
import {
  RecordAdministrationDialog,
  type RecordAdministrationTarget,
} from '@/features/service-users/medication/RecordAdministrationDialog'
import { RecordDetailDrawer } from '@/features/service-users/medication/RecordDetailDrawer'
import { CorrectRecordDialog } from '@/features/service-users/medication/CorrectRecordDialog'
import { MarLegendInline } from '@/features/service-users/medication/MarLegendInline'
import { PackRecordRoundDialog } from '@/features/service-users/medication/PackRecordRoundDialog'
import {
  cellDisplayLabel,
  marCellInnerClass,
  marCellInnerStyle,
} from '@/features/service-users/medication/mar-calendar-layout'
import {
  medMatchesCompartmentDueTime,
  normalizeTime,
} from '@/features/service-users/medication/blister-pack-wizard.utils'
import { splitPackAndStandaloneRows } from '@/features/service-users/medication/mar-pack-calendar-layout'
import {
  filterCompartmentsForVisitRound,
  marRowMatchesVisitRound,
  resolveVisitMedicationRound,
  type VisitMedicationRound,
} from '@/features/scheduling/utils/visit-medication-round.util'
import {
  chartCellForVisitDate,
  collectVisitDateMarSlots,
  normalizeVisitDate,
  summarizeVisitDateMarSlots,
  visitDateChartMonth,
  type VisitMarSlot,
} from '@/features/scheduling/utils/visit-mar-daily.util'
import '@/features/service-users/medication/mar-calendar.css'
import '@/features/service-users/medication/mar-record.css'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'

function formatVisitDateLabel(iso: string): string {
  return formatOrganisationIsoDateLong(normalizeVisitDate(iso))
}

function MarStatusChip({
  cell,
  fallbackDue = false,
}: {
  cell: MarChartCell | undefined
  fallbackDue?: boolean
}) {
  if (cell) {
    const label = cellDisplayLabel(cell)
    return (
      <span
        className={marCellInnerClass(cell)}
        style={marCellInnerStyle(cell)}
        title={cell.statusLabel ?? label}
      >
        {label}
      </span>
    )
  }
  if (fallbackDue) {
    return <span className="cell-inner cell-due px-2 py-0.5 text-xs font-semibold">Due</span>
  }
  return <span className="text-xs text-muted-foreground">—</span>
}

function findChartRow(
  chartRows: MarChartMedicationRow[],
  medicationId: string,
  dueTime: string,
): MarChartMedicationRow | undefined {
  const target = normalizeTime(dueTime)
  return chartRows.find(
    r => r.medicationId === medicationId && normalizeTime(r.dueTime) === target,
  )
}

function VisitBlisterPackCard({
  serviceUserId,
  pack,
  visitDate,
  canRecord,
  chartMedications,
  visitRound,
}: {
  serviceUserId: string
  pack: MedicationPackRow
  visitDate: string
  canRecord: boolean
  chartMedications: MarChartMedicationRow[]
  visitRound: VisitMedicationRound | null
}) {
  const compartmentsQuery = useMedicationPackCompartments(serviceUserId, pack.id)
  const membersQuery = useMedicationPackMembers(serviceUserId, pack.id)
  const [recordCompartment, setRecordCompartment] =
    React.useState<MedicationPackCompartmentRow | null>(null)

  const packChartRows = React.useMemo(
    () => chartMedications.filter(r => r.packName === pack.name),
    [chartMedications, pack.name],
  )

  const allCompartments = compartmentsQuery.data ?? []
  const compartments = React.useMemo(
    () => filterCompartmentsForVisitRound(allCompartments, visitRound),
    [allCompartments, visitRound],
  )
  const members = (membersQuery.data ?? []).filter(m => m.status === 'ACTIVE')
  const loading = compartmentsQuery.isLoading || membersQuery.isLoading

  const recordChartRows = React.useMemo(() => {
    if (!recordCompartment) return undefined
    const target = normalizeTime(recordCompartment.dueTime)
    return packChartRows.filter(r => normalizeTime(r.dueTime) === target)
  }, [recordCompartment, packChartRows])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading {pack.name}…
      </div>
    )
  }

  if (compartments.length === 0) {
    return visitRound ? (
      <p className="text-sm text-muted-foreground">
        No {visitRound.name} compartment in {pack.name} for this visit.
      </p>
    ) : (
      <p className="text-sm text-muted-foreground">No compartments defined for {pack.name}.</p>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Package className="h-4 w-4 text-teal-700" aria-hidden />
        <h3 className="text-sm font-semibold">{pack.name}</h3>
        <Badge variant="secondary" size="sm">
          Blister pack
        </Badge>
        {pack.roundLabel ? (
          <span className="text-xs text-muted-foreground">{pack.roundLabel}</span>
        ) : null}
      </div>

      {compartments.map(compartment => {
        const inSlot = members.filter(m =>
          medMatchesCompartmentDueTime(m.serviceUserMedication?.schedules, compartment.dueTime),
        )

        return (
          <div
            key={compartment.id}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden />
              <span className="text-sm font-semibold">{compartment.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{compartment.dueTime}</span>
              {(compartment.windowStart || compartment.windowEnd) && (
                <span className="text-xs text-muted-foreground">
                  ({compartment.windowStart ?? '—'}–{compartment.windowEnd ?? '—'})
                </span>
              )}
              <Badge variant="secondary" size="sm" className="ml-auto">
                {inSlot.length} medicine{inSlot.length !== 1 ? 's' : ''}
              </Badge>
              {canRecord && pack.status === 'ACTIVE' && inSlot.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 border-teal-200 text-teal-800 hover:bg-teal-50 dark:border-teal-900 dark:text-teal-200"
                  onClick={() => setRecordCompartment(compartment)}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                  Record round
                </Button>
              ) : null}
            </div>

            {inSlot.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No medicines scheduled for this slot.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {inSlot.map(member => (
                  <VisitPackMemberRow
                    key={member.id}
                    member={member}
                    compartment={compartment}
                    visitDate={visitDate}
                    chartRows={packChartRows}
                  />
                ))}
              </ul>
            )}
          </div>
        )
      })}

      <PackRecordRoundDialog
        open={recordCompartment != null}
        onOpenChange={open => !open && setRecordCompartment(null)}
        serviceUserId={serviceUserId}
        pack={pack}
        compartment={recordCompartment}
        defaultDate={normalizeVisitDate(visitDate)}
        chartMonth={visitDateChartMonth(visitDate)}
        chartRows={recordChartRows}
      />
    </section>
  )
}

function VisitPackMemberRow({
  member,
  compartment,
  visitDate,
  chartRows,
}: {
  member: MedicationPackMemberRow
  compartment: MedicationPackCompartmentRow
  visitDate: string
  chartRows: MarChartMedicationRow[]
}) {
  const med = member.serviceUserMedication
  const chartRow = findChartRow(chartRows, member.serviceUserMedicationId, compartment.dueTime)
  const cell = chartCellForVisitDate(chartRow, visitDate)

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <MarStatusChip cell={cell} fallbackDue={!cell} />
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{med?.medicationName ?? 'Medicine'}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[med?.strength, med?.dose].filter(Boolean).join(' · ')}
        </p>
        {cell?.cellState === 'recorded' ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Recorded — use Record round to change status
          </p>
        ) : (
          <p className="mt-1 text-xs text-teal-700">Use Record round to mark given / not given</p>
        )}
      </div>
    </li>
  )
}

function VisitStandaloneRow({
  slot,
  canRecord,
  onRecord,
  onView,
}: {
  slot: VisitMarSlot
  canRecord: boolean
  onRecord: (slot: VisitMarSlot) => void
  onView: (slot: VisitMarSlot) => void
}) {
  const { row, cell } = slot
  const interactive = cell.cellState === 'due' || cell.cellState === 'recorded'

  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <button
        type="button"
        disabled={!interactive}
        className="shrink-0 border-0 bg-transparent p-0 disabled:opacity-60"
        onClick={() => {
          if (cell.cellState === 'due' && canRecord) onRecord(slot)
          else if (cell.cellState === 'recorded') onView(slot)
        }}
      >
        <MarStatusChip cell={cell} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{row.medicationName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[row.strength, row.dose, row.dueTime].filter(Boolean).join(' · ')}
        </p>
      </div>
      {cell.cellState === 'due' && canRecord ? (
        <Button type="button" size="sm" variant="outline" className="h-7 shrink-0" onClick={() => onRecord(slot)}>
          Record
        </Button>
      ) : null}
    </li>
  )
}

export function VisitMedicationPanel({
  serviceUserId,
  visitDate,
  medicationRoundCode,
  medicationRoundLabel,
}: {
  serviceUserId: string
  visitDate: string
  /** From visit plan — limits UI to this administration round only. */
  medicationRoundCode?: string | null
  medicationRoundLabel?: string | null
}) {
  const normalizedDate = normalizeVisitDate(visitDate)
  const visitRound = React.useMemo(
    () => resolveVisitMedicationRound(medicationRoundCode, medicationRoundLabel),
    [medicationRoundCode, medicationRoundLabel],
  )
  const permissions = useAuthStore(s => s.user?.permissions) as string[] | undefined
  const canRecord = (permissions ?? []).some(p =>
    ['service_users.medications.administer', 'service_users.update'].includes(p),
  )

  const month = visitDateChartMonth(normalizedDate)
  const chartQuery = useMedicationRegularChart(serviceUserId, { month })
  const packsQuery = useMedicationPacks(serviceUserId)
  const chart = chartQuery.data

  const activePacks = React.useMemo(
    () => (packsQuery.data ?? []).filter(p => p.status === 'ACTIVE'),
    [packsQuery.data],
  )

  const [recordTarget, setRecordTarget] = React.useState<RecordAdministrationTarget | null>(null)
  const [recordOpen, setRecordOpen] = React.useState(false)
  const [detailEventId, setDetailEventId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [correctOpen, setCorrectOpen] = React.useState(false)
  const [detailMedLabel, setDetailMedLabel] = React.useState('')

  const chartMedications = chart?.medications ?? []

  const standaloneSlots = React.useMemo(() => {
    if (!chartMedications.length) return []
    const { standaloneRows } = splitPackAndStandaloneRows(chartMedications)
    const slots = collectVisitDateMarSlots(standaloneRows, normalizedDate)
    if (!visitRound) return slots
    return slots.filter(s => marRowMatchesVisitRound(s.row, visitRound))
  }, [chartMedications, normalizedDate, visitRound])

  const visitSlots = React.useMemo(() => {
    const slots = collectVisitDateMarSlots(chartMedications, normalizedDate)
    if (!visitRound) return slots
    return slots.filter(s => marRowMatchesVisitRound(s.row, visitRound))
  }, [chartMedications, normalizedDate, visitRound])

  const summary = React.useMemo(() => summarizeVisitDateMarSlots(visitSlots), [visitSlots])

  const hasActivePacks = activePacks.length > 0
  const empty = !hasActivePacks && standaloneSlots.length === 0 && visitSlots.length === 0

  if (chartQuery.isLoading || packsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading medications for this visit…
      </div>
    )
  }

  if (chartQuery.isError) {
    return (
      <p className="py-6 text-sm text-destructive">
        Could not load medication chart. Try again or open the full MAR page.
      </p>
    )
  }

  return (
    <div className="visit-medication-panel mar-cal-root space-y-4">
      <section className="rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Medication for visit day</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatVisitDateLabel(normalizedDate)}</p>
            {visitRound ? (
              <p className="mt-1 text-xs font-medium text-teal-800 dark:text-teal-200">
                {visitRound.name} round only — matched from visit plan
                {visitRound.dueTime ? ` (${visitRound.dueTime})` : ''}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/service-users/$serviceUserId/medication" params={{ serviceUserId }}>
              Full MAR
            </Link>
          </Button>
        </div>
        {!empty ? (
          <div className="mar-summary-strip mt-3 !mb-0">
            <div className="mar-kpi kpi-due">
              <span className="mar-kpi-val">{summary.due}</span>
              <span className="mar-kpi-label">Due</span>
            </div>
            <div className="mar-kpi kpi-given">
              <span className="mar-kpi-val">{summary.recorded}</span>
              <span className="mar-kpi-label">Recorded</span>
            </div>
          </div>
        ) : null}
      </section>

      <MarLegendInline chart={chart} />

      {!canRecord ? (
        <p className="text-xs text-muted-foreground">View only — no administer permission</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Blister pack: use <strong>Record round</strong> to mark each medicine given, refused, or not given
          (same status codes as MAR).
        </p>
      )}

      {empty ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          <Pill className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden />
          {visitRound
            ? `No ${visitRound.name} medicines scheduled or recorded for this date.`
            : 'No active blister pack or scheduled doses for this date.'}
        </div>
      ) : (
        <>
          {activePacks.map(pack => (
            <VisitBlisterPackCard
              key={pack.id}
              serviceUserId={serviceUserId}
              pack={pack}
              visitDate={normalizedDate}
              canRecord={canRecord}
              chartMedications={chartMedications}
              visitRound={visitRound}
            />
          ))}

          {standaloneSlots.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Other medicines</h3>
              <ul className="space-y-2">
                {standaloneSlots.map(slot => (
                  <VisitStandaloneRow
                    key={`${slot.row.medicationId}:${slot.row.scheduleId ?? 'default'}`}
                    slot={slot}
                    canRecord={canRecord}
                    onRecord={s => {
                      setRecordTarget({ row: s.row, day: s.cell.day, date: s.cell.date })
                      setRecordOpen(true)
                    }}
                    onView={s => {
                      if (s.cell.recordId) {
                        setDetailEventId(s.cell.recordId)
                        setDetailMedLabel(s.row.medicationName)
                        setDetailOpen(true)
                      }
                    }}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <RecordAdministrationDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        serviceUserId={serviceUserId}
        target={recordTarget}
      />
      <RecordDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        serviceUserId={serviceUserId}
        eventId={detailEventId}
        onCorrect={() => {
          setDetailOpen(false)
          setCorrectOpen(true)
        }}
      />
      <CorrectRecordDialog
        open={correctOpen}
        onOpenChange={setCorrectOpen}
        serviceUserId={serviceUserId}
        eventId={detailEventId}
        medicationLabel={detailMedLabel}
        onCorrected={() => setDetailEventId(null)}
      />
    </div>
  )
}
