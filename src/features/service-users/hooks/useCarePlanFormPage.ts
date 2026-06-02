import { useQuery } from '@tanstack/react-query'
import { getCareForm } from '@/features/care-pathway/api/form-builder.api'
import { carePathwayKeys } from '@/features/care-pathway/keys'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'

const STALE_TIME = 30_000

export function useCarePlanFormDetail(formId: string, enabled = true) {
  return useQuery({
    queryKey: carePathwayKeys.formDetail(formId),
    queryFn: () => getCareForm(formId),
    enabled: enabled && Boolean(formId),
    staleTime: STALE_TIME,
  })
}

export function useCarePlanFormPage(serviceUserId: string, formId: string, enabled = true) {
  const profile = useServiceUser(serviceUserId, enabled && Boolean(serviceUserId))
  const form = useCarePlanFormDetail(formId, enabled && Boolean(formId))
  return {
    profile,
    form,
    isLoading: profile.isLoading || form.isLoading,
    error: profile.error ?? form.error,
  }
}
