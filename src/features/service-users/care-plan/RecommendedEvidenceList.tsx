import * as React from 'react'
import {
  RECOMMENDED_EVIDENCE_PREVIEW_LIMIT,
  splitEvidencePreview,
  type RecommendationTriggerRef,
} from '@/features/service-users/care-plan/care-plan-display-state'

export function RecommendedEvidenceList({
  triggers,
  previewLimit = RECOMMENDED_EVIDENCE_PREVIEW_LIMIT,
}: {
  triggers: RecommendationTriggerRef[]
  previewLimit?: number
}) {
  const [expanded, setExpanded] = React.useState(false)
  const { visible, hiddenCount } = splitEvidencePreview(triggers, previewLimit, expanded)

  if (triggers.length === 0) return null

  return (
    <div>
      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {visible.map((trigger) => (
          <li key={trigger.questionId} className="break-words">
            {trigger.specRef ? `${trigger.specRef} · ` : ''}
            {trigger.questionText}
          </li>
        ))}
      </ul>
      {triggers.length > previewLimit ? (
        <button
          type="button"
          className="mt-0.5 text-xs font-medium text-teal-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/40 dark:text-teal-300"
          aria-expanded={expanded}
          data-testid="recommended-evidence-more"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? 'Show less' : `+${hiddenCount} more`}
        </button>
      ) : null}
    </div>
  )
}
