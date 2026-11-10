import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyLibraryLink } from '@/features/surveys/api/survey-library.api'

const { state, applyMock } = vi.hoisted(() => ({
  state: { link: null as SurveyLibraryLink | null },
  applyMock: vi.fn(),
}))

vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@/features/surveys/api/survey-library.api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/features/surveys/api/survey-library.api')>()
  return {
    ...actual,
    useSurveyLibraryLink: () => ({ data: state.link, isLoading: false }),
    useLibrarySurvey: (id: string | null) => ({
      data: id
        ? {
            sections: [
              {
                title: 'Supervision',
                evidence: [],
                questions: [
                  {
                    id: 'q1',
                    questionText: 'Do you get regular supervision?',
                    helpText: null,
                    questionType: 'YES_NO',
                    options: null,
                    config: null,
                    isRequired: true,
                  },
                ],
              },
            ],
          }
        : undefined,
      isLoading: false,
    }),
    useApplySurveyLibraryUpdate: () => ({ mutate: applyMock, isPending: false }),
  }
})

import { SurveyLibraryUpdateBanner } from '@/features/surveys/components/SurveyLibraryUpdateBanner'

const link = (over: Partial<SurveyLibraryLink> = {}): SurveyLibraryLink => ({
  libraryId: 'lib-1',
  reference: 'SUR-STF-002',
  title: 'Staff exit survey',
  adoptedRevision: 1,
  currentRevision: 2,
  revisionNote: 'Added a question on supervision',
  updateAvailable: true,
  ...over,
})

describe('SurveyLibraryUpdateBanner', () => {
  beforeEach(() => applyMock.mockReset())

  it('stays hidden when the template is up to date or was not adopted', () => {
    state.link = link({ updateAvailable: false })
    const { container, rerender } = render(<SurveyLibraryUpdateBanner surveyId="t1" canApply />)
    expect(container).toBeEmptyDOMElement()
    state.link = null
    rerender(<SurveyLibraryUpdateBanner surveyId="t1" canApply />)
    expect(container).toBeEmptyDOMElement()
  })

  it('explains the update, shows the new questions and applies it to the template', async () => {
    state.link = link()
    render(<SurveyLibraryUpdateBanner surveyId="t1" canApply />)
    expect(screen.getByTestId('survey-library-update-banner')).toHaveTextContent(
      'You adopted revision 1; revision 2 is now available: Added a question on supervision',
    )
    await userEvent.click(screen.getByRole('button', { name: /review the update/i }))
    expect(await screen.findByText('Supervision')).toBeInTheDocument()
    expect(screen.getByText(/1\. Do you get regular supervision\?/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /apply to this template/i }))
    expect(applyMock).toHaveBeenCalledWith('t1', expect.any(Object))
  })

  it('read-only users see the notice but cannot apply it', async () => {
    state.link = link()
    render(<SurveyLibraryUpdateBanner surveyId="t1" canApply={false} />)
    await userEvent.click(screen.getByRole('button', { name: /review the update/i }))
    expect(screen.queryByRole('button', { name: /apply to this template/i })).not.toBeInTheDocument()
  })

  it('shows what happens to the alert rules before applying, turned-off rules first with why', async () => {
    state.link = link({
      plan: {
        refreshed: ['Feels unsafe'],
        added: ['Missed visits'],
        removed: [],
        renamedAnswers: [{ title: 'Our late-visit rule', changes: ['"Late" is now "Arrived late" in "How was your visit?"'] }],
        kept: [],
        turnedOff: [{ title: 'Our rota rule', reason: '"Do you get your rota on time?" was taken out of the ready-made survey.' }],
        sectionIntrosKept: ['About your visits'],
        sectionIntrosDropped: ['Rotas'],
      },
    })
    render(<SurveyLibraryUpdateBanner surveyId="t1" canApply />)
    await userEvent.click(screen.getByRole('button', { name: /review the update/i }))
    const plan = await screen.findByTestId('library-update-plan')
    expect(plan).toHaveTextContent('Turned off, because they can no longer work as set')
    expect(plan).toHaveTextContent('Our rota rule: "Do you get your rota on time?" was taken out of the ready-made survey.')
    expect(plan).toHaveTextContent('Feels unsafe')
    expect(plan).toHaveTextContent('Missed visits')
    expect(plan).toHaveTextContent('Our late-visit rule: "Late" is now "Arrived late"')
    expect(plan).toHaveTextContent('Your section introductions removed (their section is no longer in the survey)')
  })
})
