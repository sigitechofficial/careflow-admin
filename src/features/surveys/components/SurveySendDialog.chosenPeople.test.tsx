import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyDetail, SurveySendCandidate } from '@/features/surveys/types'

const { mutateAsync, toastSuccess } = vi.hoisted(() => ({ mutateAsync: vi.fn(), toastSuccess: vi.fn() }))

const PEOPLE: SurveySendCandidate[] = [
  { id: 'su-1', name: 'Ann Jones', hasPortal: true, alreadySent: false },
  { id: 'su-2', name: 'Bob Smith', hasPortal: false, alreadySent: false },
  { id: 'su-3', name: 'Cara Lee', hasPortal: true, alreadySent: true },
  { id: 'su-4', name: 'Dan Ward', hasPortal: false, careEnded: true, alreadySent: false },
]

vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSendSurvey: () => ({ mutateAsync, isPending: false }),
  useSurveySendCandidates: (_id: string, query: { search?: string; ids?: string[] }) => ({
    isLoading: false,
    data: query.ids
      ? PEOPLE.filter(p => query.ids!.includes(p.id))
      : PEOPLE.filter(p => p.name.toLowerCase().includes((query.search ?? '').toLowerCase())),
  }),
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({
  useLocationManagementTree: () => ({
    data: { zones: [{ id: 'z1', name: 'North', branches: [{ id: 'b1', name: 'Leeds', locationId: 'loc-1' }] }] },
  }),
}))
vi.mock('@/features/employees/hooks/useEmployees', () => ({ useEmployeeLookups: () => ({ data: { jobTitles: [] } }) }))
vi.mock('@/features/employees/hooks/useEmployeeTabs', () => ({ useAllEmployees: () => ({ data: [] }) }))
vi.mock('@/features/surveys/components/SurveyFormerPeopleField', () => ({ SurveyFormerPeopleField: () => null }))
vi.mock('@/features/surveys/contact-rule/SendContactRuleCheck', () => ({
  SendContactRuleCheck: ({ enabled, onChange }: { enabled: boolean; onChange: (v: { sendAnyway: boolean; reason: string }) => void }) =>
    enabled ? (
      <button type="button" onClick={() => onChange({ sendAnyway: true, reason: 'Annual survey must reach everyone' })}>
        test: send anyway
      </button>
    ) : null,
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess, toastApiError: vi.fn() }))

import { SurveySendDialog } from '@/features/surveys/components/SurveySendDialog'

function survey(overrides: Partial<SurveyDetail> = {}): SurveyDetail {
  return {
    id: 's1',
    title: 'Six-week review',
    description: null,
    targetKind: 'SERVICE_USER',
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
    roleIds: [],
    audienceEmployeeIds: [],
    audienceServiceUserIds: [],
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

describe('SurveySendDialog: chosen people we support', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    toastSuccess.mockReset()
  })

  it('offers everyone in the branches or chosen people; branches stay the default', async () => {
    render(<SurveySendDialog survey={survey()} open onOpenChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Everyone in these branches' })).toBeChecked()
    expect(screen.getByText('North › Leeds')).toBeInTheDocument()
    mutateAsync.mockResolvedValue({ sent: 4, skippedExisting: 0, skippedNoPortal: 2, status: 'ACTIVE', noPortal: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({ locationIds: ['loc-1'], recurrence: null })
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/2 without a portal account skipped/))
  })

  it('chosen people: shows portal status and who already has it, sends only the chosen ids', async () => {
    render(<SurveySendDialog survey={survey()} open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Chosen people' }))
    const results = within(screen.getByTestId('chosen-people-results'))
    expect(results.getByText('Bob Smith').parentElement).toHaveTextContent('No portal account')
    expect(results.getByText('Cara Lee').parentElement).toHaveTextContent('Already has it')
    // Nobody chosen yet: nothing to send.
    expect(screen.getByRole('button', { name: 'Send now' })).toBeDisabled()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Ann Jones' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Bob Smith No portal account' }))
    expect(screen.getByText(/2 chosen · 1 without a portal account/)).toBeInTheDocument()

    mutateAsync.mockResolvedValue({
      sent: 2,
      skippedExisting: 0,
      skippedNoPortal: 0,
      status: 'ACTIVE',
      noPortal: [{ id: 'su-2', name: 'Bob Smith' }],
    })
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({ locationIds: [], serviceUserIds: ['su-1', 'su-2'], recurrence: null })
  })

  it('names the people without a portal after sending, and keeps the dialog open until Done', async () => {
    const onOpenChange = vi.fn()
    render(
      <SurveySendDialog survey={survey({ audienceServiceUserIds: ['su-1', 'su-2'] })} open onOpenChange={onOpenChange} />,
    )
    // Saved choices reopen in chosen-people mode.
    expect(screen.getByRole('radio', { name: 'Chosen people' })).toBeChecked()
    expect(within(screen.getByRole('list', { name: 'Chosen people' })).getByText('Bob Smith')).toBeInTheDocument()

    mutateAsync.mockResolvedValue({
      sent: 2,
      skippedExisting: 0,
      skippedNoPortal: 0,
      status: 'ACTIVE',
      noPortal: [{ id: 'su-2', name: 'Bob Smith' }],
    })
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }))
    const result = await screen.findByTestId('no-portal-result')
    expect(result).toHaveTextContent('Sent to 2 people. 1 person has no portal account.')
    expect(result).toHaveTextContent('Phone, visit or post it to them, then use Record response.')
    expect(within(screen.getByRole('list', { name: 'People without a portal account' })).getByText('Bob Smith')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('people whose care has ended can be chosen and are marked "Care ended"', async () => {
    render(<SurveySendDialog survey={survey()} open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Chosen people' }))
    const results = within(screen.getByTestId('chosen-people-results'))
    expect(results.getByText('Dan Ward').parentElement).toHaveTextContent('Care ended')
    expect(results.getByText('Ann Jones').parentElement).not.toHaveTextContent('Care ended')
    await userEvent.click(screen.getByRole('checkbox', { name: /^Dan Ward Care ended/ }))
    expect(within(screen.getByRole('list', { name: 'Chosen people' })).getByText('(care ended)')).toBeInTheDocument()
  })

  it('the names stay when the survey refetches after the send', async () => {
    const { rerender } = render(
      <SurveySendDialog survey={survey({ audienceServiceUserIds: ['su-2'] })} open onOpenChange={() => {}} />,
    )
    mutateAsync.mockResolvedValue({
      sent: 1,
      skippedExisting: 0,
      status: 'ACTIVE',
      noPortal: [{ id: 'su-2', name: 'Bob Smith' }],
    })
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }))
    await screen.findByTestId('no-portal-result')
    rerender(
      <SurveySendDialog
        survey={survey({ audienceServiceUserIds: ['su-2'], status: 'ACTIVE', recipientCount: 1 })}
        open
        onOpenChange={() => {}}
      />,
    )
    expect(screen.getByTestId('no-portal-result')).toHaveTextContent('Bob Smith')
  })

  it('a scheduled send says who will need a call when it goes out', async () => {
    render(
      <SurveySendDialog
        survey={survey({ audienceServiceUserIds: ['su-2'], distributeAt: '2030-03-04T09:00:00.000Z' })}
        open
        onOpenChange={() => {}}
      />,
    )
    mutateAsync.mockResolvedValue({
      sent: 0,
      skippedExisting: 0,
      status: 'DRAFT',
      scheduled: true,
      distributeAt: '2030-03-04T09:00:00.000Z',
      noPortal: [{ id: 'su-2', name: 'Bob Smith' }],
    })
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    const result = await screen.findByTestId('no-portal-result')
    expect(result).toHaveTextContent('Scheduled. When it goes out, 1 person has no portal account.')
    expect(result).toHaveTextContent('once it is sent')
  })

  it('going back to branches clears saved chosen people', async () => {
    render(<SurveySendDialog survey={survey({ audienceServiceUserIds: ['su-1'] })} open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Everyone in these branches' }))
    mutateAsync.mockResolvedValue({ sent: 1, skippedExisting: 0, status: 'ACTIVE', noPortal: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({ locationIds: ['loc-1'], serviceUserIds: [], recurrence: null })
  })

  it('anonymous surveys say chosen people reach portal accounts only', async () => {
    render(<SurveySendDialog survey={survey({ isAnonymous: true })} open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Chosen people' }))
    expect(screen.getByText(/Anonymous surveys go only to people with a portal account/)).toBeInTheDocument()
  })

  it('staff surveys keep their own people picker (no chosen-people choice)', () => {
    render(<SurveySendDialog survey={survey({ targetKind: 'EMPLOYEE' })} open onOpenChange={() => {}} />)
    expect(screen.queryByRole('radio', { name: 'Chosen people' })).toBeNull()
    expect(screen.getByText('Specific people (optional)')).toBeInTheDocument()
  })
})
