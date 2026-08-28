import { ClipboardCheck } from 'lucide-react'
import {
  formatSuggestionSourceDate,
  readFieldProvenance,
} from '@/features/service-users/care-plans/care-plan-suggestion-state'

export function CarePlanAutoPrefillIndicator({
  composedFrom,
  fieldKey,
}: {
  composedFrom: unknown
  fieldKey: string
}) {
  const provenance = readFieldProvenance(composedFrom)[fieldKey]
  if (!provenance?.autoPrefilled || provenance.userEdited) return null

  const sourceDate = formatSuggestionSourceDate(provenance.sourceDate)

  return (
    <p
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      data-testid={`care-plan-prefill-${fieldKey}`}
    >
      <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-[#0f766e]" aria-hidden />
      <span>
        Prefilled from Initial Assessment
        {sourceDate ? ` · ${sourceDate}` : null}
      </span>
    </p>
  )
}
