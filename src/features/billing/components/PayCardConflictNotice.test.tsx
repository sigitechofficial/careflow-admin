import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import type { PayCardConflictCheck, PayCardConflictList } from '@/features/billing/types/billing-cards.types'

const state = vi.hoisted(() => ({
  list: null as unknown,
  listError: null as unknown,
  check: null as unknown,
  locationId: null as string | null,
  listLocationSeen: undefined as string | null | undefined,
  checkSeen: undefined as unknown,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params }: { children: React.ReactNode; params?: { employeeId?: string } }) => (
    <a href={`/employee/${params?.employeeId}/edit`}>{children}</a>
  ),
}))
vi.mock('@/features/locations/hooks/useGlobalLocationScope', () => ({
  useGlobalLocationScope: () => ({ locationId: state.locationId }),
}))
vi.mock('@/features/billing/hooks/usePayCards', () => ({
  usePayCardConflicts: (locationId?: string | null) => {
    state.listLocationSeen = locationId
    return { data: state.list, isLoading: false, error: state.listError }
  },
  usePayCardConflictCheck: (input: unknown) => {
    state.checkSeen = input
    return { data: input ? state.check : undefined, isLoading: false, error: null }
  },
}))

import { ApiError } from '@/shared/api/api-client'
import { PayCardConflictCheckNotice, PayCardConflictsBanner } from './PayCardConflictNotice'

const conflictCard = (code: string) => ({
  id: code.toLowerCase(),
  code,
  name: `Card ${code}`,
  version: 1,
  assignmentLevel: 'ORGANISATION_DEFAULT' as const,
  assignmentLabel: null,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
})
const list = (over: Partial<PayCardConflictList> = {}): PayCardConflictList => ({
  day: '2026-11-03',
  carerCount: 2,
  groups: [
    {
      kind: 'MATCHED_LEVEL',
      level: 'ORGANISATION_DEFAULT',
      day: '2026-11-03',
      cards: [conflictCard('STD-A'), conflictCard('STD-B')],
      message: 'Two pay cards apply to this carer on 2026-11-03 at the same level (organisation default)',
      carerCount: 2,
      carers: [
        { employeeId: 'e-1', name: 'Ann Carer' },
        { employeeId: 'e-2', name: 'Ben Carer' },
      ],
    },
  ],
  ...over,
})
const check = (over: Partial<PayCardConflictCheck> = {}): PayCardConflictCheck => ({
  day: '2026-12-01',
  overlapping: [{ ...conflictCard('STD-A'), overlapFrom: '2026-12-01' }],
  affectedCarerCount: 1,
  affectedCarers: [{ employeeId: 'e-1', name: 'Ann Carer', cards: ['STD-A'] }],
  message: 'From 2026-12-01, 1 carer without a pay card of their own would match this card and STD-A at the same level.',
  ...over,
})
const input = { assignmentLevel: 'ORGANISATION_DEFAULT' as const, effectiveFrom: '2026-12-01' }

describe('pay card conflicts (PC-32)', () => {
  beforeEach(() => {
    state.list = null
    state.listError = null
    state.check = null
    state.locationId = null
  })

  it('the list of carers who cannot be paid names the cards and links to each carer', () => {
    state.list = list()
    state.locationId = 'branch-a'
    render(<PayCardConflictsBanner />)

    const banner = screen.getByTestId('pay-card-conflicts')
    expect(banner).toHaveTextContent('2 carers cannot be paid: more than one pay card applies')
    expect(banner).toHaveTextContent('Their visit pay is held until one card is chosen')
    const group = screen.getByTestId('pay-card-conflict-group')
    expect(group).toHaveTextContent('STD-A — Card STD-A')
    expect(group).toHaveTextContent('STD-B — Card STD-B')
    expect(within(group).getByRole('link', { name: 'Ann Carer' })).toHaveAttribute('href', '/employee/e-1/edit')
    expect(within(group).getByRole('link', { name: 'Ben Carer' })).toBeInTheDocument()
    // The list is asked for the branch the user is working in.
    expect(state.listLocationSeen).toBe('branch-a')
  })

  it('says how many more carers there are than it lists', () => {
    state.list = list({ carerCount: 30, groups: [{ ...list().groups[0], carerCount: 30 }] })
    render(<PayCardConflictsBanner />)
    expect(screen.getByTestId('pay-card-conflict-group')).toHaveTextContent('and 28 more')
  })

  it('shows nothing when no carer is affected, or when a branch user has not chosen a branch', () => {
    state.list = list({ carerCount: 0, groups: [] })
    const none = render(<PayCardConflictsBanner />)
    expect(screen.queryByTestId('pay-card-conflicts')).not.toBeInTheDocument()
    none.unmount()

    state.list = undefined
    state.listError = new ApiError('Choose one of your branches', 403)
    render(<PayCardConflictsBanner />)
    expect(screen.queryByTestId('pay-card-conflicts')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pay-card-conflicts-error')).not.toBeInTheDocument()
  })

  it('a failed check is said, not hidden', () => {
    state.listError = new Error('network')
    render(<PayCardConflictsBanner />)
    expect(screen.getByTestId('pay-card-conflicts-error')).toHaveTextContent('Could not check for conflicting pay cards.')
  })

  it('the form warns when carers would be held, with the other card and the carers', () => {
    state.check = check()
    render(<PayCardConflictCheckNotice input={input} />)

    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent('1 carer without a pay card of their own would match this card and STD-A')
    expect(notice).toHaveTextContent('STD-A — Card STD-A (both in force from 2026-12-01)')
    expect(within(notice).getByRole('link', { name: 'Ann Carer' })).toBeInTheDocument()
    expect(state.checkSeen).toEqual(input)
  })

  it('cards that overlap while nobody relies on matching are a note, not an alarm', () => {
    state.check = check({
      affectedCarerCount: 0,
      affectedCarers: [],
      message: "STD-A is in force for the same carers and dates at this level. No carer relies on matching at the moment, so nobody's pay is held; a carer without their own pay card would be.",
    })
    render(<PayCardConflictCheckNotice input={input} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent("nobody's pay is held")
  })

  it('shows nothing when there is no overlap, or the form is not ready to check', () => {
    state.check = check({ overlapping: [], affectedCarerCount: 0, affectedCarers: [], message: null })
    const clear = render(<PayCardConflictCheckNotice input={input} />)
    expect(screen.queryByTestId('pay-card-conflict-check')).not.toBeInTheDocument()
    clear.unmount()

    state.check = check()
    render(<PayCardConflictCheckNotice input={null} />)
    expect(screen.queryByTestId('pay-card-conflict-check')).not.toBeInTheDocument()
  })
})
