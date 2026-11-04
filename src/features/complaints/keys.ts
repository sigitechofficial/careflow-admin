import type { FeedbackListParams } from '@/features/complaints/types'

export const complaintKeys = {
  all: () => ['complaints'] as const,
  list: (params: FeedbackListParams) => [...complaintKeys.all(), 'list', params] as const,
  summary: () => [...complaintKeys.all(), 'summary'] as const,
  detail: (id: string) => [...complaintKeys.all(), 'detail', id] as const,
  investigators: (id: string) => [...complaintKeys.all(), 'investigators', id] as const,
}
