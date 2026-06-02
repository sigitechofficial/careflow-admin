import type { PracticalCareTasksMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'

export function practicalCareHasAssistanceNeeds(value: PracticalCareTasksMetadata | undefined): boolean {
  if (!value) return false
  return [value.laundry, value.cleaning, value.shopping, value.financeAssistance, value.otherComment].some(
    (s) => Boolean(s?.trim()),
  )
}
