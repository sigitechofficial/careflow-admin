import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const navigate = vi.fn()
const perms = new Set<string>()
const state = vi.hoisted(() => ({ data: null as unknown }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: { getState: () => ({ can: (p: string) => perms.has(p) }) },
}))
vi.mock('./service-user-privacy.api', () => ({ useServiceUserPrivacy: () => ({ data: state.data }) }))

import { PrivacyReviewPromptHost, askAboutPrivacyAtReview, usePrivacyReviewPromptStore } from './PrivacyReviewPrompt'
import { useSurveyDuePromptStore } from '@/features/surveys/reminders/SurveyDuePrompt'

beforeEach(() => {
  navigate.mockReset()
  perms.clear()
  usePrivacyReviewPromptStore.getState().clear()
  useSurveyDuePromptStore.getState().clear()
  state.data = {
    needs: { summary: 'Large print' },
    sharing: [{ status: 'ACTIVE' }, { status: 'REVIEW_DUE' }, { status: 'STOPPED' }],
  }
})

describe('After a care plan review: has anything changed?', () => {
  it('asks, with what is recorded now, and opens Privacy', async () => {
    perms.add('service_users.update')
    render(<PrivacyReviewPromptHost />)
    act(() => askAboutPrivacyAtReview('su-1'))
    expect(screen.getByTestId('privacy-review-prompt')).toHaveTextContent('Large print')
    expect(screen.getByTestId('privacy-review-prompt')).toHaveTextContent('2 people or organisations, 1 due a review')
    await userEvent.click(screen.getByRole('button', { name: 'Open Privacy' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/service-users/$serviceUserId/profile', params: { serviceUserId: 'su-1' }, search: { tab: 'privacy' } })
    expect(usePrivacyReviewPromptStore.getState().serviceUserId).toBeNull()
  })

  it('waits for the survey prompt, and is not shown to people who cannot change the record', () => {
    perms.add('service_users.update')
    render(<PrivacyReviewPromptHost />)
    act(() => {
      useSurveyDuePromptStore.getState().ask('su-1', 'the care plan review')
      askAboutPrivacyAtReview('su-1')
    })
    expect(screen.queryByTestId('privacy-review-prompt')).toBeNull()
    act(() => useSurveyDuePromptStore.getState().clear())
    expect(screen.getByTestId('privacy-review-prompt')).toBeInTheDocument()

    act(() => usePrivacyReviewPromptStore.getState().clear())
    perms.clear()
    act(() => askAboutPrivacyAtReview('su-1'))
    expect(usePrivacyReviewPromptStore.getState().serviceUserId).toBeNull()
  })
})
