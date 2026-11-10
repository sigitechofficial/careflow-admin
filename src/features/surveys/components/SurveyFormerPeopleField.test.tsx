import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))

import { SurveyFormerPeopleField } from './SurveyFormerPeopleField'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

describe('SurveyFormerPeopleField', () => {
  it('lists people who left in the last 3 months, chosen by name; an anonymous survey says paper', async () => {
    apiJson.mockResolvedValue({ data: { kind: 'EMPLOYEE', needsReason: true, people: [{ id: 'e1', name: 'Zara Ali', leftOn: '2026-10-01', hasPersonalEmail: false }] } })
    const onChange = vi.fn()
    wrap(<SurveyFormerPeopleField surveyId="s1" anonymous value={[]} onChange={onChange} reason="" onReasonChange={vi.fn()} />)
    expect(await screen.findByText(/asked to answer on paper/)).toBeInTheDocument()
    expect(screen.getByText(/no personal email: post a paper copy/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(['e1'])
  })

  it('shows nothing on other surveys (the API refuses)', async () => {
    apiJson.mockRejectedValue(new Error('Only leavers’ surveys'))
    const { container } = wrap(<SurveyFormerPeopleField surveyId="s1" anonymous={false} value={[]} onChange={vi.fn()} reason="" onReasonChange={vi.fn()} />)
    await new Promise(r => setTimeout(r, 20))
    expect(container.querySelector('[data-testid="survey-former-people"]')).toBeNull()
  })

  it('asks why once someone is chosen, unless the survey is for them', async () => {
    apiJson.mockResolvedValue({ data: { kind: 'SERVICE_USER', needsReason: true, people: [{ id: 'su1', name: 'Ada Lane', leftOn: '2026-10-01', hasPersonalEmail: true }] } })
    const onReasonChange = vi.fn()
    const { rerender } = wrap(<SurveyFormerPeopleField surveyId="s2" anonymous={false} value={['su1']} onChange={vi.fn()} reason="" onReasonChange={onReasonChange} />)
    expect(await screen.findByText(/Why are they being asked/)).toBeInTheDocument()
    expect(screen.getByText(/care ended 1 Oct 2026/)).toBeInTheDocument()
    expect(screen.getByText(/unsubscribe from all surveys with one click/)).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/new rota/), { target: { value: 'Views on our care' } })
    expect(onReasonChange).toHaveBeenCalledWith('Views on our care')
    void rerender
  })
})
