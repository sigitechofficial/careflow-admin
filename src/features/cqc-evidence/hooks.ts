import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEvidence,
  downloadEvidenceFile,
  fetchEvidence,
  fetchEvidenceList,
  fetchEvidenceOverview,
  removeEvidenceFile,
  updateEvidence,
  uploadEvidenceFile,
  type EvidenceInput,
  type EvidenceListParams,
  type EvidenceUpdate,
} from './api'

export const cqcEvidenceKeys = {
  all: () => ['cqc-evidence'] as const,
  overview: (locationId?: string) => [...cqcEvidenceKeys.all(), 'overview', locationId ?? ''] as const,
  list: (params: EvidenceListParams) => [...cqcEvidenceKeys.all(), 'list', params] as const,
  detail: (id: string) => [...cqcEvidenceKeys.all(), 'detail', id] as const,
}

export function useEvidenceOverview(locationId?: string) {
  return useQuery({
    queryKey: cqcEvidenceKeys.overview(locationId),
    queryFn: () => fetchEvidenceOverview(locationId),
    // Keep the key questions on screen while another branch loads (the filters list them).
    placeholderData: keepPreviousData,
  })
}

export function useEvidenceList(params: EvidenceListParams) {
  return useQuery({
    queryKey: cqcEvidenceKeys.list(params),
    queryFn: () => fetchEvidenceList(params),
    placeholderData: keepPreviousData,
  })
}

export function useEvidence(id: string | null) {
  return useQuery({
    queryKey: cqcEvidenceKeys.detail(id ?? ''),
    queryFn: () => fetchEvidence(id!),
    enabled: !!id,
  })
}

/** After any change: the overview, lists and the evidence itself, and mock inspections (they show evidence). */
function useOnWrite() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: cqcEvidenceKeys.all() })
    void qc.invalidateQueries({ queryKey: ['cqc-mock-inspections'] })
  }
}

export function useCreateEvidence() {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: (body: EvidenceInput) => createEvidence(body), onSuccess: onWrite })
}

export function useUpdateEvidence(id: string) {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: (body: EvidenceUpdate) => updateEvidence(id, body), onSuccess: onWrite })
}

export function useUploadEvidenceFile(id: string) {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: (file: File) => uploadEvidenceFile(id, file), onSuccess: onWrite })
}

export function useRemoveEvidenceFile(id: string) {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: (attachmentId: string) => removeEvidenceFile(id, attachmentId), onSuccess: onWrite })
}

/** Downloads an attached file under its own name. */
export function useDownloadEvidenceFile(id: string) {
  return useMutation({
    mutationFn: async (v: { attachmentId: string; fileName: string }) => {
      const blob = await downloadEvidenceFile(id, v.attachmentId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = v.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
  })
}
