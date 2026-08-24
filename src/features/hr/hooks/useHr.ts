import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHrProfile,
  fetchHrDocuments,
  fetchHrEmployees,
  fetchHrProfile,
  updateHrProfile,
  deleteHrDocument,
  type HrProfilePayload,
  type ListHrEmployeesParams,
} from '@/features/hr/api/hr.api'
import { hrKeys } from '@/features/hr/keys'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import type { HrDocumentType, HrDocumentStatus } from '@/features/hr/api/hr.api'

export function useHrEmployees(params: ListHrEmployeesParams, enabled = true) {
  return useQuery({
    queryKey: hrKeys.employees(params),
    queryFn: () => fetchHrEmployees(params),
    enabled,
    staleTime: 30_000,
  })
}

export function useHrProfile(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: hrKeys.profile(employeeId ?? ''),
    queryFn: () => fetchHrProfile(employeeId!),
    enabled: !!employeeId && enabled,
    staleTime: 30_000,
  })
}

export function useCreateHrProfile(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: HrProfilePayload) => createHrProfile(employeeId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.profile(employeeId) })
      void qc.invalidateQueries({ queryKey: hrKeys.all })
    },
  })
}

export function useUpdateHrProfile(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: HrProfilePayload) => updateHrProfile(employeeId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.profile(employeeId) })
      void qc.invalidateQueries({ queryKey: hrKeys.all })
    },
  })
}

export function useHrDocuments(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: hrKeys.documents(employeeId ?? ''),
    queryFn: () => fetchHrDocuments(employeeId!),
    enabled: !!employeeId && enabled,
    staleTime: 30_000,
  })
}

export function useUploadHrDocument(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      file: File
      documentType: HrDocumentType
      name?: string
      expiryDate?: string
      status?: HrDocumentStatus
    }) => {
      const base = getApiBaseUrl()
      if (!base) throw new ApiError('API base URL is not configured.', 0)
      const form = new FormData()
      form.append('file', input.file)
      form.append('documentType', input.documentType)
      if (input.name?.trim()) form.append('name', input.name.trim())
      if (input.expiryDate) form.append('expiryDate', input.expiryDate)
      if (input.status) form.append('status', input.status)
      const token = useAuthStore.getState().accessToken
      const headers = new Headers()
      if (token) headers.set('Authorization', `Bearer ${token}`)
      const res = await fetch(`${base}/hr/employees/${employeeId}/documents`, {
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
      void qc.invalidateQueries({ queryKey: hrKeys.documents(employeeId) })
    },
  })
}

export function useDeleteHrDocument(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => deleteHrDocument(documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.documents(employeeId) })
    },
  })
}
