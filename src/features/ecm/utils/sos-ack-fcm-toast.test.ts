import { describe, expect, it } from 'vitest'
import { sosAckFcmToast } from './sos-ack-fcm-toast'
import type { FcmSendReport } from '@/features/ecm/api/ecm.api'

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
