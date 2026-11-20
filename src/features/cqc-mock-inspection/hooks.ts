import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelMockInspection,
  completeMockInspection,
  createMockAction,
  createMockInspection,
  fetchMockInspection,
  fetchMockInspectionTemplates,
  fetchStatementSurveys,
  fetchStatementPolicies,
  adoptLibraryPolicies,
  adoptLibrarySurveys,
  undoAdoptPolicy,
  undoAdoptSurvey,
  fetchMockInspectionComparison,
  fetchMockInspectionPdf,
  fetchCqcFramework,
  fetchEvidencePack,
  fetchMockInspections,
  refreshMockEvidence,
  scoreMockStatement,
  updateMockAction,
  type CreateMockActionInput,
  type CreateMockInspectionInput,
  type EvidencePackInput,
  type MockInspectionDetail,
  type MockInspectionListParams,
  type ScoreStatementInput,
  type UpdateMockActionInput,
} from './api'

export const mockInspectionKeys = {
  all: () => ['cqc-mock-inspections'] as const,
  list: (params: MockInspectionListParams) => [...mockInspectionKeys.all(), 'list', params] as const,
  detail: (id: string) => [...mockInspectionKeys.all(), 'detail', id] as const,
  templates: () => [...mockInspectionKeys.all(), 'templates'] as const,
  statementSurveys: () => [...mockInspectionKeys.all(), 'statement-surveys'] as const,
  statementPolicies: () => [...mockInspectionKeys.all(), 'statement-policies'] as const,
  comparison: (id: string) => [...mockInspectionKeys.all(), 'comparison', id] as const,
  framework: () => [...mockInspectionKeys.all(), 'framework'] as const,
}

export function useMockInspections(params: MockInspectionListParams) {
  return useQuery({ queryKey: mockInspectionKeys.list(params), queryFn: () => fetchMockInspections(params) })
}

/** Ready-made inspections (they change only on deploy). */
export function useMockInspectionTemplates() {
  return useQuery({
    queryKey: mockInspectionKeys.templates(),
    queryFn: fetchMockInspectionTemplates,
    staleTime: 5 * 60_000,
  })
}

/** Adopt ready-made policies; refreshes the statement policies and the policy lists. */
export function useAdoptPolicies() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => adoptLibraryPolicies(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mockInspectionKeys.statementPolicies() })
      void qc.invalidateQueries({ queryKey: ['policies'] })
    },
  })
}

/** Adopt ready-made surveys; refreshes the statement surveys and the survey lists. */
export function useAdoptSurveys() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => adoptLibrarySurveys(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mockInspectionKeys.statementSurveys() })
      void qc.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

/** Undo adopting a policy (deletes its never-published draft); refreshes the statement policies and the policy lists. */
export function useUndoAdoptPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (policyId: string) => undoAdoptPolicy(policyId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mockInspectionKeys.statementPolicies() })
      void qc.invalidateQueries({ queryKey: ['policies'] })
    },
  })
}

/** Undo adopting a survey (removes its template); refreshes the statement surveys and the survey lists. */
export function useUndoAdoptSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (surveyId: string) => undoAdoptSurvey(surveyId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mockInspectionKeys.statementSurveys() })
      void qc.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

/** Ready-made policies by quality statement; only for users who may see policies. */
export function useStatementPolicies(enabled: boolean) {
  return useQuery({
    queryKey: mockInspectionKeys.statementPolicies(),
    queryFn: fetchStatementPolicies,
    enabled,
    staleTime: 5 * 60_000,
  })
}

/** Ready-made surveys by quality statement; only for users who may see surveys. */
export function useStatementSurveys(enabled: boolean) {
  return useQuery({
    queryKey: mockInspectionKeys.statementSurveys(),
    queryFn: fetchStatementSurveys,
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useMockInspection(id: string) {
  return useQuery({
    queryKey: mockInspectionKeys.detail(id),
    queryFn: () => fetchMockInspection(id),
    enabled: Boolean(id),
  })
}

/** Compared with the previous completed inspection of the same service. */
export function useMockInspectionComparison(id: string) {
  return useQuery({
    queryKey: mockInspectionKeys.comparison(id),
    queryFn: () => fetchMockInspectionComparison(id),
    enabled: Boolean(id),
  })
}

/** Every write returns the whole inspection: seed the detail cache and refresh the lists and comparison. */
function useOnWrite() {
  const qc = useQueryClient()
  return (detail: MockInspectionDetail) => {
    qc.setQueryData(mockInspectionKeys.detail(detail.id), detail)
    void qc.invalidateQueries({ queryKey: [...mockInspectionKeys.all(), 'list'] })
    void qc.invalidateQueries({ queryKey: mockInspectionKeys.comparison(detail.id) })
  }
}

export function useCreateMockInspection() {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: (body: CreateMockInspectionInput) => createMockInspection(body), onSuccess: onWrite })
}

export function useScoreMockStatement(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (v: { statementId: string; body: ScoreStatementInput }) => scoreMockStatement(id, v.statementId, v.body),
    onSuccess: onWrite,
  })
}

export function useRefreshMockEvidence(id: string) {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: () => refreshMockEvidence(id), onSuccess: onWrite })
}

export function useCompleteMockInspection(id: string) {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: () => completeMockInspection(id), onSuccess: onWrite })
}

export function useCancelMockInspection(id: string) {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: () => cancelMockInspection(id), onSuccess: onWrite })
}

export function useCreateMockAction(id: string) {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: (body: CreateMockActionInput) => createMockAction(id, body), onSuccess: onWrite })
}

/** The CQC framework outline (key questions and statements); it changes only on deploy. */
export function useCqcFrameworkOutline(enabled: boolean) {
  return useQuery({
    queryKey: mockInspectionKeys.framework(),
    queryFn: fetchCqcFramework,
    enabled,
    staleTime: 30 * 60_000,
  })
}

/** Saves a downloaded file in the browser. */
function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** File name like the API's: cqc-evidence-pack-<scope>-<yyyy-mm-dd>.<pdf|zip>. */
export function evidencePackFileName(input: EvidencePackInput, statementCode?: string, today = new Date()) {
  const scope = (input.statementId ? statementCode : input.keyQuestionCode) ?? 'all-statements'
  const slug = scope.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'all-statements'
  return `cqc-evidence-pack-${slug}-${today.toISOString().slice(0, 10)}.${input.format}`
}

/** Downloads a CQC evidence pack. */
export function useDownloadEvidencePack() {
  return useMutation({
    mutationFn: async (v: { input: EvidencePackInput; statementCode?: string }) => {
      const blob = await fetchEvidencePack(v.input)
      saveFile(blob, evidencePackFileName(v.input, v.statementCode))
    },
  })
}

/** Downloads the report PDF; the file is named after the inspection title and today's date. */
export function useDownloadMockInspectionPdf() {
  return useMutation({
    mutationFn: async (v: { id: string; title: string }) => {
      const blob = await fetchMockInspectionPdf(v.id)
      const slug = v.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'report'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mock-cqc-inspection-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
  })
}

export function useUpdateMockAction(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (v: { actionId: string; body: UpdateMockActionInput }) => updateMockAction(id, v.actionId, v.body),
    onSuccess: onWrite,
  })
}
