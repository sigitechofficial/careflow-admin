import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { List, Loader2 } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { useScheduleList } from '@/features/scheduling/hooks/useScheduling'
import {
  employeesLabel,
  formatDateTimeLocal,
  serviceUserLabel,
  todayIso,
} from '@/features/scheduling/utils/scheduling-format'

export default function ScheduleListPage() {
  const hasApi = !!getApiBaseUrl()
  const [date, setDate] = React.useState(todayIso())

  const { data, isLoading, isError } = useScheduleList(date, hasApi)

  const jobs = data?.jobs ?? []

  if (!hasApi) {
    return <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL.</p>
  }

  return (
    <div className="mx-auto max-w-6xl p-5 md:p-6 space-y-4">
      <PageHeader
        title="List View of Schedule"
        description="Tabular list of scheduled jobs for a selected day."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Scheduling', href: '/scheduling/view' },
          { label: 'List view' },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="h-10 border border-border rounded-md px-3 text-sm bg-background"
        />
        <Button variant="outline" size="sm" asChild>
          <Link to="/scheduling/view">Grid view</Link>
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 text-sm font-semibold">
          <List className="h-4 w-4" />
          Jobs ({jobs.length})
          {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </div>
        {isError && (
          <p className="p-4 text-sm text-destructive">Failed to load jobs. Check schedule_timelines.read permission.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">Start</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Job</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Service user</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Run</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Carers</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
                    No jobs for this date. Build a schedule or add jobs via the API.
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTimeLocal(job.scheduledStartDateTime)}</td>
                    <td className="px-3 py-2">{job.jobName}</td>
                    <td className="px-3 py-2">{serviceUserLabel(job.serviceUser)}</td>
                    <td className="px-3 py-2">{job.scheduleRun?.name ?? 'â€”'}</td>
                    <td className="px-3 py-2">{employeesLabel(job)}</td>
                    <td className="px-3 py-2">{job.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
