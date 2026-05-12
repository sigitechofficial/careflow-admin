import * as React from 'react'
import { Calendar, Check, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NoYesToggle } from '@/components/ui/no-yes-toggle'

type ReportId = 'adjustment' | 'call-off' | 'mileage' | 'schedule-status'

const reportOptions: { id: ReportId; label: string }[] = [
  { id: 'adjustment', label: 'Adjustment Report' },
  { id: 'call-off', label: 'Call Off Visits Report' },
  { id: 'mileage', label: 'Mileage Report' },
  { id: 'schedule-status', label: 'Schedule Status Report' },
]

const sampleRows = [
  { createdAt: '05/05/2026 08:23', range: '05/04/2026 - 05/05/2026', by: 'ubaid Rehmon' },
  { createdAt: '25/03/2026 07:51', range: '24/03/2026 - 25/03/2026', by: 'Edwin Omane Agyekum' },
  { createdAt: '11/03/2026 14:58', range: '11/02/2026 - 11/03/2026', by: 'Reekikumar Patel' },
  { createdAt: '11/03/2026 14:57', range: '11/03/2026 - 11/03/2026', by: 'Reekikumar Patel' },
  { createdAt: '16/02/2026 09:39', range: '12/02/2026 - 16/02/2026', by: 'Jaykumar Patel' },
]

export default function SchedulingReportPage() {
  const [report, setReport] = React.useState<ReportId>('adjustment')
  const [from, setFrom] = React.useState('2026-04-08')
  const [to, setTo] = React.useState('2026-05-08')
  const [showDeleted, setShowDeleted] = React.useState(false)

  return (
    <div className="space-y-4">
      {/* Filters card */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Scheduling Reports
            </div>
            <p className="text-sm text-muted-foreground">
              Generate and review scheduling reports for selected dates.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Report */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Report <span className="text-destructive">*</span>
              </label>
              <select
                value={report}
                onChange={(e) => setReport(e.target.value as ReportId)}
                className="h-10 w-full border border-border rounded-md px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {reportOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-sm font-medium text-muted-foreground">
                Date Range <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-10 w-full border border-border rounded-md px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <span className="text-muted-foreground">to</span>
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="h-10 w-full border border-border rounded-md px-3 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Calendar className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Show Deleted + action */}
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Show Deleted</label>
                <NoYesToggle value={showDeleted} onChange={setShowDeleted} labelOff="NO" labelOn="YES" />
              </div>

              <Button className="gap-2 h-10 px-5">
                <Check className="h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results card */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">
            {reportOptions.find(r => r.id === report)?.label ?? 'Report'}
          </h2>
        </div>

        <div className="p-5">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    { label: 'Generation Date', filter: true },
                    { label: 'Period From/To', filter: true },
                    { label: 'Generated By', filter: true },
                    { label: 'Action', filter: false },
                  ].map(col => (
                    <th key={col.label} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.filter && <Filter className="h-3 w-3 opacity-60" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((r, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.createdAt}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.range}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.by}</td>
                    <td className="px-3 py-2.5">
                      <button className="h-8 w-8 rounded-md border border-border hover:bg-muted transition-colors inline-flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
            <div>Showing 1 to {sampleRows.length} of {sampleRows.length} entries</div>
            <div className="flex items-center gap-1">
              <button className="h-9 px-3 rounded-md border border-border hover:bg-muted transition-colors inline-flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button className="h-9 w-9 rounded-md border border-border bg-primary text-primary-foreground font-semibold">1</button>
              <button className="h-9 px-3 rounded-md border border-border hover:bg-muted transition-colors inline-flex items-center gap-1">
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

