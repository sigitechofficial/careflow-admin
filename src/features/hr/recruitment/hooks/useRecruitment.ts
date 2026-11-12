import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  convertCandidate,
  createCandidate,
  createVacancy,
  fetchCandidate,
  fetchCandidateDocuments,
  fetchCandidatePipeline,
  fetchCandidates,
  fetchRecruitmentSummary,
  fetchVacancy,
  fetchVacancies,
  updateCandidateStage,
  updateVacancy,
  updateVacancyStatus,
  type CandidateDetail,
  type CandidateStage,
  type CreateCandidatePayload,
  type CreateVacancyPayload,
  type UpdateVacancyPayload,
  type VacancyStatus,
} from '@/features/hr/recruitment/api/recruitment.api'
import { recruitmentKeys } from '@/features/hr/recruitment/keys'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import type { CandidateDocumentType } from '@/features/hr/recruitment/api/recruitment.api'

export function useRecruitmentSummary(enabled = true) {
  return useQuery({
    queryKey: recruitmentKeys.summary(),
    queryFn: () => fetchRecruitmentSummary(),
    enabled,
    staleTime: 30_000,
  })
}

export function useVacancies(
  params: { page?: number; limit?: number; search?: string; status?: VacancyStatus } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: recruitmentKeys.vacancies(params),
    queryFn: () => fetchVacancies(params),
    enabled,
    staleTime: 30_000,
  })
}

export function useVacancy(id: string | null, enabled = true) {
  return useQuery({
    queryKey: recruitmentKeys.vacancy(id ?? ''),
    queryFn: () => fetchVacancy(id!),
    enabled: !!id && enabled,
    staleTime: 30_000,
  })
}

export function useCreateVacancy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateVacancyPayload) => createVacancy(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })
}

export function useUpdateVacancy(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateVacancyPayload) => updateVacancy(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recruitmentKeys.vacancy(id) })
      void qc.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })
}

export function useUpdateVacancyStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: VacancyStatus) => updateVacancyStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recruitmentKeys.vacancy(id) })
      void qc.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })
}

export function useCandidates(
  params: {
    page?: number
    limit?: number
    search?: string
    vacancyId?: string
    stage?: CandidateStage
    closed?: boolean
  } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: recruitmentKeys.candidates(params),
    queryFn: () => fetchCandidates(params),
    enabled,
    staleTime: 30_000,
  })
}

export function useCandidatePipeline(vacancyId?: string, enabled = true) {
  return useQuery({
    queryKey: recruitmentKeys.pipeline(vacancyId),
    queryFn: () => fetchCandidatePipeline(vacancyId),
    enabled,
    staleTime: 15_000,
  })
}

export function useCandidate(id: string | null, enabled = true) {
  return useQuery({
    queryKey: recruitmentKeys.candidate(id ?? ''),
    queryFn: () => fetchCandidate(id!),
    enabled: !!id && enabled,
    staleTime: 30_000,
  })
}

export function useCreateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCandidatePayload) => createCandidate(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })
}

export function useUpdateCandidateStage(candidateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { stage: CandidateStage; notes?: string; notifyCandidate?: boolean }) =>
      updateCandidateStage(candidateId, input.stage, input.notes, input.notifyCandidate),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recruitmentKeys.candidate(candidateId) })
      void qc.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })
}

/** Runs one recruitment-flow action; the server answers with the refreshed candidate. */
export function useCandidateFlowAction<TArgs>(
  candidateId: string,
  action: (args: TArgs) => Promise<CandidateDetail>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: data => {
      qc.setQueryData(recruitmentKeys.candidate(candidateId), data)
      void qc.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })
}

export function useConvertCandidate(candidateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { startDate?: string; email?: string } = {}) =>
      convertCandidate(candidateId, input.startDate, input.email),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recruitmentKeys.candidate(candidateId) })
      void qc.invalidateQueries({ queryKey: recruitmentKeys.all })
    },
  })
}

export function useCandidateDocuments(candidateId: string | null, enabled = true) {
  return useQuery({
    queryKey: recruitmentKeys.documents(candidateId ?? ''),
    queryFn: () => fetchCandidateDocuments(candidateId!),
    enabled: !!candidateId && enabled,
    staleTime: 30_000,
  })
}

export function useUploadCandidateDocument(candidateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      file: File
      documentType: CandidateDocumentType
      reviewNotes?: string
      checkId?: string
    }) => {
      const base = getApiBaseUrl()
      if (!base) throw new ApiError('API base URL is not configured.', 0)
      const form = new FormData()
      form.append('file', input.file)
      form.append('documentType', input.documentType)
      if (input.reviewNotes?.trim()) form.append('reviewNotes', input.reviewNotes.trim())
      if (input.checkId) form.append('checkId', input.checkId)
      const token = useAuthStore.getState().accessToken
      const headers = new Headers()
      if (token) headers.set('Authorization', `Bearer ${token}`)
      const res = await fetch(`${base}/hr/candidates/${candidateId}/documents`, {
        method: 'POST',
        headers,
        body: form,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new ApiError(text || 'Upload failed', res.status)
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recruitmentKeys.documents(candidateId) })
      void qc.invalidateQueries({ queryKey: recruitmentKeys.candidate(candidateId) })
    },
  })
}
