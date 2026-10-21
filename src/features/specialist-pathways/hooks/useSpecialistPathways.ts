import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { specialistPathwayKeys } from '@/features/specialist-pathways/keys'
import {
  addPathwayReview,
  addPathwayRisk,
  closePathwayCase,
  createPathwayCase,
  createPathwayPlan,
  decidePathwayPlan,
  getPathwayCase,
  getPathwaySummary,
  listPathwayCases,
  reopenPathwayCase,
  updatePathwayCase,
  updatePathwayPlan,
  updatePathwayRisk,
  addPathwayProfessional,
  updatePathwayProfessional,
  removePathwayProfessional,
  uploadPathwayDocument,
  removePathwayDocument,
} from '@/features/specialist-pathways/api/specialist-pathways.api'
import type {
  ProfessionalInput,
  CreatePathwayCaseInput,
  ListPathwayCasesParams,
  PathwayPlanContent,
  PlanDecision,
  ReviewInput,
  RiskInput,
  RiskStatus,
  UpdatePathwayCaseInput,
} from '@/features/specialist-pathways/types/specialist-pathway.types'

export function usePathwayCases(params?: ListPathwayCasesParams, enabled = true) {
  return useQuery({
    queryKey: specialistPathwayKeys.list(params),
    queryFn: () => listPathwayCases(params),
    enabled,
  })
}

export function usePathwaySummary(locationId?: string, enabled = true) {
  return useQuery({
    queryKey: specialistPathwayKeys.summary(locationId),
    queryFn: () => getPathwaySummary(locationId),
    enabled,
  })
}

export function usePathwayCase(id: string | undefined) {
  return useQuery({
    queryKey: specialistPathwayKeys.detail(id ?? ''),
    queryFn: () => getPathwayCase(id as string),
    enabled: !!id,
  })
}

/** Every write refreshes lists, summary and the open case. */
function useInvalidateAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: specialistPathwayKeys.all })
}

export function useCreatePathwayCase() {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: (body: CreatePathwayCaseInput) => createPathwayCase(body), onSuccess })
}

export function useUpdatePathwayCase(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: (body: UpdatePathwayCaseInput) => updatePathwayCase(id, body), onSuccess })
}

export function useClosePathwayCase(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: (reason: string) => closePathwayCase(id, reason), onSuccess })
}

export function useReopenPathwayCase(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: () => reopenPathwayCase(id), onSuccess })
}

export function useAddPathwayRisk(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: (body: RiskInput) => addPathwayRisk(id, body), onSuccess })
}

export function useUpdatePathwayRisk(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({
    mutationFn: ({ riskId, ...body }: { riskId: string } & Partial<RiskInput> & { status?: RiskStatus }) =>
      updatePathwayRisk(id, riskId, body),
    onSuccess,
  })
}

export function useAddPathwayReview(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: (body: ReviewInput) => addPathwayReview(id, body), onSuccess })
}

export function useAddPathwayProfessional(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: (body: ProfessionalInput) => addPathwayProfessional(id, body), onSuccess })
}

export function useUpdatePathwayProfessional(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({
    mutationFn: ({ professionalId, ...body }: { professionalId: string } & Partial<ProfessionalInput>) =>
      updatePathwayProfessional(id, professionalId, body),
    onSuccess,
  })
}

export function useRemovePathwayProfessional(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: (professionalId: string) => removePathwayProfessional(id, professionalId), onSuccess })
}

export function useUploadPathwayDocument(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({
    mutationFn: (body: { file: File; title: string; category?: string }) => uploadPathwayDocument(id, body),
    onSuccess,
  })
}

export function useRemovePathwayDocument(id: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: (documentId: string) => removePathwayDocument(id, documentId), onSuccess })
}

export function useCreatePathwayPlan(caseId: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({ mutationFn: (content?: PathwayPlanContent) => createPathwayPlan(caseId, content), onSuccess })
}

export function useUpdatePathwayPlan(caseId: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({
    mutationFn: ({ planId, content, submit }: { planId: string; content?: PathwayPlanContent; submit?: boolean }) =>
      updatePathwayPlan(caseId, planId, { content, submit }),
    onSuccess,
  })
}

export function useDecidePathwayPlan(caseId: string) {
  const onSuccess = useInvalidateAll()
  return useMutation({
    mutationFn: ({ planId, decision, comment }: { planId: string; decision: PlanDecision; comment?: string }) =>
      decidePathwayPlan(caseId, planId, decision, comment),
    onSuccess,
  })
}
