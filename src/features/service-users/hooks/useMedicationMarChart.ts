import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createMedicationAdministrationEvent,
  downloadMarExportCsv,
  downloadMarExportExcel,
  downloadMarExportHtml,
  downloadMarExportPdf,
  fetchMedicationRegularChart,
  patchMedicationAdministrationEvent,
  reviewMedicationAdministrationEvent,
  type CorrectMedicationEventPayload,
  type CreateMedicationEventPayload,
  type MarChartExportParams,
  type MarChartQueryParams,
} from '@/features/service-users/api/medication-mar.api'
import { serviceUserKeys } from '@/features/service-users/keys'

export function medicationChartMonthKey(serviceUserId: string, month: string) {
  return [...serviceUserKeys.detail(serviceUserId), 'medication-chart', month] as const
}

export function useMedicationRegularChart(
  serviceUserId: string,
  params: MarChartQueryParams & { month?: string },
  enabled = true,
) {
  const queryKey = [
    ...serviceUserKeys.detail(serviceUserId),
    'medication-chart',
    params.month ?? '',
    params.dateFrom ?? '',
    params.dateTo ?? '',
    params.medicationIds?.join(',') ?? '',
    params.prnVisitId ?? '',
  ] as const
  const hasRange = Boolean(
    params.month || (params.dateFrom && params.dateTo),
  )
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchMedicationRegularChart(serviceUserId, params, { signal }),
    enabled: Boolean(serviceUserId && hasRange && enabled),
  })
}

export function useCreateMedicationAdministrationEvent(serviceUserId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateMedicationEventPayload) =>
      createMedicationAdministrationEvent(serviceUserId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-chart'],
      })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'mar-export-preview'],
      })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-events'],
      })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medications'],
      })
    },
  })
}

export function useReviewMedicationEvent(serviceUserId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, notes }: { eventId: string; notes?: string }) =>
      reviewMedicationAdministrationEvent(serviceUserId, eventId, { notes }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-chart'],
      })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'mar-export-preview'],
      })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-events'],
      })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-event'],
      })
    },
  })
}

export function useMarExportHtmlPreview(
  serviceUserId: string,
  params: MarChartExportParams,
  enabled = true,
) {
  const hasRange = Boolean(params.month || (params.dateFrom && params.dateTo))
  return useQuery({
    queryKey: [
      ...serviceUserKeys.detail(serviceUserId),
      'mar-export-preview',
      params.month ?? '',
      params.dateFrom ?? '',
      params.dateTo ?? '',
      params.medicationIds?.join(',') ?? '',
      params.packExportDetail ?? 'full',
    ] as const,
    queryFn: ({ signal }) =>
      downloadMarExportHtml(serviceUserId, { ...params, preview: true }, { signal }),
    enabled: Boolean(serviceUserId && hasRange && enabled),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useDownloadMarExport(serviceUserId: string) {
  return useMutation({
    mutationFn: (params: MarChartExportParams) => downloadMarExportHtml(serviceUserId, params),
  })
}

export function useDownloadMarExportPdf(serviceUserId: string) {
  return useMutation({
    mutationFn: (params: MarChartExportParams) => downloadMarExportPdf(serviceUserId, params),
  })
}

export function useDownloadMarExportCsv(serviceUserId: string) {
  return useMutation({
    mutationFn: (params: MarChartExportParams) => downloadMarExportCsv(serviceUserId, params),
  })
}

export function useDownloadMarExportExcel(serviceUserId: string) {
  return useMutation({
    mutationFn: (params: MarChartExportParams) => downloadMarExportExcel(serviceUserId, params),
  })
}

export function useCorrectMedicationEvent(serviceUserId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CorrectMedicationEventPayload) =>
      patchMedicationAdministrationEvent(serviceUserId, body.eventId, {
        statusCode: body.statusCode,
        correctionReason: body.correctionReason,
        correctionNotes: body.correctionNotes,
        reason: body.reason,
        notes: body.notes,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-chart'],
      })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'mar-export-preview'],
      })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-events'],
      })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-event'],
      })
    },
  })
}

/** YYYY-MM for current UTC month */
export function currentMedicationChartMonth(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function shiftMedicationChartMonth(month: string, delta: number): string {
  const [yStr, mStr] = month.split('-')
  const d = new Date(Date.UTC(Number(yStr), Number(mStr) - 1 + delta, 1))
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

import { formatOrganisationMonthYear } from '@/shared/lib/organisation-display-format.store'

export function formatChartMonthLabel(month: string): string {
  return formatOrganisationMonthYear(month)
}

/** Inclusive month list from `from` through `to` (max 6). */
export function enumerateChartMonths(from: string, to: string): string[] {
  const months: string[] = []
  let cur = from
  while (cur <= to && months.length < 6) {
    months.push(cur)
    cur = shiftMedicationChartMonth(cur, 1)
  }
  return months
}
