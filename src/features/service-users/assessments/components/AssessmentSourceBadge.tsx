import { Badge } from '@/shared/ui/badge'
import type { AssessmentCompletionSource } from '@/features/service-users/assessments/types'

const SOURCE_META: Record<
  AssessmentCompletionSource,
  { label: string; variant: 'info' | 'secondary' | 'warning' }
> = {
  INITIAL_ASSESSMENT: { label: 'From Initial Assessment', variant: 'info' },
  MANUAL: { label: 'Manual', variant: 'secondary' },
  CARE_PLAN: { label: 'From care plan', variant: 'warning' },
}

export function AssessmentSourceBadge({ source }: { source?: AssessmentCompletionSource | null }) {
  if (!source) {
    return <Badge variant="muted" size="sm">Unknown source</Badge>
  }
  const meta = SOURCE_META[source]
  if (!meta) {
    return <Badge variant="muted" size="sm">Unknown source</Badge>
  }
  return (
    <Badge variant={meta.variant} size="sm">
      {meta.label}
    </Badge>
  )
}
