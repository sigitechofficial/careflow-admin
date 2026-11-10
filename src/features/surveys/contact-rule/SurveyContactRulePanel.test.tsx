import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SurveyContactRulePayload } from './survey-contact-rule'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { SurveyContactRulePanel } from './SurveyContactRulePanel'
import { SendContactRuleCheck } from './SendContactRuleCheck'

const payload = (over: Partial<SurveyContactRulePayload> = {}): SurveyContactRulePayload => ({
  inheritedFrom: null,
  rule: { holdBack: true, countsAsContact: true, whenHeld: 'DELAY', reason: null, source: 'DEFAULT' },
  library: null,
  days: 28,
  sampling: null,
  samplingAvailable: true,
  held: [
    { id: 'h1', personId: 'e1', name: 'Zara Ali', status: 'HELD', freeFrom: '2026-11-30', otherSurvey: null, overrideReason: null, resolvedOn: null },
    { id: 'h2', personId: 'e2', name: 'Ola Bee', status: 'HELD', freeFrom: '2026-12-02', otherSurvey: { id: 'o', title: 'Wellbeing check', on: '2026-11-04' }, overrideReason: null, resolvedOn: null },
  ],
  ...over,
})

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

beforeEach(() => apiJson.mockReset())

describe('SurveyContactRulePanel', () => {
  it('says the rule in plain words and lists who is held back, naming the other survey only when the API gives it', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    wrap(<SurveyContactRulePanel surveyId="s1" canEdit isOpen />)
    expect(await screen.findByText(/held back, and sent this one when 4 weeks have passed/)).toBeInTheDocument()
    expect(screen.getByText(/Had another survey in the last 4 weeks\. Free from 30 Nov 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Had "Wellbeing check" on 4 Nov 2026/)).toBeInTheDocument()
  })

  it('sending anyway needs a reason', async () => {
    apiJson.mockImplementation(async (url: string, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'GET' ? { data: payload() } : { message: 'Sent to 1 person', data: { sent: 1 } },
    )
    wrap(<SurveyContactRulePanel surveyId="s1" canEdit isOpen />)
    fireEvent.click(await screen.findByRole('button', { name: 'Send to Zara Ali now anyway' }))
    const send = screen.getByRole('button', { name: 'Send now' })
    expect(send).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/they asked to take part now/), { target: { value: 'She asked to take part' } })
    fireEvent.click(send)
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/held-back/send', expect.objectContaining({ method: 'POST' })))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/surveys/s1/held-back/send')![1].body)
    expect(body).toEqual({ heldIds: ['h1'], reason: 'She asked to take part' })
  })

  it('switching hold-back back on for a copy the library exempts needs a reason', async () => {
    apiJson.mockImplementation(async (_url: string, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'GET'
        ? {
            data: payload({
              held: [],
              library: { holdBack: false, countsAsContact: true, whenHeld: 'DELAY', reason: 'Complaint follow-up goes on time' },
              rule: { holdBack: false, countsAsContact: true, whenHeld: 'DELAY', reason: 'Complaint follow-up goes on time', source: 'LIBRARY' },
            }),
          }
        : { data: {} },
    )
    wrap(<SurveyContactRulePanel surveyId="s1" canEdit isOpen />)
    expect(await screen.findByText(/The ready-made survey sets this: Complaint follow-up goes on time/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    fireEvent.click(screen.getByLabelText(/Hold back people who had another survey/))
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/complaints policy/), { target: { value: 'Part B follow-up copy' } })
    fireEvent.click(save)
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/contact-rule', expect.objectContaining({ method: 'PUT' })))
    const put = apiJson.mock.calls.find(c => c[1]?.method === 'PUT')!
    expect(JSON.parse(put[1].body)).toEqual({ rule: { holdBack: true, countsAsContact: true, whenHeld: 'DELAY', reason: 'Part B follow-up copy' }, sampling: null })
  })

  it('a survey can skip held people instead of sending later, with a reason', async () => {
    apiJson.mockImplementation(async (_url: string, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'GET' ? { data: payload({ held: [] }) } : { data: {} },
    )
    wrap(<SurveyContactRulePanel surveyId="s1" canEdit isOpen />)
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    fireEvent.click(screen.getByLabelText(/Don’t send it to them this time/))
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/complaints policy/), { target: { value: 'Tier 4: supervision feedback' } })
    fireEvent.click(save)
    await waitFor(() => expect(apiJson.mock.calls.some(c => c[1]?.method === 'PUT')).toBe(true))
    const put = apiJson.mock.calls.find(c => c[1]?.method === 'PUT')!
    expect(JSON.parse(put[1].body).rule).toEqual({ holdBack: true, countsAsContact: true, whenHeld: 'SKIP', reason: 'Tier 4: supervision feedback' })
  })

  it('"Don’t send" on a held person needs a reason', async () => {
    apiJson.mockImplementation(async (url: string, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'GET' ? { data: payload() } : { message: '1 person will not be sent it', data: { notSent: 1 } },
    )
    wrap(<SurveyContactRulePanel surveyId="s1" canEdit isOpen />)
    fireEvent.click(await screen.findByRole('button', { name: 'Don’t send to Zara Ali' }))
    const confirm = screen.getByRole('button', { name: 'Don’t send' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/next supervision/), { target: { value: 'Covered at supervision' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/held-back/skip', expect.objectContaining({ method: 'POST' })))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/surveys/s1/held-back/skip')![1].body)
    expect(body).toEqual({ heldIds: ['h1'], reason: 'Covered at supervision' })
  })

  it('without free days (read-only viewers), linked parts and the all-staff calendar are said plainly', async () => {
    apiJson.mockResolvedValue({
      data: payload({
        rule: { holdBack: false, countsAsContact: false, whenHeld: 'DELAY', reason: null, source: 'DEFAULT' },
        defaultRule: { holdBack: false, countsAsContact: false, whenHeld: 'DELAY', calendar: true },
        sentWith: ['SUR-STF-012'],
        held: [{ id: 'h1', personId: 'e1', name: 'Zara Ali', status: 'HELD', freeFrom: null, otherSurvey: null, overrideReason: null, resolvedOn: null }],
      }),
    })
    wrap(<SurveyContactRulePanel surveyId="s1" canEdit={false} isOpen />)
    expect(await screen.findByText(/all-staff survey calendar/)).toBeInTheDocument()
    expect(screen.getByText(/Sent together with SUR-STF-012 as one contact/)).toBeInTheDocument()
    expect(screen.getByText('Had another survey in the last 4 weeks.')).toBeInTheDocument()
    expect(screen.queryByText(/Free from/)).toBeNull()
  })

  it('shows no change or send buttons without surveys.manage', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    wrap(<SurveyContactRulePanel surveyId="s1" canEdit={false} isOpen />)
    await screen.findByText('Zara Ali')
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull()
    expect(screen.queryByRole('button', { name: /now anyway/ })).toBeNull()
  })
})

describe('SendContactRuleCheck', () => {
  it('says how many a skipping survey will not send to', async () => {
    apiJson.mockResolvedValue({
      data: { total: 10, sendNow: 8, heldBack: 0, notSentHeld: 2, notSampled: 0, holdBack: true, whenHeld: 'SKIP', sampling: null, held: [] },
    })
    wrap(<SendContactRuleCheck surveyId="s1" input={{}} enabled value={{ sendAnyway: false, reason: '' }} onChange={vi.fn()} />)
    expect(await screen.findByText(/2 of 10 had another survey in the last 4 weeks and will not be sent this one/)).toBeInTheDocument()
  })

  it('says how many are held back and when, never which other survey', async () => {
    apiJson.mockResolvedValue({
      data: { total: 40, sendNow: 36, heldBack: 4, notSampled: 0, holdBack: true, sampling: null, held: [{ id: 'e1', name: 'Zara Ali', freeFrom: '2026-11-30' }] },
    })
    const onChange = vi.fn()
    wrap(<SendContactRuleCheck surveyId="s1" input={{}} enabled value={{ sendAnyway: false, reason: '' }} onChange={onChange} />)
    expect(await screen.findByText(/4 of 40 had another survey in the last 4 weeks/)).toBeInTheDocument()
    expect(screen.getByText(/the first on 30 Nov 2026/)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Send to them now anyway'))
    expect(onChange).toHaveBeenCalledWith({ sendAnyway: true, reason: '' })
  })
})
