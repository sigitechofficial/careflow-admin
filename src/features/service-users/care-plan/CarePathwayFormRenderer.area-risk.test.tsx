import { render, screen } from '@testing-library/react'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'

vi.mock('@/shared/ui/summernote-editor', () => ({
  SummernoteEditor: ({ value }: { value?: string }) => (
    <textarea data-testid="summernote-stub" readOnly value={value ?? ''} />
  ),
}))

const eatingForm: CareFormDetail = {
  id: 'eating-form',
  name: 'Eating and Drinking',
  description: null,
  formType: 'CARE_PLAN',
  status: 'PUBLISHED',
  lastPublishedAt: null,
  publishedById: null,
  versionLabel: '1',
  pictureUrl: null,
  currentVersionId: 'v1',
  sections: [
    {
      id: 'sec-needs',
      title: 'Needs, goals, support and risk',
      description: null,
      sortOrder: 0,
      fields: [
        {
          id: 'area-risk',
          fieldKey: 'eating_and_drinking_area_risk',
          label: 'Is there a risk associated with this area of care?',
          fieldType: 'YES_NO',
          required: false,
          sortOrder: 0,
          optionsJson: null,
          placeholder: null,
          helpText: null,
          validationJson: null,
          conditionalLogicJson: null,
        },
        {
          id: 'identify',
          fieldKey: 'eating_and_drinking_risk_identify',
          label: 'Identify the risk?',
          fieldType: 'RICH_TEXT',
          required: true,
          sortOrder: 1,
          optionsJson: null,
          placeholder: null,
          helpText: null,
          validationJson: null,
          conditionalLogicJson: {
            showWhen: [{ sectionId: 'sec-needs', fieldId: 'area-risk', operator: 'is_true' }],
          },
        },
        {
          id: 'who',
          fieldKey: 'eating_and_drinking_risk_who_might_be_harmed',
          label: 'Who might be harmed?',
          fieldType: 'TEXTAREA',
          required: true,
          sortOrder: 2,
          optionsJson: null,
          placeholder: null,
          helpText: null,
          validationJson: null,
          conditionalLogicJson: {
            showWhen: [{ sectionId: 'sec-needs', fieldId: 'area-risk', operator: 'is_true' }],
          },
        },
      ],
    },
  ],
}

describe('CarePathwayFormRenderer area-risk follow-ups', () => {
  it('hides follow-ups when the gate is empty or NO, and shows them when YES', () => {
    const { rerender } = render(
      <CarePathwayFormRenderer form={eatingForm} values={{}} onChange={() => undefined} />,
    )
    expect(screen.getByText('Is there a risk associated with this area of my care?')).toBeInTheDocument()
    expect(screen.queryByText('Identify the risk?')).not.toBeInTheDocument()
    expect(screen.queryByText('Who might be harmed?')).not.toBeInTheDocument()

    rerender(
      <CarePathwayFormRenderer
        form={eatingForm}
        values={{ 'sec-needs:area-risk': false }}
        onChange={() => undefined}
      />,
    )
    expect(screen.queryByText('Identify the risk?')).not.toBeInTheDocument()

    rerender(
      <CarePathwayFormRenderer
        form={eatingForm}
        values={{
          'sec-needs:area-risk': true,
          'sec-needs:who': 'Family and staff',
        }}
        onChange={() => undefined}
      />,
    )
    expect(screen.getByText('Identify the risk?')).toBeInTheDocument()
    expect(screen.getByText('Who might be harmed?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Family and staff')).toBeInTheDocument()

    rerender(
      <CarePathwayFormRenderer
        form={eatingForm}
        values={{
          'sec-needs:area-risk': false,
          'sec-needs:who': 'Family and staff',
        }}
        onChange={() => undefined}
      />,
    )
    expect(screen.queryByText('Who might be harmed?')).not.toBeInTheDocument()

    rerender(
      <CarePathwayFormRenderer
        form={eatingForm}
        values={{
          'sec-needs:area-risk': true,
          'sec-needs:who': 'Family and staff',
        }}
        onChange={() => undefined}
      />,
    )
    expect(screen.getByDisplayValue('Family and staff')).toBeInTheDocument()
  })
})
