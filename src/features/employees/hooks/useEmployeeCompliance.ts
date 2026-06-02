import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEmployeeCompliance,
  deleteComplianceDocument,
  downloadComplianceDocument,
  ensureEmployeeComplianceChecklist,
  fetchComplianceChecklist,
  updateEmployeeCompliance,
  uploadComplianceDocument,
} from '@/features/employees/api/employee-compliance-api'
import { employeeKeys } from '@/features/employees/keys'

const STALE_TIME = 30_000

export function useEmployeeComplianceChecklist(
  employeeId: string,
  ensure = false,
  enabled = true,
) {
  return useQuery({
    queryKey: employeeKeys.complianceChecklist(employeeId, ensure),
    queryFn: () =>
      ensure
        ? ensureEmployeeComplianceChecklist(employeeId)
        : fetchComplianceChecklist(employeeId),
    enabled: Boolean(employeeId) && enabled,
    staleTime: STALE_TIME,
  })
}

function invalidateCompliance(qc: ReturnType<typeof useQueryClient>, employeeId: string) {
  void qc.invalidateQueries({
    queryKey: [...employeeKeys.detail(employeeId), 'compliance-checklist'],
  })
}

export function useCreateEmployeeCompliance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      employeeId,
      body,
    }: {
      employeeId: string
      body: Parameters<typeof createEmployeeCompliance>[1]
    }) => createEmployeeCompliance(employeeId, body),
    onSuccess: (_data, { employeeId }) => invalidateCompliance(qc, employeeId),
  })
}

export function useUpdateEmployeeCompliance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      employeeId,
      complianceId,
      body,
    }: {
      employeeId: string
      complianceId: string
      body: Parameters<typeof updateEmployeeCompliance>[2]
    }) => updateEmployeeCompliance(employeeId, complianceId, body),
    onSuccess: (_data, { employeeId }) => invalidateCompliance(qc, employeeId),
  })
}

export function useUploadComplianceDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      employeeId,
      complianceId,
      file,
    }: {
      employeeId: string
      complianceId: string
      file: File
    }) => uploadComplianceDocument(employeeId, complianceId, file),
    onSuccess: (_data, { employeeId }) => invalidateCompliance(qc, employeeId),
  })
}

export function useDeleteComplianceDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      employeeId,
      complianceId,
      documentId,
    }: {
      employeeId: string
      complianceId: string
      documentId: string
    }) => deleteComplianceDocument(employeeId, complianceId, documentId),
    onSuccess: (_data, { employeeId }) => invalidateCompliance(qc, employeeId),
  })
}

export function useDownloadComplianceDocument() {
  return useMutation({
    mutationFn: ({
      employeeId,
      complianceId,
      documentId,
      downloadName,
    }: {
      employeeId: string
      complianceId: string
      documentId: string
      downloadName: string
    }) => downloadComplianceDocument(employeeId, complianceId, documentId, downloadName),
  })
}

export function useEnsureEmployeeComplianceChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => ensureEmployeeComplianceChecklist(employeeId),
    onSuccess: (_data, employeeId) => invalidateCompliance(qc, employeeId),
  })
}
