import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEmployeeCompliance,
  deleteComplianceDocument,
  downloadComplianceDocument,
  ensureEmployeeComplianceChecklist,
  fetchComplianceBoard,
  fetchComplianceChecklist,
  updateEmployeeCompliance,
  uploadComplianceDocument,
} from '@/features/employees/api/employee-compliance-api'
import { employeeKeys } from '@/features/employees/keys'

const STALE_TIME = 30_000

export function useComplianceBoard(
  enabled = true,
  hideNoLongerRequired = true,
  filters?: {
    visaTypeIds?: string[]
    needsImmigrationRtw?: boolean
    search?: string
    displayStatus?: 'BLOCKED' | 'ATTENTION' | 'COMPLIANT'
    documentState?: 'expired' | 'expiring_7' | 'expiring_8_30' | 'missing' | 'valid'
    issuesOnly?: boolean
    boardSort?: 'urgent' | 'nearest_expiry' | 'name'
    locationId?: string
  },
) {
  return useQuery({
    queryKey: employeeKeys.complianceBoard({
      hideNoLongerRequired,
      visaTypeIds: filters?.visaTypeIds?.length ? filters.visaTypeIds.slice().sort().join(',') : undefined,
      needsImmigrationRtw:
        filters?.needsImmigrationRtw === undefined
          ? undefined
          : filters.needsImmigrationRtw
            ? '1'
            : '0',
      search: filters?.search?.trim() || undefined,
      displayStatus: filters?.displayStatus,
      documentState: filters?.documentState,
      issuesOnly: filters?.issuesOnly ? '1' : undefined,
      boardSort: filters?.boardSort,
      locationId: filters?.locationId,
    }),
    queryFn: ({ signal }) =>
      fetchComplianceBoard({
        hideNoLongerRequired,
        visaTypeIds: filters?.visaTypeIds,
        needsImmigrationRtw: filters?.needsImmigrationRtw,
        search: filters?.search,
        displayStatus: filters?.displayStatus,
        documentState: filters?.documentState,
        issuesOnly: filters?.issuesOnly,
        boardSort: filters?.boardSort,
        locationId: filters?.locationId,
        signal,
      }),
    enabled,
    staleTime: STALE_TIME,
  })
}

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
  void qc.invalidateQueries({
    queryKey: [...employeeKeys.all(), 'compliance-board'],
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
      mode = 'download',
    }: {
      employeeId: string
      complianceId: string
      documentId: string
      downloadName: string
      mode?: 'view' | 'download'
    }) => downloadComplianceDocument(employeeId, complianceId, documentId, downloadName, mode),
  })
}

export function useEnsureEmployeeComplianceChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => ensureEmployeeComplianceChecklist(employeeId),
    onSuccess: (_data, employeeId) => invalidateCompliance(qc, employeeId),
  })
}
