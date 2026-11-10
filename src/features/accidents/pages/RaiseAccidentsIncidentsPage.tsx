import * as React from 'react'
import { AlertTriangle, Calendar, Lock } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { PageHeader } from '@/shared/ui/page-elements'

const CORAL = '#e8645a'

const recentColumns = [
  'Incident Time',
  'Incident Type',
  'People Involved',
  'Location',
  'Description',
  'Ref No.',
]

function PillToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
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

function InfoDot({ label }: { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-[10px] font-bold text-white hover:opacity-90"
    >
      i
    </button>
  )
}

function formatUkDateTime(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function RaiseAccidentsIncidentsPage() {
  const now = React.useMemo(() => new Date(), [])
  const [reportedAt] = React.useState(() => formatUkDateTime(now))
  const [reportType, setReportType] = React.useState('Accident')
  const [incidentAt, setIncidentAt] = React.useState(() => toDatetimeLocalValue(now))
  const [keepPrivate, setKeepPrivate] = React.useState(false)
  const [shareHandover, setShareHandover] = React.useState(true)
  const incidentInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Raise Accidents & Incidents"
        description="Record a new accident or incident, review recent entries from the last 12 hours, and control privacy and handover sharing."
        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'Raise' },
        ]}
      />

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-3 text-center text-sm font-semibold tracking-tight">
          Manage Incident/Accidents
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div className="h-9 min-w-[2.25rem]" aria-hidden />
          <div className="text-right text-sm text-muted-foreground">
            Date and time reported{' '}
            <span className="font-medium text-foreground">{reportedAt}</span>
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          <section>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {recentColumns.map(col => (
                      <th key={col} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={recentColumns.length} className="px-3 py-10 text-center text-muted-foreground bg-muted/20">
                      No incident/accident recorded from last 12 hrs.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:gap-4">
              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <div className="space-y-1.5 lg:col-span-3">
                  <label className="text-sm font-medium text-muted-foreground">What do you want to report?</label>
                  <select
                    value={reportType}
                    onChange={e => setReportType(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Accident">Accident</option>
                    <option value="Incident">Incident</option>
                    <option value="Near miss">Near miss</option>
                  </select>
                </div>
                <div className="space-y-1.5 lg:col-span-5">
                  <label className="text-sm font-medium text-muted-foreground">Date and time of Incident</label>
                  <div className="flex gap-2">
                    <input
                      ref={incidentInputRef}
                      type="datetime-local"
                      value={incidentAt}
                      onChange={e => setIncidentAt(e.target.value)}
                      className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => incidentInputRef.current?.showPicker?.() ?? incidentInputRef.current?.focus()}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      aria-label="Open calendar"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Ref no.</label>
                  <div className="h-10 flex items-center rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground">
                    â€”
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="h-11 shrink-0 rounded-md px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 active:scale-[0.99] xl:self-end"
                style={{ backgroundColor: CORAL }}
              >
                {reportType === 'Accident'
                  ? 'Create Accident'
                  : reportType === 'Incident'
                    ? 'Create Incident'
                    : 'Create report'}
              </button>
            </div>

            <div className="rounded-md border border-foreground/80 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-foreground">Keep Private</span>
                  <PillToggle value={keepPrivate} onChange={setKeepPrivate} />
                  <InfoDot label="When private, visibility may be limited to authorised roles." />
                  <Lock className="h-4 w-4 text-destructive shrink-0" aria-hidden />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-foreground">Share with Handover</span>
                  <PillToggle value={shareHandover} onChange={setShareHandover} />
                  <InfoDot label="Include this report on the handover summary for the next shift." />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
