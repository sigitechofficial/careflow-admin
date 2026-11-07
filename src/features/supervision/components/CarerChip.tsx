import { Link } from '@tanstack/react-router'
import { UserRound } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { employeeName, employeeRef, type SupervisionEmployee } from '@/features/supervision/api'

/** Carer name with their employee number / username, linking to the staff record. */
export function CarerChip({
  employee,
  employeeId,
  className,
  link = true,
}: {
  employee: SupervisionEmployee | undefined | null
  employeeId?: string
  className?: string
  link?: boolean
}) {
  const id = employee?.id ?? employeeId
  const ref = employeeRef(employee ?? (id ? { id, personalDetail: null } : null))
  const body = (
    <>
      <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-medium text-foreground">{employeeName(employee)}</span>
      {ref ? (
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground" data-testid="carer-ref">
          {ref}
        </span>
      ) : null}
    </>
  )
  const classes = cn('inline-flex flex-wrap items-center gap-1.5 text-sm', className)
  if (link && id) {
    return (
      <Link
        to="/employee/$employeeId/edit"
        params={{ employeeId: id }}
        search={{ tab: 'staff-reviews' }}
        className={cn(classes, 'rounded hover:underline')}
      >
        {body}
      </Link>
    )
  }
  return <span className={classes}>{body}</span>
}
