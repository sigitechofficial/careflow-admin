import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  previewMedicationSchedule,
  type MedicationSchedulePreviewPayload,
} from '@/features/service-users/api/medication-schedule-preview.api'

export function medicationSchedulePreviewKey(
  serviceUserId: string,
  payload: MedicationSchedulePreviewPayload | null,
) {
  return ['medication-schedule-preview', serviceUserId, payload] as const
}

export function useMedicationSchedulePreview(
  serviceUserId: string,
  payload: MedicationSchedulePreviewPayload | null,
  enabled = true,
) {
  const [debounced, setDebounced] = React.useState(payload)
  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(payload), 400)
    return () => window.clearTimeout(handle)
  }, [payload])

  const canRun =
    enabled &&
    Boolean(serviceUserId) &&
    Boolean(debounced?.startDate?.trim()) &&
    (debounced?.schedules.length ?? 0) > 0

  return useQuery({
    queryKey: medicationSchedulePreviewKey(serviceUserId, debounced),
    queryFn: ({ signal }) =>
      previewMedicationSchedule(serviceUserId, debounced!, { signal }),
    enabled: canRun,
    staleTime: 30_000,
  })
}
