import * as React from 'react'
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Filter,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { PageHeader } from '@/shared/ui/page-elements'

type IncidentRow = {
  refNo: string
  date: string
  time: string
  incidentType: string
  whoInvolved: string
  status: string
  dateOfReview: string
  summary: string
  pendingActions: string
}

const columns: { label: string; filter?: boolean; sort?: boolean }[] = [
  { label: 'Ref. No.', filter: true },
  { label: 'Date', filter: true },
  { label: 'Time', filter: true },
  { label: 'Incident type', filter: true },
  { label: 'Who involved', filter: true },
  { label: 'Status', filter: true },
  { label: 'Date of Review', sort: true },
  { label: 'Incident Summary' },
  { label: 'Pending Actions' },
]

function ShowDeletedToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'h-8 w-[62px] rounded-full border border-border px-1',
        'flex items-center justify-between text-[11px] font-bold transition-colors',
        value ? 'bg-destructive text-destructive-foreground border-transparent' : 'bg-muted text-muted-foreground'
      )}
      aria-pressed={value}
    >
      {value ? (
        <>
          <span className="h-6 w-6 rounded-full bg-white/90 shadow-sm shrink-0" />
          <span className="pr-1">YES</span>
        </>
      ) : (
        <>
          <span className="pl-1">NO</span>
          <span className="h-6 w-6 rounded-full bg-white shadow-sm shrink-0" />
        </>
      )}
    </button>
  )
}

export default function ViewAccidentsIncidentsPage() {
  const [showDeleted, setShowDeleted] = React.useState(true)
  const rows = React.useMemo<IncidentRow[]>(() => [], [])

  const total = rows.length
  const showingFrom = total === 0 ? 0 : 1
  const showingTo = total

  return (
    <div className="space-y-4">
      <PageHeader
        title="View Accidents & Incidents"
        description="Browse and manage recorded accidents and incidents. Export the register to Excel or include deleted records when reviewing history."
        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'View' },
        ]}
      />

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-3 text-center text-sm font-semibold tracking-tight">
          Manage Incident/Accidents
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-destructive hover:bg-muted transition-colors"
            title="Export to Excel"
            aria-label="Export to Excel"
          >
            <FileSpreadsheet className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Show Deleted</span>
            <ShowDeletedToggle value={showDeleted} onChange={setShowDeleted} />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {columns.map(col => (
                    <th
                      key={col.label}
                      className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.filter && <Filter className="h-3 w-3 opacity-60 shrink-0" aria-hidden />}
                        {col.sort && <ArrowUpDown className="h-3 w-3 opacity-60 shrink-0" aria-hidden />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground bg-muted/30">
                      No record found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={`${r.refNo}-${idx}`} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap">{r.refNo}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{r.date}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{r.time}</td>
                      <td className="px-3 py-2.5">{r.incidentType}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.whoInvolved}</td>
                      <td className="px-3 py-2.5">{r.status}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{r.dateOfReview}</td>
                      <td className="px-3 py-2.5 max-w-[240px] truncate" title={r.summary}>{r.summary}</td>
                      <td className="px-3 py-2.5 max-w-[200px] truncate" title={r.pendingActions}>{r.pendingActions}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
            <div>
              Showing {showingFrom} to {showingTo} of {total} entries
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={total === 0}
                className="h-9 px-3 rounded-md border border-border hover:bg-muted transition-colors inline-flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={total === 0}
                className="h-9 px-3 rounded-md border border-border hover:bg-muted transition-colors inline-flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
