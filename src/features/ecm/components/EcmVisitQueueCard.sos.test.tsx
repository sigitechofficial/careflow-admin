import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VisitQueueCard } from '@/features/ecm/components/EcmVisitQueueCard'
import type { EcmExceptionRow } from '@/features/ecm/types/ecm.types'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/features/scheduling/hooks/useVisitVoiceNotes', () => ({
  useVisitVoiceNotes: () => ({ groups: [] }),
}))

vi.mock('@/features/ecm/hooks/useEcm', () => ({
  useAcknowledgeEcmException: () => ({
    mutateAsync: vi.fn(),
    acknowledgeAll: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useCloseSosEcmException: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useAllowVisitContinue: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useAuthoriseCheckInMethodGrant: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useRejectCheckInMethodGrant: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
}))

function sosRow(partial: Partial<EcmExceptionRow> = {}): EcmExceptionRow {
  return {
    id: 'sos-1',
    scheduledJobId: 'job-1',
    kind: 'CARER_SOS',
    lifecycle: 'ALERT_GENERATED',
    title: 'Carer SOS — Alex',
    detail: 'No message',
    overdue: false,
    responseTargetMinutes: 5,
    escalationDeadlineAt: null,
    acknowledgedAt: null,
    createdAt: '2026-09-16T09:21:00.000Z',
    jobName: 'Morning — Alex',
    serviceUserName: 'Alex Client',
    sos: {
      id: 'sos-1',
      createdAt: '2026-09-16T09:21:00.000Z',
      lifecycle: 'ALERT_GENERATED',
      title: 'Carer SOS — Alex',
      message: null,
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      locationUnavailable: true,
      employeeId: 'emp-1',
      employeeName: 'Alex Carer',
      acknowledgedAt: null,
    },
    ...partial,
  }
}

describe('VisitQueueCard SOS close', () => {
  it('shows Acknowledge before the office has seen the SOS', () => {
    render(
      <VisitQueueCard
        rows={[sosRow()]}
        expanded
        focused={false}
        onToggle={() => undefined}
        onOpenVisit={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument()
    expect(screen.queryByTestId('ecm-close-sos')).not.toBeInTheDocument()
  })

  it('shows Close SOS after acknowledge and opens the outcome dialog', async () => {
    render(
      <VisitQueueCard
        rows={[
          sosRow({
            lifecycle: 'ACKNOWLEDGED',
            acknowledgedAt: '2026-09-16T09:22:00.000Z',
            sos: {
              id: 'sos-1',
              createdAt: '2026-09-16T09:21:00.000Z',
              lifecycle: 'ACKNOWLEDGED',
              title: 'Carer SOS — Alex',
              message: null,
              latitude: null,
              longitude: null,
              accuracyMeters: null,
              locationUnavailable: true,
              employeeId: 'emp-1',
              employeeName: 'Alex Carer',
              acknowledgedAt: '2026-09-16T09:22:00.000Z',
            },
          }),
        ]}
        expanded
        focused={false}
        onToggle={() => undefined}
        onOpenVisit={() => undefined}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId('ecm-close-sos'))
    expect(screen.getByTestId('close-sos-dialog')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Called carer' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'False alarm' })).toBeInTheDocument()
  })
})
