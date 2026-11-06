import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SurveyContactPlanPayload } from './survey-reminders'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

import { SurveyRemindersPanel } from './SurveyRemindersPanel'
import { describeContactPlan } from './survey-reminders'

const payload = (over: Partial<SurveyContactPlanPayload> = {}): SurveyContactPlanPayload => ({
  plan: {
    reminders: [{ afterDays: 3 }, { afterDays: 7 }],
    channels: ['APP', 'EMAIL'],
    quietStart: '20:00',
    quietEnd: '09:00',
    weekdaysOnly: false,
    call: { afterDays: 10, roleId: null, ownerKey: 'CARE_COORDINATOR', withinDays: 5 },
  },
  suggested: null,
  inheritedFrom: null,
  isAnonymous: false,
  targetKind: 'EMPLOYEE',
  channels: [
    { value: 'APP', label: 'Carer app notification' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'TEXT', label: 'Text message' },
  ],
  textMessages: { enabled: true, provider: 'log', repliesSupported: false },
  callListAvailable: true,
  limits: { maxReminders: 3, minGapDays: 2 },
  quietNow: false,
  runs: [{ id: 'run1', at: '2026-11-11T11:00:00.000Z', step: 1, manual: false, counts: { people: 4, email: 4, app: 3, portal: 0, text: 0, noContact: 1, optedOut: 0 } }],
  ...over,
})

const renderPanel = (props: { canEdit?: boolean; isOpen?: boolean } = {}) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SurveyRemindersPanel surveyId="s1" canEdit={props.canEdit ?? true} isOpen={props.isOpen ?? true} />
    </QueryClientProvider>,
  )

describe('describeContactPlan', () => {
  it('says the plan in plain words', () => {
    expect(describeContactPlan(payload().plan)).toBe(
      '2 reminders, 3 and 7 days after sending, by carer app and email. Nothing is sent from 20:00 to 09:00. After 10 days, the Care Coordinator gets a list of people to phone, to do within 5 days.',
    )
    expect(describeContactPlan(null)).toBe('No automatic reminders.')
  })
})

describe('SurveyRemindersPanel', () => {
  beforeEach(() => apiJson.mockReset())

  it('shows the plan, the call list link and past reminders with counts', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    renderPanel()
    expect(await screen.findByRole('heading', { level: 3, name: 'Reminders and follow-up' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Call list/ })).toHaveAttribute('href', '/surveys/$surveyId/calls')
    expect(screen.getByText(/4 people reminded \(1 with no way to reach them\)/)).toBeInTheDocument()
  })

  it('anonymous surveys: explains how reminders stay anonymous, no call list, and no counts when hidden', async () => {
    apiJson.mockResolvedValue({
      data: payload({
        isAnonymous: true,
        callListAvailable: false,
        runs: [{ id: 'run1', at: '2026-11-11', step: 1, manual: false, counts: null }],
      }),
    })
    renderPanel()
    expect(await screen.findByText(/no personal link, and never say who has answered/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Call list/ })).not.toBeInTheDocument()
    expect(screen.getByText(/to everyone who had not answered/)).toBeInTheDocument()
    expect(screen.queryByText(/people reminded/)).not.toBeInTheDocument()
  })

  it('says text messages are only logged until a provider is set up', async () => {
    apiJson.mockResolvedValue({ data: payload({ plan: { ...payload().plan!, channels: ['TEXT'] } }) })
    renderPanel()
    expect(await screen.findByText(/only noted in the system log/)).toBeInTheDocument()
  })

  it('checks reminders are at least two days apart before saving', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    fireEvent.change(screen.getByLabelText('Reminder 2, days after sending'), { target: { value: '4' } })
    expect(screen.getByRole('alert')).toHaveTextContent('leave at least 2 days')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('saves the plan', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Weekdays only/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith('/surveys/s1/contact-plan', expect.objectContaining({ method: 'PUT' })),
    )
    const body = JSON.parse(apiJson.mock.calls.find((c) => c[1]?.method === 'PUT')![1].body)
    expect(body.plan.weekdaysOnly).toBe(true)
  })

  it('people without surveys.manage see the plan but cannot change it or remind', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    renderPanel({ canEdit: false })
    await screen.findByRole('heading', { level: 3, name: 'Reminders and follow-up' })
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remind now' })).not.toBeInTheDocument()
  })
})
