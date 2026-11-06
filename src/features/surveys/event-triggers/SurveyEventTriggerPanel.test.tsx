import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { EventTriggerPayload } from './survey-event-triggers'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _p, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => <a {...rest}>{children}</a>,
}))

import { SurveyEventTriggerPanel } from './SurveyEventTriggerPanel'

const events = [
  { code: 'HOSPITAL_DISCHARGE', label: 'Home from hospital', description: 'The day a hospital stay ends.', builtIn: ['Not sent if the person has died'], repeats: true },
  { code: 'CARE_REVIEW_DUE', label: 'Care plan review due', description: 'A review date.', builtIn: [], beforeAllowed: true, repeats: true },
]
const payload = (over: Partial<EventTriggerPayload> = {}): EventTriggerPayload => ({
  audience: 'SERVICE_USER',
  trigger: null,
  library: { event: 'HOSPITAL_DISCHARGE', delayDays: 10, windowDays: 4, exclusions: [], options: { minNights: 1 }, checkFirst: false },
  libraryWords: '10 to 14 days after the person comes home from a hospital stay',
  notAllowed: null,
  events,
  exclusions: [{ code: 'IN_HOSPITAL', label: 'The person is in hospital' }],
  canSeeList: true,
  counts: {},
  occurrences: [],
  ...over,
})
const on = {
  event: 'HOSPITAL_DISCHARGE',
  label: 'Home from hospital',
  delayDays: 10,
  windowDays: 4,
  exclusions: [],
  options: { minNights: 1 },
  checkFirst: true,
  since: '2026-11-01',
  ownerKey: 'CARE_COORDINATOR',
}
const row = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  name: 'Ada Lane',
  personId: 'su1',
  event: 'HOSPITAL_DISCHARGE',
  eventLabel: 'Home from hospital',
  eventOn: '2026-11-10',
  dueOn: '2026-11-20',
  lastDay: '2026-11-24',
  status: 'DUE',
  reason: null,
  sentIn: null,
  resolvedOn: null,
  ...over,
})

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

beforeEach(() => apiJson.mockReset())

describe('SurveyEventTriggerPanel', () => {
  it('off: shows the ready-made suggestion and switches on with it, counting from today', async () => {
    apiJson.mockImplementation(async (_u: string, init?: RequestInit) => ((init?.method ?? 'GET') === 'GET' ? { data: payload() } : { data: {} }))
    wrap(<SurveyEventTriggerPanel surveyId="s1" canEdit />)
    expect(await screen.findByText(/The ready-made survey suggests: home from hospital/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Switch on' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Switch on' }).at(-1)!)
    await waitFor(() => expect(apiJson.mock.calls.some(c => c[1]?.method === 'PUT')).toBe(true))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[1]?.method === 'PUT')![1].body)
    expect(body.trigger).toEqual({ event: 'HOSPITAL_DISCHARGE', delayDays: 10, windowDays: 4, exclusions: [], options: { minNights: 1 }, checkFirst: false, lookBackDays: 0 })
  })

  it('only a review can be sent before the event', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    wrap(<SurveyEventTriggerPanel surveyId="s1" canEdit />)
    fireEvent.click(await screen.findByRole('button', { name: 'Switch on' }))
    fireEvent.change(screen.getByLabelText('Days after the event'), { target: { value: '-7' } })
    expect(screen.getAllByRole('button', { name: 'Switch on' }).at(-1)).toBeDisabled()
    fireEvent.change(screen.getByLabelText('The event'), { target: { value: 'CARE_REVIEW_DUE' } })
    expect(screen.getAllByRole('button', { name: 'Switch on' }).at(-1)).not.toBeDisabled()
  })

  it('on: says it in plain words, and "Don’t send" needs a reason', async () => {
    apiJson.mockImplementation(async (u: string, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'GET' ? { data: payload({ trigger: on, counts: { DUE: 1 }, occurrences: [row()] as never }) } : { message: '1 will not be sent it', data: { people: 1, sent: 0 } },
    )
    wrap(<SurveyEventTriggerPanel surveyId="s1" canEdit />)
    expect(await screen.findByText(/Staff check each one before it is sent 10 days after home from hospital, up to 4 days late/)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Choose Ada Lane'))
    fireEvent.click(screen.getByRole('button', { name: 'Don’t send' }))
    const confirm = screen.getAllByRole('button', { name: 'Don’t send' }).at(-1)!
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/Ombudsman/), { target: { value: 'Ombudsman review open' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/event-trigger/decide', expect.objectContaining({ method: 'POST' })))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/surveys/s1/event-trigger/decide')![1].body)
    expect(body).toEqual({ ids: ['o1'], action: 'DONT_SEND', reason: 'Ombudsman review open' })
  })

  it('family surveys are offered by staff (no Send), and names are hidden from people who cannot manage surveys', async () => {
    apiJson.mockResolvedValue({ data: payload({ audience: 'FAMILY', trigger: { ...on, event: 'DEATH', label: 'Death of a person we support' }, counts: { DUE: 1 }, occurrences: [row({ event: 'DEATH' })] as never }) })
    const { unmount } = wrap(<SurveyEventTriggerPanel surveyId="s1" canEdit />)
    expect(await screen.findByRole('button', { name: 'Mark offered' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send now' })).toBeNull()
    unmount()
    apiJson.mockResolvedValue({ data: payload({ trigger: on, canSeeList: false, occurrences: [] }) })
    wrap(<SurveyEventTriggerPanel surveyId="s1" canEdit={false} />)
    await screen.findByTestId('survey-event-trigger-summary')
    expect(screen.queryByTestId('survey-event-occurrences')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull()
  })

  it('a bereaved family is never offered it sooner than 6 weeks after the death', async () => {
    const death = { code: 'DEATH', label: 'Death of a person we support', description: 'A death.', builtIn: [], minDelayDays: 42, repeats: false }
    apiJson.mockResolvedValue({ data: payload({ audience: 'FAMILY', events: [death], library: null }) })
    wrap(<SurveyEventTriggerPanel surveyId="s1" canEdit />)
    fireEvent.click(await screen.findByRole('button', { name: 'Switch on' }))
    fireEvent.change(screen.getByLabelText('Days after the event'), { target: { value: '14' } })
    expect(screen.getAllByRole('button', { name: 'Switch on' }).at(-1)).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Days after the event'), { target: { value: '42' } })
    expect(screen.getAllByRole('button', { name: 'Switch on' }).at(-1)).not.toBeDisabled()
  })

  describe('training feedback: Part B takes the library’s 42 days', () => {
    const training = { code: 'TRAINING_ATTENDED', label: 'Training attended', description: 'A session.', builtIn: [], partBDelayDays: 42, repeats: true }
    const staff = payload({
      audience: 'EMPLOYEE',
      events: [training],
      exclusions: [],
      library: { event: 'TRAINING_ATTENDED', delayDays: 0, windowDays: 7, exclusions: [], options: { part: 'A' }, checkFirst: false },
    })

    it('switching on for Part B sets 42 days (and back to Part A, 0); the days can be edited and are sent as typed', async () => {
      apiJson.mockImplementation(async (_u: string, init?: RequestInit) => ((init?.method ?? 'GET') === 'GET' ? { data: staff } : { data: {} }))
      wrap(<SurveyEventTriggerPanel surveyId="s1" canEdit />)
      fireEvent.click(await screen.findByRole('button', { name: 'Switch on' }))
      const days = screen.getByLabelText('Days after the event') as HTMLInputElement
      expect(days.value).toBe('0')
      fireEvent.click(screen.getByRole('radio', { name: /Part B/ }))
      expect(days.value).toBe('42')
      expect(screen.getByTestId('training-part-b-delay')).toHaveTextContent('42 days (6 weeks) after the course by default')
      fireEvent.click(screen.getByRole('radio', { name: /Part A/ }))
      expect(days.value).toBe('0')
      fireEvent.click(screen.getByRole('radio', { name: /Part B/ }))
      fireEvent.change(days, { target: { value: '56' } })
      // Typed days are never replaced by a part's default.
      fireEvent.click(screen.getByRole('radio', { name: /Part A/ }))
      fireEvent.click(screen.getByRole('radio', { name: /Part B/ }))
      expect(days.value).toBe('56')
      fireEvent.click(screen.getAllByRole('button', { name: 'Switch on' }).at(-1)!)
      await waitFor(() => expect(apiJson.mock.calls.some(c => c[1]?.method === 'PUT')).toBe(true))
      const body = JSON.parse(apiJson.mock.calls.find(c => c[1]?.method === 'PUT')![1].body)
      expect(body.trigger).toMatchObject({ event: 'TRAINING_ATTENDED', delayDays: 56, options: { part: 'B' } })
    })
  })

  it('the lists are tabs with a panel, moved between with the arrow keys', async () => {
    apiJson.mockResolvedValue({ data: payload({ trigger: on, counts: { DUE: 1 }, occurrences: [row()] as never }) })
    wrap(<SurveyEventTriggerPanel surveyId="s1" canEdit />)
    const decide = await screen.findByRole('tab', { name: /To decide/ })
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', decide.id)
    fireEvent.keyDown(decide, { key: 'ArrowRight' })
    const coming = screen.getByRole('tab', { name: /Coming up/ })
    expect(coming).toHaveAttribute('aria-selected', 'true')
    expect(coming).toHaveFocus()
  })
})
