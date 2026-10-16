import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { ApiError } from '@/shared/api/api-client'
import type { UkNmwAssessment } from '@/features/payroll/types/payroll.types'

const state = vi.hoisted(() => ({ review: vi.fn() }))

vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/payroll/hooks/usePayroll', () => ({
  useReviewUkNmwAssessment: () => ({ mutateAsync: state.review, isPending: false }),
}))

import { NmwComplianceSection, type NmwComplianceSectionProps } from './NmwComplianceSection'

const assessment = (over: Partial<UkNmwAssessment> = {}): UkNmwAssessment => ({
  id: 'a-1',
  employeeId: 'e-1',
  periodStart: '2026-11-01',
  periodEnd: '2026-11-30',
  workType: 'SALARIED_HOURS',
  category: 'AGE_21_AND_OVER',
  requiredHourly: 12.71,
  pay: 2000,
  hours: 130,
  workedHours: 0,
  topUp: 0,
  compliant: true,
  issue: null,
  issueMessage: null,
  shortfall: 0,
  blocksClose: false,
  canReview: false,
  reviewOutcome: null,
  reviewedAt: null,
  reviewedByName: null,
  reviewNote: null,
  note: '£2000.00 for 130h (130h basic) = £15.3846/hr against £12.71.',
  ...over,
})
const EXCESS_MESSAGE = 'More hours were worked than the salary pays for. Whether they count depends on the hours of the year.'
const excess = (over: Partial<UkNmwAssessment> = {}) =>
  assessment({
    id: 'a-2',
    employeeId: 'e-2',
    pay: 1700,
    workedHours: 150,
    compliant: null,
    issue: 'EXCESS_HOURS_NOT_VERIFIED',
    issueMessage: EXCESS_MESSAGE,
    shortfall: 206.5,
    blocksClose: true,
    canReview: true,
    note: '£1700.00 for 130h (130h basic) = £13.0769/hr against £12.71. 150.00h were worked.',
    ...over,
  })
const employees = [
  { employeeId: 'e-1', displayName: 'Synthetic Fine' },
  { employeeId: 'e-2', displayName: 'Synthetic Excess' },
  { employeeId: 'e-3', displayName: 'Synthetic Low' },
]
const props = (over: Partial<NmwComplianceSectionProps> = {}): NmwComplianceSectionProps => ({
  runId: 'run-1',
  assessments: [assessment()],
  employees,
  runOpen: true,
  canReview: true,
  createdRun: false,
  ...over,
})
const rows = () => screen.getAllByTestId('nmw-assessment-row')
const FACTS = 'Annual basic hours of 1,560 not exceeded; 1,180 worked to date'

describe('minimum wage compliance on the UK payroll run (Sprint B4A, Task 2)', () => {
  beforeEach(() => {
    state.review.mockReset().mockResolvedValue({ message: 'Review recorded' })
  })

  it('a compliant employee: period, classification, hours, pay and rate, with nothing to review', () => {
    render(<NmwComplianceSection {...props()} />)
    const [row] = rows()
    expect(row).toHaveTextContent('Synthetic Fine')
    expect(row).toHaveTextContent('2026-11-01 – 2026-11-30')
    expect(row).toHaveTextContent('Salaried hours work')
    expect(row).toHaveTextContent('Age 21 and over')
    expect(row).toHaveTextContent('130h')
    expect(row).toHaveTextContent('£2000.00')
    expect(row).toHaveTextContent('£12.71/h')
    expect(row).toHaveTextContent('Compliant')
    expect(screen.queryByTestId('nmw-blocking')).toBeNull()
    fireEvent.click(within(row).getByRole('button', { name: 'Details' }))
    expect(screen.getByTestId('nmw-assessment-detail')).toHaveTextContent('£15.3846/hr against £12.71')
    expect(screen.queryByTestId('nmw-review-form')).toBeNull()
  })

  it('a top-up made by the run is shown as the top-up, not as an open shortfall', () => {
    const low = assessment({ id: 'a-3', employeeId: 'e-3', pay: 1500, topUp: 152.3, compliant: false })
    render(<NmwComplianceSection {...props({ assessments: [low] })} />)
    const [row] = rows()
    expect(row).toHaveTextContent('Synthetic Low')
    expect(row).toHaveTextContent('£152.30')
    expect(row).toHaveTextContent('Topped up to the minimum wage')
    expect(screen.queryByTestId('nmw-blocking')).toBeNull()
  })

  it('missing basic hours and unverified excess hours are listed as what stops the run closing, and can be filtered', () => {
    const missing = assessment({
      id: 'a-3',
      employeeId: 'e-3',
      hours: 0,
      compliant: null,
      issue: 'BASIC_HOURS_NOT_RECORDED',
      issueMessage: 'The pay agreement does not record contracted hours.',
      blocksClose: true,
      canReview: true,
    })
    render(<NmwComplianceSection {...props({ assessments: [assessment(), excess(), missing] })} />)
    const banner = screen.getByTestId('nmw-blocking')
    expect(banner).toHaveTextContent('2 minimum wage exceptions stop this run being closed')
    expect(banner).toHaveTextContent(`Synthetic Excess: ${EXCESS_MESSAGE}`)
    expect(banner).toHaveTextContent('Synthetic Low: The pay agreement does not record contracted hours.')
    expect(rows()).toHaveLength(3)
    expect(rows()[1]).toHaveTextContent('Not decided: needs review')
    expect(rows()[1]).toHaveTextContent('150h worked')
    expect(rows()[1]).toHaveTextContent('£206.50')
    expect(rows()[1]).toHaveTextContent('Not reviewed')
    fireEvent.click(screen.getByLabelText('Unresolved only'))
    expect(rows().map(r => r.textContent)).toEqual([expect.stringContaining('Synthetic Excess'), expect.stringContaining('Synthetic Low')])
  })

  it('a review needs what it found and the facts it rests on, and is sent to the existing API', async () => {
    render(<NmwComplianceSection {...props({ assessments: [excess()] })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    expect(screen.getByTestId('nmw-review-form')).toHaveTextContent('It cannot waive a shortfall')
    const save = screen.getByRole('button', { name: 'Record review' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Facts the review rests on'), { target: { value: 'Looks fine' } })
    fireEvent.change(screen.getByLabelText('What the review found'), { target: { value: 'EVIDENCE_SUPPORTS_COMPLIANCE' } })
    expect(save).toBeDisabled() // not a statement of the facts
    fireEvent.change(screen.getByLabelText('Facts the review rests on'), { target: { value: FACTS } })
    fireEvent.click(save)
    await waitFor(() =>
      expect(state.review).toHaveBeenCalledWith({ assessmentId: 'a-2', note: FACTS, outcome: 'EVIDENCE_SUPPORTS_COMPLIANCE' }),
    )
  })

  it('a confirmed shortfall keeps blocking, offers no review, and says what is required', () => {
    const confirmed = excess({
      issue: 'SHORTFALL',
      issueMessage: 'A shortfall against the minimum wage has been confirmed. It cannot be cleared by a review.',
      compliant: false,
      canReview: false,
      reviewOutcome: 'SHORTFALL_CONFIRMED',
      reviewedAt: '2026-12-02T10:00:00.000Z',
      reviewedByName: 'Chris Checker',
      reviewNote: '1,640 hours worked this year against 1,560 basic hours',
    })
    render(<NmwComplianceSection {...props({ assessments: [confirmed] })} />)
    const [row] = rows()
    expect(row).toHaveTextContent('Shortfall confirmed')
    expect(row).toHaveTextContent('A shortfall is confirmed')
    expect(row).toHaveTextContent('Chris Checker, 2026-12-02: 1,640 hours worked this year against 1,560 basic hours')
    expect(screen.getByTestId('nmw-blocking')).toHaveTextContent('1 minimum wage exception stops this run being closed')
    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    expect(screen.getByTestId('nmw-shortfall-confirmed')).toHaveTextContent(
      'It cannot be cleared by a review: pay the top-up or correct the pay, then calculate gross again.',
    )
    expect(screen.queryByTestId('nmw-review-form')).toBeNull()
  })

  it('review permissions: not without the closing power, not by the creator of the run, not on a closed run', () => {
    const { rerender } = render(<NmwComplianceSection {...props({ assessments: [excess()], canReview: false })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    expect(screen.getByTestId('nmw-review-no-permission')).toHaveTextContent('needs the power to close payroll')
    expect(screen.queryByTestId('nmw-review-form')).toBeNull()

    rerender(<NmwComplianceSection {...props({ assessments: [excess()], createdRun: true })} />)
    expect(screen.getByTestId('nmw-review-own-run')).toHaveTextContent('a different user must review its exceptions')
    expect(screen.queryByTestId('nmw-review-form')).toBeNull()

    rerender(<NmwComplianceSection {...props({ assessments: [excess()], runOpen: false })} />)
    expect(screen.getByTestId('nmw-assessment-detail')).toHaveTextContent('This run is not open, so its assessments are a record.')
    expect(screen.queryByTestId('nmw-review-form')).toBeNull()
  })

  it('shows what the server refuses, for example a review by the creator of the run', async () => {
    state.review.mockRejectedValue(
      new ApiError('A minimum wage exception is reviewed by a different user from the one who created the run.', 403),
    )
    render(<NmwComplianceSection {...props({ assessments: [excess()] })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    fireEvent.change(screen.getByLabelText('What the review found'), { target: { value: 'SHORTFALL_CONFIRMED' } })
    fireEvent.change(screen.getByLabelText('Facts the review rests on'), { target: { value: FACTS } })
    fireEvent.click(screen.getByRole('button', { name: 'Record review' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('reviewed by a different user')
  })

  it('after gross is recalculated the section shows the new status: a review of other figures is gone', () => {
    const reviewed = excess({
      blocksClose: false,
      canReview: false,
      reviewOutcome: 'EVIDENCE_SUPPORTS_COMPLIANCE',
      reviewedAt: '2026-12-02T10:00:00.000Z',
      reviewedByName: 'Chris Checker',
      reviewNote: FACTS,
    })
    const { rerender } = render(<NmwComplianceSection {...props({ assessments: [reviewed] })} />)
    expect(rows()[0]).toHaveTextContent('Reviewed: evidence supports compliance')
    expect(rows()[0]).toHaveTextContent(`Chris Checker, 2026-12-02: ${FACTS}`)
    expect(screen.queryByTestId('nmw-blocking')).toBeNull()
    // The run is read again after recalculation: more hours, so the earlier review no longer counts.
    rerender(<NmwComplianceSection {...props({ assessments: [excess({ id: 'a-9', workedHours: 160, shortfall: 333.6 })] })} />)
    expect(rows()[0]).toHaveTextContent('Not decided: needs review')
    expect(rows()[0]).toHaveTextContent('160h worked')
    expect(rows()[0]).toHaveTextContent('Not reviewed')
    expect(screen.getByTestId('nmw-blocking')).toHaveTextContent('1 minimum wage exception stops this run being closed')
  })

  // Sprint B4C. Figures are those the run stored (synthetic: 35 hours a week x 52 weeks).
  describe('position in the calculation year', () => {
    const position = () => screen.getByTestId('nmw-annual-position')
    const inYear = (over: Partial<UkNmwAssessment> = {}) =>
      assessment({
        contractedWeeklyHours: 35,
        weeksPerYear: 52,
        annualBasicHours: 1820,
        calcYearStart: '2026-04-01',
        calcYearEnd: '2027-03-31',
        yearHoursBefore: 480,
        excessHours: 0,
        hours: 151.67,
        workedHours: 240,
        ...over,
      })

    it('within the basic hours: weekly hours, method, basic hours, year, hours to date and no excess', () => {
      render(<NmwComplianceSection {...props({ assessments: [inYear()] })} />)
      fireEvent.click(screen.getByRole('button', { name: 'Details' }))
      const text = position()
      expect(text).toHaveTextContent('Contracted weekly hours35h')
      expect(text).toHaveTextContent('Annualisation methodWeekly hours × 52 weeks (approved)')
      expect(text).toHaveTextContent('Basic hours of the year1820h')
      expect(text).toHaveTextContent('Calculation year2026-04-01 – 2027-03-31')
      expect(text).toHaveTextContent('Hours counted before this period480h')
      expect(text).toHaveTextContent('Hours counted to date720h')
      expect(text).toHaveTextContent('Excess hours counted here0h')
      expect(text).toHaveTextContent('ResultCompliant')
    })

    it('basic hours exceeded: the excess hours and the top-up the run added', () => {
      const exceeded = inYear({ yearHoursBefore: 1680, excessHours: 100, hours: 249.6, topUp: 1172.42, compliant: false })
      render(<NmwComplianceSection {...props({ assessments: [exceeded] })} />)
      fireEvent.click(screen.getByRole('button', { name: 'Details' }))
      expect(position()).toHaveTextContent('Hours counted to date1920h')
      expect(position()).toHaveTextContent('Excess hours counted here100h')
      expect(position()).toHaveTextContent('ResultTopped up to the minimum wage: £1172.42 added by this run')
    })

    it('no approved method: policy review required stays, and no annual figure is shown', () => {
      const unassessed = assessment({
        contractedWeeklyHours: 35,
        hours: 0,
        compliant: null,
        issue: 'POLICY_REVIEW_REQUIRED',
        issueMessage: 'No approved method is in force for turning contracted weekly hours into the basic hours of a year.',
        blocksClose: true,
        canReview: true,
        calcYearStart: null,
        calcYearEnd: null,
        weeksPerYear: null,
        annualBasicHours: null,
        yearHoursBefore: null,
        excessHours: null,
      })
      render(<NmwComplianceSection {...props({ assessments: [unassessed] })} />)
      expect(screen.getByTestId('nmw-blocking')).toHaveTextContent('No approved method is in force')
      fireEvent.click(screen.getByRole('button', { name: 'Details' }))
      expect(position()).toHaveTextContent('The year was not assessed: No approved method is in force')
      expect(position()).toHaveTextContent('Contracted weekly hours35h')
      expect(position()).toHaveTextContent('Annualisation methodNone approved')
      expect(position()).toHaveTextContent('ResultNot decided: needs review')
      expect(position()).not.toHaveTextContent('Basic hours of the year')
      expect(screen.getByTestId('nmw-review-form')).toBeInTheDocument() // the existing review is still how it is handled
    })

    it('is not shown for work that is not salaried hours work', () => {
      render(<NmwComplianceSection {...props({ assessments: [assessment({ workType: 'TIME_WORK' })] })} />)
      fireEvent.click(screen.getByRole('button', { name: 'Details' }))
      expect(screen.queryByTestId('nmw-annual-position')).toBeNull()
    })
  })

  it('says so when gross has not been calculated yet', () => {
    render(<NmwComplianceSection {...props({ assessments: [] })} />)
    expect(screen.getByTestId('nmw-compliance-section')).toHaveTextContent('No minimum wage assessments yet. Calculate gross to make them.')
  })
})
