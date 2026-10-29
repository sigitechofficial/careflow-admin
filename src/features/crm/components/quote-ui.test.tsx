import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Enquiry } from '@/features/crm/types/crm.types'
import type { EnquiryQuotations, QuotePricing, QuoteVersion } from '@/features/crm/types/quotation.types'

const { navigate, quotationsState, mutation } = vi.hoisted(() => ({
  navigate: vi.fn(),
  quotationsState: { data: undefined as EnquiryQuotations | undefined },
  mutation: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/features/crm/hooks/useQuotations', () => ({
  useEnquiryQuotations: () => ({ data: quotationsState.data, isLoading: false }),
  useDownloadQuotePdf: mutation,
  useMakeQuotationCurrent: mutation,
  useQuoteAction: mutation,
  useReconcileLegacyQuote: mutation,
}))

import { QuoteSummary } from '@/features/crm/components/QuoteSummaryCard'
import { VisitPatternBuilder, patternProblems } from '@/features/crm/components/quote-editor/VisitPatternBuilder'
import { CostSummary, suggestFundingCategory } from '@/features/crm/components/quote-editor/QuotePricingSections'
import { emptyPattern } from '@/features/crm/quote-labels'

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
  it('checks days, duration and the own-price reason', () => {
    expect(patternProblems({ ...emptyPattern(), daysOfWeek: [] })).toContain('Choose at least one day')
    expect(patternProblems({ ...emptyPattern(), durationMinutes: 45 }).join()).toMatch(/is 30 min but the duration is 45/)
    expect(patternProblems({ ...emptyPattern(), startTime: '22:00', endTime: '07:00', durationMinutes: 540 })).toEqual([])
    expect(patternProblems({ ...emptyPattern(), manualChargePerVisit: 10 })).toContain('Give a reason for the own price')
  })

  it('adds, duplicates and removes visits', async () => {
    const onChange = vi.fn()
    render(<VisitPatternBuilder patterns={[emptyPattern()]} onChange={onChange} readOnly={false} pricing={null} />)
    await userEvent.click(screen.getByRole('button', { name: 'Duplicate visit' }))
    expect(onChange.mock.calls[0][0]).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Remove visit' }))
    expect(onChange.mock.calls[1][0]).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: /Add visit/ }))
    expect(onChange.mock.calls[2][0]).toHaveLength(2)
  })

  it('keeps the advanced visit fields folded until asked for (or already used)', async () => {
    const { unmount } = render(<VisitPatternBuilder patterns={[emptyPattern()]} onChange={vi.fn()} readOnly={false} pricing={null} />)
    expect(screen.getByText('Visit name')).toBeInTheDocument()
    expect(screen.getByText('Carers per visit')).toBeInTheDocument()
    expect(screen.queryByText('Own price per visit (£)')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /More options/ }))
    expect(screen.getByText('Own price per visit (£)')).toBeInTheDocument()
    unmount()

    render(<VisitPatternBuilder patterns={[{ ...emptyPattern(), manualChargePerVisit: 25, overrideReason: 'Agreed' }]} onChange={vi.fn()} readOnly={false} pricing={null} />)
    expect(screen.getByText('Own price per visit (£)')).toBeInTheDocument()
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
    expect(summary).toHaveTextContent('Coverage hours0.5 h')
    expect(summary).toHaveTextContent('Carer hours1 h')
    expect(summary).toHaveTextContent('cannot be issued yet (1 unresolved)')
  })
})
