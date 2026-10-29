import type { ReactNode } from 'react'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import { InitialAssessmentYesNoCardField } from '@/features/service-users/initial-assessment/components/InitialAssessmentYesNoCardField'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  ACP_DISCUSSION_BRANCHES,
  ACP_FIVE_STEPS,
  THINKING_AHEAD_INTRO_PARAGRAPHS,
  type AdvanceCarePlanningMetadata,
  type AdvanceCarePlanningProxyContact,
} from '@/features/service-users/initial-assessment/utils/advance-care-planning'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SECTION_BODY_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: AdvanceCarePlanningMetadata
  disabled?: boolean
  onChange: (next: AdvanceCarePlanningMetadata) => void
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className={IA_QUESTION_LABEL_CLASS}>
      {children}
    </Label>
  )
}

function LpoaYesNo({
  name,
  value,
  disabled,
  onChange,
}: {
  name: string
  value: boolean | null | undefined
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3" role="radiogroup" aria-label="LPA">
      <span className="text-sm text-muted-foreground">LPA</span>
      {(
        [
          { v: true, text: 'Y' },
          { v: false, text: 'N' },
        ] as const
      ).map(({ v, text }) => (
        <label
          key={text}
          className={cn(
            'flex cursor-pointer items-center gap-1',
            IA_OPTION_LABEL_CLASS,
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            type="radio"
            name={name}
            className={IA_RADIO_CLASS}
            checked={value === v}
            disabled={disabled}
            onChange={() => onChange(v)}
          />
          {text}
        </label>
      ))}
    </div>
  )
}

export function InitialAssessmentAdvanceCarePlanningPanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<AdvanceCarePlanningMetadata>) => onChange({ ...value, ...partial })

  const patchProxy = (index: 1 | 2, partial: Partial<AdvanceCarePlanningProxyContact>) => {
    const key = index === 1 ? 'proxyContact1' : 'proxyContact2'
    patch({ [key]: { ...value[key], ...partial } })
  }

  const dateValue = (iso?: string) => iso?.slice(0, 10) ?? ''
  const setDate = (key: keyof AdvanceCarePlanningMetadata, raw: string) =>
    patch({ [key]: raw ? `${raw}T00:00:00.000Z` : undefined })

  return (
    <div className={cn(IA_SECTION_BODY_CLASS, 'space-y-6')} data-testid="ia-advance-care-planning-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Advance Care Planning (ACP)" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <div className="flex flex-wrap gap-1">
            {ACP_FIVE_STEPS.map((step) => (
              <div
                key={step.number}
                className="flex min-w-[5.5rem] flex-1 items-center justify-center rounded-sm bg-sky-900 px-2 py-1.5 text-center text-xs font-semibold text-white"
              >
                {step.number}. {step.title}
              </div>
            ))}
          </div>

          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ACP_FIVE_STEPS.map((step) => (
              <li
                key={step.number}
                className="rounded-sm border border-violet-200 bg-violet-50/80 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/30"
              >
                <span className="font-semibold text-foreground">
                  {step.number}. {step.title}
                </span>
                <span className="text-foreground"> — {step.text}</span>
              </li>
            ))}
          </ol>

          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Advance Care Planning Discussions</h4>
            <div className="rounded-sm border border-teal-300 bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white dark:border-teal-800">
              Advance Care Planning
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {ACP_DISCUSSION_BRANCHES.map((branch) => (
                <div
                  key={branch.title}
                  className="overflow-hidden rounded-sm border border-teal-200 dark:border-teal-900"
                >
                  <div className="bg-teal-100/90 px-3 py-2 text-center text-xs font-semibold text-teal-950 dark:bg-teal-950/50 dark:text-teal-100">
                    {branch.title}
                  </div>
                  <p className="bg-teal-50/50 px-3 py-3 text-center text-sm text-foreground dark:bg-teal-950/20">
                    {branch.content}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-muted-foreground">
              In line with the UK Mental Capacity Act
            </p>
          </section>
        </div>
      </div>

      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="'Thinking Ahead' – Allforcare Advance Care Planning Discussion" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <div className="space-y-2">
            {THINKING_AHEAD_INTRO_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph} className={cn('text-sm', IA_HINT_CLASS)}>
                {paragraph}
              </p>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <FieldLabel htmlFor="acp-patient-name">My name</FieldLabel>
                <Input
                  id="acp-patient-name"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.patientName ?? ''}
                  onChange={(e) => patch({ patientName: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="acp-address">My address</FieldLabel>
                <Textarea
                  id="acp-address"
                  className={cn('mt-1 min-h-[80px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                  disabled={disabled}
                  value={value.address ?? ''}
                  onChange={(e) => patch({ address: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="acp-dob">My date of birth</FieldLabel>
                  <Input
                    id="acp-dob"
                    type="date"
                    className="mt-1 h-10"
                    disabled={disabled}
                    value={dateValue(value.dateOfBirth)}
                    onChange={(e) => setDate('dateOfBirth', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="acp-nhs">My hospital or NHS number</FieldLabel>
                  <Input
                    id="acp-nhs"
                    className="mt-1 h-10"
                    disabled={disabled}
                    value={value.hospitalOrNhsNumber ?? ''}
                    onChange={(e) => patch({ hospitalOrNhsNumber: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel htmlFor="acp-date-completed">Date completed</FieldLabel>
                <Input
                  id="acp-date-completed"
                  type="date"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={dateValue(value.dateCompleted)}
                  onChange={(e) => setDate('dateCompleted', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="acp-gp">My GP details</FieldLabel>
                <Textarea
                  id="acp-gp"
                  className={cn('mt-1 min-h-[80px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                  disabled={disabled}
                  value={value.gpDetails ?? ''}
                  onChange={(e) => patch({ gpDetails: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="acp-hospital-contact">My hospital contact</FieldLabel>
                <Input
                  id="acp-hospital-contact"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.hospitalContact ?? ''}
                  onChange={(e) => patch({ hospitalContact: e.target.value })}
                />
              </div>
            </div>
          </div>

          <section className="space-y-3 rounded-sm border border-slate-300 p-4 dark:border-slate-600">
            <p className="text-sm font-medium text-foreground">
              The family members involved in my Advance Care Planning discussions:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="acp-family-name">Their name</FieldLabel>
                <Input
                  id="acp-family-name"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.familyMemberName ?? ''}
                  onChange={(e) => patch({ familyMemberName: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="acp-family-tel">Their contact number</FieldLabel>
                <Input
                  id="acp-family-tel"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.familyContactTel ?? ''}
                  onChange={(e) => patch({ familyContactTel: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-sm border border-slate-300 p-4 dark:border-slate-600">
            <p className="text-sm font-medium text-foreground">
              The Care Professional involved in my Advance Care Planning discussions:
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <FieldLabel htmlFor="acp-professional-name">Their name</FieldLabel>
                <Input
                  id="acp-professional-name"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.professionalName ?? ''}
                  onChange={(e) => patch({ professionalName: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="acp-professional-role">Their role</FieldLabel>
                <Input
                  id="acp-professional-role"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.professionalRole ?? ''}
                  onChange={(e) => patch({ professionalRole: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="acp-professional-tel">Their contact number</FieldLabel>
                <Input
                  id="acp-professional-tel"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.professionalContactTel ?? ''}
                  onChange={(e) => patch({ professionalContactTel: e.target.value })}
                />
              </div>
            </div>
          </section>

          <div className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {(
                  [
                    {
                      sigKey: 'patientSignature' as const,
                      dateKey: 'patientSignatureDate' as const,
                      label: 'My signature',
                    },
                    {
                      sigKey: 'nextOfKinSignature' as const,
                      dateKey: 'nextOfKinSignatureDate' as const,
                      label: "My next of kin's or carer's signature (if present)",
                    },
                    {
                      sigKey: 'homecareProfessionalSignature' as const,
                      dateKey: 'homecareProfessionalSignatureDate' as const,
                      label: "Care Professional's signature",
                    },
                  ] as const
                ).map((row) => (
                  <tr key={row.sigKey} className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
                    <td className="w-1/2 border-r border-slate-200 p-3 align-top dark:border-slate-700">
                      <FieldLabel htmlFor={`acp-${row.sigKey}`}>{row.label}</FieldLabel>
                      <Input
                        id={`acp-${row.sigKey}`}
                        className="mt-1 h-10"
                        disabled={disabled}
                        value={value[row.sigKey] ?? ''}
                        onChange={(e) => patch({ [row.sigKey]: e.target.value })}
                      />
                    </td>
                    <td className="w-1/2 p-3 align-top">
                      <FieldLabel htmlFor={`acp-${row.dateKey}`}>Date</FieldLabel>
                      <Input
                        id={`acp-${row.dateKey}`}
                        type="date"
                        className="mt-1 h-10 max-w-xs"
                        disabled={disabled}
                        value={dateValue(value[row.dateKey])}
                        onChange={(e) => setDate(row.dateKey, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <FieldLabel htmlFor="acp-review-date">Review date</FieldLabel>
            <Input
              id="acp-review-date"
              type="date"
              className="mt-1 h-10 max-w-xs"
              disabled={disabled}
              value={dateValue(value.reviewDate)}
              onChange={(e) => setDate('reviewDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <div className={IA_SUBSECTION_PANEL_HEADER_CLASS}>
          <h4 className="text-sm font-semibold text-foreground">Thinking ahead….</h4>
        </div>

        <div className="space-y-6 p-4">
          <div>
            <FieldLabel htmlFor="acp-personal-values">
              1. At this time in my life, what makes me happy or is important to me:
            </FieldLabel>
            <Textarea
              id="acp-personal-values"
              className={cn('mt-1 min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.personalValues ?? ''}
              onChange={(e) => patch({ personalValues: e.target.value })}
            />
          </div>

          <div>
            <FieldLabel htmlFor="acp-care-preferences">
              2. The parts of my care that are important to me, and what I would like to happen in future:
            </FieldLabel>
            <Textarea
              id="acp-care-preferences"
              className={cn('mt-1 min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.carePreferences ?? ''}
              onChange={(e) => patch({ carePreferences: e.target.value })}
            />
          </div>

          <div>
            <FieldLabel htmlFor="acp-concerns">
              3. What I would NOT want to happen, and anything I worry about or fear happening:
            </FieldLabel>
            <Textarea
              id="acp-concerns"
              className={cn('mt-1 min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.concernsAndFears ?? ''}
              onChange={(e) => patch({ concernsAndFears: e.target.value })}
            />
          </div>

          <div className="space-y-3 rounded-sm border border-slate-300 p-4 dark:border-slate-600">
            <InitialAssessmentYesNoCardField
              name="acp-legal-adrt"
              label="4. Do I have a legal Advance Decision to Refuse Treatment (ADRT)? (This is in keeping with the Mental Capacity Act (2005) and enables people to make decisions that will be useful if at some future stage they can no longer express their views themselves)"
              yesText="Yes – I have an Advance Decision to Refuse Treatment"
              noText="No – I do not have an Advance Decision to Refuse Treatment"
              value={value.legalAdvanceDecision ?? null}
              disabled={disabled}
              showDivider={false}
              onChange={(v) =>
                patch({
                  legalAdvanceDecision: v,
                  ...(v ? {} : { legalAdvanceDecisionDetails: undefined }),
                })
              }
            />
            {value.legalAdvanceDecision === true ? (
              <div>
                <FieldLabel htmlFor="acp-adrt-details">
                  Details of my Advance Decision and who has a copy
                </FieldLabel>
                <Input
                  id="acp-adrt-details"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.legalAdvanceDecisionDetails ?? ''}
                  onChange={(e) => patch({ legalAdvanceDecisionDetails: e.target.value })}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <p className={IA_QUESTION_LABEL_CLASS}>
              5. Who I would like to be involved if it becomes difficult for me to make decisions, or in
              an emergency, and whether they have a Lasting Power of Attorney (LPA):
            </p>
            {([1, 2] as const).map((index) => (
              <div
                key={index}
                className="grid gap-3 rounded-sm border border-slate-300 p-4 sm:grid-cols-[1fr_1fr_auto] dark:border-slate-600"
              >
                <div>
                  <FieldLabel htmlFor={`acp-proxy-${index}-name`}>Their name</FieldLabel>
                  <Input
                    id={`acp-proxy-${index}-name`}
                    className="mt-1 h-10"
                    disabled={disabled}
                    value={value[index === 1 ? 'proxyContact1' : 'proxyContact2']?.name ?? ''}
                    onChange={(e) => patchProxy(index, { name: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor={`acp-proxy-${index}-tel`}>Their contact number</FieldLabel>
                  <Input
                    id={`acp-proxy-${index}-tel`}
                    className="mt-1 h-10"
                    disabled={disabled}
                    value={value[index === 1 ? 'proxyContact1' : 'proxyContact2']?.tel ?? ''}
                    onChange={(e) => patchProxy(index, { tel: e.target.value })}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <LpoaYesNo
                    name={`acp-proxy-${index}-lpoa`}
                    value={value[index === 1 ? 'proxyContact1' : 'proxyContact2']?.lpoa}
                    disabled={disabled}
                    onChange={(v) => patchProxy(index, { lpoa: v })}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <FieldLabel>
              6. If my condition gets worse, where I would most like to be cared for:
            </FieldLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="acp-place-1">My 1st choice</FieldLabel>
                <Input
                  id="acp-place-1"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.placeOfCareFirstChoice ?? ''}
                  onChange={(e) => patch({ placeOfCareFirstChoice: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="acp-place-2">My 2nd choice</FieldLabel>
                <Input
                  id="acp-place-2"
                  className="mt-1 h-10"
                  disabled={disabled}
                  value={value.placeOfCareSecondChoice ?? ''}
                  onChange={(e) => patch({ placeOfCareSecondChoice: e.target.value })}
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="acp-place-comments">My comments</FieldLabel>
              <Textarea
                id="acp-place-comments"
                className={cn('mt-1 min-h-[80px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                disabled={disabled}
                value={value.placeOfCareComments ?? ''}
                onChange={(e) => patch({ placeOfCareComments: e.target.value })}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="acp-special-requests">
              7. Any special requests, preferences or other comments I have:
            </FieldLabel>
            <Textarea
              id="acp-special-requests"
              className={cn('mt-1 min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.specialRequests ?? ''}
              onChange={(e) => patch({ specialRequests: e.target.value })}
            />
          </div>

          <div>
            <FieldLabel htmlFor="acp-third-party">
              8. Comments or additions from people I am close to (please name them):
            </FieldLabel>
            <Textarea
              id="acp-third-party"
              className={cn('mt-1 min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.thirdPartyComments ?? ''}
              onChange={(e) => patch({ thirdPartyComments: e.target.value })}
            />
          </div>

          <p className={cn('text-sm', IA_HINT_CLASS)}>
            Please also check for any separate DNACPR/AND or ADRT documents I have.
          </p>
        </div>
      </div>
    </div>
  )
}
