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
import { useVisitVoiceNotes } from '@/features/scheduling/hooks/useVisitVoiceNotes'
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
  resolveVisitMedicationRound,
  type VisitMedicationRound,
} from '@/features/scheduling/utils/visit-medication-round.util'
import {
  filterCompartmentsForVisitWindow,
  marRowMatchesVisitWindow,
} from '@/features/scheduling/utils/visit-medication-window.util'
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
  visitWindowStartHm,
  visitWindowEndHm,
  onViewRecord,
}: {
  serviceUserId: string
  pack: MedicationPackRow
  visitDate: string
  canRecord: boolean
  chartMedications: MarChartMedicationRow[]
  visitRound: VisitMedicationRound | null
  visitWindowStartHm?: string | null
  visitWindowEndHm?: string | null
  onViewRecord: (recordId: string, medLabel: string) => void
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
  const compartments = React.useMemo(() => {
    if (visitWindowStartHm && visitWindowEndHm) {
      return filterCompartmentsForVisitWindow(allCompartments, visitWindowStartHm, visitWindowEndHm)
    }
    return filterCompartmentsForVisitRound(allCompartments, visitRound)
  }, [allCompartments, visitRound, visitWindowStartHm, visitWindowEndHm])
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
    return (
      <p className="text-sm text-muted-foreground">
        No pack compartment due in this visit window for {pack.name}.
      </p>
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
                    onViewRecord={onViewRecord}
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
  onViewRecord,
}: {
  member: MedicationPackMemberRow
  compartment: MedicationPackCompartmentRow
  visitDate: string
  chartRows: MarChartMedicationRow[]
  onViewRecord: (recordId: string, medLabel: string) => void
}) {
  const med = member.serviceUserMedication
  const medLabel = med?.medicationName ?? 'Medicine'
  const chartRow = findChartRow(chartRows, member.serviceUserMedicationId, compartment.dueTime)
  const cell = chartCellForVisitDate(chartRow, visitDate)
  const recordId = cell?.cellState === 'recorded' ? cell.recordId : null

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      {recordId ? (
        <button
          type="button"
          className="shrink-0 border-0 bg-transparent p-0"
          onClick={() => onViewRecord(recordId, medLabel)}
          aria-label={`View ${medLabel} record details`}
        >
          <MarStatusChip cell={cell} />
        </button>
      ) : (
        <MarStatusChip cell={cell} fallbackDue={!cell} />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{medLabel}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[med?.strength, med?.dose].filter(Boolean).join(' · ')}
        </p>
        {recordId ? (
          <button
            type="button"
            className="mt-1 border-0 bg-transparent p-0 text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
            onClick={() => onViewRecord(recordId, medLabel)}
          >
            Recorded — tap to view details
          </button>
        ) : cell?.cellState === 'recorded' ? (
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
  // A record exists (scheduled 'recorded' cell OR a recorded PRN dose) → viewable.
  const recordId = cell.recordId ?? null
  const interactive = Boolean(recordId) || cell.cellState === 'due'

  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <button
        type="button"
        disabled={!interactive}
        className="shrink-0 border-0 bg-transparent p-0 disabled:opacity-60"
        onClick={() => {
          if (recordId) onView(slot)
          else if (cell.cellState === 'due' && canRecord) onRecord(slot)
        }}
      >
        <MarStatusChip cell={cell} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{row.medicationName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[row.strength, row.dose, row.dueTime].filter(Boolean).join(' · ')}
        </p>
        {recordId ? (
          <button
            type="button"
            className="mt-1 border-0 bg-transparent p-0 text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
            onClick={() => onView(slot)}
          >
            Recorded — tap to view details
          </button>
        ) : null}
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
  visitId,
  medicationRoundCode,
  medicationRoundLabel,
  visitWindowStartHm,
  visitWindowEndHm,
  jobId,
}: {
  serviceUserId: string
  visitDate: string
  /** ScheduledVisit id — scopes PRN "recorded" status to THIS visit. */
  visitId?: string | null
  /** From visit plan — label only; med matching uses visit window when provided. */
  medicationRoundCode?: string | null
  medicationRoundLabel?: string | null
  /** Visit planned/scheduled window (HH:mm) — meds match when dueTime is inside. */
  visitWindowStartHm?: string | null
  visitWindowEndHm?: string | null
  /** Scheduled job id — loads the carer's medication voice notes for the record drawer. */
  jobId?: string | null
}) {
  const voiceNoteLookup = useVisitVoiceNotes(jobId)
  const normalizedDate = normalizeVisitDate(visitDate)
  const visitRound = React.useMemo(
    () => resolveVisitMedicationRound(medicationRoundCode, medicationRoundLabel),
    [medicationRoundCode, medicationRoundLabel],
  )
  const hasVisitWindow = Boolean(visitWindowStartHm?.trim() && visitWindowEndHm?.trim())
  const permissions = useAuthStore(s => s.user?.permissions) as string[] | undefined
  const canRecord = (permissions ?? []).some(p =>
    ['service_users.medications.administer', 'service_users.update'].includes(p),
  )

  const month = visitDateChartMonth(normalizedDate)
  // Scope PRN "recorded" status to THIS visit so a PRN given in another
  // same-day visit doesn't show as already given here.
  const chartQuery = useMedicationRegularChart(serviceUserId, {
    month,
    prnVisitId: visitId ?? undefined,
  })
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

  // Scheduled standalone (non-PRN) medicines — filtered to this visit's clock window.
  const standaloneSlots = React.useMemo(() => {
    if (!chartMedications.length) return []
    const { standaloneRows } = splitPackAndStandaloneRows(chartMedications)
    const scheduled = standaloneRows.filter(r => r.scheduleType !== 'prn')
    const slots = collectVisitDateMarSlots(scheduled, normalizedDate)
    if (hasVisitWindow) {
      return slots.filter(s =>
        marRowMatchesVisitWindow(s.row, visitWindowStartHm, visitWindowEndHm),
      )
    }
    return []
  }, [chartMedications, normalizedDate, hasVisitWindow, visitWindowStartHm, visitWindowEndHm])

  // PRN (as-needed) medicines are NOT tied to a round — always surface them for
  // the visit date so a carer's PRN dose is visible/recordable in any visit.
  const prnSlots = React.useMemo(() => {
    if (!chartMedications.length) return []
    const { standaloneRows } = splitPackAndStandaloneRows(chartMedications)
    const prnRows = standaloneRows.filter(r => r.scheduleType === 'prn')
    return collectVisitDateMarSlots(prnRows, normalizedDate)
  }, [chartMedications, normalizedDate])

  const visitSlots = React.useMemo(() => {
    const scheduled = chartMedications.filter(r => r.scheduleType !== 'prn')
    const slots = collectVisitDateMarSlots(scheduled, normalizedDate)
    if (hasVisitWindow) {
      return slots.filter(s =>
        marRowMatchesVisitWindow(s.row, visitWindowStartHm, visitWindowEndHm),
      )
    }
    return []
  }, [chartMedications, normalizedDate, hasVisitWindow, visitWindowStartHm, visitWindowEndHm])

  const summary = React.useMemo(
    () => summarizeVisitDateMarSlots([...visitSlots, ...prnSlots]),
    [visitSlots, prnSlots],
  )

  const hasActivePacks = activePacks.length > 0
  const empty =
    !hasActivePacks &&
    standaloneSlots.length === 0 &&
    prnSlots.length === 0 &&
    visitSlots.length === 0

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
            {hasVisitWindow ? (
              <p className="mt-1 text-xs font-medium text-teal-800 dark:text-teal-200">
                Doses due {visitWindowStartHm}–{visitWindowEndHm}
                {visitRound ? ` (${visitRound.name})` : ''}
              </p>
            ) : visitRound ? (
              <p className="mt-1 text-xs font-medium text-teal-800 dark:text-teal-200">
                {visitRound.name} — visit window missing; no scheduled doses matched
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
          {hasVisitWindow
            ? `No medicines due between ${visitWindowStartHm} and ${visitWindowEndHm} for this date.`
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
              visitWindowStartHm={visitWindowStartHm}
              visitWindowEndHm={visitWindowEndHm}
              onViewRecord={(recordId, medLabel) => {
                setDetailEventId(recordId)
                setDetailMedLabel(medLabel)
                setDetailOpen(true)
              }}
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

          {prnSlots.length > 0 ? (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">PRN / as-needed</h3>
                <Badge variant="secondary" size="sm">
                  As needed
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Given only when required — not tied to a scheduled round. Shows in every visit.
              </p>
              <ul className="space-y-2">
                {prnSlots.map(slot => (
                  <VisitStandaloneRow
                    key={`prn:${slot.row.medicationId}:${slot.row.scheduleId ?? 'default'}`}
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
        voiceNotes={voiceNoteLookup.forSource('medication', detailEventId)}
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
