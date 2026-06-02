import * as React from 'react'
import type { StatusPickRow } from '@/features/service-users/medication/mar-record-utils'

export function MarStatusCodePicker({
  codes,
  value,
  onChange,
  searchPlaceholder = 'Search by code or label…',
}: {
  codes: StatusPickRow[]
  value: string | null
  onChange: (code: string) => void
  searchPlaceholder?: string
}) {
  const [search, setSearch] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return codes
    return codes.filter(
      sc =>
        sc.code.toLowerCase().includes(q) ||
        sc.label.toLowerCase().includes(q),
    )
  }, [codes, search])

  return (
    <div>
      <div className="status-search-wrap">
        <input
          type="search"
          className="mar-record-input w-full"
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div id="status-btn-grid" className="status-btn-grid">
        {filtered.map(sc => {
          const selected = value === sc.code
          const chipBg = sc.color
          const chipText = sc.textColor?.trim() || '#FFFFFF'
          return (
            <button
              key={sc.code}
              type="button"
              className="status-pick-btn"
              data-status={sc.code}
              onClick={() => onChange(sc.code)}
              style={
                selected
                  ? { borderColor: '#6366f1', background: '#eff6ff' }
                  : { borderColor: '#e2e8f0', background: '#fff' }
              }
            >
              <div
                className={`status-pick-code${sc.code === 'PCI' ? ' pci' : ''}`}
                style={{ background: chipBg, color: chipText }}
              >
                {sc.code}
              </div>
              <div className="status-pick-label">{sc.label}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
