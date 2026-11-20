import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _p, search: _s, ...rest }: { children: React.ReactNode; to: string; params?: unknown; search?: unknown }) => (
    <a {...rest}>{children}</a>
  ),
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ can: () => true, user: { assignedLocationIds: null } }),
}))
const adopt = { mutateAsync: vi.fn(), isPending: false }
const undo = { mutateAsync: vi.fn(), isPending: false }
vi.mock('./hooks', () => ({
  useStatementSurveys: () => ({ data: {} }),
  useAdoptPolicies: () => adopt,
  useAdoptSurveys: () => adopt,
  useUndoAdoptPolicy: () => undo,
  useUndoAdoptSurvey: () => undo,
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { RelatedSurveys, surveysForStatements } from './components/RelatedSurveys'
import type { StatementSurvey } from './types'

const s = (id: string, statementCount: number, title = id): StatementSurvey => ({
  id,
  reference: id,
  title,
  respondents: 'People we support, chosen at random',
  audience: 'SERVICE_USER',
  groupName: 'People we support',
  adoptedTemplateId: null,
  statementCount,
})

describe('related surveys', () => {
  it('orders a template\'s surveys by how many of its statements they cover, then the most focused', () => {
    const byStatement = {
      A: [s('one-statement', 1), s('broad', 20), s('two', 2)],
      B: [s('broad', 20), s('two', 2)],
    }
    expect(surveysForStatements(['A', 'B'], byStatement).map(x => x.id)).toEqual(['two', 'broad', 'one-statement'])
  })

  it('shows four surveys with the short group name, and the rest behind Show all', () => {
    render(<RelatedSurveys surveys={[1, 2, 3, 4, 5, 6].map(n => s(`s${n}`, n, `Survey ${n}`))} />)
    expect(screen.getAllByTestId('mock-related-survey')).toHaveLength(4)
    expect(screen.getAllByText('People we support')).toHaveLength(4)
    expect(screen.getAllByTestId('mock-adopt-survey')).toHaveLength(4)
    fireEvent.click(screen.getByTestId('mock-related-surveys-toggle'))
    expect(screen.getAllByTestId('mock-related-survey')).toHaveLength(6)
    expect(screen.getByTestId('mock-related-surveys-toggle')).toHaveTextContent('Show fewer')
  })

  it('offers Undo adopt on an adopted survey, which removes its template after confirming', async () => {
    render(<RelatedSurveys surveys={[{ ...s('lib-1', 1, 'Survey 1'), adoptedTemplateId: 'tpl-1' }, s('lib-2', 2, 'Survey 2')]} />)
    expect(screen.getAllByTestId('mock-undo-adopt-survey')).toHaveLength(1)
    expect(screen.getAllByTestId('mock-adopt-survey')).toHaveLength(1)
    fireEvent.click(screen.getByTestId('mock-undo-adopt-survey'))
    fireEvent.click(await screen.findByTestId('mock-undo-adopt-survey-confirm'))
    await waitFor(() => expect(undo.mutateAsync).toHaveBeenCalledWith('tpl-1'))
  })

  it('shows nothing without surveys', () => {
    const { container } = render(<RelatedSurveys surveys={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
