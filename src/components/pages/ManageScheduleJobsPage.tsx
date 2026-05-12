import * as React from 'react'
import { Calendar, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type TabId = 'jobs-not-started' | 'jobs-needing-attention' | 'day-jobs'

type JobRow = {
  id: string
  scheduledStart: string
  jobName: string
  serviceUser: string
  employees: string
  status?: string
}

const jobsNotStarted: JobRow[] = [
  { id: '1877709', scheduledStart: '27/02/2026 09:00', jobName: 'Supporting living', serviceUser: 'Jerome Bartholomew', employees: 'Khino Bryan', status: 'Started' },
  { id: '1867231', scheduledStart: '10/02/2026 19:00', jobName: 'Personal care - bed', serviceUser: 'Eileen Margaret Pennant', employees: '—', status: 'Partially Completed' },
  { id: '1667069', scheduledStart: '10/02/2026 16:00', jobName: 'Personal care - tea', serviceUser: 'Eileen Margaret Pennant', employees: '—', status: 'Partially Completed' },
  { id: '1666806', scheduledStart: '10/02/2026 12:30', jobName: 'Personal care - Lunch', serviceUser: 'Eileen Margaret Pennant', employees: '—', status: 'Partially Completed' },
]

const jobsNeedingAttention: JobRow[] = [
  { id: '1666123', scheduledStart: '09/02/2026 09:15', jobName: 'Personal care - AM', serviceUser: 'Eileen Margaret Pennant', employees: 'Michelle Campbell' },
  { id: '1665574', scheduledStart: '07/02/2026 20:00', jobName: 'Personal care - PM', serviceUser: 'Sandra How', employees: 'Sharon Cole' },
  { id: '1665579', scheduledStart: '07/02/2026 19:00', jobName: 'Personal care - bed', serviceUser: 'Eileen Margaret Pennant', employees: 'Michelle Campbell' },
]

type DayJobRow = {
  jobId: string
  run: string
  runName: string
  scheduledTime: string
  actualTime: string
  serviceUser: string
  actionName: string
  no: string
  employees: string
  status: string
}

const dayJobs: DayJobRow[] = [
  { jobId: '1706886', run: 'CR0 2', runName: 'CR0 2', scheduledTime: '07:00 - 07:45', actualTime: '06:57 - 07:46', serviceUser: 'Christopher Slater', actionName: 'AM Visit', no: '1', employees: 'Nicole Gray - 0, 0', status: 'Completed' },
  { jobId: '1705405', run: 'CR0 2', runName: 'CR0 2', scheduledTime: '07:00 - 07:45', actualTime: '—', serviceUser: 'Lourdemary Anthonisamy', actionName: 'Personal care AM', no: '1', employees: '—', status: 'Cancelled' },
  { jobId: '1706888', run: 'CR0 3', runName: 'CR0 3', scheduledTime: '07:30 - 08:15', actualTime: '07:29', serviceUser: 'Patricia Strutt', actionName: 'AM Visit', no: '1', employees: 'Lolalyn Headley - 0, 0', status: 'Started' },
]

function TableFooter({ total }: { total: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
      <div>Showing 1 to {total} of {total} entries</div>
      <div className="flex items-center gap-1">
        <button className="h-9 px-3 rounded-md border border-border hover:bg-muted transition-colors">Previous</button>
        <button className="h-9 w-9 rounded-md border border-border bg-primary text-primary-foreground font-semibold">1</button>
        <button className="h-9 px-3 rounded-md border border-border hover:bg-muted transition-colors">Next</button>
      </div>
    </div>
  )
}

function TableHeader({ cols }: { cols: { label: string; filter?: boolean }[] }) {
  return (
    <thead>
      <tr className="border-b border-border bg-muted/40">
        {cols.map(col => (
          <th key={col.label} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
            <div className="flex items-center gap-1">
              {col.label}
              {col.filter && <Filter className="h-3 w-3 opacity-60" />}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}

function Tabs({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'jobs-not-started', label: 'Jobs Not Started' },
    { id: 'jobs-needing-attention', label: 'Jobs Needing Attention' },
    { id: 'day-jobs', label: 'Day Jobs' },
  ]

  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={cn(
            'text-base px-5 py-3 border-b-2 -mb-px transition-colors font-medium',
            tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function ManageScheduleJobsPage() {
  const [tab, setTab] = React.useState<TabId>('jobs-not-started')
  const [dayDate, setDayDate] = React.useState('2026-05-08')

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Scheduled Jobs Housekeeping
          </div>
          <p className="text-sm text-muted-foreground">
            Review, complete, and manage scheduled jobs.
          </p>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Tabs tab={tab} setTab={setTab} />

        <div className="p-4 sm:p-5">
          {tab === 'jobs-not-started' && (
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <TableHeader cols={[
                    { label: 'Job Id' },
                    { label: 'Scheduled Start Date Time', filter: true },
                    { label: 'Job Name' },
                    { label: 'Service User' },
                    { label: "Employee's", filter: true },
                    { label: 'Status' },
                    { label: 'Actions' },
                  ]} />
                  <tbody>
                    {jobsNotStarted.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
                          No record found.
                        </td>
                      </tr>
                    ) : (
                      jobsNotStarted.map(r => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.id}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.scheduledStart}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.jobName}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.serviceUser}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.employees}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.status ?? '—'}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2 justify-end">
                              <Button size="sm" variant="secondary">Cancel Job</Button>
                              <Button size="sm">Complete Job</Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TableFooter total={jobsNotStarted.length || 0} />
            </div>
          )}

          {tab === 'jobs-needing-attention' && (
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <TableHeader cols={[
                    { label: 'Scheduled Start Date Time', filter: true },
                    { label: 'Job Name' },
                    { label: 'Service User' },
                    { label: "Employee's", filter: true },
                    { label: 'Actions' },
                  ]} />
                  <tbody>
                    {jobsNeedingAttention.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-12 text-center text-sm text-muted-foreground">No record found.</td>
                      </tr>
                    ) : (
                      jobsNeedingAttention.map(r => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.scheduledStart}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.jobName}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.serviceUser}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.employees}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end">
                              <Button size="sm" variant="outline">View</Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TableFooter total={jobsNeedingAttention.length || 0} />
            </div>
          )}

          {tab === 'day-jobs' && (
            <div className="rounded-lg border border-border bg-background p-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Select Date <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dayDate}
                    onChange={(e) => setDayDate(e.target.value)}
                    className="h-10 w-[180px] border border-border rounded-md px-3 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Calendar className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <TableHeader cols={[
                    { label: 'Job Id' },
                    { label: 'Run' },
                    { label: 'Run Name' },
                    { label: 'Scheduled Time' },
                    { label: 'Actual Time' },
                    { label: 'Service User' },
                    { label: 'Action Name', filter: true },
                    { label: 'No.' },
                    { label: 'Employees', filter: true },
                    { label: 'Status' },
                    { label: 'Actions' },
                  ]} />
                  <tbody>
                    {dayJobs.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-3 py-12 text-center text-sm text-muted-foreground">No record found.</td>
                      </tr>
                    ) : (
                      dayJobs.map(r => (
                        <tr key={r.jobId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.jobId}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.run}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.runName}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.scheduledTime}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.actualTime}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.serviceUser}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.actionName}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.no}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.employees}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.status}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline">View</Button>
                              <Button size="sm" variant="outline">Edit</Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TableFooter total={dayJobs.length || 0} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

