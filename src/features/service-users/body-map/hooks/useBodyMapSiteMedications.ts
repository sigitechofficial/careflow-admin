import * as React from 'react'
import { useServiceUserMedications } from '@/features/service-users/hooks/useServiceUserMedications'
import type { ServiceUserMedicationRow } from '@/features/service-users/api/service-users.api'
import { isBodyMapSiteMedication } from '@/features/service-users/utils/body-map-medication-eligibility'

export function useBodyMapSiteMedications(serviceUserId: string, enabled = true) {
  const query = useServiceUserMedications(serviceUserId)
  const eligible = React.useMemo(() => {
    const rows = query.data?.rows ?? []
    return rows.filter(
      (m): m is ServiceUserMedicationRow =>
        m.status === 'ACTIVE' &&
        isBodyMapSiteMedication({
          medicationType: m.medicationType,
          route: m.route,
        }),
    )
  }, [query.data?.rows])

  return {
    ...query,
    eligibleMedications: eligible,
  }
}
