/**
 * CareAdmin content typography — single source of truth for page copy hierarchy.
 *
 * Consumed by page-elements, data-table variants, and feature pages.
 * Do not duplicate these class strings in feature folders.
 */

/** Step label / overline (e.g. "Step 1", breadcrumb section). */
export const contentKickerClass =
  'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

/** Primary section heading (PageHeader, Section, card titles). Uses sans to match dense admin UI. */
export const contentTitleClass = 'text-sm font-sans font-semibold text-foreground'

/** Display-font section heading (EmptyState, marketing-style titles). */
export const contentTitleDisplayClass = 'text-sm font-display font-semibold text-foreground'

/** Body copy, descriptions, table secondary text. */
export const contentBodyClass = 'text-sm text-muted-foreground'

/** Field hints, timestamps, meta lines. */
export const contentHelperClass = 'text-xs text-muted-foreground'

/** Validation and destructive helper text. */
export const contentHelperErrorClass = 'text-xs font-medium text-destructive dark:text-red-400'

/** Compact status badge (On/Off, fit labels, version status). */
export const contentBadgeClass =
  'text-xs font-semibold uppercase tracking-wide'

/** Inline tag / chip label (day pills, care plan tags). */
export const contentTagClass = 'text-xs font-medium'

/** Sub-section overline inside cards (e.g. "Visit runs on", "Working pattern"). */
export const contentOverlineClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/** Warning / alert caption under badges or assignments. */
export const contentAlertClass = 'text-xs font-medium text-amber-800 dark:text-amber-200'

/** Warning section heading inside breakdown panels. */
export const contentAlertHeadingClass =
  'text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200'

/** Collapsible panel summary / sub-section title. */
export const contentSummaryClass = 'cursor-pointer text-sm font-sans font-medium text-foreground'

/** Inline emphasis inside body copy. */
export const contentEmphasisClass = 'font-medium text-foreground'

/** Primary label in dense data tables (first column). */
export const contentTableRowLabelClass = 'text-sm font-sans font-medium text-foreground'
