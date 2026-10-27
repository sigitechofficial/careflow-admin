import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  InvestigationSection,
  preventableLabel,
} from '@/features/incidents/components/IncidentInvestigationSection'
import { InvestigationSummaryLine } from '@/features/incidents/components/IncidentInvestigationSetup'
import {
  useFeedbackInvestigators,
  usePauseFeedbackInvestigation,
  useResumeFeedbackInvestigation,
  useUpsertFeedbackInvestigation,
} from '@/features/complaints/hooks/useComplaints'
import type { FeedbackDetail } from '@/features/complaints/types'

/** The incident investigation form, saved against this complaint. */
export function FeedbackInvestigationCard({ record, canEdit }: { record: FeedbackDetail; canEdit: boolean }) {
  const save = useUpsertFeedbackInvestigation(record.id)
  const investigators = useFeedbackInvestigators(record.id, canEdit)
  const pause = usePauseFeedbackInvestigation(record.id)
  const resume = useResumeFeedbackInvestigation(record.id)
  const [showAll, setShowAll] = React.useState(false)
  const investigation = record.investigation

  const section = (
    <InvestigationSection
      subject="complaint"
      investigation={investigation}
      canEdit={canEdit}
      api={{ save, investigators, pauseControls: { pause, resume } }}
      serviceUsers={record.aboutServiceUser ? [record.aboutServiceUser] : []}
      involvedEmployees={record.aboutEmployees}
      suggestHigherLevel={record.severity === 'HIGH'}
    />
  )
  if (canEdit || !investigation) return section

  // Read-only: the key findings first, everything else on demand.
  const findings: [string, string | null][] = [
    ['Root cause', investigation.rootCause],
    ['Could it have been prevented?', investigation.preventable ? preventableLabel(investigation.preventable) : null],
    ['Conclusion', investigation.conclusion],
  ]
  return (
    <div className="space-y-3">
      <InvestigationSummaryLine investigation={investigation} />
      <dl className="grid gap-3 sm:grid-cols-3">
        {findings.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-muted/40 px-3 py-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
      >
        {showAll ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {showAll ? 'Hide full investigation' : 'Show full investigation'}
      </button>
      {showAll && <div className="border-t border-border pt-3">{section}</div>}
    </div>
  )
}
