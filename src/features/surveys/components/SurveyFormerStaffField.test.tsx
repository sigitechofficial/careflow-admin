import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))

import { SurveyFormerStaffField } from './SurveyFormerStaffField'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

describe('SurveyFormerStaffField', () => {
  it('leavers’ surveys: lists people who left, chosen by name; an anonymous version says paper', async () => {
    apiJson.mockResolvedValue({ data: [{ id: 'e1', name: 'Zara Ali', leftOn: '2026-10-01', hasPersonalEmail: false }] })
    const onChange = vi.fn()
    wrap(<SurveyFormerStaffField surveyId="s1" anonymous value={[]} onChange={onChange} />)
    expect(await screen.findByText(/asked to answer on paper/)).toBeInTheDocument()
    expect(screen.getByText(/no personal email: post a paper copy/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(['e1'])
  })

  it('shows nothing on other surveys (the API refuses)', async () => {
    apiJson.mockRejectedValue(new Error('Only leavers’ surveys'))
    const { container } = wrap(<SurveyFormerStaffField surveyId="s1" anonymous={false} value={[]} onChange={vi.fn()} />)
    await new Promise(r => setTimeout(r, 20))
    expect(container.querySelector('[data-testid="survey-former-staff"]')).toBeNull()
  })
})
