import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyDetail } from '@/features/surveys/types'
import { surveyLocalToIso } from '@/features/surveys/survey-datetime'

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }))

vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSendSurvey: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({
  useLocationManagementTree: () => ({
    data: {
      zones: [
        {
          id: 'z1',
          name: 'North',
          branches: [
            { id: 'b1', name: 'Leeds', locationId: 'loc-1' },
            { id: 'b2', name: 'York', locationId: 'loc-2' },
          ],
        },
      ],
    },
  }),
}))
vi.mock('@/features/employees/hooks/useEmployees', () => ({
  useEmployeeLookups: () => ({ data: { jobTitles: [{ id: 'jt-1', name: 'Carer' }] } }),
}))
vi.mock('@/features/employees/hooks/useEmployeeTabs', () => ({
  useAllEmployees: () => ({ data: [] }),
}))
vi.mock('@/features/surveys/components/SurveyFormerStaffField', () => ({ SurveyFormerStaffField: () => null }))
vi.mock('@/features/surveys/contact-rule/SendContactRuleCheck', () => ({
  SendContactRuleCheck: ({ enabled, onChange }: { enabled: boolean; onChange: (v: { sendAnyway: boolean; reason: string }) => void }) =>
    enabled ? (
      <button type="button" onClick={() => onChange({ sendAnyway: true, reason: 'Annual survey must reach everyone' })}>
        test: send anyway
      </button>
    ) : null,
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { SurveySendDialog } from '@/features/surveys/components/SurveySendDialog'

function survey(overrides: Partial<SurveyDetail> = {}): SurveyDetail {
  return {
    id: 's1',
    title: 'Staff survey',
    description: null,
    targetKind: 'EMPLOYEE',
    status: 'DRAFT',
    isAnonymous: false,
    opensAt: null,
    closesAt: null,
    publishedAt: null,
    distributeAt: null,
    distributedAt: null,
    recurrence: null,
    clonedFromId: null,
    clonedFromTitle: null,
    periodKey: null,
    periodOpenDays: null,
    recurrenceAnchorAt: null,
    distributionFailedAt: null,
    distributionError: null,
    locationIds: ['loc-1'],
    roleIds: ['jt-1'],
    audienceEmployeeIds: [],
    isTemplate: false,
    shareToken: null,
    createdById: null,
    createdByName: null,
    scheduledByName: null,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    recipientCount: 0,
    responseCount: 0,
    periodCount: 0,
    questionsLocked: false,
    settingsLocked: false,
    questions: [],
    ...overrides,
  }
}

describe('SurveySendDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({ sent: 0, skippedExisting: 0, status: 'DRAFT', scheduled: true })
  })

  it('a scheduled send carries the chosen branches and job titles', async () => {
    render(
      <SurveySendDialog
        survey={survey({ distributeAt: '2030-03-04T09:00:00.000Z' })}
        open
        onOpenChange={() => {}}
      />,
    )
    expect(screen.getByText('North › Leeds')).toBeInTheDocument()
    expect(screen.getByText('Carer')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({
      locationIds: ['loc-1'],
      roleIds: ['jt-1'],
      employeeIds: [],
      // 09:00 UK time (GMT in early March).
      distributeAt: '2030-03-04T09:00:00.000Z',
      recurrence: null,
    })
  })

  it('Send now carries the 4-week rule override and its reason; a scheduled send never shows the check', async () => {
    mutateAsync.mockResolvedValue({ sent: 3, heldBack: 0, skippedExisting: 0, status: 'ACTIVE', scheduled: false })
    const { unmount } = render(<SurveySendDialog survey={survey()} open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'test: send anyway' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ contactRuleOverride: { reason: 'Annual survey must reach everyone' } })
    unmount()
    render(<SurveySendDialog survey={survey({ distributeAt: '2030-03-04T09:00:00.000Z' })} open onOpenChange={() => {}} />)
    expect(screen.queryByRole('button', { name: 'test: send anyway' })).toBeNull()
  })

  describe('Send at uses UK dates and a 24-hour clock', () => {
    const sendAt = () => within(screen.getByRole('group', { name: 'Send at' }))
    const hours = () => within(screen.getByRole('group', { name: 'Send at time' })).getByPlaceholderText('HH')
    const minutes = () => within(screen.getByRole('group', { name: 'Send at time' })).getByPlaceholderText('mm')

    it('shows a saved schedule as dd/mm/yyyy and 24-hour time — never a browser datetime box', () => {
      // 14:30 UK time on 4 March 2030 (GMT).
      render(
        <SurveySendDialog survey={survey({ distributeAt: '2030-03-04T14:30:00.000Z' })} open onOpenChange={() => {}} />,
      )
      expect(document.querySelector('input[type="datetime-local"], input[type="date"]')).toBeNull()
      expect(sendAt().getByRole('button', { name: /^Send at date/ })).toHaveTextContent('04/03/2030')
      expect(hours()).toHaveValue('14')
      expect(minutes()).toHaveValue('30')
    })

    it('summer times are UK (BST) wall clock', () => {
      render(<SurveySendDialog survey={survey({ distributeAt: '2030-07-01T08:00:00.000Z' })} open onOpenChange={() => {}} />)
      expect(sendAt().getByRole('button', { name: /^Send at date/ })).toHaveTextContent('01/07/2030')
      expect(hours()).toHaveValue('09')
      expect(minutes()).toHaveValue('00')
    })

    it('picking a day in the calendar and typing a time schedules that UK time', async () => {
      render(<SurveySendDialog survey={survey()} open onOpenChange={() => {}} />)
      expect(sendAt().getByRole('button', { name: 'Send at date' })).toHaveTextContent('dd/mm/yyyy')
      await userEvent.click(sendAt().getByRole('button', { name: 'Send at date' }))
      await userEvent.click(screen.getByRole('button', { name: /next month/i }))
      const grid = screen.getByRole('grid')
      await userEvent.click(within(grid).getByText('15').closest('button')!)

      const now = new Date()
      const day = new Date(now.getFullYear(), now.getMonth() + 1, 15)
      const dd = String(day.getDate()).padStart(2, '0')
      const mm = String(day.getMonth() + 1).padStart(2, '0')
      expect(sendAt().getByRole('button', { name: /^Send at date/ })).toHaveTextContent(`${dd}/${mm}/${day.getFullYear()}`)
      // A day picked first starts at 09:00; the time can then be typed.
      expect(hours()).toHaveValue('09')
      await userEvent.clear(hours())
      await userEvent.type(hours(), '14')
      await userEvent.clear(minutes())
      await userEvent.type(minutes(), '05')

      await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))
      await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
      expect(mutateAsync.mock.calls[0][0].distributeAt).toBe(
        surveyLocalToIso(`${day.getFullYear()}-${mm}-${dd}T14:05`),
      )
    })
  })

  it('clearing job titles sends an empty list (all job titles), not the old value', async () => {
    render(<SurveySendDialog survey={survey()} open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Carer' }))
    expect(screen.getByText('All job titles')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ roleIds: [], locationIds: ['loc-1'] })
    expect(mutateAsync.mock.calls[0][0]).not.toHaveProperty('distributeAt')
  })

  it('a repeat with no start time starts now and keeps the open-for-days setting', async () => {
    mutateAsync.mockResolvedValue({ sent: 4, skippedExisting: 0, status: 'DRAFT', scheduled: true, recurrence: 'MONTHLY', distributeAt: '2026-12-05T09:00:00.000Z' })
    render(<SurveySendDialog survey={survey({ recurrence: 'MONTHLY' })} open onOpenChange={() => {}} />)
    expect(screen.getByText('First period starts')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Keep each period open for (days)'), '14')
    await userEvent.click(screen.getByRole('button', { name: 'Start now' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ recurrence: 'MONTHLY', periodOpenDays: 14 })
    expect(mutateAsync.mock.calls[0][0]).not.toHaveProperty('distributeAt')
  })

  it('service-user sends have no job titles and point to Open for responses', async () => {
    render(
      <SurveySendDialog survey={survey({ targetKind: 'SERVICE_USER', roleIds: [] })} open onOpenChange={() => {}} />,
    )
    expect(screen.queryByText('Job titles')).not.toBeInTheDocument()
    expect(screen.getByText(/use Open for responses/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0]).toEqual({ locationIds: ['loc-1'], recurrence: null })
  })

  it('a stopped repeating survey needs a repeat chosen — it is never "sent now" as a whole', async () => {
    render(<SurveySendDialog survey={survey({ periodCount: 3, recurrence: null })} open onOpenChange={() => {}} />)
    expect(screen.getByText(/Choose how often it repeats/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send now' })).toBeDisabled()
  })

  it('a period of a repeating survey can only be sent now', () => {
    render(<SurveySendDialog survey={survey({ clonedFromId: 'src' })} open onOpenChange={() => {}} />)
    expect(screen.queryByLabelText('Send at')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Repeat')).not.toBeInTheDocument()
    expect(screen.getByText(/one period of a repeating survey/i)).toBeInTheDocument()
  })

  it('an anonymous survey explains the 5-person minimum; a named one does not', () => {
    const { unmount } = render(<SurveySendDialog survey={survey({ isAnonymous: true })} open onOpenChange={() => {}} />)
    expect(screen.getByTestId('anonymous-minimum')).toHaveTextContent('at least 5 people')
    unmount()
    render(<SurveySendDialog survey={survey()} open onOpenChange={() => {}} />)
    expect(screen.queryByTestId('anonymous-minimum')).not.toBeInTheDocument()
  })
})
