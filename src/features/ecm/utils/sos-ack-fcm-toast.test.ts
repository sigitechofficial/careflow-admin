import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toastError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { sosAckFcmToast, toastSosAckFcmMany } from './sos-ack-fcm-toast'
import type { FcmSendReport } from '@/features/ecm/api/ecm.api'

vi.mock('@/shared/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
  toastError: vi.fn(),
}))

function report(reason: FcmSendReport['reason'], extra?: Partial<FcmSendReport>): FcmSendReport {
  return {
    ready: reason === 'SENT',
    tokens: 0,
    sent: 0,
    skipped: 0,
    reason,
    ...extra,
  }
}

describe('sosAckFcmToast', () => {
  it('falls back when the API omits fcm', () => {
    expect(sosAckFcmToast(undefined)).toEqual({
      variant: 'success',
      title: 'SOS acknowledged',
    })
  })

  it('reports a successful carer push', () => {
    expect(sosAckFcmToast(report('SENT', { sent: 1, tokens: 1 }))).toEqual({
      variant: 'success',
      title: 'SOS acknowledged',
      description: 'Push notification sent to the carer.',
    })
  })

  it('warns when Firebase is missing on the server', () => {
    expect(sosAckFcmToast(report('FIREBASE_NOT_READY'))).toMatchObject({
      variant: 'warning',
      title: 'SOS acknowledged',
    })
  })

  it('uses the send error when delivery failed', () => {
    expect(sosAckFcmToast(report('SEND_FAILED', { error: 'quota exceeded' }))).toEqual({
      variant: 'destructive',
      title: 'SOS acknowledged',
      description: 'quota exceeded',
    })
  })
})

describe('toastSosAckFcmMany', () => {
  beforeEach(() => {
    vi.mocked(toastSuccess).mockClear()
    vi.mocked(toastWarning).mockClear()
    vi.mocked(toastError).mockClear()
  })

  it('uses the single-alert toast for one SOS', () => {
    toastSosAckFcmMany([report('SENT', { sent: 1, tokens: 1 })])
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastSuccess).toHaveBeenCalledWith(
      'SOS acknowledged',
      'Push notification sent to the carer.',
    )
  })

  it('shows one toast when several SOS are acknowledged together', () => {
    toastSosAckFcmMany([
      report('SENT', { sent: 1, tokens: 1 }),
      report('SENT', { sent: 1, tokens: 1 }),
      report('SENT', { sent: 1, tokens: 1 }),
      report('SENT', { sent: 1, tokens: 1 }),
    ])
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastWarning).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(
      '4 SOS acknowledged',
      'Push notification sent to the carer.',
    )
  })

  it('keeps one toast and prefers a push failure', () => {
    toastSosAckFcmMany([
      report('SENT', { sent: 1, tokens: 1 }),
      report('SEND_FAILED', { error: 'quota exceeded' }),
    ])
    expect(toastError).toHaveBeenCalledTimes(1)
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('2 SOS acknowledged', 'quota exceeded')
  })
})
