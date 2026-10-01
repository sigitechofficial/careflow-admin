import * as React from 'react'
import { SpecialistTriggerNotesContext } from '@/features/service-users/initial-assessment/utils/specialist-question-triggers'

/** Under a Core answer that makes a specialist assessment Required (no link — the nav shows it). */
export function InitialAssessmentSpecialistTriggerNote({ questionId }: { questionId: string }) {
  const lines = React.useContext(SpecialistTriggerNotesContext).get(questionId)
  if (!lines?.length) return null
  return (
    <div
      className="mt-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
      data-testid="ia-specialist-trigger-note"
    >
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}
