import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { surveyKeys } from '@/features/surveys/keys'

vi.mock('@/features/surveys/api/surveys.api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/surveys/api/surveys.api')>()),
  addSurveyQuestion: vi.fn(async () => ({ id: 'q-new' })),
  updateSurveyQuestion: vi.fn(async () => ({ id: 'q1' })),
  removeSurveyQuestion: vi.fn(async () => ({ id: 'q1' })),
}))

import {
  END_DATE_REFRESH_MARGIN_MS,
  nextEndDateRefreshIn,
  useAddQuestion,
  useRefreshAtEndDate,
  useRemoveQuestion,
  useUpdateQuestion,
} from '@/features/surveys/hooks/useSurveys'

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const spy = vi.spyOn(qc, 'invalidateQueries')
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  const invalidated = () => spy.mock.calls.map(([filters]) => JSON.stringify(filters?.queryKey))
  return { wrapper, invalidated }
}

describe('question changes refresh the Survey summary and the survey lists', () => {
  const expected = [
    JSON.stringify(surveyKeys.detail('s1')),
    JSON.stringify(surveyKeys.results('s1')),
    JSON.stringify([...surveyKeys.all(), 'list']),
  ]

  it('adding a question', async () => {
    const { wrapper, invalidated } = setup()
    const { result } = renderHook(() => useAddQuestion('s1'), { wrapper })
    await result.current.mutateAsync({ questionText: 'New?', questionType: 'YES_NO' } as never)
    await waitFor(() => expect(invalidated()).toEqual(expect.arrayContaining(expected)))
  })

  it('changing a question', async () => {
    const { wrapper, invalidated } = setup()
    const { result } = renderHook(() => useUpdateQuestion('s1'), { wrapper })
    await result.current.mutateAsync({ questionId: 'q1', input: { questionText: 'Changed?' } })
    await waitFor(() => expect(invalidated()).toEqual(expect.arrayContaining(expected)))
  })

  it('removing a question', async () => {
    const { wrapper, invalidated } = setup()
    const { result } = renderHook(() => useRemoveQuestion('s1'), { wrapper })
    await result.current.mutateAsync('q1')
    await waitFor(() => expect(invalidated()).toEqual(expect.arrayContaining(expected)))
  })

  it('the list key covers every filtered list', () => {
    const listKey = [...surveyKeys.all(), 'list']
    expect(surveyKeys.list({ isTemplate: true }).slice(0, listKey.length)).toEqual(listKey)
  })
})

describe('a page left open refetches once an open survey’s end date has passed', () => {
  const now = Date.parse('2026-11-06T12:00:00.000Z')

  it('waits until just after the earliest end date ahead of an open survey', () => {
    expect(
      nextEndDateRefreshIn(
        [
          { status: 'ACTIVE', closesAt: '2026-11-06T12:10:00.000Z' },
          { status: 'ACTIVE', closesAt: '2026-11-06T12:05:00.000Z' },
          { status: 'DRAFT', closesAt: '2026-11-06T12:01:00.000Z' },
          { status: 'CLOSED', closesAt: '2026-11-06T12:01:00.000Z' },
          { status: 'ACTIVE', closesAt: null },
        ],
        now,
      ),
    ).toBe(5 * 60_000 + END_DATE_REFRESH_MARGIN_MS)
    expect(nextEndDateRefreshIn([{ status: 'ACTIVE', closesAt: '2026-11-06T11:00:00.000Z' }], now)).toBeNull()
    expect(nextEndDateRefreshIn(undefined, now)).toBeNull()
  })

  it('refreshes the surveys when the time comes', () => {
    vi.useFakeTimers({ now })
    try {
      const { wrapper, invalidated } = setup()
      renderHook(() => useRefreshAtEndDate([{ status: 'ACTIVE', closesAt: '2026-11-06T12:01:00.000Z' }]), { wrapper })
      vi.advanceTimersByTime(60_000 + END_DATE_REFRESH_MARGIN_MS - 1)
      expect(invalidated()).toEqual([])
      vi.advanceTimersByTime(1)
      expect(invalidated()).toEqual([JSON.stringify(surveyKeys.all())])
    } finally {
      vi.useRealTimers()
    }
  })
})
