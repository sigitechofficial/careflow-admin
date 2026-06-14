import * as React from 'react'
import { ShieldCheck } from 'lucide-react'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { InitialAssessmentYesNoCardField } from '@/features/service-users/initial-assessment/components/InitialAssessmentYesNoCardField'
import {
  ASSESSMENT_CONSENT_GIVEN_BY_OPTIONS,
  ASSESSMENT_CONSENT_METHOD_OPTIONS,
  type AssessmentConsentMetadata,
} from '@/features/service-users/assessments/utils/assessment-consent'

type Props = {
  assessmentTitle: string
  value: AssessmentConsentMetadata
  disabled?: boolean
  error?: string | null
  onChange: (next: AssessmentConsentMetadata) => void
}

export function AssessmentConsentCaptureSection({
  assessmentTitle,
  value,
  disabled,
  error,
  onChange,
}: Props) {
  const patch = (partial: Partial<AssessmentConsentMetadata>) => {
    onChange({ ...value, ...partial })
  }

  const consentGranted = value.consentObtained === true
  const consentDeclined = value.consentObtained === false
  const needsRepresentativeDetails = consentGranted && value.givenBy && value.givenBy !== 'service_user'

  return (
    <section
      className="space-y-4 rounded-md border border-violet-200/80 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20"
      data-testid="assessment-consent-capture"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-700 dark:text-violet-300" />
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Consent for this assessment</h3>
          <p className="text-xs text-muted-foreground">
            Record separate consent for <strong>{assessmentTitle}</strong>. Each completion needs its
            own consent — service user, LPA, deputy, or best-interest as appropriate.
          </p>
        </div>
      </div>

      <InitialAssessmentYesNoCardField
        name="assessment-consent-obtained"
        label="Consent obtained for this assessment?"
        value={value.consentObtained ?? null}
        disabled={disabled}
        onChange={(v) =>
          patch({
            consentObtained: v,
            ...(v
              ? { declinedReason: '' }
              : {
                  givenBy: null,
                  method: null,
                  personName: '',
                  personRelationship: '',
                }),
          })
        }
      />

      {consentDeclined ? (
        <FormField
          label="Why consent was not obtained"
          htmlFor="assessment-consent-declined"
          required
          hint="Document refusal, absence, or why the assessment could not proceed."
        >
          <Textarea
            id="assessment-consent-declined"
            value={value.declinedReason ?? ''}
            disabled={disabled}
            rows={3}
            onChange={(e) => patch({ declinedReason: e.target.value })}
          />
        </FormField>
      ) : null}

      {consentGranted ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Consent given by" htmlFor="assessment-consent-given-by" required>
            <Select
              value={value.givenBy ?? ''}
              onValueChange={(v) =>
                patch({
                  givenBy: v as AssessmentConsentMetadata['givenBy'],
                  ...(v === 'service_user'
                    ? { personName: '', personRelationship: '' }
                    : {}),
                })
              }
              disabled={disabled}
            >
              <SelectTrigger id="assessment-consent-given-by">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {ASSESSMENT_CONSENT_GIVEN_BY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Consent method" htmlFor="assessment-consent-method" required>
            <Select
              value={value.method ?? ''}
              onValueChange={(v) => patch({ method: v as AssessmentConsentMetadata['method'] })}
              disabled={disabled}
            >
              <SelectTrigger id="assessment-consent-method">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {ASSESSMENT_CONSENT_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Consent date" htmlFor="assessment-consent-date" required>
            <Input
              id="assessment-consent-date"
              type="date"
              value={value.consentDate ?? ''}
              disabled={disabled}
              onChange={(e) => patch({ consentDate: e.target.value })}
            />
          </FormField>

          <div className="sm:col-span-2">
            <InitialAssessmentYesNoCardField
              name="assessment-consent-capacity"
              label="Capacity to consent intact at time of assessment?"
              value={value.capacityIntact ?? null}
              disabled={disabled}
              onChange={(v) => patch({ capacityIntact: v })}
            />
          </div>

          {needsRepresentativeDetails ? (
            <>
              <FormField label="Name of person giving consent" htmlFor="assessment-consent-person" required>
                <Input
                  id="assessment-consent-person"
                  value={value.personName ?? ''}
                  disabled={disabled}
                  onChange={(e) => patch({ personName: e.target.value })}
                />
              </FormField>
              <FormField
                label="Relationship / role"
                htmlFor="assessment-consent-relationship"
                required
                hint="e.g. daughter, LPA for health and welfare, IMCA"
              >
                <Input
                  id="assessment-consent-relationship"
                  value={value.personRelationship ?? ''}
                  disabled={disabled}
                  onChange={(e) => patch({ personRelationship: e.target.value })}
                />
              </FormField>
            </>
          ) : null}

          <FormField
            label="Evidence note (optional)"
            htmlFor="assessment-consent-evidence"
            className="sm:col-span-2"
            hint="What was explained, who was present, or where written consent is filed."
          >
            <Textarea
              id="assessment-consent-evidence"
              value={value.evidenceNote ?? ''}
              disabled={disabled}
              rows={2}
              onChange={(e) => patch({ evidenceNote: e.target.value })}
            />
          </FormField>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {consentDeclined ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          You can save a declined consent record, but do not complete clinical scoring without valid
          consent or an appropriate best-interest decision.
        </p>
      ) : null}
    </section>
  )
}
