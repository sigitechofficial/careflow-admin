import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InitialAssessmentPainAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPainAssessmentPanel'
import type { PainAssessmentMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

describe('InitialAssessmentPainAssessmentPanel', () => {
  it('shows labelled Abbey options, calculated total, read-only band, and scale selection', async () => {
    const user = userEvent.setup()
    let value: PainAssessmentMetadata = {}
    const onChange = vi.fn((next: PainAssessmentMetadata) => {
      value = next
    })

    const { rerender } = render(
      <InitialAssessmentPainAssessmentPanel value={value} onChange={onChange} recommendedScale="nrs" />,
    )

    expect(screen.getByTestId('ia-pain-scale-recommended')).toHaveTextContent(/Numeric Rating Scale/)
    expect(screen.getByLabelText('Numeric Rating Scale (NRS)')).toBeInTheDocument()
    expect(screen.getByLabelText('Abbey Pain Scale')).toBeInTheDocument()
    expect(screen.getByLabelText('Both scales')).toBeInTheDocument()
    expect(screen.getAllByText('0 — Absent').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 — Mild').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2 — Moderate').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3 — Severe').length).toBeGreaterThan(0)
    expect(screen.getByTestId('ia-abbey-total')).toHaveTextContent('0')

    await user.click(screen.getByLabelText('Both scales'))
    rerender(
      <InitialAssessmentPainAssessmentPanel value={value} onChange={onChange} recommendedScale="nrs" />,
    )
    expect(value.scaleUsed).toBe('both')

    await user.click(screen.getByLabelText('Vocalisation: 2 — Moderate'))
    rerender(
      <InitialAssessmentPainAssessmentPanel value={value} onChange={onChange} recommendedScale="nrs" />,
    )
    expect(value.abbey?.vocalisation).toBe(2)
    expect(value.abbey?.total).toBe(2)
    expect(value.abbey?.severityBand).toBe('none')
    expect(screen.getByTestId('ia-abbey-severity-band')).toHaveTextContent('No pain')

    expect(screen.queryByRole('radio', { name: /0–2 No pain/i })).not.toBeInTheDocument()
  })

  it('indicates Abbey as recommended without forcing both scales', () => {
    render(
      <InitialAssessmentPainAssessmentPanel
        value={{}}
        onChange={() => undefined}
        recommendedScale="abbey"
      />,
    )
    expect(screen.getByTestId('ia-pain-scale-recommended')).toHaveTextContent(/Abbey Pain Scale/)
    expect(screen.getByText(/Completing both is not required/)).toBeInTheDocument()
    expect(screen.getByLabelText('Numeric Rating Scale (NRS)')).not.toBeChecked()
    expect(screen.getByLabelText('Abbey Pain Scale')).not.toBeChecked()
  })
})
