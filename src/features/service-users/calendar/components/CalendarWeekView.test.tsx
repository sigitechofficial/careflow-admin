import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ServiceUserCalendarEvent } from '../types/service-user-calendar.types'
import { CalendarWeekView, weekDayKey, weekDays } from './CalendarWeekView'

const ev = (id: string, title: string, start: string): ServiceUserCalendarEvent =>
  ({
    id,
    title,
    startDateTime: start,
    endDateTime: null,
    allDay: false,
    status: 'SCHEDULED',
    eventType: { id: 't', name: 'Hospital Appointment', color: '#2563eb' },
    location: 'At the hospital',
  }) as unknown as ServiceUserCalendarEvent

describe('CalendarWeekView', () => {
  it('keys each day by the date shown, not its UTC date', () => {
    const days = weekDays(new Date(2026, 10, 22))
    expect(days.map(weekDayKey)).toEqual([
      '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28',
    ])
  })

  it('puts each event under its own day (Saturday’s event is not shown on Sunday)', () => {
    render(
      <CalendarWeekView
        weekStart={new Date(2026, 10, 22)}
        groupedByDate={{
          '2026-11-21': [ev('a', 'Saturday appointment', '2026-11-21T12:36:00.000Z')],
          '2026-11-22': [ev('b', 'Sunday visit', '2026-11-22T10:00:00.000Z')],
        }}
      />,
    )
    const sunday = screen.getByTestId('calendar-week-day-2026-11-22')
    expect(within(sunday).getByText('Sunday visit')).toBeInTheDocument()
    expect(screen.queryByText('Saturday appointment')).toBeNull()
    expect(within(screen.getByTestId('calendar-week-day-2026-11-23')).getByText('No events')).toBeInTheDocument()
  })

  it('shows the compact card in day columns, with the whole title, type and status', () => {
    render(
      <CalendarWeekView
        weekStart={new Date(2026, 10, 22)}
        groupedByDate={{ '2026-11-24': [ev('c', 'Annual medication review', '2026-11-24T09:00:00.000Z')] }}
      />,
    )
    const card = screen.getByTestId('calendar-event-card-compact')
    expect(card).toHaveTextContent('Annual medication review')
    expect(card).toHaveTextContent('Hospital Appointment')
    expect(card).toHaveTextContent('SCHEDULED')
    expect(card).toHaveTextContent('At the hospital')
  })
})
