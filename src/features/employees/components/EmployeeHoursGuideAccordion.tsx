import { BookOpenText } from 'lucide-react'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'

export type OverHoursGuideEmployee = {
  employeeId: string
  employeeName: string
  /** Baseline hours (contracted weekly / CoS weekly / effective cap). */
  contractedHours: number
  /** Compared load (assigned hours, or peak week hours for monthly). */
  assignedHours: number
  overHours: number
}

type Props = {
  view: 'monthly' | 'weekly'
  overHoursEmployees?: OverHoursGuideEmployee[]
  employeeCount?: number
}

function formatHoursShort(n: number): string {
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)}h`
}

function OverHoursProgressPanel({
  view,
  employees,
  employeeCount,
}: {
  view: 'monthly' | 'weekly'
  employees: OverHoursGuideEmployee[]
  employeeCount: number
}) {
  const overCount = employees.length
  const denom = Math.max(employeeCount, 1)
  const sharePct = Math.min(100, Math.round((overCount / denom) * 100))
  const sorted = [...employees].sort((a, b) => b.overHours - a.overHours)

  const baselineLabel = view === 'monthly' ? 'Weekly cap' : 'Baseline'
  const loadLabel = view === 'monthly' ? 'Peak week' : 'Assigned'
  const emptyMessage =
    view === 'monthly'
      ? 'No employees exceeded their weekly cap this month.'
      : 'No employees are assigned above contract or weekly cap this week.'

  return (
    <div className="space-y-3 px-4 py-3" data-testid="employee-hours-guide-over-hours">
      <div className="flex justify-end">
        <p className="text-sm font-semibold tabular-nums text-amber-900 dark:text-amber-200">
          {overCount} of {employeeCount}{' '}
          <span className="font-normal text-muted-foreground">({sharePct}%)</span>
        </p>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={sharePct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${overCount} of ${employeeCount} employees with over hours`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            overCount > 0 ? 'bg-amber-500' : 'bg-success',
          )}
          style={{ width: `${overCount > 0 ? Math.max(sharePct, 4) : 100}%` }}
        />
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="max-h-48 space-y-2.5 overflow-y-auto pr-1">
          {sorted.map(emp => {
            const ratio =
              emp.contractedHours > 0 && emp.assignedHours > 0
                ? Math.min(100, Math.round((emp.contractedHours / emp.assignedHours) * 100))
                : 0
            return (
              <li key={emp.employeeId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-foreground">{emp.employeeName}</span>
                  <span className="shrink-0 tabular-nums text-amber-900 dark:text-amber-200">
                    +{formatHoursShort(emp.overHours)} over
                  </span>
                </div>
                <div
                  className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
                  title={`${baselineLabel} ${formatHoursShort(emp.contractedHours)} · ${loadLabel} ${formatHoursShort(emp.assignedHours)}`}
                >
                  <div className="absolute inset-0 bg-amber-200/80 dark:bg-amber-900/50" />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-amber-600"
                    style={{ width: `${Math.max(ratio, emp.contractedHours > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {baselineLabel} {formatHoursShort(emp.contractedHours)} · {loadLabel}{' '}
                  {formatHoursShort(emp.assignedHours)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function EmployeeHoursGuideAccordion({
  view,
  overHoursEmployees = [],
  employeeCount = 0,
}: Props) {
  const title = view === 'monthly' ? 'Over weekly-cap hours' : 'Over-assigned hours'
  const description =
    view === 'monthly'
      ? 'Employees whose week-block hours exceeded their CoS / effective weekly cap this month.'
      : 'Employees whose assigned hours exceed contracted weekly hours or the effective weekly cap.'

  return (
    <ContentCard className="p-0" data-testid="employee-hours-guide">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <BookOpenText className="h-4 w-4 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <OverHoursProgressPanel
        view={view}
        employees={overHoursEmployees}
        employeeCount={employeeCount}
      />
    </ContentCard>
  )
}
