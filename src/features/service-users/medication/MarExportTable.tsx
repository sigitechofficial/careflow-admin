import * as React from 'react'
import type { MarChartCell, MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import {
  aggregateCompartmentDayCell,
  buildPackCompartments,
  compartmentAggregateCellStyle,
  compartmentMedicineContentsLine,
  compartmentStatusPill,
  showCompartmentStatusPill,
  compartmentSummaryDisplayCode,
  exportChartTodayDay,
  packExportHeaderLabel,
  splitPackAndStandaloneRows,
  summarizeCompartmentDay,
  type CompartmentAggregateCell,
} from '@/features/service-users/medication/mar-pack-calendar-layout'
import {
  cellDisplayLabel,
  dayOfWeekLetter,
  formatRoundWindow,
  formatTimeSlotDisplay,
  groupMarRows,
  maxExportSlotContentLines,
  medicationDetailFields,
  scheduleChipClass,
  scheduleChipLabel,
  type MarMedicationGroup,
} from '@/features/service-users/medication/mar-calendar-layout'

/** ~10px label + ~9px subline at leading-tight, plus cell padding */
const EXPORT_SLOT_LINE_PX = 14
const EXPORT_SLOT_CELL_PAD_PX = 6

function exportSlotMinHeightPx(slots: MarChartMedicationRow[]): string {
  const lines = maxExportSlotContentLines(slots)
  return `${lines * EXPORT_SLOT_LINE_PX + EXPORT_SLOT_CELL_PAD_PX}px`
}

function exportSlotSubline(row: MarChartMedicationRow): string {
  const slot = formatTimeSlotDisplay(row)
  return [slot.time, formatRoundWindow(row)].filter(Boolean).join(' · ')
}

function exportCellStyle(cell: MarChartCell): React.CSSProperties | undefined {
  if (cell.cellState === 'recorded' && cell.color) {
    return { backgroundColor: cell.color, color: cell.textColor ?? '#fff', fontWeight: 700 }
  }
  if (cell.cellState === 'due') {
    return { backgroundColor: '#fef9c3', color: '#854d0e', fontWeight: 700 }
  }
  if (cell.cellState === 'na') {
    return { backgroundColor: '#f8fafc', color: '#94a3b8' }
  }
  if (cell.cellState === 'prn') {
    return { backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }
  }
  return undefined
}

function exportAggregateCellStyle(aggregate: CompartmentAggregateCell): React.CSSProperties | undefined {
  return compartmentAggregateCellStyle(aggregate)
}

function MarExportCompartmentCollapsedRow({
  compartment,
  days,
  todayDay,
}: {
  compartment: ReturnType<typeof buildPackCompartments>[number]
  days: number[]
  todayDay: number | null
}) {
  const todayCounts = todayDay != null ? summarizeCompartmentDay(compartment.rows, todayDay) : null
  const todayPill = todayCounts ? compartmentStatusPill(todayCounts) : null
  const metaText = compartmentMedicineContentsLine(compartment.rows)

  return (
    <tr className="bp-compartment-summary-row is-visible is-collapsed">
      <td className="bp-comp-summary-sticky-band border border-violet-200 border-l-[3px] border-l-violet-500 bg-violet-50/40 p-0" colSpan={2}>
        <div className="bp-comp-summary-band flex min-h-[44px] w-full items-stretch">
          <div className="bp-comp-summary-label med-label-cell min-w-0 flex-1 px-2.5 py-2 text-left">
            <div className="bp-comp-summary-text">
              <div className="med-label-head flex flex-wrap items-center gap-1.5">
                <div className="med-name text-[10px] font-semibold leading-snug text-violet-700">
                  {compartment.label}
                </div>
                {showCompartmentStatusPill(todayPill) && (
                  <span
                    className={[
                      'bp-comp-status-pill rounded-full px-1.5 py-px text-[8px] font-bold uppercase tracking-wide',
                      todayPill.tone === 'open' && 'border border-blue-200 bg-blue-100 text-blue-700',
                      todayPill.tone === 'complete' && 'border border-green-200 bg-green-100 text-green-700',
                      todayPill.tone === 'partial' && 'border border-orange-200 bg-orange-100 text-orange-700',
                      todayPill.tone === 'mixed-due' && 'border border-yellow-200 bg-yellow-100 text-yellow-800',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {todayPill.icon} {todayPill.label}
                  </span>
                )}
              </div>
              <div className="med-meta mt-0.5 text-[9px] leading-snug text-slate-500">{metaText}</div>
            </div>
          </div>
          <div className="bp-comp-summary-time-side w-[72px] shrink-0 border-l border-violet-200 bg-violet-50 px-2.5 py-2 text-center">
            <div className="time-slot-label text-[9px] font-semibold leading-snug text-violet-700">
              {compartment.emoji ? `${compartment.emoji} ` : ''}
              {compartment.roundName}
            </div>
            <div className="time-slot-time mt-0.5 text-[8px] text-slate-500">{compartment.dueTime}</div>
          </div>
        </div>
      </td>
      {days.map(d => {
        const aggregate = aggregateCompartmentDayCell(compartment.rows, d, todayDay)
        const label = compartmentSummaryDisplayCode(aggregate)
        const title = aggregate.kind === 'partial' ? aggregate.tooltip : undefined
        return (
          <td
            key={d}
            title={title}
            className={[
              'mar-day-cell comp-day-summary-cell border border-slate-300 px-0.5 py-0.5 text-center align-middle font-bold',
              d === todayDay ? 'col-today' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={exportAggregateCellStyle(aggregate)}
          >
            {label}
          </td>
        )
      })}
    </tr>
  )
}

export function MarExportTable({
  month,
  medications,
  lastDay,
  compact = false,
  packExportDetail = 'full',
}: {
  month: string
  medications: MarChartMedicationRow[]
  lastDay: number
  compact?: boolean
  packExportDetail?: 'summary' | 'full'
}) {
  const days = Array.from({ length: lastDay }, (_, i) => i + 1)
  const todayDay = exportChartTodayDay(month)
  const { packBundles, standaloneRows } = splitPackAndStandaloneRows(medications)
  const standaloneGroups = groupMarRows(standaloneRows)
  const showPackMedicines = packExportDetail !== 'summary'

  return (
    <table
      className={`mar-export-grid w-full min-w-[720px] table-fixed border-collapse border border-slate-300 ${compact ? 'text-[9px]' : 'text-[10px]'}`}
    >
      <thead>
        <tr className="bg-slate-100">
          <th className="w-[168px] border border-slate-300 px-1 py-0.5 text-left font-bold">
            Medication
          </th>
          <th className="w-[72px] border border-slate-300 px-1 py-0.5 text-center font-bold">
            Time slot
          </th>
          {days.map(d => (
            <th
              key={d}
              className="mar-day-col w-7 min-w-[28px] max-w-[36px] border border-slate-300 px-0.5 py-0.5 text-center font-bold"
            >
              <div>{d}</div>
              <div className="text-[8px] font-normal text-slate-500">{dayOfWeekLetter(month, d)}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {packBundles.map((bundle, packIndex) => {
          const compartments = buildPackCompartments(bundle.rows)
          return (
          <React.Fragment key={bundle.packName}>
            {(packIndex > 0 || standaloneGroups.length > 0) && (
              <tr aria-hidden>
                <td colSpan={2 + days.length} className="h-1 border-0 bg-slate-50 p-0" />
              </tr>
            )}
            <tr>
              <td
                colSpan={2 + days.length}
                className="border border-violet-200 bg-violet-50 px-2 py-1 text-left font-bold text-violet-800"
              >
                {packExportHeaderLabel(bundle.packName, bundle.rows)}
              </td>
            </tr>
            {compartments.map(compartment => (
              <React.Fragment key={`${bundle.packName}:${compartment.dueTime}`}>
                <MarExportCompartmentCollapsedRow
                  compartment={compartment}
                  days={days}
                  todayDay={todayDay}
                />
                {showPackMedicines &&
                  groupMarRows(compartment.rows).map((group, groupIndex) => (
                    <MarExportMedicationGroup
                      key={`${compartment.dueTime}:${group.medicationId}`}
                      group={group}
                      days={days}
                      showGap={groupIndex > 0}
                      packMember
                    />
                  ))}
              </React.Fragment>
            ))}
          </React.Fragment>
          )
        })}
        {packBundles.length > 0 && standaloneGroups.length > 0 && (
          <tr aria-hidden>
            <td colSpan={2 + days.length} className="h-1 border-0 bg-slate-50 p-0" />
          </tr>
        )}
        {standaloneGroups.map((group, groupIndex) => (
          <MarExportMedicationGroup
            key={group.medicationId}
            group={group}
            days={days}
            showGap={groupIndex > 0 || packBundles.length > 0}
          />
        ))}
      </tbody>
    </table>
  )
}

function MarExportMedicationGroup({
  group,
  days,
  showGap,
  packMember = false,
}: {
  group: MarMedicationGroup
  days: number[]
  showGap: boolean
  packMember?: boolean
}) {
  const detailFields = medicationDetailFields(group).filter(
    ({ label }) => !packMember || label !== 'Pack',
  )
  const slotCount = group.slots.length
  const maxSlotLines = maxExportSlotContentLines(group.slots)
  const slotInnerMinHeight = exportSlotMinHeightPx(group.slots)

  return (
    <>
      {showGap && (
        <tr aria-hidden>
          <td colSpan={2 + days.length} className="h-1 border-0 bg-slate-50 p-0" />
        </tr>
      )}
      {group.slots.map((row, slotIndex) => {
        const slot = formatTimeSlotDisplay(row)
        const slotSubline = exportSlotSubline(row)
        const needsSublinePlaceholder = maxSlotLines >= 2 && !slotSubline

        return (
          <tr
            key={`${row.medicationId}:${row.scheduleId ?? slotIndex}`}
            className={['mar-export-slot-row', packMember ? 'pack-member-row' : '']
              .filter(Boolean)
              .join(' ')}
          >
            {slotIndex === 0 && (
              <td
                className={[
                  'mar-export-med-cell border border-slate-300 px-1 py-0.5 align-top',
                  packMember ? 'border-l-[3px] border-l-violet-300' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                rowSpan={slotCount}
              >
                <dl className="mar-export-med-detail m-0 space-y-0.5 text-[9px] leading-snug">
                  {detailFields.map(({ label, value }) => (
                    <div key={label}>
                      <dt className="inline font-semibold text-slate-600">{label}: </dt>
                      <dd className="inline m-0 font-medium text-slate-900">{value}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="inline font-semibold text-slate-600">Schedule: </dt>
                    <dd className="inline m-0">
                      <span className={scheduleChipClass(group.scheduleType)}>
                        {scheduleChipLabel(group.scheduleType)}
                      </span>
                    </dd>
                  </div>
                </dl>
              </td>
            )}
            <td className="mar-export-slot-cell border border-slate-300 px-1 py-0.5 text-center align-middle">
              <div
                className="mar-export-slot-inner flex flex-col items-center justify-center gap-0.5"
                style={{ minHeight: slotInnerMinHeight }}
              >
                <div className="font-semibold leading-tight">{slot.label}</div>
                {slotSubline ? (
                  <div className="text-[9px] leading-tight text-slate-500">{slotSubline}</div>
                ) : needsSublinePlaceholder ? (
                  <div className="text-[9px] leading-tight text-transparent" aria-hidden>
                    &nbsp;
                  </div>
                ) : null}
              </div>
            </td>
            {days.map(d => {
              const cell = row.days.find(c => c.day === d)
              if (!cell) {
                return (
                  <td
                    key={d}
                    className="mar-day-cell border border-slate-300 bg-slate-50 align-middle"
                  />
                )
              }
              const label = cellDisplayLabel(cell)
              return (
                <td
                  key={d}
                  className="mar-day-cell border border-slate-300 px-0.5 py-0.5 text-center align-middle font-bold"
                  style={exportCellStyle(cell)}
                >
                  {label}
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}
