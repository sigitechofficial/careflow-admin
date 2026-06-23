import type { EmployeeBranchScope } from '@/features/scheduling/utils/employee-branch-scope.util'
import { Badge } from '@/shared/ui/badge'

type Props = {
  scope: EmployeeBranchScope
}

export function StaffListBranchesCell({ scope }: Props) {
  if (scope.kind === 'all-zones') {
    return (
      <div className="flex max-w-[18rem] flex-col gap-1">
        <Badge variant="secondary" size="sm" className="font-normal">
          All branches
        </Badge>
        <span className="text-[11px] leading-snug text-muted-foreground">
          Works at every zone and branch
        </span>
      </div>
    )
  }

  if (scope.kind === 'multiple') {
    return (
      <ul className="max-w-[18rem] space-y-1">
        {scope.branches.map((branch) => (
          <li
            key={branch}
            className="rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-xs leading-snug text-foreground"
          >
            {branch}
          </li>
        ))}
      </ul>
    )
  }

  if (scope.kind === 'single' && scope.branches[0]) {
    return <span className="text-xs leading-snug">{scope.branches[0]}</span>
  }

  return <span className="text-muted-foreground">—</span>
}
