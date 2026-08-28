export const recruitmentKeys = {
  all: ['hr-recruitment'] as const,
  summary: () => [...recruitmentKeys.all, 'summary'] as const,
  vacancies: (params?: Record<string, unknown>) =>
    [...recruitmentKeys.all, 'vacancies', params ?? {}] as const,
  vacancy: (id: string) => [...recruitmentKeys.all, 'vacancy', id] as const,
  candidates: (params?: Record<string, unknown>) =>
    [...recruitmentKeys.all, 'candidates', params ?? {}] as const,
  pipeline: (vacancyId?: string) =>
    [...recruitmentKeys.all, 'pipeline', vacancyId ?? 'all'] as const,
  candidate: (id: string) => [...recruitmentKeys.all, 'candidate', id] as const,
  documents: (candidateId: string) =>
    [...recruitmentKeys.all, 'documents', candidateId] as const,
}
