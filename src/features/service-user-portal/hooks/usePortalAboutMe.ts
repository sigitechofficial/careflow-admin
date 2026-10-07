import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPortalAboutMe,
  fetchPortalAllergies,
  fetchPortalCalendar,
  fetchPortalCompletedVisits,
  fetchPortalContacts,
  fetchPortalDashboard,
  fetchPortalDisplaySettings,
  fetchPortalLookups,
  fetchPortalMedications,
  fetchPortalProfile,
  fetchPortalVisitPlans,
  patchPortalAboutMe,
  patchPortalProfile,
  createPortalContact,
  createPortalAllergy,
  uploadPortalPhoto,
  type CreatePortalContactPayload,
  type CreatePortalAllergyPayload,
  type PatchPortalProfilePayload,
} from '@/features/service-user-portal/api/portal.api'

export const portalKeys = {
  all: ['portal'] as const,
  dashboard: () => [...portalKeys.all, 'dashboard'] as const,
  profile: () => [...portalKeys.all, 'profile'] as const,
  lookups: () => [...portalKeys.all, 'lookups'] as const,
  aboutMe: () => [...portalKeys.all, 'about-me'] as const,
  contacts: () => [...portalKeys.all, 'contacts'] as const,
  allergies: () => [...portalKeys.all, 'allergies'] as const,
  medications: () => [...portalKeys.all, 'medications'] as const,
  calendar: () => [...portalKeys.all, 'calendar'] as const,
  completedVisits: () => [...portalKeys.all, 'completed-visits'] as const,
  visitPlans: () => [...portalKeys.all, 'visit-plans'] as const,
  displaySettings: () => [...portalKeys.all, 'display-settings'] as const,
}

/** Organisation timezone + date/time formats chosen in admin General settings. */
export function usePortalDisplaySettings(enabled = true) {
  return useQuery({
    queryKey: portalKeys.displaySettings(),
    queryFn: fetchPortalDisplaySettings,
    enabled,
    staleTime: 60_000,
  })
}

export function usePortalDashboard() {
  return useQuery({ queryKey: portalKeys.dashboard(), queryFn: fetchPortalDashboard })
}

export function usePortalProfile() {
  return useQuery({ queryKey: portalKeys.profile(), queryFn: fetchPortalProfile })
}

export function usePortalLookups() {
  return useQuery({ queryKey: portalKeys.lookups(), queryFn: fetchPortalLookups })
}

export function usePatchPortalProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PatchPortalProfilePayload) => patchPortalProfile(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: portalKeys.profile() })
      void qc.invalidateQueries({ queryKey: portalKeys.dashboard() })
    },
  })
}

export function useUploadPortalPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, setAsProfile }: { file: File; setAsProfile?: boolean }) =>
      uploadPortalPhoto(file, setAsProfile ?? false),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: portalKeys.profile() })
      void qc.invalidateQueries({ queryKey: portalKeys.dashboard() })
    },
  })
}

export function usePortalAboutMe() {
  return useQuery({ queryKey: portalKeys.aboutMe(), queryFn: fetchPortalAboutMe })
}

export function usePatchPortalAboutMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: patchPortalAboutMe,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: portalKeys.aboutMe() })
      void qc.invalidateQueries({ queryKey: portalKeys.dashboard() })
    },
  })
}

export function usePortalContacts() {
  return useQuery({ queryKey: portalKeys.contacts(), queryFn: fetchPortalContacts })
}

export function useCreatePortalContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePortalContactPayload) => createPortalContact(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: portalKeys.contacts() })
      void qc.invalidateQueries({ queryKey: portalKeys.dashboard() })
    },
  })
}

export function usePortalAllergies() {
  return useQuery({ queryKey: portalKeys.allergies(), queryFn: fetchPortalAllergies })
}

export function useCreatePortalAllergy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePortalAllergyPayload) => createPortalAllergy(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: portalKeys.allergies() })
      void qc.invalidateQueries({ queryKey: portalKeys.dashboard() })
    },
  })
}

export function usePortalMedications() {
  return useQuery({ queryKey: portalKeys.medications(), queryFn: fetchPortalMedications })
}

export function usePortalCalendar() {
  return useQuery({ queryKey: portalKeys.calendar(), queryFn: fetchPortalCalendar })
}

export function usePortalCompletedVisits() {
  return useQuery({ queryKey: portalKeys.completedVisits(), queryFn: fetchPortalCompletedVisits })
}

export function usePortalVisitPlans() {
  return useQuery({ queryKey: portalKeys.visitPlans(), queryFn: fetchPortalVisitPlans })
}
