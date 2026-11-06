import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { employeeKeys } from '@/features/employees/keys'
import {
  fetchOpenSupervisionActions,
  fetchSupervisionSession,
  fetchSupervisionSessions,
  fetchEmployeeSupervisionSummary,
  fetchEmployeeSupervisor,
  fetchSupervisionForms,
  fetchSupervisionOverview,
  fetchSupervisors,
  type SupervisionSessionDetail,
  type SupervisionSessionStatus,
} from '@/features/supervision/api'

export const supervisionKeys = {
  all: () => ['supervision'] as const,
  forms: () => [...supervisionKeys.all(), 'forms'] as const,
  supervisors: () => [...supervisionKeys.all(), 'supervisors'] as const,
  overview: (locationId: string | null) => [...supervisionKeys.all(), 'overview', locationId] as const,
  employeeSupervisor: (employeeId: string) => [...supervisionKeys.all(), 'employee-supervisor', employeeId] as const,
  employeeSummary: (employeeId: string) => [...supervisionKeys.all(), 'employee-summary', employeeId] as const,
  sessions: (params: { employeeId?: string; status?: SupervisionSessionStatus }) =>
    [...supervisionKeys.all(), 'sessions', params] as const,
  session: (id: string) => [...supervisionKeys.all(), 'session', id] as const,
  openActions: (employeeId: string) => [...supervisionKeys.all(), 'open-actions', employeeId] as const,
}

export function useSupervisionForms(enabled = true) {
  return useQuery({ queryKey: supervisionKeys.forms(), queryFn: fetchSupervisionForms, enabled, staleTime: 30_000 })
}

export function useSupervisionOverview(locationId: string | null, enabled = true) {
  return useQuery({
    queryKey: supervisionKeys.overview(locationId),
    queryFn: () => fetchSupervisionOverview(locationId),
    enabled,
    staleTime: 60_000,
  })
}

export function useSupervisors(enabled = true) {
  return useQuery({ queryKey: supervisionKeys.supervisors(), queryFn: fetchSupervisors, enabled, staleTime: 60_000 })
}

export function useEmployeeSupervisionSummary(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: supervisionKeys.employeeSummary(employeeId),
    queryFn: () => fetchEmployeeSupervisionSummary(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useEmployeeSupervisor(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: supervisionKeys.employeeSupervisor(employeeId),
    queryFn: () => fetchEmployeeSupervisor(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useSupervisionSessions(params: { employeeId?: string; status?: SupervisionSessionStatus }, enabled = true) {
  return useQuery({
    queryKey: supervisionKeys.sessions(params),
    queryFn: () => fetchSupervisionSessions({ ...params, limit: 100 }),
    enabled,
  })
}

export function useSupervisionSession(id: string) {
  return useQuery({ queryKey: supervisionKeys.session(id), queryFn: () => fetchSupervisionSession(id), enabled: Boolean(id) })
}

export function useOpenSupervisionActions(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: supervisionKeys.openActions(employeeId),
    queryFn: () => fetchOpenSupervisionActions(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

/**
 * Any call that returns the updated session: refreshes the page data in place and the lists, open
 * actions and review trackers that a completed session moves on.
 */
export function useSessionMutation<TVars>(sessionId: string, fn: (vars: TVars) => Promise<SupervisionSessionDetail | unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: result => {
      if (result && typeof result === 'object' && 'attendees' in result) {
        qc.setQueryData(supervisionKeys.session(sessionId), result)
      } else {
        void qc.invalidateQueries({ queryKey: supervisionKeys.session(sessionId) })
      }
      void qc.invalidateQueries({ queryKey: [...supervisionKeys.all(), 'sessions'] })
      void qc.invalidateQueries({ queryKey: [...supervisionKeys.all(), 'open-actions'] })
      void qc.invalidateQueries({ queryKey: employeeKeys.all() })
    },
  })
}
