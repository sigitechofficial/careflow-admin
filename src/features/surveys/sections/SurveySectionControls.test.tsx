import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SplitSectionsWarning, SurveySectionHeader } from '@/features/surveys/sections/SurveySectionControls'
import { SurveyRespondentForm } from '@/features/surveys/components/SurveyRespondentForm'

const apiJson = vi.hoisted(() => vi.fn())
vi.mock('@/shared/api/api-client', () => ({ apiJson }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const header = (over: Partial<React.ComponentProps<typeof SurveySectionHeader>> = {}) => (
  <ol>
    <SurveySectionHeader
      surveyId="s1"
      title="Your visits"
      introduction="About your visits."
      canEdit
      isFirst={false}
      isLast={false}
      split={false}
      onAddHere={vi.fn()}
      onDropQuestion={vi.fn()}
      {...over}
    />
  </ol>
)

describe('section manager controls', () => {
  beforeEach(() => apiJson.mockReset().mockResolvedValue({}))

  it('moves a section as a block, and cannot move the first one up', async () => {
    wrap(header({ isFirst: true }))
    expect(screen.getByRole('button', { name: 'Move section Your visits up' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Move section Your visits down' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/sections/change', expect.objectContaining({ method: 'POST' })))
    expect(JSON.parse(apiJson.mock.calls[0][1].body)).toEqual({ title: 'Your visits', move: 'down' })
  })

  it('renames and sets the introduction in one dialog', async () => {
    wrap(header())
    fireEvent.click(screen.getByRole('button', { name: /Rename or introduction/ }))
    fireEvent.change(screen.getByLabelText('Heading'), { target: { value: 'Your care workers' } })
    fireEvent.change(screen.getByLabelText('Introduction (optional)'), { target: { value: 'About the people who visit.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledTimes(2))
    expect(apiJson.mock.calls.map(c => JSON.parse(c[1].body))).toEqual([
      { title: 'Your visits', introduction: 'About the people who visit.' },
      { title: 'Your visits', rename: 'Your care workers' },
    ])
  })

  it('removing a section asks first and keeps the questions', async () => {
    wrap(header())
    fireEvent.click(screen.getByRole('button', { name: /Remove section Your visits/ }))
    expect(await screen.findByText(/Its questions stay where they are/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove section' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/sections/remove', expect.anything()))
  })

  it('a split section cannot be moved until put together', async () => {
    wrap(
      <>
        {header({ split: true })}
        <SplitSectionsWarning surveyId="s1" titles={['Your visits']} canEdit />
      </>,
    )
    expect(screen.queryByRole('button', { name: /Move section/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Put them together' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/sections/gather', expect.anything()))
  })

  it('people answering see the introduction under the heading', () => {
    render(
      <SurveyRespondentForm
        submitting={false}
        onSubmit={vi.fn()}
        data={{
          title: 'Survey',
          description: null,
          isAnonymous: false,
          status: 'ACTIVE',
          opensAt: null,
          closesAt: null,
          alreadyCompleted: false,
          canSubmit: true,
          unavailableReason: null,
          sectionIntros: { 'Your visits': 'About your visits.' },
          questions: [
            { id: 'q1', questionText: 'On time?', helpText: null, questionType: 'YES_NO', options: null, config: null, isRequired: false, sortOrder: 0, sectionTitle: 'Your visits' },
          ],
        }}
      />,
    )
    expect(screen.getByTestId('survey-section-heading')).toHaveTextContent('Your visits')
    expect(screen.getByTestId('survey-section-intro')).toHaveTextContent('About your visits.')
  })
})
