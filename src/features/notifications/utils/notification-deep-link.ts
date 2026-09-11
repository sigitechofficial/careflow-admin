import { isUrgentOfficeAlertKind } from '@/features/ecm/utils/ecm-urgent-alert.util'
import {
  validateEcmLiveSearch,
  type EcmLiveUrlSearch,
} from '@/features/ecm/utils/ecm-period-url-state.util'

export type NotificationDeepLinkInput = {
  recordType?: string | null
  recordId?: string | null
  metadata?: Record<string, unknown> | null
}

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value : null
}

export function ecmExceptionQueueSearch(scheduledJobId?: string | null): EcmLiveUrlSearch {
  return {
    tab: 'exceptions',
    period: 'today',
    ...(scheduledJobId ? { jobId: scheduledJobId } : {}),
  }
}

export function ecmExceptionQueueHref(scheduledJobId?: string | null): string {
  const params = new URLSearchParams({ tab: 'exceptions', period: 'today' })
  if (scheduledJobId) params.set('jobId', scheduledJobId)
  return `/ecm/live?${params.toString()}`
}

export function parseEcmLiveHref(href: string): EcmLiveUrlSearch | null {
  if (!href.startsWith('/ecm/live')) return null
  const query = href.includes('?') ? href.slice(href.indexOf('?') + 1) : ''
  return validateEcmLiveSearch(Object.fromEntries(new URLSearchParams(query)))
}

export function notificationDeepLink(item: NotificationDeepLinkInput): string | null {
  const metadata = item.metadata ?? {}
  const href = metadataString(metadata, 'href')
  if (href?.startsWith('/ecm/live')) return href

  const kind = metadataString(metadata, 'kind')
  const jobId = metadataString(metadata, 'scheduledJobId')
  if (item.recordType === 'EcmException' || isUrgentOfficeAlertKind(kind)) {
    return ecmExceptionQueueHref(jobId)
  }
  return null
}

export function notificationEcmLiveSearch(item: NotificationDeepLinkInput): EcmLiveUrlSearch | null {
  const href = notificationDeepLink(item)
  return href ? parseEcmLiveHref(href) : null
}
