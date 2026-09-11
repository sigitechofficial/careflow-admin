import type { FcmSendReport } from '@/features/ecm/api/ecm.api'
import { toastError, toastSuccess, toastWarning } from '@/shared/lib/toast'

export type SosAckFcmToast = {
  variant: 'success' | 'warning' | 'destructive'
  title: string
  description?: string
}

export function sosAckFcmToast(fcm: FcmSendReport | undefined): SosAckFcmToast {
  if (!fcm) {
    return { variant: 'success', title: 'SOS acknowledged' }
  }
  switch (fcm.reason) {
    case 'SENT':
      return {
        variant: 'success',
        title: 'SOS acknowledged',
        description: 'Push notification sent to the carer.',
      }
    case 'NOT_SOS':
      return { variant: 'success', title: 'Acknowledged' }
    case 'NOT_FIRST_ACK':
      return {
        variant: 'warning',
        title: 'Already acknowledged',
        description: 'The carer was not notified again.',
      }
    case 'FIREBASE_NOT_READY':
      return {
        variant: 'warning',
        title: 'SOS acknowledged',
        description: 'Carer push was not sent — Firebase is not configured on the server.',
      }
    case 'NO_DEVICE_TOKEN':
      return {
        variant: 'warning',
        title: 'SOS acknowledged',
        description: 'Carer has no registered device token, so the push was not sent.',
      }
    case 'NO_EMPLOYEE':
      return {
        variant: 'warning',
        title: 'SOS acknowledged',
        description: 'Could not identify the carer for this SOS.',
      }
    case 'SEND_FAILED':
      return {
        variant: 'destructive',
        title: 'SOS acknowledged',
        description: fcm.error?.trim() || 'Carer push failed to send.',
      }
    default:
      return {
        variant: 'warning',
        title: 'SOS acknowledged',
        description: `Carer push status: ${fcm.reason}`,
      }
  }
}

export function toastSosAckFcm(fcm: FcmSendReport | undefined) {
  const next = sosAckFcmToast(fcm)
  if (next.variant === 'success') {
    toastSuccess(next.title, next.description)
    return
  }
  if (next.variant === 'destructive') {
    toastError(next.title, next.description)
    return
  }
  toastWarning(next.title, next.description)
}
