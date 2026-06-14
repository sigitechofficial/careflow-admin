import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentYesNoCardField } from '@/features/service-users/initial-assessment/components/InitialAssessmentYesNoCardField'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import {
  MCA_FUNCTIONAL_FIELD_KEYS,
  MCA_TWO_STAGE_FIELD_KEYS,
} from '@/features/service-users/initial-assessment/utils/mca-screening'
import {
  MCA_SCREENING_OUTCOME_OPTIONS,
  type McaScreeningStandaloneMetadata,
} from '@/features/service-users/initial-assessment/utils/mca-screening-standalone'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

const FUNCTIONAL_LABELS: Record<(typeof MCA_FUNCTIONAL_FIELD_KEYS)[number], string> = {
  mcaFunctionalUnderstand:
    'Can the person understand the provided information relevant to the decision?',
  mcaFunctionalRetain: 'Can the person retain the information given?',
  mcaFunctionalWeigh:
    'Can the person use or weigh the information given as part of their decision making process?',
  mcaFunctionalCommunicate:
    'Can the person communicate their decision? (whether by talking or any other means)',
}

type Props = {
  value: McaScreeningStandaloneMetadata
  disabled?: boolean
  onChange: (next: McaScreeningStandaloneMetadata) => void
}

export function InitialAssessmentMcaScreeningStandalonePanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<McaScreeningStandaloneMetadata>) => onChange({ ...value, ...partial })

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-mca-screening-standalone-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader
          title="Initial mental capacity act screening tool"
          subtitle="The two stage test of mental capacity"
        />

        <div className="space-y-4 border border-slate-300 bg-white p-4 dark:border-slate-600">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              1. Does the person have an impairment or disturbance in the functioning of the mind or
              brain?
            </p>
            <p className={IA_HINT_CLASS}>
              (It does not matter whether the impairment or disturbance is temporary or permanent.)
            </p>
            <InitialAssessmentYesNoCardField
              name="mca-stage1-impairment"
              label=""
              value={value.mcaStage1Impairment ?? null}
              disabled={disabled}
              onChange={(next) => patch({ mcaStage1Impairment: next })}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              2. Does that impairment or disturbance mean that the person is unable to make the
              decision in question at the time that it needs to be made?
            </p>
            <InitialAssessmentYesNoCardField
              name="mca-stage2-unable"
              label=""
              value={value.mcaStage2UnableToDecide ?? null}
              disabled={disabled}
              onChange={(next) => patch({ mcaStage2UnableToDecide: next })}
            />
          </div>
        </div>

        <InitialAssessmentSection12PanelShell
          title="Functional assessment"
          hint="Answer Yes or No for each criterion."
          testId="ia-mca-functional-table"
          bodyVariant="content"
        >
          <HolisticAssessmentTable
            columns={[
              { key: 'question', header: 'Question', className: 'w-[62%]' },
              { key: 'assessment', header: 'Yes / No', className: 'w-[38%]' },
            ]}
          >
            {MCA_FUNCTIONAL_FIELD_KEYS.map((key, index) => (
              <HolisticAssessmentTableRow key={key}>
                <HolisticAssessmentTableCell className="align-top text-sm font-medium">
                  {index + 1}. {FUNCTIONAL_LABELS[key]}
                </HolisticAssessmentTableCell>
                <HolisticAssessmentTableCell className="align-top">
                  <InitialAssessmentYesNoCardField
                    name={`mca-functional-${key}`}
                    label=""
                    compact
                    value={value[key] ?? null}
                    disabled={disabled}
                    onChange={(next) => patch({ [key]: next } as Partial<McaScreeningStandaloneMetadata>)}
                  />
                </HolisticAssessmentTableCell>
              </HolisticAssessmentTableRow>
            ))}
          </HolisticAssessmentTable>

          <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'mt-3 text-sm')}>
            <strong>NB:</strong> If a person is not able to provide a yes response to one or more of
            the above, they are unable to make an informed decision.
          </p>
        </InitialAssessmentSection12PanelShell>

        <InitialAssessmentSection12PanelShell
          title="Outcome of the mental capacity screening tool"
          hint="On the balance of probabilities from the outcome of the above:"
          bodyVariant="content"
        >
          <Select
            value={value.mcaScreeningOutcome ?? ''}
            onValueChange={(next) => patch({ mcaScreeningOutcome: next })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select outcome…" />
            </SelectTrigger>
            <SelectContent>
              {MCA_SCREENING_OUTCOME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InitialAssessmentSection12PanelShell>

        <div className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'text-sm')}>
          If it has been established that the person lacks mental capacity for the required decision,
          the Decision Maker should now consider what would be in the person&apos;s best interests.
          Refer for Assessment of Mental Capacity and Best Interests Decision for Adults That Lack
          Capacity Document.
        </div>

        <InitialAssessmentSection12PanelShell title="Comments" bodyVariant="content">
          <Label htmlFor="mca-screening-comments-standalone" className={IA_QUESTION_LABEL_CLASS}>
            Comments
          </Label>
          <Textarea
            id="mca-screening-comments-standalone"
            disabled={disabled}
            rows={4}
            className={IA_FORM_TEXTAREA_COMPACT_CLASS}
            value={value.mcaScreeningComments ?? ''}
            onChange={(e) => patch({ mcaScreeningComments: e.target.value })}
          />
        </InitialAssessmentSection12PanelShell>
      </div>
    </div>
  )
}
