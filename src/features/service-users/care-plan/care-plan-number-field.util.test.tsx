import { render, screen } from '@testing-library/react'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import {
  carePlanNumberPlaceholder,
  formatCarePlanNumberInputValue,
} from '@/features/service-users/care-plan/care-plan-number-field.util'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'

vi.mock('@/shared/ui/summernote-editor', () => ({
  SummernoteEditor: () => null,
}))

const form: CareFormDetail = {
  id: 'falls',
  name: 'Falls',
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
      id: 'hist',
      title: 'Falls history',
      description: null,
      sortOrder: 0,
      fields: [
        {
          id: 'count',
          label: 'Falls in last 12 months',
          fieldType: 'NUMBER',
          placeholder: '0',
          helpText: null,
          required: false,
          optionsJson: null,
          validationJson: null,
          conditionalLogicJson: null,
          sortOrder: 0,
        },
      ],
    },
  ],
}

function numberInput() {
  return screen.getByRole('spinbutton') as HTMLInputElement
}

describe('formatCarePlanNumberInputValue', () => {
  it('renders undefined NUMBER as empty', () => {
    expect(formatCarePlanNumberInputValue(undefined)).toBe('')
  })

  it('renders null NUMBER as empty', () => {
    expect(formatCarePlanNumberInputValue(null)).toBe('')
  })

  it('renders saved 0 as 0', () => {
    expect(formatCarePlanNumberInputValue(0)).toBe('0')
    expect(formatCarePlanNumberInputValue('0')).toBe('0')
  })

  it('renders a saved positive number correctly', () => {
    expect(formatCarePlanNumberInputValue(2)).toBe('2')
    expect(formatCarePlanNumberInputValue('2')).toBe('2')
  })
})

describe('carePlanNumberPlaceholder', () => {
  it('does not use 0 as a placeholder because it looks like a value', () => {
    expect(carePlanNumberPlaceholder('0')).toBe('Enter number')
    expect(carePlanNumberPlaceholder(null)).toBe('Enter number')
  })
})

describe('CarePathwayFormRenderer NUMBER', () => {
  it('shows an empty NUMBER input with a neutral placeholder, not 0', () => {
    const onChange = vi.fn()
    render(<CarePathwayFormRenderer form={form} values={{}} onChange={onChange} />)
    expect(numberInput().value).toBe('')
    expect(numberInput()).toHaveAttribute('placeholder', 'Enter number')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows a saved 0', () => {
    render(
      <CarePathwayFormRenderer
        form={form}
        values={{ 'hist:count': '0' }}
        onChange={() => undefined}
      />,
    )
    expect(numberInput().value).toBe('0')
  })

  it('shows a saved positive number', () => {
    render(
      <CarePathwayFormRenderer
        form={form}
        values={{ 'hist:count': '2' }}
        onChange={() => undefined}
      />,
    )
    expect(numberInput().value).toBe('2')
  })
})
