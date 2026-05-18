import { ServiceUserCalendarPage } from './ServiceUserCalendarPage'

/** Calendar tab inside service user profile (per-user events). */
export function ServiceUserCalendarTab({ serviceUserId }: { serviceUserId: string }) {
  return <ServiceUserCalendarPage serviceUserId={serviceUserId} embedded />
}
