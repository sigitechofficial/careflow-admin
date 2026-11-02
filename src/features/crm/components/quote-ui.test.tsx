import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Enquiry } from '@/features/crm/types/crm.types'
import type { EnquiryQuotations, QuotePricing, QuoteVersion } from '@/features/crm/types/quotation.types'

const { navigate, quotationsState, mutation } = vi.hoisted(() => ({
  navigate: vi.fn(),
  quotationsState: { data: undefined as EnquiryQuotations | undefined },
  mutation: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/features/settings/hooks/useMedicationRounds', () => ({
  useMedicationRounds: () => ({
    data: [
      { id: 'r1', name: 'Morning', code: 'MORNING', time: '08:00', windowStart: '07:00', windowEnd: '10:00', sortOrder: 1, isActive: true },
      { id: 'r2', name: 'Lunch', code: 'LUNCH', time: '12:30', windowStart: '12:00', windowEnd: '14:00', sortOrder: 2, isActive: true },
    ],
  }),
}))
vi.mock('@/features/crm/hooks/useCrm', () => ({
  useQuoteFunders: () => ({
    data: [
      { id: 'f-council', name: 'Croydon Council', fundingTypeName: 'Local Authority', payerType: 'LOCAL_AUTHORITY' },
      { id: 'f-nhs', name: 'NHS Continuing Healthcare', fundingTypeName: 'NHS', payerType: 'NHS' },
    ],
  }),
}))
vi.mock('@/features/crm/hooks/useQuotations', () => ({
  useEnquiryQuotations: () => ({ data: quotationsState.data, isLoading: false }),
  useDownloadQuotePdf: mutation,
  useMakeQuotationCurrent: mutation,
  useQuoteAction: mutation,
  useReconcileLegacyQuote: mutation,
}))

import { QuoteSummary } from '@/features/crm/components/QuoteSummaryCard'
import { VisitPatternBuilder, patternProblems } from '@/features/crm/components/quote-editor/VisitPatternBuilder'
import { CostSummary, FundingAndExtras, suggestFundingCategory } from '@/features/crm/components/quote-editor/QuotePricingSections'
import { QuoteClientLayoutChoice } from '@/features/crm/components/quote-editor/QuoteClientLayoutChoice'
import { VisitSlotsBuilder } from '@/features/crm/components/quote-editor/VisitSlotsBuilder'
import { QuoteVersionCompare } from '@/features/crm/components/quote-editor/QuoteVersionCompare'
import { QuoteRatesEditor } from '@/features/crm/components/quote-editor/QuoteRatesEditor'
import { dayRatesNote, emptyPattern, visitBasePrice } from '@/features/crm/quote-labels'

const enquiry = { id: 'e1', stage: 'OFFER', firstName: 'Jo', lastName: 'Bloggs' } as Enquiry
const legacy = { unlinked: false, hasLegacyFields: false, weeklyAmount: null, hourlyRate: null, sentAt: null, notes: null, reconciledAt: null, reconcileNote: null }

describe('QuoteSummary (Plan → Quote)', () => {
  it('flags a legacy Quote sent enquiry with no quotation instead of showing "Not recorded"', () => {
    quotationsState.data = { quotations: [], emailAvailable: false, legacy: { ...legacy, unlinked: true, hasLegacyFields: true, weeklyAmount: 250 } }
    render(<QuoteSummary enquiry={enquiry} canManage />)
    expect(screen.getByTestId('crm-legacy-quote')).toHaveTextContent('Legacy / unlinked quote')
    expect(screen.getByTestId('crm-legacy-quote')).toHaveTextContent('£250.00/week')
    expect(screen.queryByText(/Not recorded/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Create quotation' })).toBeInTheDocument()
  })

  it('shows the current quotation from its records with the right actions', async () => {
    const version = { id: 'v1', label: 'EQ-2026-0001 V1', status: 'SENT', statusLabel: 'Sent', editable: false } as QuoteVersion
    quotationsState.data = {
      emailAvailable: true,
      legacy,
      quotations: [
        {
          id: 'q1',
          quotationNumber: 'EQ-2026-0001',
          isCurrent: true,
          createdAt: '2026-11-01T10:00:00Z',
          latestVersion: version,
          versions: [{ id: 'v1', versionNumber: 1, status: 'SENT', statusLabel: 'Sent', weeklyTotal: 186, sentAt: '2026-11-02T10:00:00Z', createdAt: '2026-11-01T10:00:00Z' }],
          summary: { weeklyTotal: 186, monthlyAverage: 806, sentAt: '2026-11-02T10:00:00Z', lastSend: null, responseType: null, respondedAt: null, followUp: { id: 'f1', dueAt: '2020-01-01T09:00:00Z', overdue: true } },
        },
      ],
    }
    render(<QuoteSummary enquiry={enquiry} canManage />)
    const card = screen.getByTestId('crm-quote-summary')
    expect(card).toHaveTextContent('EQ-2026-0001 V1')
    expect(card).toHaveTextContent('Sent')
    expect(card).toHaveTextContent('£186.00')
    expect(card).toHaveTextContent('£806.00')
    expect(card).toHaveTextContent('Overdue')
    for (const name of ['View', 'Preview', 'Download', 'Send', 'Revise', 'Record response']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Record response' }))
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ search: { section: 'responses' } }))
  })
})

it('shows a failed email as failed, not as sent', () => {
  const version = { id: 'v1', label: 'EQ-2026-0002 V1', status: 'APPROVED', statusLabel: 'Approved', editable: false } as QuoteVersion
  quotationsState.data = {
    emailAvailable: true,
    legacy,
    quotations: [
      {
        id: 'q1',
        quotationNumber: 'EQ-2026-0002',
        isCurrent: true,
        createdAt: '2026-11-01T10:00:00Z',
        latestVersion: version,
        versions: [{ id: 'v1', versionNumber: 1, status: 'APPROVED', statusLabel: 'Approved', weeklyTotal: 32, sentAt: null, createdAt: '2026-11-01T10:00:00Z' }],
        summary: {
          weeklyTotal: 32,
          monthlyAverage: 138.67,
          sentAt: null,
          lastSend: { status: 'FAILED', channel: 'EMAIL', at: '2026-11-02T10:00:00Z', failureReason: '530 Client not authenticated' },
          responseType: null,
          respondedAt: null,
          followUp: null,
        },
      },
    ],
  }
  render(<QuoteSummary enquiry={enquiry} canManage />)
  expect(screen.getByTestId('crm-quote-summary')).toHaveTextContent('Email failed · not sent')
})

describe('VisitPatternBuilder', () => {
  it('checks days and duration', () => {
    expect(patternProblems({ ...emptyPattern(), daysOfWeek: [] })).toContain('Choose at least one day')
    expect(patternProblems({ ...emptyPattern(), durationMinutes: 45 }).join()).toMatch(/is 30 min but the duration is 45/)
    expect(patternProblems({ ...emptyPattern(), startTime: '22:00', endTime: '07:00', durationMinutes: 540 })).toEqual([])
  })

  it('groups visits by time slot like the visit plan, and adds, edits and removes them in a dialog', async () => {
    const onChange = vi.fn()
    render(<VisitPatternBuilder patterns={[emptyPattern()]} onChange={onChange} readOnly={false} pricing={null} hourlyRate={24} />)
    // The 08:00 visit sits under Morning; Lunch is empty.
    expect(screen.getByTestId('quote-slot-MORNING')).toHaveTextContent('1 visit quoted')
    expect(screen.getByTestId('quote-slot-LUNCH')).toHaveTextContent('No visit added yet')
    expect(screen.queryByText(/Own price/)).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /Remove Morning call at 08:00/ }))
    expect(onChange.mock.calls[0][0]).toHaveLength(0)

    await userEvent.click(within(screen.getByTestId('quote-slot-LUNCH')).getAllByRole('button', { name: /Add visit/ })[0]!)
    // The dialog starts at the slot window and shows the price from the hourly rate.
    expect(screen.getByLabelText('Start time')).toHaveValue('12:00')
    expect(screen.getByTestId('quote-visit-price')).toHaveTextContent('£12.00 = £24.00/hour × 30 min')
    await userEvent.click(screen.getByTestId('quote-visit-done'))
    const added = onChange.mock.calls[1][0]
    expect(added).toHaveLength(2)
    expect(added[1]).toMatchObject({ label: 'Lunch', startTime: '12:00', endTime: '12:30', durationMinutes: 30, manualChargePerVisit: null })
  })
})

describe('quote rates in the editor', () => {
  const rates = {
    shortVisits: [{ upToMinutes: 15, pricePerVisit: 9.5 }],
    weekend: { mode: 'PERCENT' as const, value: 20 },
    sleepingNightPrice: 110,
  }
  it('prices a visit like the server: night, else short visit, else hourly', () => {
    expect(visitBasePrice({ durationMinutes: 15, carersPerVisit: 2, nightDuty: 'NONE' }, 24, rates)).toEqual({
      amount: 19,
      how: 'short visit (up to 15 min) £9.50 × 2 carers',
    })
    expect(visitBasePrice({ durationMinutes: 540, carersPerVisit: 1, nightDuty: 'SLEEPING_NIGHT' }, 24, rates)?.amount).toBe(110)
    expect(visitBasePrice({ durationMinutes: 60, carersPerVisit: 1, nightDuty: 'NONE' }, 24, rates)?.amount).toBe(24)
    expect(visitBasePrice({ durationMinutes: 60, carersPerVisit: 1, nightDuty: 'NONE' }, null, rates)).toBeNull()
    expect(dayRatesNote(rates)).toBe('weekends +20%')
  })

  it('shows the short-visit price and the weekend note in the visit dialog', async () => {
    render(<VisitPatternBuilder patterns={[]} onChange={vi.fn()} readOnly={false} pricing={null} hourlyRate={24} rates={rates} />)
    await userEvent.click(within(screen.getByTestId('quote-slot-MORNING')).getAllByRole('button', { name: /Add visit/ })[0]!)
    const duration = screen.getByLabelText(/Duration/)
    await userEvent.clear(duration)
    await userEvent.type(duration, '15')
    expect(screen.getByTestId('quote-visit-price')).toHaveTextContent('£9.50 = short visit (up to 15 min) £9.50')
    expect(screen.getByTestId('quote-visit-price')).toHaveTextContent('On those days: weekends +20%')
  })

  it('adds up to ten fixed short visits, each 15 min longer than the last, up to 60 min', async () => {
    const onChange = vi.fn()
    const three = [15, 30, 45].map(m => ({ upToMinutes: m, pricePerVisit: 10 }))
    const { rerender } = render(<QuoteRatesEditor value={{ shortVisits: three }} onChange={onChange} readOnly={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add visit' }))
    expect(onChange.mock.calls[0][0].shortVisits.map((b: { upToMinutes: number }) => b.upToMinutes)).toEqual([15, 30, 45, 60])

    // A 60 min visit does not stop more being added; the next takes an unused length.
    rerender(<QuoteRatesEditor value={{ shortVisits: [{ upToMinutes: 60, pricePerVisit: 10 }] }} onChange={onChange} readOnly={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add visit' }))
    expect(onChange.mock.lastCall![0].shortVisits.map((b: { upToMinutes: number }) => b.upToMinutes)).toEqual([60, 15])
    // A typed length over an hour is held at 60.
    await userEvent.type(screen.getByLabelText('Short visit 1 minutes'), '0')
    expect(onChange.mock.lastCall![0].shortVisits[0].upToMinutes).toBe(60)

    const ten = Array.from({ length: 10 }, (_, i) => ({ upToMinutes: (i + 1) * 5, pricePerVisit: 10 }))
    rerender(<QuoteRatesEditor value={{ shortVisits: ten }} onChange={onChange} readOnly={false} />)
    expect(screen.getByRole('button', { name: 'Add visit' })).toBeDisabled()
  })
})

describe('pricing a quote by a typed total', () => {
  it('chooses between visits with times & rates and a total amount', async () => {
    const onChange = vi.fn()
    render(<QuoteClientLayoutChoice value="DETAILED" onChange={onChange} readOnly={false} />)
    expect(screen.getByRole('radio', { name: /Visits with times & rates/ })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: /Total amount & visit slots/ }))
    expect(onChange).toHaveBeenCalledWith('SUMMARY')
  })

  it('adds visits by time of day, with days and carers but no times', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<VisitSlotsBuilder patterns={[]} onChange={onChange} readOnly={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Add visit/ }))
    const added = onChange.mock.calls[0][0][0]
    expect(added).toMatchObject({ label: 'Morning visit', startTime: '08:00', durationMinutes: 30, frequency: 'WEEKLY' })

    rerender(<VisitSlotsBuilder patterns={[added]} onChange={onChange} readOnly={false} />)
    expect(screen.queryByText(/08:00/)).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText('Visit 1 time of day'), 'LUNCH')
    expect(onChange.mock.calls[1][0][0]).toMatchObject({ label: 'Lunch visit', startTime: '12:30' })
    await userEvent.click(within(screen.getByRole('group', { name: 'Visit 1 days' })).getByRole('button', { name: 'Sun' }))
    expect(onChange.mock.calls[2][0][0].daysOfWeek).not.toContain(0)
  })
})

describe('QuoteVersionCompare', () => {
  it('shows both weekly prices, the difference and each change grouped by section and visit', () => {
    render(
      <QuoteVersionCompare
        diff={{
          from: { id: 'v1', versionNumber: 1, statusLabel: 'Accepted', weeklyTotal: 140, clientWeeklyLiability: 0 },
          to: { id: 'v2', versionNumber: 2, statusLabel: 'Draft', weeklyTotal: 350, clientWeeklyLiability: 210 },
          rows: [
            { section: 'Visits', item: 'Visit 1 · Morning visit', field: 'Days', from: 'Every day', to: 'Mon, Fri, Sat, Sun', change: 'changed', delta: null },
            { section: 'Price', item: null, field: 'Weekly total', from: '£140.00', to: '£350.00', change: 'changed', delta: 210 },
            { section: 'Visits', item: 'Visit 2 · Evening visit', field: 'Visit', from: null, to: 'Added', change: 'added', delta: null },
          ],
        }}
      />,
    )
    const view = screen.getByTestId('quote-version-compare')
    expect(view).toHaveTextContent('V1 · Accepted£140.00 a week')
    expect(view).toHaveTextContent('+£210.00 a week')
    expect(view).toHaveTextContent('3 changes from V1 to V2')
    // The price section comes first, even though a visit change was listed first.
    const sections = within(view).getAllByTestId(/^quote-compare-/).map(s => s.dataset.testid)
    expect(sections).toEqual(['quote-compare-Price', 'quote-compare-Visits'])
    expect(screen.getByTestId('quote-compare-Visits')).toHaveTextContent('Visit 1 · Morning visitDaysEvery dayMon, Fri, Sat, Sun')
    expect(screen.getByTestId('quote-compare-Visits')).toHaveTextContent('Visit 2 · Evening visitAdded')
  })
})

describe('suggestFundingCategory', () => {
  const council = { payerType: 'LOCAL_AUTHORITY', method: 'PERCENTAGE', amount: 100 } as const
  it('follows the funders so it never contradicts them', () => {
    expect(suggestFundingCategory([])).toBe('PRIVATE')
    expect(suggestFundingCategory([council])).toBe('LOCAL_AUTHORITY')
    expect(suggestFundingCategory([{ ...council, payerType: 'NHS' }])).toBe('NHS')
    expect(suggestFundingCategory([{ ...council, amount: 60 }])).toBe('MIXED')
    expect(suggestFundingCategory([{ ...council, amount: 60 }, { payerType: 'NHS', method: 'PERCENTAGE', amount: 40 }])).toBe('MIXED')
    expect(suggestFundingCategory([council, { payerType: 'PRIVATE_CLIENT', method: 'FIXED', amount: 20 }])).toBe('MIXED')
  })
})

describe('FundingAndExtras funders', () => {
  it('picks the funder from the Settings funder list and keeps a hand-typed one', async () => {
    const onFundings = vi.fn()
    render(
      <FundingAndExtras
        category="LOCAL_AUTHORITY"
        onCategory={vi.fn()}
        fundings={[
          { payerType: 'LOCAL_AUTHORITY', method: 'PERCENTAGE', amount: 100 },
          { payerType: 'OTHER', payerName: 'Old Charity', method: 'FIXED', amount: 20 },
        ]}
        onFundings={onFundings}
        extras={[]}
        onExtras={vi.fn()}
        readOnly={false}
        pricing={null}
        rateLabel="£20.00 per carer per hour"
      />,
    )
    const [first, second] = screen.getAllByLabelText('Funder') as HTMLSelectElement[]
    expect(within(first!).getByRole('option', { name: 'Choose a funder…' })).toBeInTheDocument()
    expect(within(first!).getByRole('option', { name: 'NHS Continuing Healthcare · NHS' })).toBeInTheDocument()
    expect(second!.value).toBe('__legacy__')
    expect(within(second!).getByRole('option', { name: 'Old Charity (not in the funder list)' })).toBeInTheDocument()

    await userEvent.selectOptions(first!, 'f-nhs')
    expect(onFundings.mock.calls[0][0][0]).toMatchObject({ funderId: 'f-nhs', payerName: 'NHS Continuing Healthcare', payerType: 'NHS' })
  })
})

describe('FundingAndExtras extra care', () => {
  it('adds a care task like medication in one click, as a weekly charge to price', async () => {
    const onExtras = vi.fn()
    const extras = [{ kind: 'OTHER' as const, description: 'Shower / bathing', frequency: 'WEEKLY' as const, amount: 20 }]
    render(
      <FundingAndExtras
        category="PRIVATE"
        onCategory={vi.fn()}
        fundings={[]}
        onFundings={vi.fn()}
        extras={extras}
        onExtras={onExtras}
        readOnly={false}
        pricing={null}
        rateLabel="£20.00 per carer per hour"
      />,
    )
    // Already added, so it can't be added twice.
    expect(screen.getByRole('button', { name: 'Shower / bathing' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Medication support' }))
    expect(onExtras).toHaveBeenLastCalledWith([
      ...extras,
      { kind: 'OTHER', description: 'Medication support', frequency: 'WEEKLY', amount: null },
    ])
    expect(screen.getByLabelText('Extra name')).toHaveValue('Shower / bathing')
    expect(screen.getByLabelText('Amount £')).toHaveValue(20)
    expect(screen.getByLabelText('How often')).toHaveValue('WEEKLY')
  })
})

describe('CostSummary', () => {
  it('shows each estimate with its method, coverage vs carer hours and blocking problems', () => {
    const pricing = {
      patterns: [],
      extras: [],
      fundings: [],
      visitsWeekly: 186,
      extrasWeekly: 0,
      discountWeekly: 0,
      netWeekly: 186,
      vatWeekly: 0,
      vatLabel: 'VAT: VAT exempt',
      weeklyTotal: 186,
      oneOffTotal: 0,
      weeklyCoverageMinutes: 30,
      weeklyCarerMinutes: 60,
      estimates: [{ key: 'monthlyAverage', label: 'Average monthly', amount: 806, method: 'Weekly × 52 ÷ 12' }],
      calendarMonth: { month: '2027-02', amount: 744, occurrences: 24, bankHolidayOccurrences: 0, method: 'Actual dates in February 2027', complete: true },
      clientWeeklyLiability: 186,
      clientWeeklyLiabilityIfPendingDeclined: 186,
      fundedWeekly: 0,
      pendingFundingWeekly: 0,
      issues: ['No visit rate on Card for Sunday 08:00, 30 min'],
      unresolvedCharges: 1,
    } satisfies QuotePricing
    render(<CostSummary pricing={pricing} />)
    const summary = screen.getByTestId('quote-cost-summary')
    expect(summary).toHaveTextContent('Weekly × 52 ÷ 12')
    expect(summary).toHaveTextContent('Actual dates in February 2027')
    expect(screen.getByTestId('quote-client-pays')).toHaveTextContent('£186.00 a week')
    expect(summary).toHaveTextContent('For 0.5 hours of care a week (0 visits), 1 hour of carer time as some visits have 2 carers.')
    // Nothing-lines (extras, discount, funding) are left out.
    expect(summary).not.toHaveTextContent('Extras')
    expect(summary).not.toHaveTextContent('Paid by funders')
    expect(summary).toHaveTextContent('cannot be issued yet (1 unresolved)')
  })
})
