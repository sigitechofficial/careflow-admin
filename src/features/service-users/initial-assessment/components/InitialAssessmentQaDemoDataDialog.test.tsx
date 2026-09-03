import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InitialAssessmentQaDemoDataDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentQaDemoDataDialog'
import { generateIaSectionDemoDev } from '@/features/service-users/initial-assessment/utils/ia-section-demo-dev'

vi.mock('@/features/service-users/initial-assessment/utils/ia-section-demo-dev', () => ({
  generateIaSectionDemoDev: vi.fn(),
}))

const mockGenerate = vi.mocked(generateIaSectionDemoDev)

afterEach(() => vi.clearAllMocks())

describe('InitialAssessmentQaDemoDataDialog', () => {
  it('selecting a scenario only records the choice — it does not generate or fill data', async () => {
    const onSelect = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <InitialAssessmentQaDemoDataDialog
        open
        onOpenChange={onOpenChange}
        activeLevel={null}
        onSelect={onSelect}
      />,
    )

    await userEvent.click(screen.getByTestId('ia-autofill-normal'))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('normal')
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockGenerate).not.toHaveBeenCalled()
  })
})
