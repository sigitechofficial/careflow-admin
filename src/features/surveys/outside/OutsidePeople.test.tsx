import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@/features/auth/store', () => ({ useAuthStore: (sel: (s: { can: () => boolean }) => unknown) => sel({ can: () => true }) }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _p, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => <a {...rest}>{children}</a>,
}))
vi.mock('@/shared/ui/page-elements', () => ({
  PageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {children}
    </header>
  ),
}))
vi.mock('@/features/complaints/components/FeedbackPickers', () => ({
  ServiceUserPicker: ({ onChange }: { onChange: (v: { id: string; name: string }) => void }) => (
    <>
      <button type="button" onClick={() => onChange({ id: 'su1', name: 'Ada Lane' })}>
        pick person
      </button>
      <button type="button" onClick={() => onChange({ id: 'su2', name: 'Tom Hart' })}>
        pick second person
      </button>
    </>
  ),
}))

import OutsidePeoplePage from './OutsidePeoplePage'
import { SendOutsideDialog } from './SendOutsideDialog'
import { SurveysAboutPersonSection } from './SurveysAboutPersonSection'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const contact = {
  id: 'x1',
  kind: 'PROFESSIONAL',
  name: 'Dr Sam Patel',
  organisation: 'Hill Surgery',
  role: 'GP',
  email: 'sam@hill.example',
  mobile: null,
  phone: null,
  sourceType: 'TYPED',
  serviceUserId: null,
  locationIds: [],
  listIds: [],
  optedOut: [],
  canChange: true,
}

beforeEach(() => apiJson.mockReset())

describe('Outside people', () => {
  it('lists people with how they may be contacted, and stops surveys to one with a click', async () => {
    apiJson.mockImplementation(async (raw: unknown, init?: RequestInit) => {
      const url = String(raw ?? "")
      if ((init?.method ?? 'GET') !== 'GET') return { data: {} }
      if (url.startsWith('/survey-outside-people/contacts')) return { data: [contact, { ...contact, id: 'x2', name: 'Jo Bloggs', kind: 'COMMISSIONER', optedOut: ['ALL'] }] }
      return { data: [] }
    })
    wrap(<OutsidePeoplePage />)
    expect(await screen.findByText('Dr Sam Patel')).toBeInTheDocument()
    expect(screen.getByText('Does not want surveys')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop surveys to Dr Sam Patel' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/survey-outside-people/contacts/x1/opt-out', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ channels: ['ALL'] }) })))
  })

  it('send to people: families only with consent, linked to the person; says who cannot be sent it', async () => {
    apiJson.mockImplementation(async (raw: unknown, init?: RequestInit) => {
      const url = String(raw ?? "")
      if (url.startsWith('/survey-outside-people/families')) {
        return {
          data: [
            { sourceId: 'c1', serviceUserId: 'su1', name: 'Mo Lane', relationship: 'Son', email: 'mo@example.com', mobile: null, consent: true, reachable: true, aboutName: 'Ada Lane' },
            { sourceId: 'c2', serviceUserId: 'su1', name: 'Bea Lane', relationship: 'Daughter', email: null, mobile: null, consent: false, reachable: false, aboutName: 'Ada Lane' },
          ],
        }
      }
      if (url.endsWith('/send-outside/check')) return { data: { total: 1, sendNow: 1, heldBack: 0, held: [], already: 0, optedOut: 0, noDetails: 0, noConsent: 0 } }
      if (url.endsWith('/send-outside')) return { message: 'Sent to 1 person', data: { sent: 1 } }
      return { data: [] }
    })
    wrap(<SendOutsideDialog surveyId="s1" open onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByText('pick person'))
    expect(await screen.findByText(/has not agreed to surveys/)).toBeInTheDocument()
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes[1]).toBeDisabled()
    fireEvent.click(boxes[0])
    expect(await screen.findByText(/1 person will be sent it now/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(apiJson.mock.calls.some(c => c[0] === '/surveys/s1/send-outside')).toBe(true))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/surveys/s1/send-outside')![1].body)
    expect(body).toMatchObject({ familyContactIds: ['c1'], aboutServiceUserId: 'su1' })
  })

  it('send to people: families of several people we support, not linked to one person', async () => {
    apiJson.mockImplementation(async (raw: unknown) => {
      const url = String(raw ?? '')
      if (url.startsWith('/survey-outside-people/families')) {
        const all = [
          { sourceId: 'c1', serviceUserId: 'su1', name: 'Mo Lane', relationship: 'Son', email: 'mo@example.com', mobile: null, consent: true, reachable: true, aboutName: 'Ada Lane' },
          { sourceId: 'c3', serviceUserId: 'su2', name: 'Ann Hart', relationship: 'Wife', email: 'ann@example.com', mobile: null, consent: true, reachable: true, aboutName: 'Tom Hart' },
          { sourceId: 'c4', serviceUserId: 'su2', name: 'Ian Hart', relationship: 'Son', email: null, mobile: '07700900001', consent: true, reachable: true, aboutName: 'Tom Hart' },
        ]
        const ids = new URL(url, 'http://x').searchParams.get('serviceUserIds')?.split(',') ?? []
        return { data: all.filter(f => ids.includes(f.serviceUserId)) }
      }
      if (url.endsWith('/send-outside/check')) return { data: { total: 3, sendNow: 3, heldBack: 0, held: [], already: 0, optedOut: 0, noDetails: 0, noConsent: 0 } }
      if (url.endsWith('/send-outside')) return { message: 'Sent to 3 people', data: { sent: 3 } }
      return { data: [] }
    })
    wrap(<SendOutsideDialog surveyId="s1" open onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByText('pick person'))
    fireEvent.click(await screen.findByLabelText(/Mo Lane/))
    fireEvent.click(screen.getByText('pick second person'))
    fireEvent.click(await screen.findByRole('button', { name: 'Tick all who can be contacted' }))
    expect(await screen.findByText(/not linked to one person’s record/)).toBeInTheDocument()
    expect(screen.queryByText(/This survey is about/)).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Send' }))
    await waitFor(() => expect(apiJson.mock.calls.some(c => c[0] === '/surveys/s1/send-outside')).toBe(true))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/surveys/s1/send-outside')![1].body)
    expect([...body.familyContactIds].sort()).toEqual(['c1', 'c3', 'c4'])
    expect(body.aboutServiceUserId).toBeUndefined()

    // Removing a person also unticks their family.
    fireEvent.click(screen.getByRole('button', { name: 'Remove Tom Hart' }))
    expect(screen.queryByText('Ann Hart')).not.toBeInTheDocument()
  })

  it('a person’s record lists surveys about them', async () => {
    apiJson.mockResolvedValue({ data: [{ id: 's9', title: 'GP views on Ada’s care', status: 'ACTIVE', targetKind: 'PUBLIC', createdAt: '2026-11-01T10:00:00Z', closesAt: null, sentTo: 2 }] })
    wrap(<SurveysAboutPersonSection serviceUserId="su1" />)
    expect(await screen.findByText('GP views on Ada’s care')).toBeInTheDocument()
    expect(screen.getByText(/Open · sent to 2/)).toBeInTheDocument()
  })
})
