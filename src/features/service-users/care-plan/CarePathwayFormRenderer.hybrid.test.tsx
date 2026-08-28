import { render, screen } from '@testing-library/react'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'

vi.mock('@/shared/ui/summernote-editor', () => ({
  SummernoteEditor: () => null,
}))

const form: CareFormDetail = {
  id: 'form-1',
  name: 'Home Support Plan',
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
      id: 'sec-access',
      title: 'Home access & safety',
      description: null,
      sortOrder: 0,
      fields: [
        {
          id: 'lives-alone',
          label: 'Lives alone',
          fieldType: 'YES_NO',
          required: false,
          sortOrder: 0,
          optionsJson: null,
          placeholder: null,
          helpText: null,
          conditionalLogicJson: null,
          validationJson: null,
        },
        {
          id: 'personal-care',
          label: 'Personal care tasks',
          fieldType: 'TEXTAREA',
          required: true,
          sortOrder: 1,
          optionsJson: null,
          placeholder: null,
          helpText: null,
          conditionalLogicJson: null,
          validationJson: null,
        },
      ],
    },
  ],
}

const suggestion: CarePlanFieldSuggestion = {
  id: 'hsp:personal-care:ia-1',
  kind: 'value',
  targetFieldKey: 'sec-access:personal-care',
  targetLabel: 'Personal care tasks',
  targetFieldType: 'TEXTAREA',
  suggestedValue: 'Bathing: assistance of one person',
  displayText: 'Bathing: assistance of one person',
  sourceType: 'INITIAL_ASSESSMENT',
  submissionId: 'ia-1',
  sourceDate: '2026-08-19T07:36:44.000Z',
  sourceQuestions: [],
  transform: 'narrative',
}

describe('CarePathwayFormRenderer hybrid UI', () => {
  it('shows a prefilled indicator for auto-prefilled fields', () => {
    render(
      <CarePathwayFormRenderer
        form={form}
        values={{ 'sec-access:lives-alone': true }}
        onChange={() => undefined}
        composedFrom={{
          fieldProvenance: {
            'sec-access:lives-alone': {
              sourceType: 'INITIAL_ASSESSMENT',
              submissionId: 'ia-1',
              acceptedAt: '2026-08-19T07:36:44.000Z',
              originalValue: true,
              sourceDate: '2026-08-19T07:36:44.000Z',
              autoPrefilled: true,
              userEdited: false,
            },
          },
        }}
      />,
    )

    expect(screen.getByTestId('care-plan-prefill-sec-access:lives-alone')).toHaveTextContent(
      /Prefilled from Initial Assessment/i,
    )
  })

  it('hides the prefilled indicator after the user edits the field', () => {
    render(
      <CarePathwayFormRenderer
        form={form}
        values={{ 'sec-access:lives-alone': false }}
        onChange={() => undefined}
        composedFrom={{
          fieldProvenance: {
            'sec-access:lives-alone': {
              sourceType: 'INITIAL_ASSESSMENT',
              submissionId: 'ia-1',
              acceptedAt: '2026-08-19T07:36:44.000Z',
              originalValue: true,
              sourceDate: '2026-08-19T07:36:44.000Z',
              autoPrefilled: true,
              userEdited: true,
            },
          },
        }}
      />,
    )

    expect(screen.queryByTestId('care-plan-prefill-sec-access:lives-alone')).not.toBeInTheDocument()
  })

  it('still renders suggestion banners for hybrid suggestion fields', () => {
    render(
      <CarePathwayFormRenderer
        form={form}
        values={{}}
        onChange={() => undefined}
        suggestions={[suggestion]}
        ignoredSuggestionIds={[]}
        onUseSuggestion={() => undefined}
        onIgnoreSuggestion={() => undefined}
        onKeepCurrentSuggestion={() => undefined}
      />,
    )

    expect(screen.getByTestId('care-plan-suggestion-sec-access:personal-care')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use suggestion/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    expect(screen.getByTestId('care-plan-section-ia-hint')).toHaveTextContent(
      /1 IA recommendation available/i,
    )
  })

  it('shows suggestion cards for draft HSP edit mode', () => {
    // Draft / PUBLISHED_WITH_DRAFT pages pass suggestions + handlers through.
    render(
      <CarePathwayFormRenderer
        form={form}
        values={{}}
        onChange={() => undefined}
        suggestions={[suggestion]}
        ignoredSuggestionIds={[]}
        onUseSuggestion={() => undefined}
        onIgnoreSuggestion={() => undefined}
        onKeepCurrentSuggestion={() => undefined}
      />,
    )

    expect(screen.getByTestId('care-plan-suggestion-sec-access:personal-care')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use suggestion/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    expect(screen.getByTestId('care-plan-field-review-sec-access:personal-care')).toBeInTheDocument()
  })

  it('hides suggestion cards for published HSP view mode', () => {
    // Published "View plan" omits suggestions and Use/Ignore handlers.
    render(
      <CarePathwayFormRenderer
        form={form}
        values={{ 'sec-access:personal-care': 'Bathing: assistance of one person' }}
        onChange={() => undefined}
      />,
    )

    expect(screen.queryByTestId('care-plan-suggestion-sec-access:personal-care')).not.toBeInTheDocument()
    expect(screen.queryByText(/IA Recommendation/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /use suggestion/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('care-plan-section-ia-hint')).not.toBeInTheDocument()
  })

  it('shows accepted suggestion field value on published live plan without suggestion banners', () => {
    // After Use suggestion → save → publish, live view hydrates published values and hides banners.
    render(
      <CarePathwayFormRenderer
        form={form}
        values={{
          'sec-access:lives-alone': true,
          'sec-access:personal-care': 'Bathing: assistance of one person',
        }}
        onChange={() => undefined}
        composedFrom={{
          fieldProvenance: {
            'sec-access:personal-care': {
              sourceType: 'INITIAL_ASSESSMENT',
              submissionId: 'ia-1',
              acceptedAt: '2026-08-19T07:36:44.000Z',
              originalValue: 'Bathing: assistance of one person',
              sourceDate: '2026-08-19T07:36:44.000Z',
              userEdited: false,
            },
          },
        }}
      />,
    )

    expect(screen.getByDisplayValue('Bathing: assistance of one person')).toBeInTheDocument()
    expect(screen.queryByTestId('care-plan-suggestion-sec-access:personal-care')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /use suggestion/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ignore/i })).not.toBeInTheDocument()
  })
})
