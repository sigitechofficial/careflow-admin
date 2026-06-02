import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type MedicationSchedulePreviewPayload = {
  startDate: string
  endDate?: string
  previewDays?: number
  medicationKind?: 'REGULAR' | 'PRN'
  schedulePattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  frequencyIntervalDays?: number
  monthlyDayOfMonth?: number
  monthlyAnchorToStartDate?: boolean
  schedules: Array<{
    dueTime: string
    dueVisitName?: string
    roundId?: string
    daysOfWeek?: string[]
  }>
}

export type MedicationSchedulePreviewResult = {
  from: string
  to: string
  dayCount: number
  totalDueSlots: number
  schedulesCount: number
  perSchedule: Array<{
    dueTime: string
    timeSlotLabel: string
    dueSlotCount: number
  }>
  scheduleType: string
  summaryLabel: string
  prnNote?: string
}

export async function previewMedicationSchedule(
  serviceUserId: string,
  body: MedicationSchedulePreviewPayload,
  init?: RequestInit,
): Promise<MedicationSchedulePreviewResult> {
  const res = await apiJson<
    ApiEnvelope<MedicationSchedulePreviewResult> | { data: MedicationSchedulePreviewResult }
  >(`/service-users/${serviceUserId}/medication-schedule-preview`, {
    method: 'POST',
    body: JSON.stringify(body),
    ...init,
  })
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: MedicationSchedulePreviewResult }).data
  }
  return res as MedicationSchedulePreviewResult
}
