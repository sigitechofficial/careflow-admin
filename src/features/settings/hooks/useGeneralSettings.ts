import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  type OrganisationGeneralSettings,
  type UpdateOrganisationGeneralSettingsPayload,
} from '@/features/settings/api/general-settings-api'
import { settingsKeys } from '@/features/settings/keys'
import { syncOrganisationOperationalTimezone } from '@/shared/lib/operational-day.util'

export function useGeneralSettings(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.general(),
    queryFn: ({ signal }) => fetchGeneralSettings({ signal }),
    enabled,
    staleTime: 60_000,
  })
}

export function useUpdateGeneralSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateOrganisationGeneralSettingsPayload) => updateGeneralSettings(payload),
    onSuccess: (data: OrganisationGeneralSettings) => {
      qc.setQueryData(settingsKeys.general(), data)
      syncOrganisationOperationalTimezone(data.timezone)
    },
  })
}
