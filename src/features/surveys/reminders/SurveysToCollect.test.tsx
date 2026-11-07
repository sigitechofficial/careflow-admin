import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SurveyCallPerson, SurveyToCollect } from './survey-reminders'

const apiJson = vi.fn()
const perms = new Set<string>()
const dialogProps = vi.fn()

vi.mock('@/shared/api/api-client', () => ({
  apiJson: (...a: unknown[]) => apiJson(...a),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/features/auth/store', () => {
  const state = { can: (p: string) => perms.has(p) }
  const useAuthStore = (pick: (s: typeof state) => unknown) => pick(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurvey: (id: string) => ({ data: { id, targetKind: 'SERVICE_USER', questions: [], isAnonymous: false }, isError: false }),
}))
vi.mock('@/features/surveys/components/RecordSurveyResponseDialog', () => ({
  RecordSurveyResponseDialog: (props: Record<string, unknown>) => {
    dialogProps(props)
    return <div data-testid="record-dialog" />
  },
}))

import { SurveysToCollectList, countToCollect } from './SurveysToCollectList'
import { filterToCollect } from './SurveysToCollectPage'
import { SurveysDueForPersonSection } from './SurveysDueForPersonSection'
import { SurveyDuePromptHost, askForDueSurveys, useSurveyDuePromptStore } from './SurveyDuePrompt'

const person = (over: Partial<SurveyCallPerson> = {}): SurveyCallPerson => ({
  recipientId: 'r1',
  employeeId: null,
  serviceUserId: 'su1',
  name: 'Pat Jones',
  phones: [{ label: 'Mobile', number: '07700 900123' }],
  died: false,
  sentAt: '2026-11-01T10:00:00.000Z',
  reminders: 1,
  lastReminderAt: null,
  due: true,
  optedOut: false,
  open: true,
  calls: [],
  ...over,
})

const items: SurveyToCollect[] = [
  {
    survey: { id: 's1', title: 'Your life and how our support helps', targetKind: 'SERVICE_USER', closesAt: null, libraryReference: 'SUR-PWS-021' },
    people: [person(), person({ recipientId: 'r2', serviceUserId: 'su2', name: 'Sam Lee', optedOut: true, phones: [] })],
  },
  {
    survey: { id: 's2', title: 'Staff survey', targetKind: 'EMPLOYEE', closesAt: '2026-12-01T00:00:00.000Z', libraryReference: null },
    people: [person({ recipientId: 'r3', serviceUserId: null, employeeId: 'e1', name: 'Zara Ali' })],
  },
]

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

beforeEach(() => {
  apiJson.mockReset()
  perms.clear()
  dialogProps.mockReset()
  useSurveyDuePromptStore.getState().clear()
})

describe('Surveys to collect', () => {
  it('lists each survey with the people still to collect, and opens Record response for the person chosen', async () => {
    wrap(<SurveysToCollectList items={items} />)
    expect(countToCollect(items)).toBe(3)
    expect(screen.getByText('Pat Jones')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Mobile: 07700 900123' })[0]).toHaveAttribute('href', 'tel:07700900123')
    // Someone who asked not to be phoned can still be asked on a visit.
    expect(screen.getByText('Asked not to be phoned about surveys')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /by phone for Sam Lee/ })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Record answers in person for Pat Jones: Your life and how our support helps' }))
    expect(await screen.findByTestId('record-dialog')).toBeInTheDocument()
    expect(dialogProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ surveyId: 's1', initialChannel: 'IN_PERSON', initialPerson: { id: 'su1', name: 'Pat Jones', phone: '07700 900123' } }),
    )
  })

  it('the page narrows by name and by whose surveys', () => {
    expect(filterToCollect(items, 'ALL', 'sam').flatMap(i => i.people.map(p => p.name))).toEqual(['Sam Lee'])
    expect(filterToCollect(items, 'EMPLOYEE', '').map(i => i.survey.id)).toEqual(['s2'])
    expect(filterToCollect(items, 'SERVICE_USER', 'zara')).toEqual([])
  })

  it('a person’s record shows Surveys due only to staff who can record answers', async () => {
    apiJson.mockResolvedValue({ data: [items[0]] })
    const { unmount } = wrap(<SurveysDueForPersonSection serviceUserId="su1" />)
    expect(screen.queryByTestId('surveys-due-person')).toBeNull()
    expect(apiJson).not.toHaveBeenCalled()
    unmount()

    perms.add('surveys.responses.record')
    wrap(<SurveysDueForPersonSection serviceUserId="su1" />)
    expect(await screen.findByTestId('surveys-due-person')).toBeInTheDocument()
    expect(apiJson).toHaveBeenCalledWith('/surveys-to-collect?serviceUserId=su1', { method: 'GET' })
  })
})

describe('After a review: record a survey that is due', () => {
  it('offers the surveys due for that person and records in person', async () => {
    perms.add('surveys.responses.record')
    apiJson.mockResolvedValue({ data: [{ ...items[0], people: [person()] }] })
    wrap(<SurveyDuePromptHost />)
    act(() => askForDueSurveys('su1', 'the care plan review'))
    expect(await screen.findByText('A survey is due for Pat Jones')).toBeInTheDocument()
    expect(screen.getByText(/You have just finished the care plan review/)).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('survey-due-record'))
    expect(await screen.findByTestId('record-dialog')).toBeInTheDocument()
    expect(dialogProps).toHaveBeenLastCalledWith(expect.objectContaining({ surveyId: 's1', initialChannel: 'IN_PERSON' }))
  })

  it('says nothing when nothing is due, or the user cannot record answers', async () => {
    perms.add('surveys.responses.record')
    apiJson.mockResolvedValue({ data: [] })
    wrap(<SurveyDuePromptHost />)
    act(() => askForDueSurveys('su1', 'the assessment'))
    await waitFor(() => expect(useSurveyDuePromptStore.getState().serviceUserId).toBeNull())
    expect(screen.queryByTestId('survey-due-prompt')).toBeNull()

    perms.clear()
    act(() => askForDueSurveys('su1', 'the assessment'))
    expect(useSurveyDuePromptStore.getState().serviceUserId).toBeNull()
  })
})
