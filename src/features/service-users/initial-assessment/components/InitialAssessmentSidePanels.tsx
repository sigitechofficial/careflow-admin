import { Heart, MessageSquare, ShieldAlert } from 'lucide-react'
import type { InitialAssessmentFlaggedItem } from '@/features/service-users/initial-assessment/types'

type Props = {
  riskItems: InitialAssessmentFlaggedItem[]
  riskCount: number
  triggerItems: InitialAssessmentFlaggedItem[]
  triggerCount: number
  overallPercent: number
  sectionCommentCount: number
  sectionTotal: number
  onGoToSection?: (sectionNumber: number) => void
}

function FlagList({
  items,
  max = 8,
  onGoToSection,
}: {
  items: InitialAssessmentFlaggedItem[]
  max?: number
  onGoToSection?: (sectionNumber: number) => void
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">None flagged in this submission yet.</p>
  }
  return (
    <ul className="space-y-1.5 text-xs">
      {items.slice(0, max).map((item) => (
        <li key={item.answerId} className="leading-snug">
          {item.section ? (
            onGoToSection ? (
              <button
                type="button"
                className="text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                onClick={() => onGoToSection(item.section!.sectionNumber)}
              >
                §{item.section.sectionNumber}
              </button>
            ) : (
              <span className="text-muted-foreground">§{item.section.sectionNumber} · </span>
            )
          ) : null}
          {item.section && onGoToSection ? <span className="text-muted-foreground"> · </span> : null}
          {item.questionText}
        </li>
      ))}
      {items.length > max ? (
        <li className="text-muted-foreground">+{items.length - max} more</li>
      ) : null}
    </ul>
  )
}

export function InitialAssessmentSidePanels({
  riskItems,
  riskCount,
  triggerItems,
  triggerCount,
  overallPercent,
  sectionCommentCount,
  sectionTotal,
  onGoToSection,
}: Props) {
  return (
    <div className="space-y-4" data-testid="ia-side-panels">
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
          Risk flags ({riskCount})
        </div>
        <FlagList items={riskItems} onGoToSection={onGoToSection} />
      </div>

      <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900 dark:bg-teal-950/30">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-950 dark:text-teal-100">
          <Heart className="h-4 w-4 shrink-0" aria-hidden />
          Care plan triggers ({triggerCount})
        </div>
        <FlagList items={triggerItems} onGoToSection={onGoToSection} />
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section progress</p>
        <p className="mt-1 text-3xl font-semibold text-teal-800 dark:text-teal-300">{overallPercent}%</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-teal-600 transition-all duration-300 dark:bg-teal-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-teal-200/60 bg-teal-50/30 p-4 dark:border-teal-900 dark:bg-teal-950/20">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-teal-900 dark:text-teal-200">
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
          Section comments
        </div>
        <p className="text-xs text-muted-foreground">
          {sectionCommentCount} of {sectionTotal} sections have assessor notes.
        </p>
      </div>
    </div>
  )
}
