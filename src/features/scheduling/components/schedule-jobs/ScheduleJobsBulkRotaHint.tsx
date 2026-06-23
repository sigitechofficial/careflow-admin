import { Link } from '@tanstack/react-router'

export function ScheduleJobsBulkRotaHint() {
  return (
    <p className="mb-3 shrink-0 text-xs text-muted-foreground">
      Jobs come from generated rota. After changing call pattern on a visit plan, save the plan and use{' '}
      <Link
        to="/scheduling/bulk-generate-rota"
        className="font-medium text-foreground underline-offset-2 hover:underline"
      >
        Bulk generate rota
      </Link>{' '}
      or <strong className="font-medium text-foreground">Generate rota</strong> on each visit plan — then refresh
      this board.
    </p>
  )
}
