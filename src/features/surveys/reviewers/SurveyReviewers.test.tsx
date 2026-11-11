import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { apiJson, toast } = vi.hoisted(() => ({ apiJson: vi.fn(), toast: { toastSuccess: vi.fn(), toastApiError: vi.fn() } }))
vi.mock('@/shared/api/api-client', () => ({ apiJson }))
vi.mock('@/shared/lib/toast', () => toast)

import { SurveyReviewersPanel, SurveyReviewsPage } from '@/features/surveys/reviewers/SurveyReviewers'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const later = new Date(Date.now() + 20 * 86400000).toISOString()

describe('Independent reviewers', () => {
  beforeEach(() => apiJson.mockReset())

  it('a survey manager gives a reviewer account access for a chosen sample', async () => {
    apiJson.mockImplementation(async (rawUrl: unknown, init: { method?: string } = {}) => {
      const url = String(rawUrl)
      if (url === '/surveys/s1/reviewers' && init.method === 'GET') {
        return { data: { anonymousOnly: false, grants: [], accounts: [{ id: 'rev-1', name: 'Rita Review', email: 'rita@review.example', active: true }] } }
      }
      if (url.startsWith('/surveys/s1/record-candidates')) return { data: [{ id: 'su-1', name: 'Mary Jones', recipientStatus: null, hasResponse: false }] }
      return { data: { id: 'g1' } }
    })
    wrap(<SurveyReviewersPanel surveyId="s1" canEdit />)
    expect(await screen.findByText('No reviewer has access.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Give a reviewer access' }))
    const give = screen.getByRole('button', { name: 'Give access' })
    expect(give).toBeDisabled()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Mary Jones' }))
    await userEvent.click(give)
    const post = apiJson.mock.calls.find(([url, init]) => url === '/surveys/s1/reviewers' && init.method === 'POST')!
    expect(JSON.parse(post[1].body)).toMatchObject({ userId: 'rev-1', personIds: ['su-1'] })
    // Never a temporary (inspector) login.
    expect(post[1].body).not.toMatch(/inspector/i)
  })

  it('"Add a reviewer" makes the account with a name and email only (they choose their own password), then offers access', async () => {
    apiJson.mockImplementation(async (rawUrl: unknown, init: { method?: string } = {}) => {
      const url = String(rawUrl)
      if (url === '/surveys/s1/reviewers' && init.method === 'GET') return { data: { anonymousOnly: true, grants: [], accounts: [] } }
      if (url === '/surveys/s1/reviewers/accounts') return { data: { id: 'rev-new', inviteSent: true } }
      return { data: {} }
    })
    wrap(<SurveyReviewersPanel surveyId="s1" canEdit />)
    expect(await screen.findByTestId('survey-reviewers-ending')).toHaveTextContent(/End access.*switch their account off as well/)
    await userEvent.click(await screen.findByRole('button', { name: 'Add a reviewer' }))
    const dialog = screen.getByTestId('add-reviewer-dialog')
    expect(dialog).toHaveTextContent('They are emailed a link to choose their own password; nobody else sets or sees it.')
    // No password box anywhere.
    expect(dialog.querySelector('input[type="password"]')).toBeNull()
    const make = screen.getByRole('button', { name: /make the account/i })
    expect(make).toBeDisabled()
    await userEvent.type(screen.getByLabelText('First name'), 'Rita')
    await userEvent.type(screen.getByLabelText('Last name'), 'Review')
    await userEvent.type(screen.getByLabelText('Email'), 'rita@review.example')
    await userEvent.click(make)
    const post = apiJson.mock.calls.find(([url]) => url === '/surveys/s1/reviewers/accounts')!
    expect(JSON.parse(post[1].body)).toEqual({ firstName: 'Rita', lastName: 'Review', email: 'rita@review.example' })
    expect(toast.toastSuccess).toHaveBeenCalledWith('Reviewer account made', 'They have been emailed a link to choose their own password.')
    expect(await screen.findByTestId('grant-reviewer-dialog')).toBeInTheDocument()
  })

  it('"Add a reviewer" opens on reviewers added before: one is chosen as they are, with no new account', async () => {
    apiJson.mockImplementation(async (rawUrl: unknown, init: { method?: string } = {}) => {
      const url = String(rawUrl)
      if (url === '/surveys/s1/reviewers' && init.method === 'GET') {
        return {
          data: {
            anonymousOnly: true,
            grants: [],
            accounts: [
              { id: 'rev-1', name: 'Rita Review', email: 'rita@review.example', active: true },
              { id: 'rev-2', name: 'Old Reviewer', email: 'old@review.example', active: false },
            ],
          },
        }
      }
      if (url === '/surveys/s1/reviewers/survey-staff') {
        return { data: { staff: [{ id: 'u-1', name: 'Sam Office', email: 'sam@care.example', roles: ['Care coordinator'], branches: ['North'] }] } }
      }
      return { data: {} }
    })
    wrap(<SurveyReviewersPanel surveyId="s1" canEdit />)
    await userEvent.click(await screen.findByRole('button', { name: 'Add a reviewer' }))
    const previous = await screen.findByTestId('reviewer-previous')
    expect(screen.getByRole('tab', { name: /Reviewers added before \(2\)/ })).toHaveAttribute('aria-selected', 'true')
    expect(previous).toHaveTextContent('Rita Review · Independent reviewer')
    expect(previous).toHaveTextContent('account switched off')
    const radios = screen.getAllByRole('radio')
    expect(radios[1]).toBeDisabled()
    const use = screen.getByTestId('use-existing-reviewer')
    expect(use).toBeDisabled()
    await userEvent.click(radios[0])
    await userEvent.click(use)
    // No new account: straight to giving access.
    expect(apiJson.mock.calls.some(([url]) => url === '/surveys/s1/reviewers/accounts')).toBe(false)
    expect(await screen.findByTestId('grant-reviewer-dialog')).toBeInTheDocument()
  })

  it('"Staff who run surveys" lists staff with the responsibility and offers no way to give them reviewer access', async () => {
    apiJson.mockImplementation(async (rawUrl: unknown, init: { method?: string } = {}) => {
      const url = String(rawUrl)
      if (url === '/surveys/s1/reviewers' && init.method === 'GET') return { data: { anonymousOnly: true, grants: [], accounts: [] } }
      if (url === '/surveys/s1/reviewers/survey-staff') {
        return { data: { staff: [{ id: 'u-1', name: 'Sam Office', email: 'sam@care.example', roles: ['Care coordinator'], branches: ['North'] }] } }
      }
      return { data: {} }
    })
    wrap(<SurveyReviewersPanel surveyId="s1" canEdit />)
    await userEvent.click(await screen.findByRole('button', { name: 'Add a reviewer' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Staff who run surveys' }))
    const staff = await screen.findByTestId('reviewer-staff')
    expect(await screen.findByText('Sam Office')).toBeInTheDocument()
    expect(staff).toHaveTextContent('Care coordinator')
    expect(staff).toHaveTextContent('Staff can’t be independent reviewers')
    expect(screen.queryByRole('button', { name: /make the account|give them access/i })).toBeNull()
  })

  it('someone already connected to us: the links are shown and a declaration is needed before the account is made', async () => {
    apiJson.mockImplementation(async (rawUrl: unknown, init: { method?: string } = {}) => {
      const url = String(rawUrl)
      if (url === '/surveys/s1/reviewers' && init.method === 'GET') return { data: { anonymousOnly: true, grants: [], accounts: [] } }
      if (url === '/surveys/s1/reviewers/accounts/check')
        return { data: { links: [{ kind: 'FORMER_STAFF', label: 'Former member of staff: Rita Review', match: 'NAME' }] } }
      if (url === '/surveys/s1/reviewers/accounts') return { data: { id: 'rev-new', inviteSent: true } }
      return { data: {} }
    })
    wrap(<SurveyReviewersPanel surveyId="s1" canEdit />)
    await userEvent.click(await screen.findByRole('button', { name: 'Add a reviewer' }))
    await userEvent.type(screen.getByLabelText('First name'), 'Rita')
    await userEvent.type(screen.getByLabelText('Last name'), 'Review')
    await userEvent.type(screen.getByLabelText('Email'), 'rita@review.example')
    await userEvent.click(screen.getByRole('button', { name: /make the account/i }))
    expect(await screen.findByTestId('reviewer-links')).toHaveTextContent('Former member of staff: Rita Review')
    expect(apiJson.mock.calls.some(([url]) => url === '/surveys/s1/reviewers/accounts')).toBe(false)
    const make = screen.getByRole('button', { name: 'Make the account' })
    expect(make).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.type(screen.getByLabelText('Why they are independent enough'), 'Left in 2022, never in this branch')
    await userEvent.click(make)
    const post = apiJson.mock.calls.find(([url]) => url === '/surveys/s1/reviewers/accounts')!
    expect(JSON.parse(post[1].body)).toMatchObject({ declaration: 'Left in 2022, never in this branch' })
  })

  it('a repeating survey: access is given on the period being run, not here', async () => {
    apiJson.mockResolvedValue({ data: { anonymousOnly: false, repeatingParent: true, grants: [], accounts: [] } })
    wrap(<SurveyReviewersPanel surveyId="s1" canEdit />)
    expect(await screen.findByTestId('survey-reviewers-repeating')).toHaveTextContent('open it from Periods')
    expect(screen.queryByRole('button', { name: 'Give a reviewer access' })).not.toBeInTheDocument()
  })

  it('an anonymous survey: no sample to choose, anonymous answers only', async () => {
    apiJson.mockResolvedValue({ data: { anonymousOnly: true, grants: [], accounts: [{ id: 'rev-1', name: 'Rita', email: 'rita@review.example', active: true }] } })
    wrap(<SurveyReviewersPanel surveyId="s1" canEdit />)
    await userEvent.click(await screen.findByRole('button', { name: 'Give a reviewer access' }))
    expect(screen.getByTestId('grant-reviewer-dialog')).toHaveTextContent('record anonymous answers only')
    expect(screen.queryByRole('group', { name: /Sample/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Give access' })).toBeEnabled()
  })

  it('the reviewer sees only the surveys they may record now', async () => {
    apiJson.mockResolvedValue({
      data: [{ surveyId: 's1', title: 'Independent review 2027', targetKind: 'SERVICE_USER', anonymousOnly: false, sampleSize: 12, validTo: later, closed: false }],
    })
    wrap(<SurveyReviewsPage />)
    expect(await screen.findByText('Independent review 2027')).toBeInTheDocument()
    expect(screen.getByText(/12 people in your sample/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Surveys to record' })).toBeInTheDocument()
  })
})
