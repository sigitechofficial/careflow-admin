import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { MySurveysPayload } from './my-surveys'

const { state } = vi.hoisted(() => ({ state: { data: undefined as MySurveysPayload | undefined } }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...rest }: { children: React.ReactNode; to: string; params?: { surveyId?: string } }) => (
    <a href={params?.surveyId ? to.replace('$surveyId', params.surveyId) : to} {...rest}>
      {children}
    </a>
  ),
  useParams: () => ({}),
}))
vi.mock('./my-surveys', () => ({
  useMySurveys: () => ({ data: state.data, isLoading: false, isError: false }),
  useMySurveyForm: () => ({ data: undefined, isLoading: false, isError: true }),
  useSubmitMySurvey: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/shared/ui/page-elements', () => ({
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}))

import MySurveysPage from './MySurveysPage'

describe('My surveys (web)', () => {
  it('lists my surveys and opens one by survey, never by a personal link or token', () => {
    state.data = {
      linked: true,
      items: [
        { surveyId: 'sv-1', title: 'Rotas and workload', description: null, isAnonymous: true, sentAt: null, opensAt: null, closesAt: '2026-11-30T17:00:00Z', state: 'OPEN', unavailableReason: null, completedAt: null },
        { surveyId: 'sv-2', title: 'Supervision feedback', description: null, isAnonymous: false, sentAt: null, opensAt: null, closesAt: null, state: 'COMPLETED', unavailableReason: null, completedAt: '2026-11-02T10:00:00Z' },
      ],
    }
    render(<MySurveysPage />)
    expect(screen.getByText(/Anonymous: your answers are not linked to your name/)).toBeInTheDocument()
    const answer = screen.getByRole('link', { name: 'Answer' })
    expect(answer.getAttribute('href')).toBe('/my-surveys/sv-1')
    expect(screen.getByText(/Answered on 2 Nov 2026/)).toBeInTheDocument()
  })

  it('says so when the login is not linked to a staff record', () => {
    state.data = { linked: false, items: [] }
    render(<MySurveysPage />)
    expect(screen.getByTestId('my-surveys-not-linked')).toHaveTextContent(/not linked to a staff record/)
  })
})
