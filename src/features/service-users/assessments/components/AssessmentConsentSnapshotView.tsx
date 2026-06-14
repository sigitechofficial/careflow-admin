import {
  ASSESSMENT_CONSENT_GIVEN_BY_OPTIONS,
  ASSESSMENT_CONSENT_METHOD_OPTIONS,
  assessmentConsentSummaryLine,
  extractAssessmentConsentFromSnapshot,
  type AssessmentConsentMetadata,
} from '@/features/service-users/assessments/utils/assessment-consent'

type Props = {
  snapshot?: Record<string, unknown> | null
}

function labelForGivenBy(value: AssessmentConsentMetadata['givenBy']): string {
  return ASSESSMENT_CONSENT_GIVEN_BY_OPTIONS.find((o) => o.value === value)?.label ?? '—'
}

function labelForMethod(value: AssessmentConsentMetadata['method']): string {
  return ASSESSMENT_CONSENT_METHOD_OPTIONS.find((o) => o.value === value)?.label ?? '—'
}

export function AssessmentConsentSnapshotView({ snapshot }: Props) {
  const consent = extractAssessmentConsentFromSnapshot(snapshot)
  if (!consent) return null

  return (
    <section
      className="space-y-2 rounded-md border border-violet-200/70 bg-violet-50/30 p-3 dark:border-violet-900/40 dark:bg-violet-950/15"
      data-testid="assessment-consent-snapshot"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Assessment consent
      </h4>
      <p className="text-sm font-medium">{assessmentConsentSummaryLine(consent)}</p>
      {consent.consentObtained === true ? (
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Given by</dt>
            <dd>{labelForGivenBy(consent.givenBy)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Method</dt>
            <dd>{labelForMethod(consent.method)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd>{consent.consentDate || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Capacity intact</dt>
            <dd>
              {consent.capacityIntact === true
                ? 'Yes'
                : consent.capacityIntact === false
                  ? 'No'
                  : '—'}
            </dd>
          </div>
          {consent.personName?.trim() ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Person giving consent</dt>
              <dd>
                {consent.personName}
                {consent.personRelationship?.trim() ? ` (${consent.personRelationship})` : ''}
              </dd>
            </div>
          ) : null}
          {consent.evidenceNote?.trim() ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Evidence note</dt>
              <dd className="whitespace-pre-wrap">{consent.evidenceNote}</dd>
            </div>
          ) : null}
        </dl>
      ) : consent.declinedReason?.trim() ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{consent.declinedReason}</p>
      ) : null}
    </section>
  )
}
