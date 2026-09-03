import type { ServiceUserCalendarEvent } from '../types/service-user-calendar.types'

export function isBirthdayEvent(event: ServiceUserCalendarEvent): boolean {
  const code = event.eventType?.code?.toUpperCase() ?? ''
  if (code === 'BIRTHDAY') return true
  const name = event.eventType?.name?.toLowerCase() ?? ''
  if (name.includes('birthday')) return true
  return event.title.toLowerCase().includes('birthday')
}

export function countByMonth(
  events: ServiceUserCalendarEvent[],
  year: number,
  monthIndex: number,
) {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const inMonth = events.filter(e => e.startDateTime.slice(0, 7) === prefix)
  const birthdays = inMonth.filter(isBirthdayEvent)
  const scheduled = inMonth.filter(e => e.status === 'SCHEDULED')
  const completed = inMonth.filter(e => e.status === 'COMPLETED')
  return {
    total: inMonth.length,
    birthdays: birthdays.length,
    scheduled: scheduled.length,
    completed: completed.length,
    events: inMonth,
    birthdayEvents: birthdays,
  }
}

export function nextMonthParts(year: number, monthIndex: number) {
  if (monthIndex === 11) return { year: year + 1, month: 0 }
  return { year, month: monthIndex + 1 }
}
