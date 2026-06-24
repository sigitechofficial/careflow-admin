import { Link } from '@tanstack/react-router'
import { Loader2, MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchMedicationBodyMapSite } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { formatGbDateTime } from '@/features/service-users/medication/medication-event-display'

type Props = {
  serviceUserId: string
  medicationId: string
  medicationName: string
  showAddLink?: boolean
}

export function MedicationBodyMapSitePanel({
  serviceUserId,
  medicationId,
  medicationName,
  showAddLink = true,
}: Props) {
  const siteQuery = useQuery({
    queryKey: [...bodyMapKeys.all, 'med-site', serviceUserId, medicationId] as const,
    queryFn: ({ signal }) => fetchMedicationBodyMapSite(serviceUserId, medicationId, signal),
    enabled: Boolean(serviceUserId && medicationId),
  })

  if (siteQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking body map site…
      </p>
    )
  }

  if (siteQuery.isError) return null

  const data = siteQuery.data
  if (data?.linked && data.medicationSite) {
    const marker = data.record?.markers[0]
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/90 px-3 py-2.5 text-xs text-blue-950">
        <p className="flex items-center gap-1 font-semibold text-blue-900">
          <MapPin className="h-3.5 w-3.5" />
          Body map site linked
        </p>
        <p className="mt-1">
          {marker?.bodyPart ?? 'Location recorded'}
          {data.medicationSite.nextChangeDue
            ? ` · next change ${formatGbDateTime(data.medicationSite.nextChangeDue)}`
            : ''}
        </p>
        <Link
          to="/service-users/$serviceUserId/body-map"
          params={{ serviceUserId }}
          className="mt-2 inline-block font-medium text-indigo-700 hover:underline"
        >
          Open body map record →
        </Link>
      </div>
    )
  }

  if (!showAddLink) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950">
      <p className="font-semibold text-amber-900">No body map site on file</p>
      <p className="mt-1">
        CQC expects external medicines such as {medicationName} to show where on the body they are
        applied.
      </p>
      <Link
        to="/service-users/$serviceUserId/body-map"
        params={{ serviceUserId }}
        search={{ linkMedicationId: medicationId }}
        className="mt-2 inline-block font-medium text-indigo-700 hover:underline"
      >
        Add body map site →
      </Link>
    </div>
  )
}
