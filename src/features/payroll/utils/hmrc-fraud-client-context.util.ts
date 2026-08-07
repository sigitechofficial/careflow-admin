/**
 * Browser-side fraud-prevention context for HMRC WEB_APP_VIA_SERVER (T17).
 * Device ID is persisted in localStorage; never invent missing network values.
 */

const DEVICE_ID_KEY = 'care-hmrc-device-id'

function ensureDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY)?.trim()
    if (existing) return existing
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `care-${Date.now()}-${Math.random().toString(16).slice(2)}`
    window.localStorage.setItem(DEVICE_ID_KEY, id)
    return id
  } catch {
    return `care-ephemeral-${Date.now()}`
  }
}

function formatTimezone(): string {
  const total = -new Date().getTimezoneOffset()
  const sign = total >= 0 ? '+' : '-'
  const abs = Math.abs(total)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${hh}:${mm}`
}

export type HmrcFraudClientContext = {
  deviceId: string
  browserJsUserAgent: string
  timezone: string
  screens: string
  windowSize: string
}

/** Collect what the browser can honestly report for HMRC fraud headers. */
export function collectHmrcFraudClientContext(): HmrcFraudClientContext {
  const width = Math.max(1, Math.round(window.screen?.width || window.innerWidth || 1))
  const height = Math.max(1, Math.round(window.screen?.height || window.innerHeight || 1))
  const scaling = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1
  const colourDepth = Math.max(1, Math.round(window.screen?.colorDepth || 24))

  return {
    deviceId: ensureDeviceId(),
    browserJsUserAgent: navigator.userAgent || '',
    timezone: formatTimezone(),
    screens: `width=${width}&height=${height}&scaling-factor=${scaling}&colour-depth=${colourDepth}`,
    windowSize: `width=${Math.max(1, Math.round(window.innerWidth || 1))}&height=${Math.max(1, Math.round(window.innerHeight || 1))}`,
  }
}
