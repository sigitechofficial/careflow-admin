import type { RoleTaskRecurrence, RoleTaskTemplate } from '@/features/role-tasks/types'

/** Pages a task can open (label → app path). */
export const ROLE_TASK_PAGES: Array<{ label: string; path: string }> = [
  { label: 'Add service user', path: '/service-users/add' },
  { label: 'All service users', path: '/service-users/all' },
  { label: 'Care plan reviews', path: '/care-plans/reviews' },
  { label: 'Assessment review queue', path: '/assessments/review-queue' },
  { label: 'Schedule jobs (rota)', path: '/scheduling/schedule-jobs' },
  { label: 'Manage schedule jobs', path: '/scheduling/jobs' },
  { label: 'Add employee', path: '/employee/add' },
  { label: 'All employees', path: '/employee/staff-list' },
  { label: 'Compliance board', path: '/employee/compliance' },
  { label: 'Hours approvals', path: '/hours-approvals' },
  { label: 'UK payroll runs', path: '/payroll/runs' },
  { label: 'Payslips', path: '/payroll/payslips' },
  { label: 'Office salaries', path: '/office-salaries' },
  { label: 'Visit reconciliation', path: '/billing/visit-reconciliation' },
  { label: 'Employee payouts', path: '/billing/employee-payouts' },
  { label: 'Invoice runs', path: '/billing/invoice-runs' },
  { label: 'All incidents', path: '/incidents/view' },
  { label: 'Surveys', path: '/surveys' },
  { label: 'Setup checklist', path: '/checklist' },
]

export function rolePageLabel(path: string | null): string | null {
  if (!path) return null
  return ROLE_TASK_PAGES.find((p) => p.path === path)?.label ?? path
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const RECURRENCE_LABEL: Record<RoleTaskRecurrence, string> = {
  NONE: 'One-off',
  DAILY: 'Every day',
  WEEKLY: 'Every week',
  MONTHLY: 'Every month',
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${s}`
}

/** "Every Monday", "Monthly on the 25th", "One-off · due 25 Oct 2026". */
export function repeatLabel(
  t: Pick<RoleTaskTemplate, 'recurrence' | 'weekday' | 'dayOfMonth' | 'startDate'>,
  formatDate: (iso: string) => string,
): string {
  switch (t.recurrence) {
    case 'DAILY':
      return 'Every day'
    case 'WEEKLY':
      return `Every ${WEEKDAYS[t.weekday ?? 1]}`
    case 'MONTHLY':
      return `Monthly on the ${ordinal(t.dayOfMonth ?? 1)}`
    default:
      return `One-off · due ${formatDate(t.startDate)}`
  }
}
