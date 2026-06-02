import * as React from 'react'
import type { MarCalendarFilters, MarCellTypeFilter, MarScheduleFilter } from '@/features/service-users/medication/mar-calendar-filters'
import { DEFAULT_MAR_FILTERS } from '@/features/service-users/medication/mar-calendar-filters'
import { buildFilterSummary } from '@/features/service-users/medication/mar-calendar-layout'
import type { MedicationRegularChartResponse } from '@/features/service-users/api/medication-mar.api'

const CELL_TYPES: { id: MarCellTypeFilter; code: string; label: string }[] = [
  { id: 'due', code: 'Due', label: 'Scheduled' },
  { id: 'na', code: 'N/A', label: 'Not scheduled' },
  { id: 'prn', code: '+', label: 'PRN log' },
  { id: 'recorded', code: '●', label: 'Recorded' },
]

const SCHEDULE_TYPES: { id: MarScheduleFilter; label: string }[] = [
  { id: 'all', label: 'All medications' },
  { id: 'daily', label: 'Daily' },
  { id: 'interval', label: 'Every N days' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'specific', label: 'Specific days' },
  { id: 'prn', label: 'PRN only' },
]

export function MarFiltersBar({
  chart,
  filters,
  onChange,
}: {
  chart: MedicationRegularChartResponse | undefined
  filters: MarCalendarFilters
  onChange: (next: MarCalendarFilters) => void
}) {
  const [expanded, setExpanded] = React.useState(false)

  const toggleCellType = (id: MarCellTypeFilter) => {
    const next = new Set(filters.cellTypes)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ ...filters, cellTypes: next })
  }

  const toggleStatus = (code: string) => {
    const next = new Set(filters.statusCodes)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    onChange({ ...filters, statusCodes: next })
  }

  const summary = buildFilterSummary(filters)

  return (
    <div className={`mar-filter-panel ${expanded ? '' : 'collapsed'}`}>
      <div className="filter-compact-bar">
        <span className="filter-summary">{summary}</span>
        <div className="filter-compact-actions">
          <button
            type="button"
            className="filter-expand-btn"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? 'Fewer filters' : 'More filters'}
          </button>
          <button
            type="button"
            className="filter-expand-btn"
            style={{ background: '#fff', color: '#475569', borderColor: '#d1d5db' }}
            onClick={() => onChange({ ...DEFAULT_MAR_FILTERS })}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="filter-expanded">
        <div className="filter-section">
          <span className="filter-section-label">Search</span>
          <input
            className="h-9 w-full rounded-lg border border-[#d1d5db] px-3 text-[13px] text-[#1e293b] outline-none focus:border-[#818cf8] focus:shadow-[0_0_0_3px_rgba(129,140,248,0.15)]"
            placeholder="Medication name…"
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
          />
        </div>
        {chart && chart.legend.length > 0 && (
          <div className="filter-section">
            <span className="filter-section-label">
              Status codes ({chart.legend.filter(l => l.code !== 'Pending').length})
            </span>
            <div className="filter-chip-row">
              <button
                type="button"
                className={`filter-chip chip-cell ${filters.statusCodes.has('Due') ? 'active' : ''}`}
                onClick={() => toggleStatus('Due')}
              >
                <span className="chip-code">Due</span> Scheduled
              </button>
              {chart.legend
                .filter(l => l.code !== 'Pending')
                .map(l => {
                  const active = filters.statusCodes.has(l.code)
                  return (
                    <button
                      key={l.code}
                      type="button"
                      className={`filter-chip chip-status ${active ? 'active' : ''}`}
                      style={
                        active
                          ? {
                              backgroundColor: l.color,
                              color: l.textColor,
                              borderColor: l.textColor,
                            }
                          : undefined
                      }
                      onClick={() => toggleStatus(l.code)}
                    >
                      {!active && (
                        <span className="chip-dot" style={{ backgroundColor: l.color }} aria-hidden />
                      )}
                      <span className="chip-code">{l.code}</span> {l.label}
                    </button>
                  )
                })}
            </div>
          </div>
        )}
        <div className="filter-section">
          <span className="filter-section-label">Schedule type</span>
          <div className="filter-chip-row">
            {SCHEDULE_TYPES.map(st => (
              <button
                key={st.id}
                type="button"
                className={`filter-chip chip-freq ${filters.scheduleType === st.id ? 'active' : ''}`}
                onClick={() => onChange({ ...filters, scheduleType: st.id })}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-section">
          <span className="filter-section-label">Cell types</span>
          <div className="filter-chip-row">
            {CELL_TYPES.map(ct => (
              <button
                key={ct.id}
                type="button"
                className={`filter-chip chip-cell ${filters.cellTypes.has(ct.id) ? 'active' : ''}`}
                onClick={() => toggleCellType(ct.id)}
              >
                <span className="chip-code">{ct.code}</span> {ct.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
