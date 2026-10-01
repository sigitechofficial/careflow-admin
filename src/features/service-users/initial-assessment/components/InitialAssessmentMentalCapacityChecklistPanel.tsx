import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  MENTAL_CAPACITY_CHECKLIST_ROWS,
  mentalCapacityAnswerKey,
  mentalCapacityAnswerValue,
  mentalCapacityCommentsKey,
  mentalCapacityCommentsValue,
  mentalCapacityRequiresDetailedAssessment,
  mentalCapacityShortCircuitComplete,
  type MentalCapacityAssessmentType,
  type MentalCapacityChecklistMetadata,
  type MentalCapacityQuestionId,
} from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'
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
  value: MentalCapacityChecklistMetadata
  disabled?: boolean
  /** Rows answered on the MCA Screening tab — shown read-only here (comments stay editable). */
  screeningSyncedIds?: ReadonlySet<MentalCapacityQuestionId>
  /** e.g. "Tab 7" — where the synced rows are answered. */
  screeningTabLabel?: string
  onChange: (
    updater:
      | MentalCapacityChecklistMetadata
      | ((prev: MentalCapacityChecklistMetadata) => MentalCapacityChecklistMetadata),
    options?: { immediate?: boolean },
  ) => void
}

function YesNoColumnCell({
  name,
  selected,
  column,
  disabled,
  ariaLabel,
  onSelect,
}: {
  name: string
  selected: boolean | null | undefined
  column: 'yes' | 'no'
  disabled?: boolean
  ariaLabel: string
  onSelect: (value: boolean) => void
}) {
  const checked = column === 'yes' ? selected === true : selected === false

  return (
    <HolisticAssessmentTableCell className="w-16 text-center align-middle">
      <label
        className={cn(
          'inline-flex cursor-pointer items-center justify-center',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          type="radio"
          name={name}
          value={column}
          className={IA_RADIO_CLASS}
          checked={checked}
          disabled={disabled}
          aria-label={`${ariaLabel} — ${column === 'yes' ? 'Yes' : 'No'}`}
          onChange={() => onSelect(column === 'yes')}
        />
      </label>
    </HolisticAssessmentTableCell>
  )
}

function AssessmentTypeRow({
  value,
  disabled,
  onChange,
}: {
  value: MentalCapacityAssessmentType | undefined
  disabled?: boolean
  onChange: (next: MentalCapacityAssessmentType) => void
}) {
  const options: { id: MentalCapacityAssessmentType; text: string }[] = [
    { id: 'preliminary', text: 'B1: Preliminary assessment' },
    { id: 'review', text: 'B2: Review assessment' },
  ]

  return (
    <div
      className="flex flex-col gap-3 border-b border-slate-300 bg-sky-100/70 p-4 dark:border-slate-600 dark:bg-sky-950/30 sm:flex-row sm:items-center sm:justify-center sm:gap-8"
      role="radiogroup"
      aria-label="Assessment type"
    >
      {options.map(({ id, text }) => (
        <label
          key={id}
          className={cn(
            'flex cursor-pointer items-center gap-2 font-medium',
            IA_OPTION_LABEL_CLASS,
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            type="radio"
            name="mca-checklist-type"
            className={IA_RADIO_CLASS}
            checked={value === id}
            disabled={disabled}
            onChange={() => onChange(id)}
          />
          {text}
        </label>
      ))}
    </div>
  )
}

export function InitialAssessmentMentalCapacityChecklistPanel({
  value,
  disabled,
  screeningSyncedIds,
  screeningTabLabel = 'MCA Screening',
  onChange,
}: Props) {
  const patch = (partial: Partial<MentalCapacityChecklistMetadata>, immediate?: boolean) =>
    onChange((prev) => ({ ...prev, ...partial }), { immediate })

  const patchQuestion = (id: MentalCapacityQuestionId, answer: boolean) => {
    patch({ [mentalCapacityAnswerKey(id)]: answer }, true)
  }

  const patchComments = (id: MentalCapacityQuestionId, comments: string) => {
    patch({ [mentalCapacityCommentsKey(id)]: comments })
  }

  const detailedRequired = mentalCapacityRequiresDetailedAssessment(value)
  const shortCircuit = mentalCapacityShortCircuitComplete(value)

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-mental-capacity-checklist-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader
          title="Assessment of Mental Capacity Check List"
          subtitle="This form is used to assess whether or not the client has the mental capacity to make key decisions affecting his / her daily living needs and chosen lifestyle."
        />

        <div className="space-y-6 border-t border-slate-200 bg-white dark:bg-card dark:border-slate-700">
          <AssessmentTypeRow
            value={value.assessmentType ?? null}
            disabled={disabled}
            onChange={(assessmentType) => patch({ assessmentType }, true)}
          />

          <div className="space-y-3 px-4 pb-4">
            <h4 className={IA_SUBSECTION_PANEL_HEADER_CLASS}>B: Assessment of mental capacity</h4>

            {shortCircuit ? (
              <p className={cn('text-sm', IA_HINT_CLASS)}>
                Both screening questions are No — the client has appropriate mental capacity. Sign and
                date section C below; detailed questions are not required.
              </p>
            ) : null}

            {screeningSyncedIds && screeningSyncedIds.size > 0 ? (
              <p className={cn('text-sm', IA_HINT_CLASS)} data-testid="ia-mca-checklist-synced-note">
                Questions 1–6 are answered once on MCA Screening ({screeningTabLabel}) and shown here
                read-only. Add comments below; change the answers on {screeningTabLabel}.
              </p>
            ) : null}

            {!detailedRequired && !shortCircuit ? (
              <p className={cn('text-sm', IA_HINT_CLASS)}>
                Complete questions 1 and 2 to determine whether the detailed assessment below is
                required.
              </p>
            ) : null}

            <HolisticAssessmentTable
              columns={[
                { key: 'number', header: '#', className: 'w-10 text-center' },
                { key: 'indicator', header: 'Performance indicator', className: 'w-[46%]' },
                { key: 'yes', header: 'Yes', className: 'w-[8%] text-center' },
                { key: 'no', header: 'No', className: 'w-[8%] text-center' },
                {
                  key: 'comments',
                  header: 'Comments / action required',
                  className: 'w-[28%]',
                },
              ]}
            >
              {MENTAL_CAPACITY_CHECKLIST_ROWS.map((row, index) => {
                if (row.kind === 'instruction' || row.kind === 'legalNote') {
                  return (
                    <HolisticAssessmentTableRow key={`${row.kind}-${index}`}>
                      <HolisticAssessmentTableCell colSpan={5} className="bg-slate-50 text-sm italic">
                        {row.label}
                      </HolisticAssessmentTableCell>
                    </HolisticAssessmentTableRow>
                  )
                }

                const answer = mentalCapacityAnswerValue(value, row.id)
                const comments = mentalCapacityCommentsValue(value, row.id) ?? ''
                const name = `mca-checklist-${row.id}`
                const rowDisabled =
                  disabled || (row.detailed === true && !detailedRequired)
                const answerLocked = rowDisabled || screeningSyncedIds?.has(row.id) === true

                return (
                  <HolisticAssessmentTableRow key={row.id}>
                    <HolisticAssessmentTableCell className="text-center align-top font-mono text-sm tabular-nums">
                      {row.number}
                    </HolisticAssessmentTableCell>
                    <HolisticAssessmentTableCell className="align-top text-sm">
                      {row.label}
                      {screeningSyncedIds?.has(row.id) ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          From MCA Screening ({screeningTabLabel})
                        </span>
                      ) : null}
                    </HolisticAssessmentTableCell>
                    <YesNoColumnCell
                      name={name}
                      selected={answer}
                      column="yes"
                      disabled={answerLocked}
                      ariaLabel={row.label}
                      onSelect={(v) => patchQuestion(row.id, v)}
                    />
                    <YesNoColumnCell
                      name={name}
                      selected={answer}
                      column="no"
                      disabled={answerLocked}
                      ariaLabel={row.label}
                      onSelect={(v) => patchQuestion(row.id, v)}
                    />
                    <HolisticAssessmentTableCell className="align-top">
                      <Textarea
                        className={cn('min-h-[72px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                        disabled={rowDisabled}
                        value={comments}
                        aria-label={`Comments for question ${row.number}`}
                        onChange={(e) => patchComments(row.id, e.target.value)}
                      />
                    </HolisticAssessmentTableCell>
                  </HolisticAssessmentTableRow>
                )
              })}
            </HolisticAssessmentTable>
          </div>

          <section className="space-y-4 border-t border-slate-200 px-4 py-4 dark:border-slate-700">
            <h4 className={IA_SUBSECTION_PANEL_HEADER_CLASS}>C: Signatures</h4>

            <div className="space-y-2">
              <Label htmlFor="mca-checklist-section-comments" className={IA_QUESTION_LABEL_CLASS}>
                Comments
              </Label>
              <Textarea
                id="mca-checklist-section-comments"
                className={cn('min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                disabled={disabled}
                value={value.sectionComments ?? ''}
                onChange={(e) => patch({ sectionComments: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="mca-checklist-assessor-name" className={IA_QUESTION_LABEL_CLASS}>
                  Assessor name (print)
                </Label>
                <Input
                  id="mca-checklist-assessor-name"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.assessorName ?? ''}
                  onChange={(e) => patch({ assessorName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mca-checklist-assessor-signature" className={IA_QUESTION_LABEL_CLASS}>
                  Assessor&apos;s signature
                </Label>
                <Input
                  id="mca-checklist-assessor-signature"
                  className="h-9 bg-background"
                  disabled={disabled}
                  placeholder="Signature"
                  value={value.assessorSignature ?? ''}
                  onChange={(e) => patch({ assessorSignature: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mca-checklist-assessor-position" className={IA_QUESTION_LABEL_CLASS}>
                  Position
                </Label>
                <Input
                  id="mca-checklist-assessor-position"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.assessorPosition ?? ''}
                  onChange={(e) => patch({ assessorPosition: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mca-checklist-assessor-date" className={IA_QUESTION_LABEL_CLASS}>
                  Date
                </Label>
                <Input
                  id="mca-checklist-assessor-date"
                  type="date"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.assessorDate?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    patch(
                      {
                        assessorDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : '',
                      },
                      true,
                    )
                  }
                />
              </div>
            </div>

            <p className="text-sm font-semibold text-foreground">
              Client / family member / advocate (as appropriate)
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="mca-checklist-rep-name" className={IA_QUESTION_LABEL_CLASS}>
                  Name (print)
                </Label>
                <Input
                  id="mca-checklist-rep-name"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.representativeName ?? ''}
                  onChange={(e) => patch({ representativeName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mca-checklist-rep-signature" className={IA_QUESTION_LABEL_CLASS}>
                  Signature
                </Label>
                <Input
                  id="mca-checklist-rep-signature"
                  className="h-9 bg-background"
                  disabled={disabled}
                  placeholder="Signature"
                  value={value.representativeSignature ?? ''}
                  onChange={(e) => patch({ representativeSignature: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mca-checklist-rep-relationship" className={IA_QUESTION_LABEL_CLASS}>
                  Relationship to client
                </Label>
                <Input
                  id="mca-checklist-rep-relationship"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.representativeRelationship ?? ''}
                  onChange={(e) => patch({ representativeRelationship: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mca-checklist-rep-date" className={IA_QUESTION_LABEL_CLASS}>
                  Date
                </Label>
                <Input
                  id="mca-checklist-rep-date"
                  type="date"
                  className="h-9 bg-background"
                  disabled={disabled}
                  value={value.representativeDate?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    patch(
                      {
                        representativeDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : '',
                      },
                      true,
                    )
                  }
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
