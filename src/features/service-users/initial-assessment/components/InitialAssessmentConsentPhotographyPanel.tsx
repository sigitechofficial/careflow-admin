import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'
import type { ServiceUserDetail } from '@/features/service-users/api/service-users.api'
import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  CONSENT_GIVER_LABEL,
  type ConsentGiver,
} from '@/features/service-users/initial-assessment/utils/consent-capacity'
import {
  IA_CHECKBOX_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  PHOTOGRAPHY_CONSENT_STATEMENTS,
  PHOTOGRAPHY_NEEDED_OPTIONS,
  type PhotographyConsentMetadata,
  type PhotographyNeeded,
} from '@/features/service-users/initial-assessment/utils/photography-consent'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { cn, formatDate } from '@/shared/lib/utils'

const GIVER_FIELD_LABELS: Record<Exclude<ConsentGiver, 'service_user'>, { name: string; relationship: string }> = {
  lpa: { name: 'Attorney name', relationship: 'Relationship to the service user' },
  deputy: { name: 'Deputy name', relationship: 'Relationship / role' },
  court_order: { name: 'Authorised person', relationship: 'Relationship / role' },
  best_interest: { name: 'Best interest decision made by', relationship: 'Role' },
  capacity_to_be_assessed: { name: 'Consent given by', relationship: 'Relationship / role' },
}

type Props = {
  value: PhotographyConsentMetadata
  /** From the Consent tab (capacity doubt + legal authority) — photography consent follows the same person. */
  consentGiver: ConsentGiver
  /** Attorney / deputy named on the Consent tab — prefills the giver's name. */
  decisionMakerName?: string
  serviceUserDetail?: ServiceUserDetail | null
  disabled?: boolean
  onChange: (next: PhotographyConsentMetadata) => void
  /** Consent tab: render as plain rows (no panel header / border). */
  bare?: boolean
}

const PHOTOGRAPHY_HINT = 'Only needed when photos of wounds, pressure areas or skin conditions will be taken.'

function todayIso(): string {
  return `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
}

/**
 * Consent tab photography block: one gate question, and only when photos are needed a short record.
 * Identity comes from the service user profile and signer from §2.1, so neither is asked again.
 * (The full paper form stays on the standalone Photography consent assessment tool.)
 */
export function InitialAssessmentConsentPhotographyPanel({
  value,
  consentGiver,
  decisionMakerName,
  serviceUserDetail,
  disabled,
  onChange,
  bare = false,
}: Props) {
  const staff = useAuthStore((s) => s.user)
  const patch = (partial: Partial<PhotographyConsentMetadata>) => onChange({ ...value, ...partial })

  const firstName = serviceUserDetail?.firstName?.trim() ?? ''
  const lastName = serviceUserDetail?.lastName?.trim() ?? ''
  const serviceUserName = [firstName, lastName].filter(Boolean).join(' ')
  const dateOfBirth = serviceUserDetail?.dateOfBirth ?? undefined
  const nhsNumber = serviceUserDetail?.nhsNumber ?? undefined
  const givenBySelf = consentGiver === 'service_user'
  const giverLabels = givenBySelf ? null : GIVER_FIELD_LABELS[consentGiver]

  const selectNeeded = (photographyNeeded: PhotographyNeeded) => {
    if (photographyNeeded !== 'yes') {
      patch({ photographyNeeded })
      return
    }
    // Snapshot identity + staff so the stored record stands on its own (and the promoted assessment has it).
    patch({
      photographyNeeded,
      surname: value.surname || lastName || undefined,
      firstNames: value.firstNames || firstName || undefined,
      dateOfBirth: value.dateOfBirth || dateOfBirth,
      nhsNumber: value.nhsNumber || nhsNumber,
      consentSubjectName: value.consentSubjectName || serviceUserName || undefined,
      professionalName: value.professionalName || staff?.displayName || undefined,
      professionalJobTitle: value.professionalJobTitle || staff?.jobTitle || undefined,
      consentPrintName:
        value.consentPrintName ||
        (givenBySelf ? serviceUserName : consentGiver === 'best_interest' ? undefined : decisionMakerName) ||
        undefined,
    })
  }

  // When the service user gives consent themselves, their name is the signer — keep it in step with the tab.
  const selfSignerOutOfDate =
    value.photographyNeeded === 'yes' &&
    givenBySelf &&
    Boolean(serviceUserName) &&
    (value.consentPrintName !== serviceUserName || Boolean(value.consentRelationship))
  React.useEffect(() => {
    if (selfSignerOutOfDate && !disabled) {
      onChange({ ...value, consentPrintName: serviceUserName, consentRelationship: undefined })
    }
  }, [selfSignerOutOfDate, disabled, onChange, value, serviceUserName])

  const setAgreed = (statementsAgreed: boolean) =>
    patch({
      statementsAgreed: statementsAgreed || undefined,
      consentDate: statementsAgreed && !value.consentDate ? todayIso() : value.consentDate,
    })

  const identityLine = [
    serviceUserName || 'Service user',
    dateOfBirth ? `DOB ${formatDate(dateOfBirth)}` : null,
    nhsNumber ? `NHS ${nhsNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const content = (
    <>
      <InitialAssessmentSection12FieldRow>
        <fieldset className="space-y-2">
          <legend className={IA_QUESTION_LABEL_CLASS}>Will clinical photographs be needed?</legend>
          {bare ? <p className={IA_HINT_CLASS}>{PHOTOGRAPHY_HINT}</p> : null}
          <div className="flex flex-wrap items-center gap-5" role="radiogroup">
            {PHOTOGRAPHY_NEEDED_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2',
                  IA_OPTION_LABEL_CLASS,
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  type="radio"
                  name="ia-photography-needed"
                  className={IA_RADIO_CLASS}
                  checked={value.photographyNeeded === opt.value}
                  disabled={disabled}
                  onChange={() => selectNeeded(opt.value)}
                  data-testid={`ia-photography-needed-${opt.value}`}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {value.photographyNeeded === 'not_now' ? (
            <p className={IA_HINT_CLASS}>Record consent here if a wound or skin concern appears later.</p>
          ) : null}
        </fieldset>
      </InitialAssessmentSection12FieldRow>

      {value.photographyNeeded === 'yes' ? (
        <div className="space-y-4" data-testid="ia-photography-consent-record">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">{identityLine}</p>
            <p className={IA_HINT_CLASS}>
              From the service user profile · Consent given by:{' '}
              <span className="font-medium text-foreground">
                {CONSENT_GIVER_LABEL[consentGiver]}
              </span>
            </p>
            {consentGiver === 'capacity_to_be_assessed' ? (
              <p className="mt-1 text-amber-800 dark:text-amber-300" data-testid="ia-photography-capacity-pending">
                Capacity is in doubt but not yet assessed. Complete the MCA first — an attorney or deputy
                can only agree once the person lacks capacity for this decision, and only within their
                authority.
              </p>
            ) : null}
          </div>

          <div className="space-y-2 text-sm text-foreground">
            <p>
              Photographs are for clinical use only — a record of condition, diagnosis and planning of
              treatment.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {PHOTOGRAPHY_CONSENT_STATEMENTS.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </div>

          {giverLabels ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ia-photo-giver-name" className={IA_QUESTION_LABEL_CLASS}>
                  {giverLabels.name}
                </Label>
                <Input
                  id="ia-photo-giver-name"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.consentPrintName ?? ''}
                  onChange={(e) => patch({ consentPrintName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ia-photo-giver-relationship" className={IA_QUESTION_LABEL_CLASS}>
                  {giverLabels.relationship}
                </Label>
                <Input
                  id="ia-photo-giver-relationship"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.consentRelationship ?? ''}
                  onChange={(e) => patch({ consentRelationship: e.target.value })}
                />
              </div>
            </div>
          ) : null}

          <label
            className={cn(
              'flex cursor-pointer items-start gap-2',
              IA_OPTION_LABEL_CLASS,
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="checkbox"
              className={cn(IA_CHECKBOX_CLASS, 'mt-0.5')}
              checked={value.statementsAgreed === true}
              disabled={disabled}
              onChange={(e) => setAgreed(e.target.checked)}
              data-testid="ia-photography-statements-agreed"
            />
            The statements above were explained and consent to clinical photography was given.
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
            <div className="space-y-1">
              <Label htmlFor="ia-photo-staff-name" className={IA_QUESTION_LABEL_CLASS}>
                Consent taken by
              </Label>
              <Input
                id="ia-photo-staff-name"
                className="h-9 bg-background"
                disabled={disabled}
                value={value.professionalName ?? ''}
                onChange={(e) => patch({ professionalName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ia-photo-staff-job" className={IA_QUESTION_LABEL_CLASS}>
                Job title
              </Label>
              <Input
                id="ia-photo-staff-job"
                className="h-9 bg-background"
                disabled={disabled}
                value={value.professionalJobTitle ?? ''}
                onChange={(e) => patch({ professionalJobTitle: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ia-photo-date" className={IA_QUESTION_LABEL_CLASS}>
                Date
              </Label>
              <Input
                id="ia-photo-date"
                type="date"
                className="h-9 bg-background"
                disabled={disabled}
                value={value.consentDate?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  patch({ consentDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined })
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )

  return bare ? (
    <div data-testid="ia-consent-photography-panel">{content}</div>
  ) : (
    <InitialAssessmentSection12PanelShell
      title="Clinical photography"
      hint={PHOTOGRAPHY_HINT}
      bodyVariant="content"
      testId="ia-consent-photography-panel"
    >
      {content}
    </InitialAssessmentSection12PanelShell>
  )
}
