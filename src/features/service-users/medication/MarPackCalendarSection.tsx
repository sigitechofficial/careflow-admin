import * as React from 'react'
import { ChevronDown, Package } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { MarChartCell, MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import type { MedicationPackCompartmentRow, MedicationPackRow } from '@/features/service-users/types'
import type { MarCalendarFilters } from '@/features/service-users/medication/mar-calendar-filters'
import { MarGridCell } from '@/features/service-users/medication/MarGridCell'
import { chartRowMissingBodyMapSite } from '@/features/service-users/medication/mar-body-map-site-hint'
import {
  formatTimeSlotDisplay,
  formatTimeSlotSubline,
  isMarSlotOverdue,
  medicationMetaLine,
  cellDisplayLabel,
  scheduleChipClass,
  scheduleChipLabel,
} from '@/features/service-users/medication/mar-calendar-layout'
import {
  aggregateCompartmentDayCell,
  buildPackCompartments,
  compartmentAggregateCellStyle,
  compartmentCollapsedHeadline,
  compartmentKey,
  compartmentMedicineContentsLine,
  compartmentStatusPill,
  showCompartmentStatusPill,
  compartmentSummaryDisplayCode,
  daysUntil,
  formatShortDate,
  isCompartmentPartialRound,
  packCompartmentMetaLine,
  summarizeCompartmentDay,
  type CompartmentAggregateCell,
  type MarCalendarPackBundle,
  type MarPackCompartmentSlice,
} from '@/features/service-users/medication/mar-pack-calendar-layout'
import { useMedicationPackCompartments, useMedicationPackDeliveries } from '@/features/service-users/hooks/useMedicationPackLifecycle'
import { PackRecordRoundDialog } from '@/features/service-users/medication/PackRecordRoundDialog'
import { PackCompartmentRoundSheet } from '@/features/service-users/medication/PackCompartmentRoundSheet'

function MarCompartmentAggregateCell({
  aggregate,
  isTodayCol,
  onDayClick,
}: {
  aggregate: CompartmentAggregateCell
  isTodayCol: boolean
  onDayClick?: () => void
}) {
  const label =
    aggregate.kind === 'uniform'
      ? cellDisplayLabel(aggregate.cell)
      : compartmentSummaryDisplayCode(aggregate)
  const title =
    aggregate.kind === 'partial'
      ? aggregate.tooltip
      : aggregate.kind === 'uniform'
        ? (aggregate.cell.statusLabel ?? label)
        : undefined
  const interactive =
    aggregate.kind === 'due' ||
    aggregate.kind === 'partial' ||
    aggregate.kind === 'uniform'

  return (
    <td
      className={[
        'mar-cell',
        'comp-cell-expandable',
        'comp-day-summary-cell',
        isTodayCol ? 'col-today' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={compartmentAggregateCellStyle(aggregate)}
      title={title}
    >
      {interactive ? (
        <button
          type="button"
          onClick={onDayClick}
          className="h-full w-full border-0 bg-transparent p-0 cursor-pointer font-bold"
        >
          {label}
        </button>
      ) : (
        <span className="font-bold">{label}</span>
      )}
    </td>
  )
}

export function MarPackCalendarSection({
  serviceUserId,
  bundle,
  pack,
  month,
  visibleDays,
  todayDay,
  todayDate,
  colSpan,
  filters,
  packCollapsed,
  collapsedCompartments,
  onTogglePack,
  onToggleCompartment,
  onOpenCell,
  bodyMapSiteByMedId,
}: {
  serviceUserId: string
  bundle: MarCalendarPackBundle
  pack: MedicationPackRow | null
  month: string
  visibleDays: number[]
  todayDay: number | null
  todayDate: string | null
  colSpan: number
  filters: MarCalendarFilters
  packCollapsed: boolean
  collapsedCompartments: Set<string>
  onTogglePack: () => void
  onToggleCompartment: (dueTime: string) => void
  onOpenCell: (row: MarChartMedicationRow, cell: MarChartCell) => void
  bodyMapSiteByMedId: ReadonlyMap<string, unknown>
}) {
  const compartments = React.useMemo(() => buildPackCompartments(bundle.rows), [bundle.rows])
  const compartmentsQuery = useMedicationPackCompartments(serviceUserId, pack?.id ?? null, Boolean(pack?.id))
  const deliveriesQuery = useMedicationPackDeliveries(serviceUserId, pack?.id ?? null, Boolean(pack?.id))

  const [recordCompartment, setRecordCompartment] = React.useState<MedicationPackCompartmentRow | null>(null)
  const [recordChartRows, setRecordChartRows] = React.useState<MarChartMedicationRow[] | undefined>()
  const [recordDate, setRecordDate] = React.useState<string | undefined>()
  const [roundSheet, setRoundSheet] = React.useState<{
    comp: MarPackCompartmentSlice
    day: number
    date: string
    aggregate: CompartmentAggregateCell
  } | null>(null)

  const compartmentByTime = React.useMemo(() => {
    const map = new Map<string, MedicationPackCompartmentRow>()
    for (const c of compartmentsQuery.data ?? []) {
      map.set(c.dueTime, c)
    }
    return map
  }, [compartmentsQuery.data])

  const latestDelivery = deliveriesQuery.data?.[0]
  const daysLeft = daysUntil(pack?.endDate)
  const metaParts = [
    packCompartmentMetaLine(compartments) + ' medicines',
    pack?.pharmacyName,
  ].filter(Boolean)

  const todayBanner = React.useMemo(() => {
    if (todayDay == null) return null
    for (const comp of compartments) {
      const counts = summarizeCompartmentDay(comp.rows, todayDay)
      if (counts.scheduled === 0) continue
      const headline = compartmentCollapsedHeadline(counts)
      if (
        counts.due === counts.scheduled ||
        isCompartmentPartialRound(counts) ||
        (counts.due > 0 && counts.recorded > 0)
      ) {
        const dateLabel = todayDate ? formatShortDate(todayDate) ?? `Day ${todayDay}` : `Day ${todayDay}`
        const partial = isCompartmentPartialRound(counts)
        return {
          text: `${dateLabel} ${comp.roundName.toLowerCase()}: ${partial ? 'partial' : 'open'} — ${headline.text}`,
          partial,
        }
      }
    }
    return null
  }, [compartments, todayDay, todayDate])

  const openRecordDialog = (dueTime: string, date?: string, chartRows?: MarChartMedicationRow[]) => {
    const compartment = compartmentByTime.get(dueTime)
    const comp = compartments.find(c => c.dueTime === dueTime)
    if (compartment && pack) {
      setRecordChartRows(chartRows ?? comp?.rows)
      setRecordDate(date ?? todayDate ?? undefined)
      setRecordCompartment(compartment)
    }
  }

  const handleCollapsedCompartmentDayClick = (
    comp: MarPackCompartmentSlice,
    day: number,
    aggregate: CompartmentAggregateCell,
  ) => {
    const sampleCell = comp.rows[0]?.days.find(c => c.day === day)
    const date = sampleCell?.date ?? `${month}-${String(day).padStart(2, '0')}`

    if (aggregate.kind === 'due') {
      openRecordDialog(comp.dueTime, date, comp.rows)
      return
    }

    if (aggregate.kind === 'partial' || aggregate.kind === 'uniform') {
      setRoundSheet({ comp, day, date, aggregate })
    }
  }

  return (
    <>
      <tr className={`med-group-row mar-med-card-start mar-pack-group${packCollapsed ? ' is-collapsed' : ''}`}>
        <td colSpan={colSpan}>
          <div
            className="med-group-header mar-pack-group-header"
            role="button"
            tabIndex={0}
            onClick={onTogglePack}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onTogglePack()
              }
            }}
          >
            <button
              type="button"
              className="group-collapse-btn"
              aria-expanded={!packCollapsed}
              aria-label={packCollapsed ? 'Expand pack' : 'Collapse pack'}
              onMouseDown={e => e.preventDefault()}
              onClick={e => {
                e.stopPropagation()
                onTogglePack()
              }}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <Package className="h-3.5 w-3.5 shrink-0 text-[#6d28d9]" aria-hidden />
            <span className="group-title">{bundle.packName}</span>
            {pack && (
              <span className="pack-badge">
                Cycle {pack.cycleNumber} · {pack.status}
              </span>
            )}
            {metaParts.length > 0 && <span className="group-meta">{metaParts.join(' · ')}</span>}
            <span className="schedule-chip schedule-chip-daily">Daily</span>
            {todayBanner && (
              <span className={`round-context-banner${todayBanner.partial ? ' partial' : ''}`}>
                {todayBanner.text}
              </span>
            )}
            <div className="group-stats">
              {daysLeft != null && pack?.endDate && (
                <span>
                  Pack <strong>{daysLeft} days</strong> left
                </span>
              )}
              {latestDelivery?.receivedAt && (
                <span>
                  Delivery <strong>{formatShortDate(latestDelivery.receivedAt)}</strong>
                </span>
              )}
              {pack?.endDate && (
                <span>
                  Cycle ends <strong>{formatShortDate(pack.endDate)}</strong>
                </span>
              )}
            </div>
            <div className="group-header-actions">
              <Link
                to="/service-users/$serviceUserId/medication"
                params={{ serviceUserId }}
                search={{ view: 'packs' }}
                className="bp-mar-header-link"
                onClick={e => e.stopPropagation()}
              >
                Manage pack
              </Link>
            </div>
          </div>
        </td>
      </tr>

      {!packCollapsed &&
        compartments.map(comp => {
          const compKey = compartmentKey(bundle.packName, comp.dueTime)
          const collapsed = collapsedCompartments.has(compKey)
          const todayCounts = todayDay != null ? summarizeCompartmentDay(comp.rows, todayDay) : null
          const todayHeadline = todayCounts ? compartmentCollapsedHeadline(todayCounts) : null
          const todayPill = todayCounts ? compartmentStatusPill(todayCounts) : null
          const progressPct =
            todayCounts && todayCounts.scheduled
              ? Math.round((todayCounts.recorded / todayCounts.scheduled) * 100)
              : 0
          const canMarkAll =
            todayCounts != null &&
            todayCounts.scheduled > 0 &&
            (todayCounts.due > 0 || todayCounts.R > 0 || todayCounts.N > 0 || todayCounts.U > 0)

          return (
            <React.Fragment key={compKey}>
              {!collapsed && (
                <tr className="bp-compartment-header-row">
                  <td colSpan={colSpan}>
                    <div className="bp-compartment-label-row">
                      <button
                        type="button"
                        className="bp-comp-collapse-btn"
                        aria-expanded
                        aria-label={`Collapse ${comp.roundName} compartment`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => onToggleCompartment(comp.dueTime)}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <div className="bp-compartment-header-body">
                        <strong>
                          {comp.emoji} {comp.roundName} compartment
                        </strong>
                        <span className="bp-comp-header-meta">
                          {comp.rows.length} medicines
                          {todayHeadline ? ` · today: ${todayHeadline.text}` : ''}
                        </span>
                        {showCompartmentStatusPill(todayPill) && (
                          <span className={`bp-comp-status-pill ${todayPill.tone}`}>
                            {todayPill.label === 'PR'
                              ? 'PR · Partial round'
                              : `${todayPill.icon} ${todayPill.label}`}
                          </span>
                        )}
                        <div className="bp-compartment-progress">
                          <div
                            className={`bp-compartment-progress-fill${todayCounts?.R && todayCounts.recorded === todayCounts.scheduled ? ' partial' : ''}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          className="bp-mar-mark-all-btn"
                          disabled={!canMarkAll || !pack}
                          onClick={() => openRecordDialog(comp.dueTime, todayDate ?? undefined, comp.rows)}
                        >
                          {todayCounts?.due === todayCounts?.scheduled
                            ? `Mark all ${todayCounts?.scheduled ?? comp.rows.length} given`
                            : todayCounts && todayCounts.due > 0
                              ? `Mark ${todayCounts.due} due as given`
                              : `Mark all ${comp.rows.length} given`}
                        </button>
                        <button
                          type="button"
                          className="bp-mar-exceptions-btn"
                          disabled={!pack}
                          onClick={() => openRecordDialog(comp.dueTime)}
                        >
                          Exceptions…
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {collapsed && (
                <tr className="bp-compartment-summary-row is-visible is-collapsed">
                  <td className="sticky-col bp-comp-summary-sticky-band" colSpan={2}>
                    <div className="bp-comp-summary-band">
                      <div className="med-label-cell bp-comp-summary-label">
                        <button
                          type="button"
                          className="bp-comp-collapse-btn is-collapsed"
                          aria-expanded={false}
                          aria-label={`Expand ${comp.roundName} compartment`}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => onToggleCompartment(comp.dueTime)}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <div className="bp-comp-summary-text">
                          <div className="med-label-head">
                            <div className="med-name">{comp.label}</div>
                            {showCompartmentStatusPill(todayPill) && (
                              <span className={`bp-comp-status-pill ${todayPill.tone}`}>
                                {todayPill.icon} {todayPill.label}
                              </span>
                            )}
                          </div>
                          <div className="med-meta">{compartmentMedicineContentsLine(comp.rows)}</div>
                        </div>
                      </div>
                      <div className="bp-comp-summary-time-side">
                        <div className="time-slot-label">
                          {comp.emoji ? `${comp.emoji} ` : ''}
                          {comp.roundName}
                        </div>
                        <div className="time-slot-time">{comp.dueTime}</div>
                      </div>
                    </div>
                  </td>
                  {visibleDays.map(d => {
                    const aggregate = aggregateCompartmentDayCell(comp.rows, d, todayDay)
                    return (
                      <MarCompartmentAggregateCell
                        key={d}
                        aggregate={aggregate}
                        isTodayCol={d === todayDay}
                        onDayClick={() => handleCollapsedCompartmentDayClick(comp, d, aggregate)}
                      />
                    )
                  })}
                </tr>
              )}

              {!collapsed &&
                comp.rows.map((row, rowIndex) => {
                  const group = bundle.medicationGroups.find(g => g.medicationId === row.medicationId)
                  const meta = group ? medicationMetaLine(group) : null
                  const slotSubline = formatTimeSlotSubline(row)
                  return (
                    <tr
                      key={`${row.medicationId}:${row.scheduleId ?? rowIndex}`}
                      className={[
                        'mar-slot-row pack-member-row',
                        rowIndex === comp.rows.length - 1 ? 'mar-med-card-end' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-slot={comp.dueTime}
                    >
                      <td className="sticky-col">
                        <div className="med-label-cell">
                          <div className="med-label-head">
                            <div className="med-name">{row.medicationName}</div>
                            {group && (
                              <span className={scheduleChipClass(group.scheduleType)}>
                                {scheduleChipLabel(group.scheduleType)}
                              </span>
                            )}
                          </div>
                          {meta && <div className="med-meta">{meta}</div>}
                        </div>
                      </td>
                      <td className="time-slot-cell">
                        <div className="time-slot-label">{formatTimeSlotDisplay(row).label}</div>
                        {slotSubline && <div className="time-slot-time">{slotSubline}</div>}
                        {row.dose && <div className="time-slot-dose">{row.dose}</div>}
                      </td>
                      {visibleDays.map(d => {
                        const cell = row.days.find(c => c.day === d)
                        if (!cell) return <td key={d} className="mar-col-hidden" />
                        const slotOverdue =
                          d === todayDay && cell.cellState === 'due' && isMarSlotOverdue(row)
                        return (
                          <MarGridCell
                            key={d}
                            cell={cell}
                            filters={filters}
                            isTodayCol={d === todayDay}
                            isOverdue={slotOverdue}
                            missingBodyMapSite={chartRowMissingBodyMapSite(row, bodyMapSiteByMedId)}
                            onClick={() => onOpenCell(row, cell)}
                          />
                        )
                      })}
                    </tr>
                  )
                })}
            </React.Fragment>
          )
        })}

      {pack && roundSheet && (
        <PackCompartmentRoundSheet
          open={roundSheet != null}
          onOpenChange={o => !o && setRoundSheet(null)}
          serviceUserId={serviceUserId}
          packName={pack.name}
          compartment={compartmentByTime.get(roundSheet.comp.dueTime) ?? null}
          roundName={roundSheet.comp.roundName}
          dueTime={roundSheet.comp.dueTime}
          date={roundSheet.date}
          day={roundSheet.day}
          rows={roundSheet.comp.rows}
          aggregate={roundSheet.aggregate}
          onRecordRound={() =>
            openRecordDialog(roundSheet.comp.dueTime, roundSheet.date, roundSheet.comp.rows)
          }
          onOpenMedicine={onOpenCell}
        />
      )}

      {pack && (
        <PackRecordRoundDialog
          open={recordCompartment != null}
          onOpenChange={o => {
            if (!o) {
              setRecordCompartment(null)
              setRecordChartRows(undefined)
              setRecordDate(undefined)
            }
          }}
          serviceUserId={serviceUserId}
          pack={pack}
          compartment={recordCompartment}
          defaultDate={recordDate ?? todayDate ?? undefined}
          chartMonth={month}
          chartRows={recordChartRows}
        />
      )}
    </>
  )
}
