/** Public domain types for the settings feature. */
export type * from '@/features/settings/api/general-settings-api'
export type * from '@/features/settings/api/company-settings-api'
export type * from '@/features/settings/api/lookups-admin-api'
export type * from '@/features/settings/location-management/location-management.types'

// ── Carer notifications (Settings › General › Carer Notifications) ──
export type CarerMessageAudience = 'ALL' | 'BRANCHES' | 'EMPLOYEES'

export const CARER_MESSAGE_TITLE_MAX = 65
export const CARER_MESSAGE_BODY_MAX = 240

export type CarerMessageAudienceInput = {
  audience: CarerMessageAudience
  locationIds?: string[]
  employeeIds?: string[]
}

export type SendCarerMessageInput = CarerMessageAudienceInput & { title: string; body: string }

export type CarerMessagePreview = { recipientCount: number; withAppCount: number }

export type CarerMessageSendResult = CarerMessagePreview & {
  id: string
  deliveredCount: number
  pushReady: boolean
}

export type CarerMessageRow = {
  id: string
  title: string
  body: string
  audience: CarerMessageAudience
  branchNames: string[]
  pickedCount: number
  recipientCount: number
  withAppCount: number
  deliveredCount: number
  sentBy: string | null
  createdAt: string
}
