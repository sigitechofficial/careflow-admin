import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyListItem } from '@/features/surveys/types'

const { state, mutation } = vi.hoisted(() => ({
  state: { surveys: [] as unknown[], search: {} as Record<string, unknown> },
  mutation: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _params, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a {...rest}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => state.search,
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: () => boolean }) => unknown) => pick({ can: () => true }),
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurveys: () => ({ data: state.surveys, isLoading: false, isError: false }),
  useSurvey: () => ({ data: undefined, isLoading: false }),
  useCreateSurvey: mutation,
  useDeleteSurvey: mutation,
  useDeleteSurveyWithoutEvidence: mutation,
  useMoveTemplateToSurveys: mutation,
  useSaveSurveyAsTemplate: mutation,
  useDuplicateSurvey: mutation,
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({
  useLocationManagementTree: () => ({
    data: { zones: [{ id: 'z1', name: 'North', branches: [{ id: 'b1', name: 'Leeds', locationId: 'loc-1' }] }] },
  }),
}))
vi.mock('@/features/employees/hooks/useEmployees', () => ({
  useEmployeeLookups: () => ({ data: { jobTitles: [] } }),
}))
vi.mock('@/features/employees/hooks/useEmployeeTabs', () => ({ useAllEmployees: () => ({ data: [] }) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn(), toastError: vi.fn() }))
vi.mock('@/features/surveys/api/survey-library.api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/surveys/api/survey-library.api')>()),
  useLibrarySurveys: () => ({ data: [], isLoading: false, isError: false }),
  useLibrarySurvey: () => ({ data: undefined, isLoading: false, isError: false }),
  useAdoptLibrarySurveys: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSurveyLibraryLink: () => ({ data: null }),
}))

import SurveysPage from '@/features/surveys/pages/SurveysPage'

function template(overrides: Partial<SurveyListItem>): SurveyListItem {
  return {
    id: 't1',
    title: 'Company template',
    description: null,
    targetKind: 'EMPLOYEE',
    status: 'DRAFT',
    isAnonymous: false,
    opensAt: null,
    closesAt: null,
    publishedAt: null,
    distributeAt: null,
    distributedAt: null,
    recurrence: null,
    clonedFromId: null,
    periodKey: null,
    periodOpenDays: null,
    recurrenceAnchorAt: null,
    distributionFailedAt: null,
    distributionError: null,
    locationIds: [],
    roleIds: [],
    audienceEmployeeIds: [],
    isTemplate: true,
    shareToken: null,
    questionCount: 3,
    recipientCount: 0,
    completedCount: 0,
    responseCount: 0,
    periodCount: 0,
    responseRate: 0,
    createdById: null,
    createdByName: null,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    ...overrides,
  }
}

describe('SurveysPage — templates', () => {
  beforeEach(() => {
    state.surveys = [
      template({ id: 't1', title: 'Company template', readOnly: true }),
      template({ id: 't2', title: 'Leeds template', locationIds: ['loc-1'], readOnly: false }),
    ]
  })

  it('shared company templates can be used but not moved, deleted or edited by a branch user', async () => {
    render(<SurveysPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Templates/ }))
    const table = screen.getByTestId('templates-table')
    const shared = within(table).getByText('Company template').closest('tr')!
    expect(within(shared).getByRole('button', { name: 'Use template Company template' })).toBeEnabled()
    expect(within(shared).getByText('Shared')).toBeInTheDocument()
    expect(within(shared).getByLabelText('View Company template')).toBeInTheDocument()
    expect(within(shared).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument()
    expect(within(shared).queryByRole('button', { name: /back to surveys/ })).not.toBeInTheDocument()

    const own = within(table).getByText('Leeds template').closest('tr')!
    expect(within(own).getByRole('button', { name: 'Delete Leeds template' })).toBeInTheDocument()
    expect(within(own).getByRole('button', { name: 'Move Leeds template back to surveys' })).toBeInTheDocument()
    expect(within(own).getByLabelText('Edit Leeds template')).toBeInTheDocument()
  })
})

describe('SurveysPage — opening on Templates', () => {
  it('?view=templates (after adopting ready-made surveys) opens the Templates tab', () => {
    state.surveys = [template({ id: 't1', title: 'Adopted template' })]
    state.search = { view: 'templates' }
    render(<SurveysPage />)
    expect(screen.getByRole('tab', { name: /Templates/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('templates-table')).toBeInTheDocument()
    state.search = {}
  })
})

describe('SurveysPage — ready-made surveys', () => {
  it('links to the ready-made surveys from the header', () => {
    state.surveys = []
    render(<SurveysPage />)
    expect(screen.getByTestId('ready-made-surveys-link')).toHaveTextContent('Ready-made surveys')
  })
})

describe('SurveysPage — one New survey dialog for every way in', () => {
  beforeEach(() => {
    state.search = {}
    state.surveys = [template({ id: 't1', title: 'Company template', questionCount: 4 })]
  })

  it('"New survey" opens step 1: blank, one of your templates or the ready-made library', async () => {
    render(<SurveysPage />)
    await userEvent.click(screen.getByRole('button', { name: 'New survey' }))
    const dialog = within(screen.getByTestId('new-survey-dialog'))
    expect(dialog.getByText('Step 1 of 2 · Choose what to start from')).toBeInTheDocument()
    const choices = within(dialog.getByRole('radiogroup', { name: 'Start from' })).getAllByRole('radio')
    expect(choices.map(c => c.closest('label')?.textContent)).toEqual([
      expect.stringMatching(/^Blank survey/),
      expect.stringMatching(/^One of your templates/),
      expect.stringMatching(/^Ready-made library/),
    ])
    // Only one dialog — no separate "Use template" one.
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('"Use" on a template opens step 2 with that template chosen, and Back goes to step 1', async () => {
    render(<SurveysPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Templates/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Use template Company template' }))
    const dialog = within(screen.getByTestId('new-survey-dialog'))
    expect(dialog.getByText('Step 2 of 2 · Details')).toBeInTheDocument()
    expect(dialog.getByTestId('new-survey-source')).toHaveTextContent('From template: Company template')
    expect(dialog.getByDisplayValue('Company template')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Back' }))
    expect(dialog.getByRole('radio', { name: /^One of your templates/ })).toBeChecked()
    expect(dialog.getByRole('radio', { name: 'Company template' })).toBeChecked()
  })

  it('"New template" on the Templates tab opens a blank template', async () => {
    render(<SurveysPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Templates/ }))
    await userEvent.click(screen.getByRole('button', { name: 'New template' }))
    const dialog = within(screen.getByTestId('new-survey-dialog'))
    expect(dialog.getByRole('heading', { name: 'New template' })).toBeInTheDocument()
    expect(dialog.getByRole('checkbox', { name: /Make this a template instead/ })).toBeChecked()
    expect(dialog.getByRole('button', { name: 'Create template' })).toBeInTheDocument()
  })

  it('Duplicate uses the same dialog, without step 1', async () => {
    state.surveys = [template({ id: 's1', title: 'Spring check-in', isTemplate: false })]
    render(<SurveysPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Duplicate Spring check-in' }))
    const dialog = within(screen.getByTestId('new-survey-dialog'))
    expect(dialog.getByRole('heading', { name: 'Duplicate survey' })).toBeInTheDocument()
    expect(dialog.getByDisplayValue('Spring check-in (Copy)')).toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Duplicate & edit' })).toBeInTheDocument()
  })
})

describe('SurveysPage — end dates', () => {
  it('shows "Ends <date time>" on open surveys and "Closed at its end date" on surveys closed that way', () => {
    state.search = {}
    state.surveys = [
      template({ id: 'a', title: 'Open one', isTemplate: false, status: 'ACTIVE', closesAt: '2026-11-30T17:00:00.000Z' }),
      template({ id: 'b', title: 'Ended one', isTemplate: false, status: 'CLOSED', closesAt: '2026-11-01T17:00:00.000Z', closedAtEndDate: true }),
      template({ id: 'c', title: 'Closed early', isTemplate: false, status: 'CLOSED', closesAt: '2026-12-01T17:00:00.000Z', closedAtEndDate: false }),
    ]
    render(<SurveysPage />)
    const row = (title: string) => screen.getByText(title).closest('tr')!
    expect(row('Open one')).toHaveTextContent('Ends 30 Nov 2026, 17:00')
    expect(within(row('Ended one')).getByTestId('survey-closed-at-end-date')).toHaveTextContent('Closed at its end date')
    expect(within(row('Closed early')).queryByTestId('survey-closed-at-end-date')).not.toBeInTheDocument()
    expect(row('Closed early')).not.toHaveTextContent('Ends ')
  })
})
