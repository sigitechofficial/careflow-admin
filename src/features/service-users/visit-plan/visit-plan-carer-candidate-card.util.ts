import { cn } from '@/shared/lib/utils'

export function visitPlanCarerCandidateCardClass(options: {
  selected: boolean
  blocked: boolean
  rotaConflict: boolean
  atLimit?: boolean
}): string {
  return cn(
    'rounded-lg border px-3 py-3 transition-colors',
    options.selected
      ? 'border-sky-400 bg-sky-50/50 ring-1 ring-sky-200 dark:border-sky-700 dark:bg-sky-950/30 dark:ring-sky-900'
      : 'border-border bg-card hover:border-border/80',
    options.rotaConflict && 'border-red-200 dark:border-red-900',
    options.blocked && 'border-red-100 dark:border-red-950',
    options.atLimit && !options.selected && 'opacity-75',
  )
}
