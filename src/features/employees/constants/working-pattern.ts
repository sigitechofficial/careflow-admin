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
