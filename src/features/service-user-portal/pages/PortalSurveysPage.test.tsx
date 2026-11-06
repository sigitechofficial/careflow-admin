import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { PortalSurveyItem } from '@/features/surveys/types'

const { state } = vi.hoisted(() => ({ state: { items: [] as unknown[], updates: undefined as unknown } }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _params, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a {...rest}>{children}</a>
  ),
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  usePortalSurveys: () => ({ data: state.items, isLoading: false, isError: false }),
  usePortalSurveyAnswers: () => ({ data: undefined, isLoading: false, isError: false }),
}))

vi.mock('@/features/surveys/actions/survey-actions', () => ({ usePortalUpdates: () => ({ data: state.updates }) }))

import PortalSurveysPage from '@/features/service-user-portal/pages/PortalSurveysPage'

const item = (over: Partial<PortalSurveyItem>): PortalSurveyItem => ({
  token: 't',
  title: 'Survey',
  description: null,
  sentAt: null,
  opensAt: null,
  closesAt: null,
  state: 'COMPLETED',
  unavailableReason: null,
  completedAt: '2026-11-02T10:00:00.000Z',
  respondentRelation: 'SELF',
  answersAvailable: true,
  answeredWithoutName: false,
  ...over,
})

describe('Portal surveys: answered without a name', () => {
  it('says so and offers no answers to view', () => {
    state.items = [
      item({ token: 'a', title: 'Annual survey', completedAt: null, respondentRelation: null, answersAvailable: false, answeredWithoutName: true }),
      item({ token: 'b', title: 'Visit check-in' }),
    ]
    render(<PortalSurveysPage />)
    const cards = screen.getAllByRole('listitem')
    const annual = within(cards.find(c => c.textContent?.includes('Annual survey'))!)
    expect(annual.getByText(/answered without your name/)).toBeInTheDocument()
    expect(annual.queryByRole('button', { name: /View my answers/ })).not.toBeInTheDocument()
    const visit = within(cards.find(c => c.textContent?.includes('Visit check-in'))!)
    expect(visit.getByRole('button', { name: /View my answers/ })).toBeInTheDocument()
  })
})

describe('Portal: You said, we did', () => {
  it('shows what changed, published for the person’s branch', () => {
    state.items = []
    state.updates = { organisation: null, updates: [{ id: 'y1', title: 'What we changed', intro: null, items: [{ youSaid: 'Visits felt rushed', weDid: 'More time between visits' }], headline: null, publishedOn: '2026-11-06' }] }
    render(<PortalSurveysPage />)
    expect(screen.getByRole('heading', { name: 'You said, we did' })).toBeInTheDocument()
    expect(screen.getByText('We did: More time between visits')).toBeInTheDocument()
    state.updates = undefined
  })
})
