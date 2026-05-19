import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Hammer, Loader2 } from 'lucide-react'
import { getApiBaseUrl } from '@/lib/api-base'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-elements'
import { buildSchedule, getScheduleStatus, listScheduleAreas } from '@/features/scheduling/api/scheduling.api'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'

export default function BuildSchedulePage() {
  const hasApi = !!getApiBaseUrl()
  const [date, setDate] = React.useState(todayIso())
  const [notes, setNotes] = React.useState('')
  const [selectedAreas, setSelectedAreas] = React.useState<string[]>([])

  const areasQuery = useQuery({
    queryKey: ['schedule-areas'],
    queryFn: listScheduleAreas,
    enabled: hasApi,
  })

  const statusQuery = useQuery({
    queryKey: ['schedule-status', date],
    queryFn: () => getScheduleStatus(date),
    enabled: hasApi,
  })

  const buildMutation = useMutation({
    mutationFn: () =>
      buildSchedule({
        scheduleDate: date,
        buildSource: 'MANUAL',
        notes: notes.trim() || undefined,
        areaIds: selectedAreas.length ? selectedAreas : undefined,
      }),
    onSuccess: () => {
      toastSuccess('Schedule built', `Batch for ${date} was created or updated.`)
      void statusQuery.refetch()
    },
    onError: e => toastApiError(e, 'Build failed'),
  })

  const toggleArea = (id: string) => {
    setSelectedAreas(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  if (!hasApi) {
    return <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL.</p>
  }

  return (
    <div className="mx-auto max-w-3xl p-5 md:p-6 space-y-6">
      <PageHeader
        title="Build Schedule"
        description="Create or refresh the schedule batch for a day and schedule areas."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Scheduling', href: '/scheduling/view' },
          { label: 'Build Schedule' },
        ]}
      />

      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Hammer className="h-4 w-4" />
          Build parameters
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Schedule date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-10 w-full max-w-xs border border-border rounded-md px-3 text-sm bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Schedule areas (leave empty for all active)</p>
          {areasQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {(areasQuery.data ?? []).map(a => (
              <label key={a.id} className="flex items-center gap-2 text-sm border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={selectedAreas.includes(a.id)}
                  onChange={() => toggleArea(a.id)}
                />
                <span>{a.name}</span>
                <span className="text-muted-foreground text-xs">({a.code})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => buildMutation.mutate()} disabled={buildMutation.isPending}>
            {buildMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Build schedule
          </Button>
          <Button variant="outline" asChild>
            <Link to="/scheduling/view">View schedule</Link>
          </Button>
        </div>
      </div>

      {statusQuery.data && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold">Current status for {date}</h2>
          <p className="text-sm text-muted-foreground">
            Batch: {statusQuery.data.batch?.status ?? 'none'} ({statusQuery.data.batch?.id?.slice(0, 8) ?? '—'})
          </p>
          <ul className="text-sm space-y-1">
            {statusQuery.data.areas.map(a => (
              <li key={a.scheduleAreaId} className="flex justify-between border-b border-border/50 py-1">
                <span>{a.scheduleArea.name}</span>
                <span className="text-muted-foreground">{a.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
