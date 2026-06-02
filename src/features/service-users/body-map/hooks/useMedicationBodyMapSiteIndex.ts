import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchServiceUserBodyMap } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'

export type MedicationBodyMapSiteIndexEntry = {
  bodyMapRecordId: string
  bodyPart: string
  subType: string | null
}

/** Active MEDICATION records indexed by chart line id (from body map list). */
export function useMedicationBodyMapSiteIndex(serviceUserId: string, enabled = true) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: bodyMapKeys.list(serviceUserId, true),
    queryFn: ({ signal }) =>
      fetchServiceUserBodyMap(serviceUserId, { includeResolved: true, signal }),
    enabled: Boolean(serviceUserId) && enabled,
  })

  const byMedicationId = React.useMemo(() => {
    const map = new Map<string, MedicationBodyMapSiteIndexEntry>()
    for (const r of data?.records ?? []) {
      if (r.recordType !== 'MEDICATION' || !r.medicationSite) continue
      if (r.status === 'CLOSED' || r.status === 'RESOLVED') continue
      map.set(r.medicationSite.serviceUserMedicationId, {
        bodyMapRecordId: r.id,
        bodyPart: r.markers[0]?.bodyPart ?? 'Body map',
        subType: r.subType,
      })
    }
    return map
  }, [data?.records])

  return { byMedicationId, isLoading, isError, error }
}
