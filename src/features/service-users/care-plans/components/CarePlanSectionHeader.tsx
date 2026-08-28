import { Sparkles } from 'lucide-react'

export type CarePlanSectionHeaderProps = {
  title: string
  description?: string | null
  /** Pending IA recommendations in this section. */
  recommendationCount?: number
  /** Softer styling when embedded in an accordion. */
  embedded?: boolean
}

/**
 * Section chrome for Care Plan forms with an IA recommendations badge.
 */
export function CarePlanSectionHeader({
  title,
  description,
  recommendationCount = 0,
  embedded = false,
}: CarePlanSectionHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3
          className={
            embedded
              ? 'text-base font-medium text-[#5a7a96]'
              : 'text-sm font-semibold tracking-tight text-[#0f2744] dark:text-slate-100'
          }
        >
          {title}
        </h3>
        {recommendationCount > 0 ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            data-testid="care-plan-section-ia-hint"
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            {recommendationCount} IA recommendation{recommendationCount === 1 ? '' : 's'} available
          </span>
        ) : null}
      </div>
      {description?.trim() ? (
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
  )
}
