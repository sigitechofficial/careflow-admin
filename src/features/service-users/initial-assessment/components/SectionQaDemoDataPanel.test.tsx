import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SectionQaDemoDataPanel } from '@/features/service-users/initial-assessment/components/SectionQaDemoDataPanel'
import { runIaSectionDemoDev } from '@/features/service-users/initial-assessment/utils/ia-section-demo-dev'

vi.mock('@/features/service-users/initial-assessment/utils/ia-section-demo-dev', () => ({
  runIaSectionDemoDev: vi.fn(),
}))
vi.mock('@/shared/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastApiError: vi.fn(),
}))

const mockRun = vi.mocked(runIaSectionDemoDev)

afterEach(() => vi.clearAllMocks())

function renderPanel(overrides: Partial<React.ComponentProps<typeof SectionQaDemoDataPanel>> = {}) {
  const onFilled = vi.fn().mockResolvedValue(undefined)
  const onPickScenario = vi.fn()
  render(
    <SectionQaDemoDataPanel
      tabId={10}
      tabTitle="Pain Assessment Tool"
      serviceUserId="su-1"
      questionIds={['q1', 'q2']}
      activeLevel="critical"
      sectionHasData={false}
      onFilled={onFilled}
      onPickScenario={onPickScenario}
      {...overrides}
    />,
  )
  return { onFilled, onPickScenario }
}

describe('SectionQaDemoDataPanel', () => {
  it('disables filling and prompts to pick a scenario when none is active', () => {
    const { onPickScenario } = renderPanel({ activeLevel: null })
    const fill = screen.getByTestId('ia-section-demo-fill-10')
    expect(fill).toBeDisabled()
    expect(screen.getByText(/Select a QA scenario first/i)).toBeInTheDocument()
    screen.getByTestId('ia-section-demo-pick-10').click()
    expect(onPickScenario).toHaveBeenCalled()
  })

  it('fills this section with the active severity when there is no existing data', async () => {
    mockRun.mockResolvedValue({ message: 'ok', tabId: 10, answersWritten: 2 })
    const { onFilled } = renderPanel({ sectionHasData: false })

    await userEvent.click(screen.getByTestId('ia-section-demo-fill-10'))

    expect(mockRun).toHaveBeenCalledWith('su-1', 'critical', 10, ['q1', 'q2'])
    expect(onFilled).toHaveBeenCalled()
  })

  it('requires confirmation before overwriting a section that already has data', async () => {
    mockRun.mockResolvedValue({ message: 'ok', tabId: 10, answersWritten: 2 })
    renderPanel({ sectionHasData: true })

    // Clicking the fill button opens the confirm popover instead of firing immediately.
    await userEvent.click(screen.getByTestId('ia-section-demo-fill-10'))
    expect(mockRun).not.toHaveBeenCalled()

    // Confirming performs the fill.
    await userEvent.click(screen.getByRole('button', { name: /replace/i }))
    expect(mockRun).toHaveBeenCalledWith('su-1', 'critical', 10, ['q1', 'q2'])
  })

  it('does not fill without a service user', async () => {
    renderPanel({ serviceUserId: null })
    const fill = screen.getByTestId('ia-section-demo-fill-10')
    expect(fill).toBeDisabled()
    await userEvent.click(fill)
    expect(mockRun).not.toHaveBeenCalled()
  })
})
