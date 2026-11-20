import { Clock, ListChecks, Scale } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import type { MockInspectionTemplate, TemplateGuidance } from '../types'

const KQ_LABEL: Record<string, string> = {
  SAFE: 'Safe',
  EFFECTIVE: 'Effective',
  CARING: 'Caring',
  RESPONSIVE: 'Responsive',
  WELL_LED: 'Well-led',
}

export const keyQuestionLabel = (code: string) => KQ_LABEL[code] ?? code

/** "1 hr 30 min", "45 min". */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} hr ${m} min` : `${h} hr${h === 1 ? '' : 's'}`
}

/** Statements, time, key questions and whether an overall rating is given, in one row. */
export function TemplateFacts({ t }: { t: MockInspectionTemplate }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground" data-testid="mock-template-facts">
      <span className="inline-flex items-center gap-1">
        <ListChecks className="h-3.5 w-3.5" aria-hidden />
        {t.statementCount} quality statement{t.statementCount === 1 ? '' : 's'}
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        About {durationLabel(t.estimatedMinutes)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Scale className="h-3.5 w-3.5" aria-hidden />
        {t.givesOverallRating ? 'Gives an overall rating' : 'Rates its key questions only'}
      </span>
      <span className="flex flex-wrap gap-1">
        {t.keyQuestionCodes.map(code => (
          <Badge key={code} size="sm" variant="outline">
            {keyQuestionLabel(code)}
          </Badge>
        ))}
      </span>
    </div>
  )
}

const GUIDANCE_PARTS: { key: keyof TemplateGuidance; label: string }[] = [
  { key: 'lookAt', label: 'Look at' },
  { key: 'askPeople', label: 'Ask people we support' },
  { key: 'askStaff', label: 'Ask staff' },
  { key: 'inCareFlow', label: 'In CareFlow' },
]

/** What to check for one statement: records to look at, questions to ask, and where to look in CareFlow. */
export function GuidanceList({ guidance, compact = false }: { guidance: TemplateGuidance; compact?: boolean }) {
  const parts = GUIDANCE_PARTS.filter(p => guidance[p.key].length)
  return (
    <div className={compact ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 md:grid-cols-2'} data-testid="mock-guidance">
      {parts.map(p => (
        <div key={p.key}>
          <p className="text-xs font-semibold text-foreground">{p.label}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            {guidance[p.key].map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
