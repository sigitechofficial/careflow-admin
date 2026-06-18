import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'

/** When true, blocked carers appear in schedule pickers (still not assignable without override). */
export function useShowBlockedCarersInSchedule(): boolean {
  const { data } = useGeneralSettings()
  return data?.domShowBlockedCarersInSchedule ?? false
}
