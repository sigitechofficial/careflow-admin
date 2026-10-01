import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  PHOTOGRAPHY_CONSENT_STATEMENTS,
  type PhotographyConsentGender,
  type PhotographyConsentMetadata,
} from '@/features/service-users/initial-assessment/utils/photography-consent'
import {
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SECTION_BODY_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: PhotographyConsentMetadata
  disabled?: boolean
  onChange: (next: PhotographyConsentMetadata) => void
}

function GenderCheckboxes({
  value,
  disabled,
  onChange,
}: {
  value: PhotographyConsentGender | undefined
  disabled?: boolean
  onChange: (next: PhotographyConsentGender) => void
}) {
  const options: { id: PhotographyConsentGender; label: string }[] = [
    { id: 'male', label: 'Male' },
    { id: 'female', label: 'Female' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-4" role="radiogroup" aria-label="Gender">
      {options.map((opt) => (
        <label
          key={opt.id}
          className={cn(
            'flex cursor-pointer items-center gap-2',
            IA_OPTION_LABEL_CLASS,
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            type="radio"
            name="photography-consent-gender"
            className={IA_RADIO_CLASS}
            checked={value === opt.id}
            disabled={disabled}
            onChange={() => onChange(opt.id)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

export function InitialAssessmentPhotographyConsentPanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<PhotographyConsentMetadata>) => onChange({ ...value, ...partial })

  const dateValue = (iso?: string) => iso?.slice(0, 10) ?? ''
  const setDate = (key: keyof PhotographyConsentMetadata, raw: string) =>
    patch({ [key]: raw ? `${raw}T00:00:00.000Z` : undefined })

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-photography-consent-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Photography consent" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <div className="grid gap-0 overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600 lg:grid-cols-2">
            <div className="space-y-2 border-b border-slate-300 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-900/40 lg:border-b-0 lg:border-r">
              <p className="text-sm font-semibold text-foreground">Allfor Care Services</p>
              <p className="text-sm text-foreground">Client, Parent or Guardian agreement for</p>
              <p className="text-sm font-semibold text-foreground">
                Photography for clinical use and best practices only
              </p>
              <p className="text-xs text-muted-foreground">
                (Record of condition, diagnostic requirement, planning treatment)
              </p>
            </div>

            <div className="space-y-3 p-4">
              <div className="space-y-1">
                <Label htmlFor="photo-consent-surname" className={IA_QUESTION_LABEL_CLASS}>
                  Client&apos;s surname / family name
                </Label>
                <Input
                  id="photo-consent-surname"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.surname ?? ''}
                  onChange={(e) => patch({ surname: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="photo-consent-first-names" className={IA_QUESTION_LABEL_CLASS}>
                  Client&apos;s first names
                </Label>
                <Input
                  id="photo-consent-first-names"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.firstNames ?? ''}
                  onChange={(e) => patch({ firstNames: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="photo-consent-dob" className={IA_QUESTION_LABEL_CLASS}>
                    Date of birth
                  </Label>
                  <Input
                    id="photo-consent-dob"
                    type="date"
                    className="h-9 bg-background"
                    disabled={disabled}
                    value={dateValue(value.dateOfBirth)}
                    onChange={(e) => setDate('dateOfBirth', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="photo-consent-nhs" className={IA_QUESTION_LABEL_CLASS}>
                    NHS number (or other identifier)
                  </Label>
                  <Input
                    id="photo-consent-nhs"
                    className="h-9 bg-background"
                    disabled={disabled}
                    value={value.nhsNumber ?? ''}
                    onChange={(e) => patch({ nhsNumber: e.target.value })}
                  />
                </div>
              </div>
              <GenderCheckboxes
                value={value.gender}
                disabled={disabled}
                onChange={(gender) => patch({ gender })}
              />
              <div className="space-y-1">
                <Label htmlFor="photo-consent-special" className={IA_QUESTION_LABEL_CLASS}>
                  Special requirements (e.g. other language / other communication method)
                </Label>
                <Input
                  id="photo-consent-special"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.specialRequirements ?? ''}
                  onChange={(e) => patch({ specialRequirements: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="photo-consent-professional" className={IA_QUESTION_LABEL_CLASS}>
                  Health &amp; Social care professional seeking consent
                </Label>
                <Input
                  id="photo-consent-professional"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.professionalName ?? ''}
                  onChange={(e) => patch({ professionalName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="photo-consent-job-title" className={IA_QUESTION_LABEL_CLASS}>
                  Job title
                </Label>
                <Input
                  id="photo-consent-job-title"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.professionalJobTitle ?? ''}
                  onChange={(e) => patch({ professionalJobTitle: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-foreground">
            <p className="flex flex-wrap items-baseline gap-1">
              <span>I hereby give consent for</span>
              <Input
                className="inline-flex h-8 min-w-[12rem] max-w-full flex-1 bg-background"
                disabled={disabled}
                aria-label="Person to be photographed"
                value={value.consentSubjectName ?? ''}
                onChange={(e) => patch({ consentSubjectName: e.target.value })}
              />
              <span>
                to be photographed for a record of condition, planning of treatment, diagnostic
                treatment.
              </span>
            </p>
            {PHOTOGRAPHY_CONSENT_STATEMENTS.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          <section className="space-y-4 rounded-sm border border-slate-300 p-4 dark:border-slate-600">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1">
                <Label htmlFor="photo-consent-signature" className={IA_QUESTION_LABEL_CLASS}>
                  Signature
                </Label>
                <Input
                  id="photo-consent-signature"
                  className="h-9 bg-background"
                  disabled={disabled}
                  placeholder="Signature"
                  value={value.consentSignature ?? ''}
                  onChange={(e) => patch({ consentSignature: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:w-40">
                <Label htmlFor="photo-consent-date" className={IA_QUESTION_LABEL_CLASS}>
                  Date
                </Label>
                <Input
                  id="photo-consent-date"
                  type="date"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={dateValue(value.consentDate)}
                  onChange={(e) => setDate('consentDate', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="photo-consent-print-name" className={IA_QUESTION_LABEL_CLASS}>
                Print name
              </Label>
              <Input
                id="photo-consent-print-name"
                className="h-9 bg-background"
                disabled={disabled}
                value={value.consentPrintName ?? ''}
                onChange={(e) => patch({ consentPrintName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="photo-consent-relationship" className={IA_QUESTION_LABEL_CLASS}>
                If not client, please state relationship
              </Label>
              <Input
                id="photo-consent-relationship"
                className="h-9 bg-background"
                disabled={disabled}
                value={value.consentRelationship ?? ''}
                onChange={(e) => patch({ consentRelationship: e.target.value })}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <div className="grid lg:grid-cols-2">
              <div className="space-y-3 border-b border-slate-300 p-4 dark:border-slate-600 lg:border-b-0 lg:border-r">
                <h4 className={IA_SUBSECTION_PANEL_HEADER_CLASS}>Service user</h4>
                <div className="space-y-1">
                  <Label htmlFor="photo-consent-su-name" className={IA_QUESTION_LABEL_CLASS}>
                    Service user name
                  </Label>
                  <Input
                    id="photo-consent-su-name"
                    className="h-9 bg-background"
                    disabled={disabled}
                    value={value.serviceUserName ?? ''}
                    onChange={(e) => patch({ serviceUserName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="photo-consent-su-signature" className={IA_QUESTION_LABEL_CLASS}>
                    Signature
                  </Label>
                  <Input
                    id="photo-consent-su-signature"
                    className="h-9 bg-background"
                    disabled={disabled}
                    placeholder="Signature"
                    value={value.serviceUserSignature ?? ''}
                    onChange={(e) => patch({ serviceUserSignature: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="photo-consent-su-date" className={IA_QUESTION_LABEL_CLASS}>
                    Date
                  </Label>
                  <Input
                    id="photo-consent-su-date"
                    type="date"
                    className="h-9 bg-background"
                    disabled={disabled}
                    value={dateValue(value.serviceUserDate)}
                    onChange={(e) => setDate('serviceUserDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3 p-4">
                <h4 className={IA_SUBSECTION_PANEL_HEADER_CLASS}>LPA</h4>
                <div className="space-y-1">
                  <Label htmlFor="photo-consent-lpoa-name" className={IA_QUESTION_LABEL_CLASS}>
                    LPA name
                  </Label>
                  <Input
                    id="photo-consent-lpoa-name"
                    className="h-9 bg-background"
                    disabled={disabled}
                    value={value.lpoaName ?? ''}
                    onChange={(e) => patch({ lpoaName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="photo-consent-lpoa-signature" className={IA_QUESTION_LABEL_CLASS}>
                    Signature
                  </Label>
                  <Input
                    id="photo-consent-lpoa-signature"
                    className="h-9 bg-background"
                    disabled={disabled}
                    placeholder="Signature"
                    value={value.lpoaSignature ?? ''}
                    onChange={(e) => patch({ lpoaSignature: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="photo-consent-lpoa-date" className={IA_QUESTION_LABEL_CLASS}>
                    Date
                  </Label>
                  <Input
                    id="photo-consent-lpoa-date"
                    type="date"
                    className="h-9 bg-background"
                    disabled={disabled}
                    value={dateValue(value.lpoaDate)}
                    onChange={(e) => setDate('lpoaDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
