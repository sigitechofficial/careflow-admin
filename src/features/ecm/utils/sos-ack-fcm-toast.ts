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
    case 'HELD':
      return {
        variant: 'success',
        title: 'SOS acknowledged',
        description: fcm.error?.trim() || 'The carer was not notified (held back by Message delivery settings).',
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
  showSosAckToast(sosAckFcmToast(fcm))
}

/** One toast when office acknowledges several SOS on the same visit together. */
export function toastSosAckFcmMany(fcms: Array<FcmSendReport | undefined>) {
  if (fcms.length <= 1) {
    toastSosAckFcm(fcms[0])
    return
  }

  const mapped = fcms.map(sosAckFcmToast)
  const rank = { success: 0, warning: 1, destructive: 2 } as const
  const worst = mapped.reduce((acc, next) =>
    rank[next.variant] > rank[acc.variant] ? next : acc,
  )
  const descriptions = [
    ...new Set(
      mapped
        .map(row => row.description)
        .filter((row): row is string => Boolean(row)),
    ),
  ]

  showSosAckToast({
    variant: worst.variant,
    title: `${fcms.length} SOS acknowledged`,
    description:
      descriptions.length === 1 ? descriptions[0] : worst.description,
  })
}

function showSosAckToast(next: SosAckFcmToast) {
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
