import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  clearDisplayLogo,
  fetchCompanyBranding,
  fetchCompanyProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
  uploadDisplayLogo,
  type CompanyProfile,
  type UpdateCompanyProfilePayload,
} from '@/features/settings/api/company-settings-api'
import { settingsKeys } from '@/features/settings/keys'

export function useCompanyProfile(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.companyProfile(),
    queryFn: ({ signal }) => fetchCompanyProfile({ signal }),
    enabled,
    staleTime: 60_000,
  })
}

export function useCompanyBranding(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.companyBranding(),
    queryFn: ({ signal }) => fetchCompanyBranding({ signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateCompanyProfilePayload) => updateCompanyProfile(payload),
    onSuccess: (data: CompanyProfile) => {
      qc.setQueryData(settingsKeys.companyProfile(), data)
      void qc.invalidateQueries({ queryKey: settingsKeys.companyBranding() })
    },
  })
}

export function useUploadDisplayLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadDisplayLogo(file),
    onSuccess: (data: CompanyProfile) => {
      qc.setQueryData(settingsKeys.companyProfile(), data)
      void qc.invalidateQueries({ queryKey: settingsKeys.companyBranding() })
    },
  })
}

export function useUploadCompanyLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
    onSuccess: (data: CompanyProfile) => {
      qc.setQueryData(settingsKeys.companyProfile(), data)
      void qc.invalidateQueries({ queryKey: settingsKeys.companyBranding() })
    },
  })
}

export function useClearDisplayLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearDisplayLogo(),
    onSuccess: (data: CompanyProfile) => {
      qc.setQueryData(settingsKeys.companyProfile(), data)
      void qc.invalidateQueries({ queryKey: settingsKeys.companyBranding() })
    },
  })
}
