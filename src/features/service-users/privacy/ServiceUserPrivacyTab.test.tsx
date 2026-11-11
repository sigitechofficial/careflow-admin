import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ServiceUserPrivacy } from './service-user-privacy.api'

const apiJson = vi.fn()
const perms = new Set<string>()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: (p: string) => boolean }) => unknown) => pick({ can: (p: string) => perms.has(p) }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))

import { ServiceUserPrivacyTab } from './ServiceUserPrivacyTab'

const SU = 'su-1'
const privacy = (over: Partial<ServiceUserPrivacy> = {}): ServiceUserPrivacy => ({
  today: '2026-11-08',
  needs: null,
  sharing: [],
  exceptions: [],
  contacts: [{ id: 'c1', name: 'Ann Smith', relationship: 'Daughter', canReceiveUpdates: true }],
  legalAuthorities: [],
  assessment: {
    submissionId: 'ia-1',
    submittedOn: '2026-11-01T10:00:00Z',
    needs: { interpreterNeeded: true, interpreterLanguage: 'Polish', easyReadOrLargePrint: true, hearing: 'Moderate loss', sight: '' },
    sharing: { consent: 'YES', with: ['GP', 'Family or representatives'], limits: 'Not her finances', restrictions: '', conditions: '' },
  },
  consents: [
    { key: 'ia-care', title: 'Consent to receive care and support', answer: 'PARTLY', detail: 'Not consented to, or conditions: no male carers.', on: '2026-11-01', source: 'INITIAL_ASSESSMENT' },
    { key: 'capacity-d1', title: 'Covert medication', answer: 'BEST_INTERESTS', detail: 'Best-interests decision: crushed in yoghurt.', on: '2026-11-02', source: 'CAPACITY' },
    { key: 'visits', title: 'Consent to care at each visit', answer: 'RECORDED', detail: 'Last 90 days: given at 12 visits, declined at 1.', on: null, source: 'VISITS' },
  ],
  ...over,
})

const line = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  recipientKind: 'CONTACT',
  contactId: 'c1',
  recipientName: 'Ann Smith',
  recipientRole: 'Daughter',
  categories: ['CARE_UPDATES', 'VISIT_TIMES'],
  channels: ['PHONE'],
  basis: 'CONSENT',
  legalAuthorityId: null,
  conditions: 'Not her finances',
  startsOn: '2026-11-01',
  endsOn: null,
  reviewOn: null,
  status: 'ACTIVE',
  stoppedAt: null,
  stopReason: '',
  source: 'MANUAL',
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
  ...over,
})

function wrap(data: ServiceUserPrivacy) {
  apiJson.mockImplementation(async (url: string, init: { method: string }) =>
    init.method === 'GET' && url === `/service-users/${SU}/privacy` ? { data } : { message: 'ok' },
  )
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ServiceUserPrivacyTab serviceUserId={SU} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  apiJson.mockReset()
  perms.clear()
  perms.add('service_users.update')
})

describe('Privacy on a service user’s profile', () => {
  it('fills communication needs from the assessment the first time', async () => {
    wrap(privacy())
    const banner = await screen.findByTestId('privacy-needs-from-assessment')
    expect(banner).toHaveTextContent('interpreter (Polish), easy read or large print, hearing: moderate loss')
    await userEvent.click(within(banner).getByRole('button', { name: 'Use the assessment’s answers' }))
    expect(screen.getByText('The assessment said easy read or large print: tick which they need.')).toBeInTheDocument()
    expect(screen.getByLabelText('Language')).toHaveValue('Polish')
    await userEvent.click(screen.getByLabelText('Large print'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const put = apiJson.mock.calls.find(([, init]) => (init as { method: string }).method === 'PUT')!
    expect(put[0]).toBe(`/service-users/${SU}/privacy/communication-needs`)
    expect(JSON.parse((put[1] as { body: string }).body)).toMatchObject({
      interpreterNeeded: true,
      interpreterLanguage: 'Polish',
      formats: ['LARGE_PRINT'],
      hearing: 'Moderate loss',
      fromAssessmentId: 'ia-1',
    })
  })

  it('shows recorded needs and what the assessment said about sharing', async () => {
    wrap(
      privacy({
        needs: {
          interpreterNeeded: false,
          interpreterLanguage: '',
          formats: ['LARGE_PRINT', 'EASY_READ'],
          hearing: '',
          sight: 'Cannot read small print',
          contactViaContactId: 'c1',
          notes: '',
          source: 'MANUAL',
          summary: 'Large print · Easy read',
          updatedAt: '2026-11-08T10:00:00Z',
        },
      }),
    )
    const summary = await screen.findByTestId('privacy-needs-summary')
    expect(summary).toHaveTextContent('Large print, Easy read')
    expect(summary).toHaveTextContent('Cannot read small print')
    expect(summary).toHaveTextContent('Ann Smith')
    expect(screen.queryByTestId('privacy-needs-from-assessment')).toBeNull()
    expect(screen.getByTestId('privacy-sharing-assessment')).toHaveTextContent('Agreed to sharing with: GP, Family or representatives. Limits: Not her finances.')
  })

  it('lists who we share with, and stopping asks why', async () => {
    wrap(privacy({ sharing: [line(), line({ id: 's2', recipientName: 'Old GP', status: 'STOPPED', stoppedAt: '2026-11-05T10:00:00Z', stopReason: 'Moved surgery' })] as never }))
    const current = await screen.findByTestId('privacy-sharing-current')
    expect(within(current).getAllByTestId('privacy-sharing-row')).toHaveLength(1)
    expect(current).toHaveTextContent('Day-to-day care updates, Visit times and carers · by phone · They agreed')
    await userEvent.click(screen.getByRole('button', { name: /Show stopped and ended sharing \(1\)/ }))
    expect(screen.getByTestId('privacy-sharing-past')).toHaveTextContent('Moved surgery')

    await userEvent.click(within(current).getByRole('button', { name: 'Stop sharing' }))
    const stop = screen.getByRole('button', { name: 'Stop sharing' })
    expect(stop).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Why'), 'She asked us to stop')
    await userEvent.click(stop)
    const post = apiJson.mock.calls.find(([url]) => String(url).endsWith('/sharing/s1/stop'))!
    expect(JSON.parse((post[1] as { body: string }).body)).toEqual({ reason: 'She asked us to stop' })
  })

  it('adds sharing with a contact', async () => {
    wrap(privacy())
    await screen.findByTestId('privacy-sharing')
    await userEvent.click(within(screen.getByTestId('privacy-sharing')).getByRole('button', { name: 'Add' }))
    await userEvent.selectOptions(screen.getByLabelText('Which family member or friend'), 'c1')
    await userEvent.click(screen.getByLabelText('Day-to-day care updates'))
    await userEvent.click(screen.getByLabelText('Phone'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const post = apiJson.mock.calls.find(([url, init]) => String(url).endsWith('/privacy/sharing') && (init as { method: string }).method === 'POST')!
    expect(JSON.parse((post[1] as { body: string }).body)).toMatchObject({
      recipientKind: 'CONTACT',
      contactId: 'c1',
      categories: ['CARE_UPDATES'],
      channels: ['PHONE'],
      basis: 'CONSENT',
      startsOn: '2026-11-08',
    })
  })

  it('a family member can be ticked for surveys, on its own and apart from "Everything"', async () => {
    wrap(privacy())
    await screen.findByTestId('privacy-sharing')
    await userEvent.click(within(screen.getByTestId('privacy-sharing')).getByRole('button', { name: 'Add' }))
    await userEvent.selectOptions(screen.getByLabelText('Which family member or friend'), 'c1')
    await userEvent.click(screen.getByLabelText('Everything about their care'))
    await userEvent.click(screen.getByLabelText(/Surveys about our care/))
    await userEvent.click(screen.getByLabelText('Email'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const post = apiJson.mock.calls.find(([url, init]) => String(url).endsWith('/privacy/sharing') && (init as { method: string }).method === 'POST')!
    expect(JSON.parse((post[1] as { body: string }).body)).toMatchObject({ contactId: 'c1', categories: ['ALL', 'SURVEYS'] })
  })

  it('without permission to change, it only shows', async () => {
    perms.clear()
    wrap(privacy({ sharing: [line()] as never }))
    await screen.findByTestId('privacy-sharing-current')
    expect(screen.queryByRole('button', { name: 'Stop sharing' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull()
    expect(screen.queryByTestId('privacy-needs-from-assessment')).toBeNull()
  })
  it('shows every consent in one record, with its answer and where it was recorded', async () => {
    wrap(privacy())
    const rows = await screen.findAllByTestId('privacy-consent-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Consent to receive care and support')
    expect(rows[0]).toHaveTextContent('Partly')
    expect(rows[0]).toHaveTextContent('Initial assessment')
    expect(rows[1]).toHaveTextContent('Best interests')
    expect(rows[1]).toHaveTextContent('Capacity decision')
    expect(rows[2]).toHaveTextContent('Last 90 days: given at 12 visits, declined at 1.')
  })
  it('records a change to a consent, and shows what it was before', async () => {
    wrap(
      privacy({
        consents: [
          {
            key: 'ia-care',
            title: 'Consent to receive care and support',
            answer: 'WITHDRAWN',
            detail: 'By Ann Smith, attorney. Moving to a care home',
            on: '2026-11-08',
            source: 'CHANGE',
            topic: 'CARE',
            recordedBy: 'Sam Lee',
            history: [{ answer: 'GIVEN', detail: 'Given verbally.', on: '2026-11-01', source: 'INITIAL_ASSESSMENT', recordedBy: null }],
          },
        ],
      }),
    )
    const row = await screen.findByTestId('privacy-consent-row')
    expect(row).toHaveTextContent('Withdrawn')
    expect(row).toHaveTextContent('by Sam Lee')
    await userEvent.click(within(row).getByRole('button', { name: 'History (1)' }))
    expect(screen.getByTestId('privacy-consent-history')).toHaveTextContent('Given verbally. · Initial assessment')

    await userEvent.click(within(row).getByRole('button', { name: 'Record a change' }))
    await userEvent.selectOptions(screen.getByLabelText('Answer'), 'GIVEN')
    await userEvent.selectOptions(screen.getByLabelText('How'), 'written')
    await userEvent.type(screen.getByLabelText('Details'), 'Staying at home after all')
    await userEvent.click(screen.getByRole('button', { name: 'Record' }))
    const post = apiJson.mock.calls.find(([url]) => String(url).endsWith('/privacy/consents'))!
    expect(JSON.parse((post[1] as { body: string }).body)).toMatchObject({
      topic: 'CARE',
      answer: 'GIVEN',
      method: 'written',
      details: 'Staying at home after all',
      decidedOn: '2026-11-08',
    })
  })
})
