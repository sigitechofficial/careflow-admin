import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useEcmExceptions } from '@/features/ecm/hooks/useEcm'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import {
  countLiveOfficeAlertsOnBoard,
  groupLiveOfficeAlertsByJobId,
} from '@/features/scheduling/utils/schedule-job-live-office-alerts.util'

export function useScheduleJobsLiveOfficeAlerts(
  date: string,
  jobIds: ReadonlySet<string> | undefined,
) {
  const canRead = useAuthStore(
    (s) => s.can('ecm.read') || s.can('ecm.monitor') || s.can('ecm.exceptions.manage'),
  )
  const { locationId } = useGlobalLocationScope()
  const exceptions = useEcmExceptions({
    limit: 100,
    locationId: locationId ?? undefined,
    enabled: canRead && Boolean(date),
  })

  const alertsByJobId = React.useMemo(
    () =>
      groupLiveOfficeAlertsByJobId(exceptions.data ?? [], {
        date,
        jobIds,
      }),
    [exceptions.data, date, jobIds],
  )

  const counts = React.useMemo(
    () => countLiveOfficeAlertsOnBoard(alertsByJobId),
    [alertsByJobId],
  )

  return { alertsByJobId, counts, canRead }
}
