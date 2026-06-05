import { cn } from '@/shared/lib/utils'

/** Paper form: light blue section header band */
export const HOLISTIC_HEADER_CLASS =
  'border border-slate-300 bg-sky-100/90 px-4 py-2.5 dark:border-slate-600 dark:bg-sky-950/50'

export const HOLISTIC_SUBHEADER_CLASS = 'mt-0.5 text-xs text-muted-foreground'

/** Bordered content block under a header */
export const HOLISTIC_SECTION_SHELL_CLASS =
  'overflow-hidden rounded-sm border border-slate-300 bg-white dark:border-slate-600 dark:bg-card'

export const HOLISTIC_SECTION_BODY_CLASS = 'space-y-4 border-t border-slate-200 bg-white p-4 dark:border-slate-700'

export const HOLISTIC_TABLE_CLASS = 'w-full border-collapse text-sm'

export const HOLISTIC_TABLE_HEAD_CLASS = 'border border-slate-300 bg-sky-50 px-3 py-2 text-left text-xs font-semibold dark:border-slate-600 dark:bg-sky-950/40'

export const HOLISTIC_TABLE_CELL_CLASS = 'border border-slate-200 px-3 py-2 align-top dark:border-slate-700'

export const HOLISTIC_FOOTER_GRID_CLASS = 'grid gap-3 border-t border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-muted/20'

export const HOLISTIC_FORM_PAGE_CLASS = cn(
  'bg-white text-foreground dark:bg-card',
  '[&_table]:text-sm',
)
