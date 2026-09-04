import { cn } from '@/shared/lib/utils'

export function visitPlanCarerCandidateCardClass(options: {
  selected: boolean
  blocked: boolean
  rotaConflict: boolean
  complianceBlocked?: boolean
  atLimit?: boolean
  justAssigned?: boolean
}): string {
  return cn(
    'rounded-lg border px-3 py-3 transition-[border-color,background-color,box-shadow,transform] duration-200',
    options.selected
      ? 'border-sky-400 bg-sky-50/70 ring-2 ring-sky-300/70 dark:border-sky-600 dark:bg-sky-950/40 dark:ring-sky-800'
      : 'border-border bg-card hover:border-border/80',
    options.justAssigned && 'animate-assign-flash scale-[1.01]',
    (options.rotaConflict || options.complianceBlocked) && 'border-red-200 dark:border-red-900',
    options.blocked && 'border-red-100 dark:border-red-950',
    options.atLimit && !options.selected && 'opacity-75',
    !options.blocked &&
      !options.rotaConflict &&
      !options.complianceBlocked &&
      !options.atLimit &&
      'cursor-pointer',
  )
}
