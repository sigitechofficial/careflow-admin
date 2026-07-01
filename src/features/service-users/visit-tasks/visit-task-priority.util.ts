export const VISIT_TASK_PRIORITIES = [
  { code: 'routine', label: 'Routine', rank: 0 },
  { code: 'important', label: 'Important', rank: 1 },
  { code: 'critical', label: 'Critical', rank: 2 },
] as const

export type VisitTaskPriorityCode = (typeof VISIT_TASK_PRIORITIES)[number]['code']

export const VISIT_TASK_PRIORITY_CODES: VisitTaskPriorityCode[] = VISIT_TASK_PRIORITIES.map(
  (row) => row.code,
)

export const DEFAULT_VISIT_TASK_PRIORITY: VisitTaskPriorityCode = 'routine'

export function isVisitTaskPriorityCode(value: string | null | undefined): value is VisitTaskPriorityCode {
  return VISIT_TASK_PRIORITY_CODES.includes(value as VisitTaskPriorityCode)
}

export function normalizeVisitTaskPriority(
  value: string | null | undefined,
): VisitTaskPriorityCode {
  return isVisitTaskPriorityCode(value) ? value : DEFAULT_VISIT_TASK_PRIORITY
}

export function visitTaskPriorityLabel(code: string | null | undefined): string {
  return VISIT_TASK_PRIORITIES.find((row) => row.code === code)?.label ?? 'Routine'
}

export function visitTaskPriorityRank(code: string | null | undefined): number {
  return VISIT_TASK_PRIORITIES.find((row) => row.code === code)?.rank ?? 0
}

export function visitTaskPriorityBadgeClass(code: VisitTaskPriorityCode): string {
  switch (code) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
    case 'important':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function visitTaskPrioritySelectedClass(code: VisitTaskPriorityCode): string {
  switch (code) {
    case 'critical':
      return 'border-red-600 bg-red-600 text-white shadow-sm'
    case 'important':
      return 'border-amber-600 bg-amber-600 text-white shadow-sm'
    default:
      return 'border-primary bg-primary text-primary-foreground shadow-sm'
  }
}

export function visitTaskPriorityCardClass(code: VisitTaskPriorityCode): string {
  switch (code) {
    case 'critical':
      return 'border-l-4 border-l-red-500'
    case 'important':
      return 'border-l-4 border-l-amber-500'
    default:
      return 'border-l-4 border-l-primary/30'
  }
}
