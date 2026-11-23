import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  answerStandard,
  beginAudit,
  cancelAudit,
  completeAudit,
  createAuditAction,
  createAuditArea,
  createAuditSchedule,
  createAuditTemplate,
  fetchAudit,
  fetchAuditAreas,
  fetchAuditDashboard,
  fetchAuditReports,
  fetchAudits,
  fetchAuditSchedules,
  fetchAuditTemplate,
  fetchAuditTemplates,
  retireAuditTemplate,
  startAudit,
  stopAuditSchedule,
  updateAudit,
  updateAuditAction,
  updateAuditSchedule,
  updateAuditTemplate,
  type AnswerInput,
  type AuditDetail,
  type AuditFilters,
  type AuditListParams,
  type CreateActionInput,
  type CreateScheduleInput,
  type SaveTemplateInput,
  type StartAuditInput,
  type UpdateActionInput,
  type UpdateAuditInput,
  type UpdateScheduleInput,
} from './api'

export const auditKeys = {
  all: () => ['quality-audits'] as const,
  dashboard: (f: AuditFilters) => [...auditKeys.all(), 'dashboard', f] as const,
  reports: (f: AuditFilters & { days?: number }) => [...auditKeys.all(), 'reports', f] as const,
  list: (p: AuditListParams) => [...auditKeys.all(), 'list', p] as const,
  detail: (id: string) => [...auditKeys.all(), 'detail', id] as const,
  areas: () => [...auditKeys.all(), 'areas'] as const,
  templates: (p: object) => [...auditKeys.all(), 'templates', p] as const,
  template: (code: string) => [...auditKeys.all(), 'template', code] as const,
  schedules: (p: object) => [...auditKeys.all(), 'schedules', p] as const,
}

export function useAuditDashboard(f: AuditFilters) {
  return useQuery({ queryKey: auditKeys.dashboard(f), queryFn: () => fetchAuditDashboard(f), placeholderData: keepPreviousData })
}
export function useAuditReports(f: AuditFilters & { days?: number }) {
  return useQuery({ queryKey: auditKeys.reports(f), queryFn: () => fetchAuditReports(f), placeholderData: keepPreviousData })
}
export function useAudits(p: AuditListParams, enabled = true) {
  return useQuery({ queryKey: auditKeys.list(p), queryFn: () => fetchAudits(p), placeholderData: keepPreviousData, enabled })
}
export function useAudit(id: string) {
  return useQuery({ queryKey: auditKeys.detail(id), queryFn: () => fetchAudit(id) })
}
export function useAuditAreas() {
  return useQuery({ queryKey: auditKeys.areas(), queryFn: fetchAuditAreas, staleTime: 60_000 })
}
export function useAuditTemplates(p: { areaCode?: string; kind?: 'library' | 'custom' } = {}, enabled = true) {
  return useQuery({ queryKey: auditKeys.templates(p), queryFn: () => fetchAuditTemplates(p), staleTime: 30_000, enabled })
}
export function useAuditTemplate(code: string | null) {
  return useQuery({
    queryKey: auditKeys.template(code ?? ''),
    queryFn: () => fetchAuditTemplate(code!),
    enabled: Boolean(code),
  })
}
export function useAuditSchedules(p: { locationId?: string; templateCode?: string; includeStopped?: boolean } = {}) {
  return useQuery({ queryKey: auditKeys.schedules(p), queryFn: () => fetchAuditSchedules(p) })
}

/** Every change refreshes the audits, the dashboard, the reports and the schedules. */
function useAuditMutation<V, R>(fn: (v: V) => Promise<R>, onData?: (data: R, qc: ReturnType<typeof useQueryClient>) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: data => {
      onData?.(data, qc)
      void qc.invalidateQueries({ queryKey: auditKeys.all() })
    },
  })
}

const putDetail = (data: AuditDetail, qc: ReturnType<typeof useQueryClient>) =>
  qc.setQueryData(auditKeys.detail(data.id), data)

export const useStartAudit = () => useAuditMutation((v: StartAuditInput) => startAudit(v), putDetail)
export const useBeginAudit = (id: string) =>
  useAuditMutation((auditedItemValue?: string) => beginAudit(id, auditedItemValue), putDetail)
export const useUpdateAudit = (id: string) => useAuditMutation((v: UpdateAuditInput) => updateAudit(id, v), putDetail)
export const useAnswerStandard = (id: string) =>
  useAuditMutation((v: { standardId: string; body: AnswerInput }) => answerStandard(id, v.standardId, v.body), putDetail)
export const useCompleteAudit = (id: string) => useAuditMutation<void, AuditDetail>(() => completeAudit(id), putDetail)
export const useCancelAudit = (id: string) => useAuditMutation<void, AuditDetail>(() => cancelAudit(id), putDetail)
export const useCreateAuditAction = (id: string) =>
  useAuditMutation((v: CreateActionInput) => createAuditAction(id, v), putDetail)
export const useUpdateAuditAction = (id: string) =>
  useAuditMutation((v: { actionId: string; body: UpdateActionInput }) => updateAuditAction(id, v.actionId, v.body), putDetail)

export const useCreateAuditArea = () => useAuditMutation((v: { name: string; description?: string }) => createAuditArea(v))
export const useCreateAuditTemplate = () => useAuditMutation((v: SaveTemplateInput) => createAuditTemplate(v))
export const useUpdateAuditTemplate = (code: string) =>
  useAuditMutation((v: SaveTemplateInput) => updateAuditTemplate(code, v))
export const useRetireAuditTemplate = () => useAuditMutation((code: string) => retireAuditTemplate(code))
export const useCreateAuditSchedule = () => useAuditMutation((v: CreateScheduleInput) => createAuditSchedule(v))
export const useUpdateAuditSchedule = () =>
  useAuditMutation((v: { id: string; body: UpdateScheduleInput }) => updateAuditSchedule(v.id, v.body))
export const useStopAuditSchedule = () => useAuditMutation((id: string) => stopAuditSchedule(id))
