import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { useCarePlanMeasureEvidence } from '@/features/incidents/hooks/useIncidents'
import type { IncidentAction } from '@/features/incidents/types'

/** Where the care plan page sends the manager back to, and what the new version is linked to. */
export type CarePlanIncidentContext = {
  incidentId: string
  incidentRef: string
  incidentActionId: string
  measure: string
}

/**
 * "Care plan update" measure (open): open the plan it names to change and publish it. With
 * "new care plan needed", open the service user's care plans to add one.
 */
export function CarePlanOpenLinks({
  action,
  incidentId,
  incidentRef,
}: {
  action: IncidentAction
  incidentId: string
  incidentRef: string
}) {
  const evidence = useCarePlanMeasureEvidence(action.id)
  const data = evidence.data
  if (!data) return null
  const context: CarePlanIncidentContext = {
    incidentId,
    incidentRef,
    incidentActionId: action.id,
    measure: action.title,
  }
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {data.newRecordNeeded
        ? data.serviceUserIds.map((suId) => (
            <Link
              key={suId}
              to="/service-users/$serviceUserId/care-plan"
              params={{ serviceUserId: suId }}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open care plans to add the new plan
            </Link>
          ))
        : data.plans.map((p) => (
            <Link
              key={p.instanceId}
              to="/service-users/$serviceUserId/care-plan/forms/$formId"
              params={{ serviceUserId: p.serviceUserId, formId: p.carePathwayFormId }}
              search={context}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open {p.formName} care plan
            </Link>
          ))}
      <span className="text-muted-foreground">
        Change it and publish — a saved draft doesn’t count.
      </span>
    </div>
  )
}

/**
 * Completing a "Care plan update" measure: choose the published version that made the change.
 * Only versions that qualify are offered (the named plan, published after the measure was added;
 * or a new plan created after it).
 */
export function CarePlanVersionPicker({
  actionId,
  value,
  onChange,
}: {
  actionId: string
  value: string
  onChange: (versionId: string) => void
}) {
  const evidence = useCarePlanMeasureEvidence(actionId)
  const versions = evidence.data?.versions ?? []
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
        Which published care plan version made the change?
        <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
      </p>
      {evidence.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading care plan versions…</p>
      ) : versions.length === 0 ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          {evidence.data?.newRecordNeeded
            ? 'No new care plan has been published for this service user since this measure was added.'
            : 'The care plan hasn’t been published since this measure was added.'}{' '}
          Open the care plan, make the change and publish it, then come back.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {versions.map((v) => (
            <li key={v.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                <input
                  type="radio"
                  className="mt-1"
                  name={`care-plan-version-${actionId}`}
                  checked={value === v.id}
                  onChange={() => onChange(v.id)}
                />
                <span>
                  <span className="font-medium text-foreground">
                    {v.formName} — version {v.versionNumber}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Published {formatOrganisationIsoDateLong(v.publishedAt.slice(0, 10))}
                    {v.publishedByName ? ` by ${v.publishedByName}` : ''}
                    {v.summary ? ` · ${v.summary}` : ''}
                    {v.linkedToThisMeasure ? ' · published from this measure' : ''}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
