import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, MapPin, Package } from 'lucide-react'
import {
  currentMedicationChartMonth,
  formatChartMonthLabel,
  shiftMedicationChartMonth,
  useMedicationRegularChart,
} from '@/features/service-users/hooks/useMedicationMarChart'
import type { MedicationSupplySummary } from '@/features/service-users/api/medication-mar.api'
import {
  RecordAdministrationDialog,
  type RecordAdministrationTarget,
} from '@/features/service-users/medication/RecordAdministrationDialog'
import { RecordDetailDrawer } from '@/features/service-users/medication/RecordDetailDrawer'
import { RecordPrnDialog, type RecordPrnTarget } from '@/features/service-users/medication/RecordPrnDialog'
import { CorrectRecordDialog } from '@/features/service-users/medication/CorrectRecordDialog'
import { MarFiltersBar } from '@/features/service-users/medication/MarFiltersBar'
import { MarLegendPopover } from '@/features/service-users/medication/MarLegendPopover'
import { MarGridCell } from '@/features/service-users/medication/MarGridCell'
import { MarMedicationSupplyStats } from '@/features/service-users/medication/MarMedicationSupplyStats'
import {
  DEFAULT_MAR_FILTERS,
  getWeekDayRange,
  todayDayInMonth,
  type MarCalendarFilters,
} from '@/features/service-users/medication/mar-calendar-filters'
import {
  chartTodayColumnDay,
  collectDueTodaySlots,
  dayOfWeekLetter,
  formatTimeSlotDisplay,
  formatTimeSlotSubline,
  isMarSlotOverdue,
  countFilteredScheduleRows,
  groupMarRows,
  groupMatchesFilters,
  medicationMetaLine,
  scheduleChipClass,
  scheduleChipLabel,
} from '@/features/service-users/medication/mar-calendar-layout'
import { splitPackAndStandaloneRows, compartmentKey, buildPackCompartments } from '@/features/service-users/medication/mar-pack-calendar-layout'
import { MarPackCalendarSection } from '@/features/service-users/medication/MarPackCalendarSection'
import { useMedicationPacks } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { useMedicationBodyMapSiteIndex } from '@/features/service-users/body-map/hooks/useMedicationBodyMapSiteIndex'
import { chartRowMissingBodyMapSite } from '@/features/service-users/medication/mar-body-map-site-hint'
import type { MarChartCell, MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import type { MedicationPackRow } from '@/features/service-users/types'
import { formatDate } from '@/shared/lib/utils'
import './mar-calendar.css'

export function MarCalendarTab({ serviceUserId }: { serviceUserId: string }) {
  const [month, setMonth] = React.useState(currentMedicationChartMonth)
  const [viewMode, setViewMode] = React.useState<'month' | 'week'>('month')
  const [weekAnchor, setWeekAnchor] = React.useState(
    () => todayDayInMonth(currentMedicationChartMonth()) ?? 1,
  )
  const gridRef = React.useRef<HTMLDivElement>(null)
  const [statsOpen, setStatsOpen] = React.useState(false)
  const [filters, setFilters] = React.useState<MarCalendarFilters>(DEFAULT_MAR_FILTERS)
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set())
  const [collapsedPacks, setCollapsedPacks] = React.useState<Set<string>>(new Set())
  const [collapsedCompartments, setCollapsedCompartments] = React.useState<Set<string>>(new Set())
  const compartmentsInitialized = React.useRef(false)

  const packsQuery = useMedicationPacks(serviceUserId)
  const { byMedicationId: bodyMapSiteByMedId } = useMedicationBodyMapSiteIndex(serviceUserId)

  const [recordTarget, setRecordTarget] = React.useState<RecordAdministrationTarget | null>(null)
  const [recordOpen, setRecordOpen] = React.useState(false)
  const [prnTarget, setPrnTarget] = React.useState<RecordPrnTarget | null>(null)
  const [prnOpen, setPrnOpen] = React.useState(false)
  const [detailEventId, setDetailEventId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [correctOpen, setCorrectOpen] = React.useState(false)
  const [detailMedLabel, setDetailMedLabel] = React.useState('')

  const chartQuery = useMedicationRegularChart(serviceUserId, { month })
  const chart = chartQuery.data

  const supplyByMedId = React.useMemo(() => {
    const map = new Map<string, MedicationSupplySummary>()
    const fromChart = chart?.supplyByMedicationId ?? {}
    for (const [id, summary] of Object.entries(fromChart)) {
      map.set(id, summary)
    }
    return map
  }, [chart?.supplyByMedicationId])

  const todayDay = React.useMemo(
    () => chartTodayColumnDay(chart, month),
    [chart?.summary?.date, chart?.dayDates, month],
  )

  React.useEffect(() => {
    const td = chartTodayColumnDay(chart, month) ?? todayDayInMonth(month)
    if (td) setWeekAnchor(td)
  }, [month, chart?.summary?.date])

  const visibleDays = React.useMemo(() => {
    if (viewMode === 'week' && chart) {
      return getWeekDayRange(chart.lastDay, month, weekAnchor).days
    }
    if (chart) {
      return Array.from({ length: chart.lastDay }, (_, i) => i + 1)
    }
    return []
  }, [viewMode, chart?.lastDay, month, weekAnchor])

  const todayDate = chart?.summary?.date ?? null
  const dueTodaySlots = React.useMemo(
    () =>
      todayDate && chart?.medications
        ? collectDueTodaySlots(chart.medications, todayDate)
        : [],
    [chart?.medications, todayDate],
  )

  const todayColumnVisible =
    todayDay != null && (viewMode === 'month' || visibleDays.includes(todayDay))

  const overdueTodaySlots = React.useMemo(
    () => dueTodaySlots.filter(s => s.overdue),
    [dueTodaySlots],
  )

  const medicationGroups = React.useMemo(() => {
    if (!chart) return []
    const { standaloneRows } = splitPackAndStandaloneRows(chart.medications)
    return groupMarRows(standaloneRows).filter(group => groupMatchesFilters(group, filters))
  }, [chart, filters])

  const filteredPackBundles = React.useMemo(() => {
    if (!chart) return []
    const { packBundles } = splitPackAndStandaloneRows(chart.medications)
    return packBundles.filter(bundle =>
      bundle.medicationGroups.some(g => groupMatchesFilters(g, filters)),
    )
  }, [chart, filters])

  const packByName = React.useMemo(() => {
    const map = new Map<string, MedicationPackRow>()
    for (const p of packsQuery.data ?? []) {
      if (p.status === 'ACTIVE') map.set(p.name, p)
    }
    return map
  }, [packsQuery.data])

  React.useEffect(() => {
    if (compartmentsInitialized.current || !chart?.medications) return
    const { packBundles } = splitPackAndStandaloneRows(chart.medications)
    if (packBundles.length === 0) return
    compartmentsInitialized.current = true
    setCollapsedCompartments(prev => {
      const next = new Set(prev)
      for (const bundle of packBundles) {
        for (const comp of buildPackCompartments(bundle.rows)) {
          next.add(compartmentKey(bundle.packName, comp.dueTime))
        }
      }
      return next
    })
  }, [chart?.medications])

  const openCell = (row: MarChartMedicationRow, cell: MarChartCell) => {
    if (cell.cellState === 'due') {
      setRecordTarget({ row, day: cell.day, date: cell.date })
      setRecordOpen(true)
    } else if (cell.cellState === 'prn') {
      setPrnTarget({ row, day: cell.day, date: cell.date })
      setPrnOpen(true)
    } else if (cell.cellState === 'recorded' && cell.recordId) {
      setDetailEventId(cell.recordId)
      setDetailMedLabel(row.medicationName)
      setDetailOpen(true)
    }
  }

  const goToToday = () => {
    const m = currentMedicationChartMonth()
    setMonth(m)
    const td = todayDayInMonth(m)
    if (td) setWeekAnchor(td)
    setViewMode('month')
  }

  React.useLayoutEffect(() => {
    if (!todayDay || chartQuery.isLoading || !chart) return
    const header = gridRef.current?.querySelector(`th[data-day="${todayDay}"]`)
    header?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    // Only re-scroll when month/view/today column changes — not on collapse/filter UI updates.
  }, [todayDay, month, viewMode, weekAnchor, chartQuery.isLoading, chart?.lastDay, chart?.summary?.date])

  const toggleGroup = (medicationId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(medicationId)) next.delete(medicationId)
      else next.add(medicationId)
      return next
    })
  }

  const togglePack = (packName: string) => {
    setCollapsedPacks(prev => {
      const next = new Set(prev)
      if (next.has(packName)) next.delete(packName)
      else next.add(packName)
      return next
    })
  }

  const toggleCompartment = (packName: string, dueTime: string) => {
    const key = compartmentKey(packName, dueTime)
    setCollapsedCompartments(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const monthLabel = formatChartMonthLabel(month)
  const colSpan = 2 + visibleDays.length

  return (
    <div className="mar-cal-root">
      <div className="mar-cal-header-row">
        <div />
        <div className="mar-cal-header-actions">
          <div className="month-nav">
            <button
              type="button"
              className="month-btn"
              aria-label="Previous month"
              onClick={() => setMonth(m => shiftMedicationChartMonth(m, -1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="month-label">{monthLabel}</span>
            <button
              type="button"
              className="month-btn"
              aria-label="Next month"
              onClick={() => setMonth(m => shiftMedicationChartMonth(m, 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <MarLegendPopover chart={chart} />
        </div>
      </div>

      <MarFiltersBar chart={chart} filters={filters} onChange={setFilters} />

      {chart && (chart.medicationCount != null || chart.scheduleRowCount != null) && (
        <div className="mar-med-count-bar">
          <strong>{chart.medicationCount ?? medicationGroups.length}</strong> medications ·{' '}
          <strong>{chart.scheduleRowCount ?? countFilteredScheduleRows(medicationGroups)}</strong>{' '}
          administration rows this
          month
        </div>
      )}

      {chart?.summary && (
        <div className="mar-summary-strip">
          <div className="mar-kpi kpi-due">
            <span className="mar-kpi-val">{chart.summary.due}</span>
            <span className="mar-kpi-label">Due today</span>
          </div>
          <div className="mar-kpi kpi-given">
            <span className="mar-kpi-val">{chart.summary.recorded}</span>
            <span className="mar-kpi-label">Recorded today</span>
          </div>
          <div className="mar-kpi kpi-missed">
            <span className="mar-kpi-val">{chart.summary.missed}</span>
            <span className="mar-kpi-label">Missed today</span>
          </div>
          <div className="mar-kpi kpi-review">
            <span className="mar-kpi-val">{chart.summary.reviewToday}</span>
            <span className="mar-kpi-label">Review today</span>
          </div>
        </div>
      )}

      {dueTodaySlots.length > 0 && (
        <div
          className={`mar-due-today-alert${overdueTodaySlots.length > 0 ? ' has-overdue' : ''}`}
          role={overdueTodaySlots.length > 0 ? 'alert' : 'status'}
          aria-live={overdueTodaySlots.length > 0 ? 'assertive' : 'polite'}
        >
          <div className="mar-due-today-alert-head">
            <span className="mar-due-today-alert-title">
              {overdueTodaySlots.length === dueTodaySlots.length
                ? `${dueTodaySlots.length} dose${dueTodaySlots.length === 1 ? '' : 's'} overdue — administration window has passed`
                : overdueTodaySlots.length > 0
                  ? `${dueTodaySlots.length} still due today · ${overdueTodaySlots.length} overdue`
                  : `${dueTodaySlots.length} scheduled dose${dueTodaySlots.length === 1 ? '' : 's'} still due today`}
            </span>
            {!todayColumnVisible && (
              <button type="button" className="mar-due-today-goto" onClick={goToToday}>
                Show today on calendar
              </button>
            )}
          </div>
          <ul className="mar-due-today-list">
            {dueTodaySlots.map(slot => (
              <li
                key={`${slot.medicationId}:${slot.scheduleId ?? 'default'}`}
                className={slot.overdue ? 'is-overdue' : ''}
              >
                <strong>{slot.medicationName}</strong>
                <span>
                  {slot.timeSlotLabel}
                  {slot.dueTime ? ` · due ${slot.dueTime}` : ''}
                  {slot.roundWindow
                    ? slot.overdue
                      ? ` · window ended ${slot.roundWindow}`
                      : ` · window ${slot.roundWindow}`
                    : ''}
                </span>
                {chartRowMissingBodyMapSite(
                  {
                    medicationId: slot.medicationId,
                    type: chart?.medications.find(m => m.medicationId === slot.medicationId)?.type,
                    routeName: chart?.medications.find(m => m.medicationId === slot.medicationId)
                      ?.routeName,
                  },
                  bodyMapSiteByMedId,
                ) ? (
                  <span className="mar-due-today-missing-site">
                    <MapPin className="h-3 w-3" aria-hidden />
                    No body map site
                  </span>
                ) : null}
                {slot.isPatch ? (
                  <Link
                    to="/service-users/$serviceUserId/body-map"
                    params={{ serviceUserId }}
                    search={{ linkMedicationId: slot.medicationId }}
                    className="mar-due-today-patch-map"
                  >
                    <MapPin className="h-3 w-3" aria-hidden />
                    Open body map for patch change
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mar-due-today-hint">
            {overdueTodaySlots.length > 0 ? (
              <>
                Record as <strong>Given</strong>, <strong>Refused</strong>, <strong>Missed</strong>,
                or another code on today&apos;s column — do not leave as <strong>Due</strong> after
                the window.
              </>
            ) : (
              <>
                Click the yellow <strong>Due</strong> cell on today&apos;s column to record
                administration.
              </>
            )}
          </p>
        </div>
      )}

      <div className="mar-toolbar">
        <span className="sect-label">MAR Calendar — {monthLabel}</span>
        <div className="mar-toolbar-actions">
          <div className="mar-view-toggle" role="group" aria-label="Calendar view">
            <button
              type="button"
              className={`mar-view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              type="button"
              className={`mar-view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>
          <button type="button" className="filter-expand-btn" onClick={goToToday}>
            Go to today
          </button>
          <span className="mar-hint">Click any cell to view or record</span>
        </div>
      </div>

      {chart?.monthStats && (
        <div className={`mar-month-stats ${statsOpen ? 'expanded' : ''}`}>
          <button
            type="button"
            className="mar-month-stats-toggle"
            onClick={() => setStatsOpen(v => !v)}
          >
            Period statistics (to{' '}
            {chart.monthStats.completionThroughDate
              ? formatDate(`${chart.monthStats.completionThroughDate}T12:00:00Z`, { utc: true })
              : 'date'}
            )
            <span>{statsOpen ? '▲' : '▼'}</span>
          </button>
          <p className="mar-month-stats-hint px-3 pb-2 text-[11px] text-[#64748b] dark:text-slate-400">
            MAR completion = documented scheduled doses ÷ (documented + still open). PRN is
            reported separately. Aligns with CQC/NICE expectation that every scheduled dose is
            accounted for on the MAR.
          </p>
          <div className="mar-month-stats-body">
            <div className="mar-month-stat-card">
              <p>MAR completion</p>
              <p>
                {chart.monthStats.marCompletionPercent != null
                  ? `${chart.monthStats.marCompletionPercent}%`
                  : '—'}
              </p>
            </div>
            <div className="mar-month-stat-card">
              <p>Documented</p>
              <p>{chart.monthStats.documented}</p>
            </div>
            <div className="mar-month-stat-card">
              <p>Still open</p>
              <p>{chart.monthStats.stillOpen}</p>
            </div>
            <div className="mar-month-stat-card">
              <p>Given</p>
              <p>{chart.monthStats.given}</p>
            </div>
            <div className="mar-month-stat-card">
              <p>Not given</p>
              <p>{chart.monthStats.notGiven}</p>
            </div>
            <div className="mar-month-stat-card">
              <p>PRN given</p>
              <p>{chart.monthStats.prnAdministered}</p>
            </div>
          </div>
        </div>
      )}

      {chartQuery.isLoading && (
        <div className="flex items-center gap-2 py-12 text-sm text-[#64748b] dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading MAR calendar…
        </div>
      )}

      {chartQuery.error && !chartQuery.isLoading && (
        <p className="text-sm text-destructive" role="alert">
          {chartQuery.error instanceof Error ? chartQuery.error.message : 'Failed to load calendar'}
        </p>
      )}

      {chart && !chartQuery.isLoading && (
        <div className="mar-wrapper" ref={gridRef}>
          {viewMode === 'week' && !todayColumnVisible && todayDay != null && (
            <p className="mar-view-hint" role="note">
              Week view is not showing today (day {todayDay}). Use <strong>Go to today</strong> or switch
              to <strong>Month</strong> view to record doses due this morning.
            </p>
          )}
          <table className="mar-table">
            <colgroup>
              <col className="mar-col-sticky" />
              <col className="mar-col-time" />
              {visibleDays.map(d => (
                <col key={`col-${d}`} className="mar-col-day" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky-col">Medication</th>
                <th className="time-col">Time Slot</th>
                {visibleDays.map(d => {
                  const today = d === todayDay
                  return (
                    <th
                      key={`day-${d}`}
                      className={['day-header', today ? 'day-today-col' : '']
                        .filter(Boolean)
                        .join(' ')}
                      data-day={d}
                    >
                      <span className="day-header-num">{d}</span>
                      <span className="day-header-dow">{dayOfWeekLetter(month, d)}</span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filteredPackBundles.length === 0 && medicationGroups.length === 0 ? (
                <tr className="mar-empty-row">
                  <td colSpan={colSpan}>
                    No rows match filters. Clear filters or add medications on the Records tab.
                  </td>
                </tr>
              ) : (
                <>
                  {filteredPackBundles.map((bundle, packIndex) => (
                    <React.Fragment key={bundle.packName}>
                      {packIndex > 0 && (
                        <tr className="mar-med-gap" aria-hidden>
                          <td colSpan={colSpan} />
                        </tr>
                      )}
                      <MarPackCalendarSection
                        serviceUserId={serviceUserId}
                        bundle={bundle}
                        pack={packByName.get(bundle.packName) ?? null}
                        month={month}
                        visibleDays={visibleDays}
                        todayDay={todayDay}
                        todayDate={todayDate}
                        colSpan={colSpan}
                        filters={filters}
                        packCollapsed={collapsedPacks.has(bundle.packName)}
                        collapsedCompartments={collapsedCompartments}
                        onTogglePack={() => togglePack(bundle.packName)}
                        onToggleCompartment={dueTime => toggleCompartment(bundle.packName, dueTime)}
                        onOpenCell={openCell}
                        bodyMapSiteByMedId={bodyMapSiteByMedId}
                      />
                    </React.Fragment>
                  ))}
                  {filteredPackBundles.length > 0 && medicationGroups.length > 0 && (
                    <tr className="mar-med-gap" aria-hidden>
                      <td colSpan={colSpan} />
                    </tr>
                  )}
                  {medicationGroups.map((group, groupIndex) => {
                  const collapsed = collapsedGroups.has(group.medicationId)
                  const meta = medicationMetaLine(group)
                  const slotCount = group.slots.length
                  const isStatusShowcase = group.medicationName.includes('Atorvastatin')
                  const supplySummary = supplyByMedId.get(group.medicationId)

                  return (
                    <React.Fragment key={group.medicationId}>
                      {groupIndex > 0 && (
                        <tr className="mar-med-gap" aria-hidden>
                          <td colSpan={colSpan} />
                        </tr>
                      )}
                      <tr
                        className={`med-group-row mar-med-card-start${collapsed ? ' is-collapsed' : ''}`}
                      >
                        <td colSpan={colSpan}>
                          <div
                            className="med-group-header"
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleGroup(group.medicationId)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                toggleGroup(group.medicationId)
                              }
                            }}
                          >
                            <button
                              type="button"
                              className="group-collapse-btn"
                              aria-expanded={!collapsed}
                              aria-label={collapsed ? 'Expand medication' : 'Collapse medication'}
                              onClick={e => {
                                e.stopPropagation()
                                toggleGroup(group.medicationId)
                              }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            {group.packName ? (
                              <Package className="h-3.5 w-3.5 shrink-0 text-[#6d28d9]" aria-hidden />
                            ) : null}
                            <span className="group-title">{group.medicationName}</span>
                            {group.packName && (
                              <span className="pack-badge">Blister Pack · {group.packName}</span>
                            )}
                            {meta && <span className="group-meta">{meta}</span>}
                            {group.slots.some(row =>
                              chartRowMissingBodyMapSite(row, bodyMapSiteByMedId),
                            ) ? (
                              <span
                                className="mar-med-missing-site-badge"
                                title="Site-specific medicine without a body map site"
                              >
                                <MapPin className="h-3 w-3" aria-hidden />
                                No body site
                              </span>
                            ) : null}
                            <span className={scheduleChipClass(group.scheduleType)}>
                              {scheduleChipLabel(group.scheduleType)}
                            </span>
                            {isStatusShowcase && (
                              <span className="mar-showcase-hint">
                                Morning · days 1–14 · all MAR codes
                              </span>
                            )}
                            <div className="group-stats">
                              <MarMedicationSupplyStats summary={supplySummary} variant="header" />
                              <span>
                                <strong>{slotCount}</strong> time slot{slotCount === 1 ? '' : 's'}
                              </span>
                              {group.dose && (
                                <span>
                                  <strong>{group.dose}</strong>
                                  {group.routeName ? ` · ${group.routeName}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {!collapsed &&
                        group.slots.map((row, slotIndex) => (
                          <tr
                            key={`${row.medicationId}:${row.scheduleId ?? slotIndex}`}
                            className={[
                              'mar-slot-row',
                              slotIndex === slotCount - 1 ? 'mar-med-card-end' : '',
                              isStatusShowcase && slotIndex === 0 ? 'mar-status-showcase-row' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {slotIndex === 0 && (
                              <td className="sticky-col" rowSpan={slotCount}>
                                <div className="med-label-cell">
                                  <div className="med-label-head">
                                    <div className="med-name">{group.medicationName}</div>
                                    <span className={scheduleChipClass(group.scheduleType)}>
                                      {scheduleChipLabel(group.scheduleType)}
                                    </span>
                                  </div>
                                  {meta && <div className="med-meta">{meta}</div>}
                                  <MarMedicationSupplyStats summary={supplySummary} variant="label" />
                                  <div className="med-slot-count">
                                    {slotCount} time slot{slotCount === 1 ? '' : 's'}
                                  </div>
                                </div>
                              </td>
                            )}
                            {(() => {
                              const slotSubline = formatTimeSlotSubline(row)
                              const todayCell = todayDay
                                ? row.days.find(c => c.day === todayDay)
                                : undefined
                              const slotOverdue =
                                todayCell?.cellState === 'due' && isMarSlotOverdue(row)
                              return (
                                <td
                                  className={[
                                    'time-slot-cell',
                                    slotOverdue ? 'is-overdue' : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                >
                                  <div className="time-slot-label">
                                    {formatTimeSlotDisplay(row).label}
                                  </div>
                                  {slotSubline && (
                                    <div className="time-slot-time">{slotSubline}</div>
                                  )}
                                  {row.dose && (
                                    <div className="time-slot-dose">{row.dose}</div>
                                  )}
                                </td>
                              )
                            })()}
                            {visibleDays.map(d => {
                              const cell = row.days.find(c => c.day === d)
                              if (!cell) {
                                return <td key={d} className="mar-col-hidden" />
                              }
                              const slotOverdue =
                                d === todayDay &&
                                cell.cellState === 'due' &&
                                isMarSlotOverdue(row)
                              return (
                                <MarGridCell
                                  key={d}
                                  cell={cell}
                                  filters={filters}
                                  isTodayCol={d === todayDay}
                                  isOverdue={slotOverdue}
                                  missingBodyMapSite={chartRowMissingBodyMapSite(
                                    row,
                                    bodyMapSiteByMedId,
                                  )}
                                  onClick={() => openCell(row, cell)}
                                />
                              )
                            })}
                          </tr>
                        ))}
                    </React.Fragment>
                  )
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      <RecordAdministrationDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        serviceUserId={serviceUserId}
        target={recordTarget}
      />
      <RecordPrnDialog
        open={prnOpen}
        onOpenChange={setPrnOpen}
        serviceUserId={serviceUserId}
        target={prnTarget}
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
