import { usePortalCalendar } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import {
  formatPortalDateTime,
  PortalReadOnlyField,
  PortalSection,
} from '@/features/service-user-portal/components/portal-display.util'

export default function PortalCalendarPage() {
  const { data, isLoading } = usePortalCalendar()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading calendar…</p>
  }

  const events = data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upcoming visits and events on your care calendar.</p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events in the next 90 days.</p>
      ) : (
        <div className="space-y-4">
          {events.map(e => (
            <PortalSection key={e.id} title={e.title}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <PortalReadOnlyField label="Start" value={formatPortalDateTime(e.startAt)} />
                <PortalReadOnlyField label="End" value={formatPortalDateTime(e.endAt)} />
                <PortalReadOnlyField label="Type" value={e.eventType?.name} />
                <PortalReadOnlyField label="Status" value={e.status} />
                <PortalReadOnlyField label="Location" value={e.location} />
                <PortalReadOnlyField label="Description" value={e.description} />
              </div>
            </PortalSection>
          ))}
        </div>
      )}
    </div>
  )
}
