import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { incidentKeys } from '@/features/incidents/keys'
import {
  addIncidentInjury,
  addIncidentWitness,
  addRelatedCareRecord,
  deleteIncidentAttachment,
  deleteIncidentInjury,
  deleteIncidentWitness,
  deleteRelatedCareRecord,
  fetchIncidentAttachments,
  fetchRelatedIncidents,
  fetchServiceUserIncidentHistory,
  linkRelatedIncident,
  unlinkRelatedIncident,
  updateRelatedCareRecord,
  uploadIncidentAttachment,
} from '@/features/incidents/api/incidents-care.api'

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: incidentKeys.all() })
}

export function useAddIncidentInjury(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof addIncidentInjury>[1]) => addIncidentInjury(incidentId, input),
    onSuccess: () => { toastSuccess('Injury recorded'); invalidateAll(qc) },
    onError: (e) => toastApiError(e),
  })
}

export function useDeleteIncidentInjury() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (injuryId: string) => deleteIncidentInjury(injuryId),
    onSuccess: () => invalidateAll(qc),
    onError: (e) => toastApiError(e),
  })
}

export function useAddIncidentWitness(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof addIncidentWitness>[1]) => addIncidentWitness(incidentId, input),
    onSuccess: () => { toastSuccess('Witness added'); invalidateAll(qc) },
    onError: (e) => toastApiError(e),
  })
}

export function useDeleteIncidentWitness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (witnessId: string) => deleteIncidentWitness(witnessId),
    onSuccess: () => invalidateAll(qc),
    onError: (e) => toastApiError(e),
  })
}

export function useAddRelatedCareRecord(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof addRelatedCareRecord>[1]) => addRelatedCareRecord(incidentId, input),
    onSuccess: () => { toastSuccess('Care record linked'); invalidateAll(qc) },
    onError: (e) => toastApiError(e),
  })
}

export function useUpdateRelatedCareRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { recordId: string; input: Parameters<typeof updateRelatedCareRecord>[1] }) =>
      updateRelatedCareRecord(vars.recordId, vars.input),
    onSuccess: () => invalidateAll(qc),
    onError: (e) => toastApiError(e),
  })
}

export function useDeleteRelatedCareRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recordId: string) => deleteRelatedCareRecord(recordId),
    onSuccess: () => invalidateAll(qc),
    onError: (e) => toastApiError(e),
  })
}

export function useRelatedIncidents(incidentId: string | undefined) {
  return useQuery({
    queryKey: [...incidentKeys.detail(incidentId ?? ''), 'related'],
    queryFn: ({ signal }) => fetchRelatedIncidents(incidentId!, { signal }),
    enabled: Boolean(incidentId),
  })
}

export function useLinkRelatedIncident(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { relatedIncidentId: string; note?: string }) =>
      linkRelatedIncident(incidentId, vars.relatedIncidentId, vars.note),
    onSuccess: () => { toastSuccess('Incident linked'); invalidateAll(qc) },
    onError: (e) => toastApiError(e),
  })
}

export function useUnlinkRelatedIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => unlinkRelatedIncident(linkId),
    onSuccess: () => invalidateAll(qc),
    onError: (e) => toastApiError(e),
  })
}

export function useIncidentAttachments(incidentId: string | undefined) {
  return useQuery({
    queryKey: [...incidentKeys.detail(incidentId ?? ''), 'attachments'],
    queryFn: ({ signal }) => fetchIncidentAttachments(incidentId!, { signal }),
    enabled: Boolean(incidentId),
  })
}

export function useUploadIncidentAttachment(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { file: File; category: string }) =>
      uploadIncidentAttachment(incidentId, vars.file, vars.category),
    onSuccess: () => { toastSuccess('Attachment uploaded'); invalidateAll(qc) },
    onError: (e) => toastApiError(e),
  })
}

export function useDeleteIncidentAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => deleteIncidentAttachment(attachmentId),
    onSuccess: () => invalidateAll(qc),
    onError: (e) => toastApiError(e),
  })
}

export function useServiceUserIncidentHistory(serviceUserId: string | undefined) {
  return useQuery({
    queryKey: [...incidentKeys.all(), 'su-history', serviceUserId ?? ''],
    queryFn: ({ signal }) => fetchServiceUserIncidentHistory(serviceUserId!, { signal }),
    enabled: Boolean(serviceUserId),
  })
}
