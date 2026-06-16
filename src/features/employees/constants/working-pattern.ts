export const WORKING_PATTERN_DAY_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

export type WorkingPatternDayConst = (typeof WORKING_PATTERN_DAY_ORDER)[number]

export const DEFAULT_WORK_PATTERN_START = '09:00'
export const DEFAULT_WORK_PATTERN_END = '18:00'
