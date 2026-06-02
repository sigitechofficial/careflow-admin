import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEmergencyContact,
  createWorkingPattern,
  deleteEmergencyContact,
  deleteEmployeeDocument,
  deleteWorkingPattern,
  fetchEmployeeDocuments,
  listEmergencyContacts,
  listWorkingPatterns,
  updateEmergencyContact,
  uploadEmployeeDocument,
} from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'

export function useEmployeeDocuments(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.documents(employeeId ?? ''),
    queryFn: () => fetchEmployeeDocuments(employeeId!),
    enabled: !!employeeId && enabled,
    staleTime: 30_000,
  })
}

export function useUploadEmployeeDocument(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      name,
      description,
    }: {
      file: File
      name?: string
      description?: string
    }) => uploadEmployeeDocument(employeeId, file, { name, description }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.documents(employeeId) })
    },
  })
}

export function useDeleteEmployeeDocument(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => deleteEmployeeDocument(employeeId, documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.documents(employeeId) })
    },
  })
}

export function useEmergencyContacts(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.emergencyContacts(employeeId ?? ''),
    queryFn: () => listEmergencyContacts(employeeId!),
    enabled: !!employeeId && enabled,
    staleTime: 30_000,
  })
}

export function useCreateEmergencyContact(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createEmergencyContact>[1]) =>
      createEmergencyContact(employeeId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.emergencyContacts(employeeId) })
    },
  })
}

export function useUpdateEmergencyContact(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      contactId,
      body,
    }: {
      contactId: string
      body: Parameters<typeof updateEmergencyContact>[2]
    }) => updateEmergencyContact(employeeId, contactId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.emergencyContacts(employeeId) })
    },
  })
}

export function useDeleteEmergencyContact(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contactId: string) => deleteEmergencyContact(employeeId, contactId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.emergencyContacts(employeeId) })
    },
  })
}

export function useWorkingPatterns(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.workingPatterns(employeeId ?? ''),
    queryFn: () => listWorkingPatterns(employeeId!),
    enabled: !!employeeId && enabled,
    staleTime: 30_000,
  })
}

export function useCreateWorkingPattern(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createWorkingPattern>[1]) =>
      createWorkingPattern(employeeId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.workingPatterns(employeeId) })
    },
  })
}

export function useDeleteWorkingPattern(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patternId: string) => deleteWorkingPattern(employeeId, patternId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.workingPatterns(employeeId) })
    },
  })
}
