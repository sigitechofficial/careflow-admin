import { useQuery } from '@tanstack/react-query'
import { fetchPatchRotationCheck } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { isPatchSubType } from '@/features/service-users/body-map/utils/body-map-medication-subtype'
import type { BodyMapBodyView } from '@/features/service-users/body-map/types'

export function usePatchRotationWarning(
  serviceUserId: string,
  opts: {
    enabled: boolean
    subType: string
    bodyView?: BodyMapBodyView
    x?: number
    y?: number
  },
) {
  const canRun =
    opts.enabled &&
    Boolean(serviceUserId) &&
    isPatchSubType(opts.subType) &&
    opts.bodyView != null &&
    opts.x != null &&
    opts.y != null

  return useQuery({
    queryKey: [
      ...bodyMapKeys.all,
      'patch-rotation',
      serviceUserId,
      opts.subType,
      opts.bodyView,
      opts.x,
      opts.y,
    ] as const,
    queryFn: ({ signal }) =>
      fetchPatchRotationCheck(serviceUserId, {
        bodyView: opts.bodyView!,
        x: opts.x!,
        y: opts.y!,
        signal,
      }),
    enabled: canRun,
    staleTime: 30_000,
  })
}
