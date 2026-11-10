import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PublicSurveyForm } from '@/features/surveys/types'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/api/api-client')>()),
  apiJson: (...a: unknown[]) => apiJson(...a),
}))
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ token: 'share-1' }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))

import { ApiError } from '@/shared/api/api-client'
import KioskSurveyPage from './KioskSurveyPage'
import { addFormTokens, flushKioskQueue, formTokenStock, kioskQueue, outcomeOf, queueAnswer, takeFormToken, tokenIssuedAt } from './kiosk-queue'

/** A form token as the API gives it (issued `secondsAgo` ago). */
const tok = (n: number, secondsAgo = 60) => `v1.${Math.floor(Date.now() / 1000 - secondsAgo).toString(36)}.nonce${n}.sig`

const form = (over: Partial<PublicSurveyForm> = {}): PublicSurveyForm =>
  ({
    title: 'Your visit today',
    description: 'Tell us how it went.',
    isAnonymous: true,
    status: 'ACTIVE',
    opensAt: null,
    closesAt: null,
    alreadyCompleted: false,
    canSubmit: true,
    unavailableReason: null,
    sectionIntros: {},
    linkKind: 'share',
    formToken: tok(0),
    deviceMarker: 'careflow-survey-answered-x',
    oncePerDeviceNote: 'Only one answer from each device.',
    questions: [{ id: 'q1', questionText: 'Do you feel safe?', helpText: null, questionType: 'YES_NO', options: null, config: null, isRequired: true, sortOrder: 0 }],
    languages: [{ code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr' }],
    translations: { pl: { 'q:q1:text': 'Czy czujesz się bezpiecznie?', 'ui:yes': 'Tak' } },
    ...over,
  }) as PublicSurveyForm

let sent: unknown[] = []
function api({ form: f = form(), failSubmit }: { form?: PublicSurveyForm; failSubmit?: () => unknown } = {}) {
  sent = []
  let n = 0
  apiJson.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes('/form-tokens')) return { data: { formTokens: Array.from({ length: 3 }, () => tok(++n + 100)) } }
    if (url.endsWith('/responses')) {
      if (failSubmit) throw failSubmit()
      sent.push(JSON.parse(String(init?.body)))
      return { data: { id: 'r1', submittedAt: '2026-11-07', closingMessage: 'Thank you from the team.', closingMessages: {} } }
    }
    return { data: f }
  })
}

const setOnline = (on: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => on })
  window.dispatchEvent(new Event(on ? 'online' : 'offline'))
}

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <KioskSurveyPage />
    </QueryClientProvider>,
  )

beforeEach(() => {
  window.localStorage.clear()
  apiJson.mockReset()
  setOnline(true)
})
afterEach(() => setOnline(true))

describe('kiosk queue', () => {
  it('keeps a stock of form tokens, oldest first, and leaves out ones too old to use', () => {
    addFormTokens('L', [tok(1, 21 * 3600), tok(2, 120), tok(3, 60)])
    expect(formTokenStock('L')).toBe(2)
    expect(takeFormToken('L')).toBe(tok(2, 120))
    expect(tokenIssuedAt(tok(9, 0))).toBeGreaterThan(0)
  })

  it('sends kept answers in order: already sent counts as sent, a refusal is dropped, no connection keeps the rest', async () => {
    queueAnswer('L', { formToken: 'a', input: { answers: [] } })
    queueAnswer('L', { formToken: 'b', input: { answers: [] } })
    queueAnswer('L', { formToken: 'c', input: { answers: [] } })
    queueAnswer('L', { formToken: 'd', input: { answers: [] } })
    apiJson
      .mockRejectedValueOnce(new ApiError('These answers have already been sent.', 400, { code: 'SURVEY_FORM_ALREADY_SENT' }))
      .mockRejectedValueOnce(new ApiError('This survey is closed.', 400, {}))
      .mockResolvedValueOnce({ data: { id: 'r', submittedAt: 'x' } })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const result = await flushKioskQueue('L')
    expect(result).toMatchObject({ sent: 2, dropped: 1, left: 1 })
    expect(kioskQueue('L').map(q => q.formToken)).toEqual(['d'])
    // Each answer goes with its own form token.
    expect(JSON.parse(String(apiJson.mock.calls[2]![1].body))).toMatchObject({ formToken: 'c' })
  })

  it('waits on no connection, too many answers at once and server errors', () => {
    expect(outcomeOf(new TypeError('Failed to fetch'))).toBe('later')
    expect(outcomeOf(new ApiError('busy', 429))).toBe('later')
    expect(outcomeOf(new ApiError('down', 503))).toBe('later')
    expect(outcomeOf(new ApiError('expired', 400, { code: 'SURVEY_FORM_EXPIRED' }))).toBe('drop')
  })
})

describe('kiosk page', () => {
  it('one person after another: thank-you, then a fresh page with no choices left over', async () => {
    api()
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: /Your visit today/ })).toBeInTheDocument()
    // One answer per device does not apply on a tablet.
    expect(screen.queryByText('Only one answer from each device.')).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByTestId('survey-language'), 'pl')
    await userEvent.click(screen.getByRole('radio', { name: 'Tak' }))
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByText('Thank you from the team.')).toBeInTheDocument()
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ formToken: expect.stringContaining('.nonce0.'), answers: [{ questionId: 'q1', booleanValue: true }] })
    await userEvent.click(screen.getByRole('button', { name: 'Start for the next person' }))
    // The next person starts in English with nothing answered.
    expect(await screen.findByRole('heading', { level: 1, name: /Your visit today/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Yes' })).not.toBeChecked()
  })

  it('offline: the answer is kept on the tablet and sent when it reconnects', async () => {
    api()
    renderPage()
    await screen.findByRole('heading', { level: 1, name: /Your visit today/ })
    await waitFor(() => expect(formTokenStock('share-1')).toBeGreaterThan(1))
    act(() => setOnline(false))
    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByRole('button', { name: 'Start for the next person' })).toBeInTheDocument()
    expect(screen.getByTestId('kiosk-status')).toHaveTextContent('1 answer waiting to send')
    expect(screen.getByTestId('kiosk-status')).toHaveTextContent(/Offline/)
    expect(sent).toHaveLength(0)
    act(() => setOnline(true))
    await waitFor(() => expect(sent).toHaveLength(1))
    await waitFor(() => expect(screen.getByTestId('kiosk-status')).toHaveTextContent('All answers sent'))
  })

  it('starts offline from the form kept on the tablet', async () => {
    api()
    const first = renderPage()
    await screen.findByRole('heading', { level: 1, name: /Your visit today/ })
    first.unmount()
    apiJson.mockReset()
    apiJson.mockRejectedValue(new TypeError('Failed to fetch'))
    setOnline(false)
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: /Your visit today/ })).toBeInTheDocument()
  })

  it('a person’s own link cannot be used as a kiosk', async () => {
    api({ form: form({ linkKind: 'recipient' }) })
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Not a shared link' })).toBeInTheDocument()
  })
})
