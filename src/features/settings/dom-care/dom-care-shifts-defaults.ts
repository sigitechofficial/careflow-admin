import type { DomCareShiftDefinition } from '@/features/settings/types'

export const DEFAULT_DOM_CARE_SHIFT_DEFINITIONS: DomCareShiftDefinition[] = [
  {
    id: 'default-morning',
    name: 'Morning Call',
    fromTime: '06:00',
    toTime: '10:59',
    colorHex: '#F4D03F',
    endsNextDay: false,
    sortOrder: 0,
  },
  {
    id: 'default-lunch',
    name: 'Lunch Call',
    fromTime: '11:00',
    toTime: '14:59',
    colorHex: '#2ECC71',
    endsNextDay: false,
    sortOrder: 1,
  },
  {
    id: 'default-tea',
    name: 'Tea Call',
    fromTime: '15:00',
    toTime: '17:59',
    colorHex: '#F39C12',
    endsNextDay: false,
    sortOrder: 2,
  },
  {
    id: 'default-evening',
    name: 'Evening Call',
    fromTime: '18:00',
    toTime: '20:55',
    colorHex: '#5DADE2',
    endsNextDay: false,
    sortOrder: 3,
  },
  {
    id: 'default-night',
    name: 'Night call',
    fromTime: '21:00',
    toTime: '07:00',
    colorHex: '#BB8FCE',
    endsNextDay: true,
    sortOrder: 4,
  },
]

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function inferEndsNextDay(fromTime: string, toTime: string): boolean {
  if (!TIME_RE.test(fromTime) || !TIME_RE.test(toTime)) return false
  return fromTime > toTime
}

export function newDomCareShift(sortOrder: number): DomCareShiftDefinition {
  return {
    id: crypto.randomUUID(),
    name: '',
    fromTime: '09:00',
    toTime: '17:00',
    colorHex: '#5DADE2',
    endsNextDay: false,
    sortOrder,
  }
}
