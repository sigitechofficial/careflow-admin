import * as React from 'react'
import {
  ChevronDown, Pencil, Sun, Plus, X, Users,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-elements'

/* ─── Data ───────────────────────────────────────────────────── */
const jobList = [
  { id: 1,  name: 'Ivy Lindsay',    service: 'PM Personal care',          time: '08:00/1:00/09:00', group: true,  alert: false },
  { id: 2,  name: 'Patricia Dawson',service: 'Personal care am',           time: '08:00/0:45/08:45', group: false, alert: false },
  { id: 3,  name: 'Kiara Watkins',  service: 'Family Support',             time: '08:00/12:00/20:00',group: true,  alert: false },
  { id: 4,  name: 'Penny Doyle',    service: 'Personal care',              time: '09:00/1:00/10:00', group: false, alert: true  },
  { id: 5,  name: 'Penny Doyle',    service: 'Personal care and sitting',  time: '09:00/1:00/10:00', group: false, alert: true  },
  { id: 6,  name: 'Marian Letts',   service: 'AM Visit',                   time: '10:00/0:30/10:30', group: false, alert: false },
  { id: 7,  name: 'Wayne Hill',     service: 'Outreach',                   time: '10:00/4:00/14:00', group: false, alert: false },
  { id: 8,  name: 'Zofia Glowacka', service: 'AM Visit',                   time: '10:00/0:45/10:45', group: false, alert: false },
  { id: 9,  name: 'Sarah Alasomuka',service: 'AM visit',                   time: '11:00/1:00/12:00', group: false, alert: false },
  { id: 10, name: 'Jean Harvey',    service: 'Personal care AM',           time: '10:00/0:45/11:45', group: false, alert: true  },
  { id: 11, name: 'Dion Allen',     service: 'Outreach',                   time: '11:00/4:00/15:00', group: false, alert: false },
  { id: 12, name: 'Ivy Lindsay',    service: 'Lunch',                      time: '12:00/1:00/13:00', group: true,  alert: false },
  { id: 13, name: 'Marian Letts',   service: 'Domestic Visit',             time: '12:00/1:00/13:00', group: false, alert: false },
  { id: 14, name: 'Paul Barrett',   service: 'Domestic Visit',             time: '12:00/1:30/13:30', group: false, alert: false },
  { id: 15, name: 'Penny Doyle',    service: 'Personal Care',              time: '13:00/1:00/14:00', group: false, alert: false },
]

const runs = [
  {
    id: 'CR0 6', zone: 'CR0 6', run: 1, staff: ['Kerine Edwards'],
    visits: [
      { id: 1, name: 'Stuart Reakes', time: '11:00/0:45/11:45', type: 'AM Visit',       color: 'green',  group: false, alert: false, striped: false },
      { id: 2, name: 'Stuart Reakes', time: '14:15/0:30/14:45', type: 'Lunchtime pr...',color: 'green',  group: false, alert: false, striped: false },
    ],
  },
  {
    id: 'CR0 3', zone: 'CR0 3', run: 2, staff: ['Anishka Campbell', 'Lolalyn Headley'],
    visits: [
      { id: 3,  name: 'Patricia Strutt', time: '07:30/0:45/08:15', type: 'AM Visit',       color: 'yellow', group: false, alert: false, striped: true  },
      { id: 4,  name: 'Yim-HA Mok',      time: '08:25/0:30/08:55', type: 'Personal Car...', color: 'yellow', group: true,  alert: false, striped: false },
      { id: 5,  name: 'Unice Frederick', time: '09:10/0:30/09:40', type: 'Personal Car...', color: 'yellow', group: false, alert: false, striped: false },
      { id: 6,  name: 'Diane Morgan',    time: '10:00/3:00/13:00', type: 'SHOPPING V...',   color: 'yellow', group: false, alert: false, striped: false },
      { id: 7,  name: 'Yim-HA Mok',      time: '13:15/0:30/13:45', type: 'Lunch',           color: 'green',  group: true,  alert: false, striped: false },
    ],
  },
  {
    id: 'CR0 0', zone: 'CR0 0', run: 5, staff: ['Juliet Ellis','Tawana Nelson','Tyecia Lawrence','Abiola Idowu','Sketter Thomas'],
    visits: [
      { id: 8,  name: 'Katie Mulholla...', time: '08:00/1:00/09:00', type: 'AM Visit',       color: 'green',  group: false, alert: false, striped: false },
      { id: 9,  name: 'Esther Duroja...', time: '08:30/5:30/14:00', type: 'Outreach',        color: 'yellow', group: false, alert: true,  striped: false },
      { id: 10, name: 'Doreen Lockyer',   time: '09:30/1:00/10:30', type: 'Personal Car...', color: 'yellow', group: false, alert: false, striped: false },
      { id: 11, name: 'Udaya Nakye...',   time: '10:00/6:00/16:00', type: 'Outreach',        color: 'yellow', group: false, alert: false, striped: false },
      { id: 12, name: 'Winifred Nolan',   time: '10:50/0:45/11:35', type: 'AM Visit',        color: 'yellow', group: false, alert: false, striped: false },
      { id: 13, name: 'Gillian Keogh',    time: '11:00/1:00/12:00', type: 'Domestic Visit',  color: 'yellow', group: false, alert: false, striped: false },
      { id: 14, name: 'Christina West',   time: '12:30/0:45/13:15', type: 'AM Visit',        color: 'green',  group: false, alert: false, striped: false },
      { id: 15, name: 'Doreen Lockyer',   time: '13:30/0:45/14:15', type: 'Personal Lunch',  color: 'yellow', group: true,  alert: false, striped: false },
    ],
  },
  {
    id: 'CR7 6', zone: 'CR7 6', run: 3, staff: ['Sandria Brown','Amina Irfan','Jodan Purcell'],
    visits: [
      { id: 16, name: 'Michael Azubike', time: '10:00/0:30/10:30', type: 'AM Visit',       color: 'green',  group: false, alert: false, striped: false },
      { id: 17, name: 'Nana Ababio',     time: '11:00/0:30/11:30', type: 'Lunch Visit',    color: 'green',  group: false, alert: false, striped: false },
      { id: 18, name: 'Jean Pierre ro...', time: '11:00/1:00/12:00', type: 'domestic',      color: 'green',  group: false, alert: true,  striped: false },
      { id: 19, name: 'Michael Azubike', time: '12:00/0:30/12:30', type: 'Lunch Visit',    color: 'green',  group: false, alert: false, striped: false },
      { id: 20, name: 'Donald Goldson',  time: '14:00/1:30/15:30', type: 'Laundry/Shop...', color: 'green',  group: false, alert: false, striped: false },
    ],
  },
]

/* ─── Visit card ─────────────────────────────────────────────── */
function VisitCard({ v }: { v: typeof runs[0]['visits'][0] }) {
  const bg    = v.color === 'green' ? 'bg-[#86efac]' : 'bg-[#fde047]'
  const border= v.color === 'green' ? 'border-green-400' : 'border-yellow-400'
  return (
    <div className={cn(
      'relative rounded p-1.5 min-w-[120px] max-w-[140px] border cursor-pointer hover:brightness-95 transition-all overflow-hidden shrink-0',
      bg, border
    )}>
      {v.striped && (
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(-45deg,#000 0,#000 1px,transparent 0,transparent 50%)', backgroundSize: '8px 8px' }} />
      )}
      <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{v.name}</p>
      <p className="text-[10px] text-slate-700 leading-tight mt-0.5">{v.time}</p>
      <p className="text-[10px] text-slate-600 leading-tight truncate">{v.type}</p>
      <div className="flex items-center gap-1 mt-1">
        {v.group && <Users className="h-3 w-3 text-slate-600" />}
        {v.alert && <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0 inline-block" />}
      </div>
    </div>
  )
}

/* ─── Job card (left panel) ──────────────────────────────────── */
function JobCard({ job }: { job: typeof jobList[0] }) {
  return (
    <div className="relative rounded-sm bg-slate-200/80 border-l-2 border-slate-400 px-2 py-1.5 cursor-pointer hover:bg-slate-300/60 transition-colors overflow-hidden">
      <div className="absolute inset-0 opacity-30"
        style={{ backgroundImage: 'repeating-linear-gradient(-45deg,#999 0,#999 1px,transparent 0,transparent 50%)', backgroundSize: '7px 7px' }} />
      <p className="relative text-xs font-semibold text-slate-800 leading-tight truncate">
        <span className="text-slate-500 line-through-red">{job.name}</span>
        <span className="text-slate-600">-{job.service}</span>
      </p>
      <div className="relative flex items-center justify-between mt-0.5">
        <p className="text-[11px] text-slate-600">{job.time}</p>
        <div className="flex items-center gap-1">
          {job.group && <Users className="h-3 w-3 text-slate-500" />}
          {job.alert && <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0 inline-block" />}
        </div>
      </div>
    </div>
  )
}

/* ─── Blue toolbar button ────────────────────────────────────── */
function TBtn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button className={cn('h-9 px-4 rounded text-white text-sm font-medium bg-blue-600 hover:bg-blue-700 transition-colors shrink-0', className)}>
      {children}
    </button>
  )
}

function TBtnOutline({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-9 px-4 rounded text-white text-sm font-medium bg-blue-500 hover:bg-blue-600 transition-colors shrink-0">
      {children}
    </button>
  )
}

/* ─── Dropdown button ────────────────────────────────────────── */
function DropBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-9 px-3 pr-2 rounded bg-blue-600 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-blue-700 transition-colors shrink-0">
      {children}
      <ChevronDown className="h-3.5 w-3.5" />
    </button>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function ViewSchedulePage() {
  const [selectedDate] = React.useState('Fri 08/05 - All Zones')

  return (
    <div className="mx-auto max-w-7xl p-5 md:p-6">
      <div className="flex flex-col h-full min-h-0 w-full bg-background space-y-4">
        <PageHeader
          title="View Schedule"
          description="Build, review, and manage daily schedules and runs."
          breadcrumb={[
            { label: 'Home', href: '/' },
            { label: 'Scheduling' },
            { label: 'View Schedule' },
          ]}
        />

      {/* ── Toolbar row 1 ── */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="border-b border-border px-4 py-2 flex flex-wrap items-center gap-2">
          <DropBtn>{selectedDate}</DropBtn>
          <TBtn>Build Schedule</TBtn>
          <TBtn>Schedule Status</TBtn>
          <TBtn>Call off visits</TBtn>
          <div className="ml-auto flex gap-2">
            <TBtn className="bg-blue-700 px-6">Actions</TBtn>
            <TBtn className="bg-blue-700 px-6">Reports</TBtn>
          </div>
        </div>

        {/* ── Toolbar row 2 ── */}
        <div className="px-4 py-2 flex items-center gap-2">
          <TBtnOutline>Filter Jobs</TBtnOutline>
          <div className="ml-auto">
            <DropBtn>Jobs/Day/Runs</DropBtn>
          </div>
        </div>
      </div>

      {/* ── 3-column layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden mt-4 bg-card rounded-xl border border-border shadow-sm">

        {/* ── Left: Job list ── */}
        <div className="w-[230px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-2 space-y-1">
            {jobList.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        </div>

        {/* ── Center: Runs ── */}
        <div className="w-[180px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="px-3 py-2 text-center font-semibold text-sm text-foreground border-b border-border bg-muted/40">
            Runs
          </div>
          <div className="divide-y divide-border">
            {runs.map(run => (
              <div key={run.id} className="px-3 py-3">
                <div className="flex items-center gap-2 mb-1">
                  {/* Sun icon */}
                  <Sun className="h-5 w-5 text-yellow-400 shrink-0" />
                  <span className="text-sm font-semibold text-foreground flex-1">{run.zone}</span>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {/* Run number badge */}
                  <div className="h-5 w-5 rounded-sm bg-muted text-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                    {run.run}
                  </div>
                </div>
                <div className="space-y-0.5 pl-7">
                  {run.staff.map(s => (
                    <p key={s} className="text-[11px] text-muted-foreground leading-tight">{s}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Schedule grid ── */}
        <div className="flex-1 min-w-0 overflow-auto bg-background">
          {/* Date header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-2 flex items-center gap-3">
            <button className="h-7 w-7 rounded-full border-2 border-blue-500 text-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
            <button className="h-7 w-7 rounded-full border border-border text-muted-foreground flex items-center justify-center hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
            <Sun className="h-6 w-6 text-yellow-400" />
            {/* Half-moon */}
            <div className="h-6 w-6 rounded-full bg-gradient-to-r from-yellow-300 to-slate-300" />
            <span className="text-sm font-semibold text-foreground ml-1">
              08-05-2026 Friday Week 19 Cycle 2
            </span>
          </div>

          {/* Run rows */}
          <div className="divide-y divide-border">
            {runs.map(run => (
              <div key={run.id} className="flex items-stretch min-h-[80px]">
                {/* Run label */}
                <div className="w-14 shrink-0 flex items-center justify-center bg-muted/30 border-r border-border">
                  <span className="text-xs font-bold text-muted-foreground -rotate-90 whitespace-nowrap tracking-wide">
                    {run.run}
                  </span>
                </div>

                {/* Visit cards */}
                <div className="flex flex-wrap gap-1.5 p-2 flex-1">
                  {run.visits.map(v => <VisitCard key={v.id} v={v} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
