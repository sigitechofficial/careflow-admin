import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SectionQaDemoDataPanel } from '@/features/service-users/initial-assessment/components/SectionQaDemoDataPanel'
import { generateIaSectionDemoDev } from '@/features/service-users/initial-assessment/utils/ia-section-demo-dev'
import { iaSectionDemoOverwriteConfirmText } from '@/features/service-users/initial-assessment/utils/ia-autofill-levels'

vi.mock('@/features/service-users/initial-assessment/utils/ia-section-demo-dev', () => ({
  generateIaSectionDemoDev: vi.fn(),
}))
vi.mock('@/shared/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastApiError: vi.fn(),
}))

const mockGenerate = vi.mocked(generateIaSectionDemoDev)

afterEach(() => vi.clearAllMocks())

function renderPanel(overrides: Partial<React.ComponentProps<typeof SectionQaDemoDataPanel>> = {}) {
  const onApply = vi.fn()
  const onPickScenario = vi.fn()
  render(
    <SectionQaDemoDataPanel
      tabId={10}
      tabTitle="Pain Assessment Tool"
      questionIds={['q1', 'q2']}
      activeLevel="critical"
      editable={true}
      sectionHasData={false}
      alreadyFilled={false}
      onApply={onApply}
      onPickScenario={onPickScenario}
      {...overrides}
    />,
  )
  return { onApply, onPickScenario }
}

describe('SectionQaDemoDataPanel', () => {
  it('disables filling and prompts to pick a scenario when none is active', () => {
    const { onPickScenario } = renderPanel({ activeLevel: null })
    expect(screen.getByTestId('ia-section-demo-fill-10')).toBeDisabled()
    expect(screen.getByText(/Select a QA scenario first/i)).toBeInTheDocument()
    screen.getByTestId('ia-section-demo-pick-10').click()
    expect(onPickScenario).toHaveBeenCalled()
  })

  it('keeps Fill enabled on a DRAFT reassessment after a scenario is selected', () => {
    renderPanel({
      activeLevel: 'normal',
      editable: true,
      sectionHasData: true,
      alreadyFilled: false,
    })
    expect(screen.getByTestId('ia-section-demo-fill-10')).toBeEnabled()
  })

  it('picking a scenario from the panel does not generate or apply demo data', () => {
    const { onApply, onPickScenario } = renderPanel({ activeLevel: null, sectionHasData: true })
    screen.getByTestId('ia-section-demo-pick-10').click()
    expect(onPickScenario).toHaveBeenCalledTimes(1)
    expect(mockGenerate).not.toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('generates values and applies them IN MEMORY (no serviceUserId, no save)', async () => {
    mockGenerate.mockResolvedValue({
      answers: [{ questionId: 'q1', textValue: 'Realistic note' }],
      metadata: { painAssessment: { nrsScore: 7 } },
    })
    const { onApply } = renderPanel({ sectionHasData: false })

    await userEvent.click(screen.getByTestId('ia-section-demo-fill-10'))

    // Called with (level, tabId, questionIds) — no serviceUserId, nothing persisted.
    expect(mockGenerate).toHaveBeenCalledWith('critical', 10, ['q1', 'q2'], undefined)
    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        10,
        [{ questionId: 'q1', textValue: 'Realistic note' }],
        { painAssessment: { nrsScore: 7 } },
      ),
    )
  })

  it('requires confirmation naming the scenario before overwriting a section that already has data', async () => {
    mockGenerate.mockResolvedValue({ answers: [], metadata: {} })
    renderPanel({ activeLevel: 'normal', sectionHasData: true })

    await userEvent.click(screen.getByTestId('ia-section-demo-fill-10'))
    expect(mockGenerate).not.toHaveBeenCalled()
    expect(
      screen.getByText(iaSectionDemoOverwriteConfirmText('Moderate')),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /replace/i }))
    expect(mockGenerate).toHaveBeenCalledWith('normal', 10, ['q1', 'q2'], undefined)
  })

  it('Cancel on the overwrite confirm generates nothing and applies nothing', async () => {
    mockGenerate.mockResolvedValue({ answers: [{ questionId: 'q1', textValue: 'nope' }], metadata: {} })
    const { onApply } = renderPanel({ activeLevel: 'normal', sectionHasData: true })

    await userEvent.click(screen.getByTestId('ia-section-demo-fill-10'))
    expect(screen.getByText(iaSectionDemoOverwriteConfirmText('Moderate'))).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockGenerate).not.toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByTestId('ia-section-demo-fill-10')).toBeEnabled()
  })

  it('Replace generates and applies demo data for the current section only', async () => {
    mockGenerate.mockResolvedValue({
      answers: [{ questionId: 'q1', textValue: 'Replaced note' }],
      metadata: { painAssessment: { nrsScore: 4 } },
    })
    const { onApply } = renderPanel({ activeLevel: 'normal', sectionHasData: true })

    await userEvent.click(screen.getByTestId('ia-section-demo-fill-10'))
    await userEvent.click(screen.getByRole('button', { name: /replace/i }))

    expect(mockGenerate).toHaveBeenCalledWith('normal', 10, ['q1', 'q2'], undefined)
    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        10,
        [{ questionId: 'q1', textValue: 'Replaced note' }],
        { painAssessment: { nrsScore: 4 } },
      ),
    )
  })

  it('shows a "Filled" badge once the section has been populated', () => {
    renderPanel({ alreadyFilled: true })
    expect(screen.getByTestId('ia-section-demo-filled-10')).toBeInTheDocument()
  })

  it('forwards the Service User identity so worksheet labels are not a different person', async () => {
    mockGenerate.mockResolvedValue({ answers: [], metadata: {} })
    const identity = { firstName: 'Helen', lastName: 'Wright', preferredName: 'Helen' }
    renderPanel({ identity })
    await userEvent.click(screen.getByTestId('ia-section-demo-fill-10'))
    expect(mockGenerate).toHaveBeenCalledWith('critical', 10, ['q1', 'q2'], identity)
  })

  it('renders but disables Fill on a read-only (submitted) assessment, with a reopen hint', async () => {
    renderPanel({ editable: false })
    // The panel is still rendered (visible on every section)...
    expect(screen.getByTestId('ia-section-demo-panel-10')).toBeInTheDocument()
    // ...but the Fill action is disabled and explains why.
    expect(screen.getByTestId('ia-section-demo-fill-10')).toBeDisabled()
    expect(screen.getByText(/read-only.*Reopen it/i)).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('ia-section-demo-fill-10'))
    expect(mockGenerate).not.toHaveBeenCalled()
  })
})
