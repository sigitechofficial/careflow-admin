import type { SurveyListFilters } from '@/features/surveys/types'

export const surveyKeys = {
  all: () => ['surveys'] as const,
  list: (filters: SurveyListFilters) => [...surveyKeys.all(), 'list', filters] as const,
  detail: (id: string) => [...surveyKeys.all(), 'detail', id] as const,
  results: (id: string) => [...surveyKeys.all(), 'results', id] as const,
  responses: (id: string) => [...surveyKeys.all(), 'responses', id] as const,
  recipients: (id: string) => [...surveyKeys.all(), 'recipients', id] as const,
  recordCandidates: (id: string, search: string) =>
    [...surveyKeys.all(), 'record-candidates', id, search] as const,
  sendCandidates: (id: string, search: string, ids: string) =>
    [...surveyKeys.all(), 'send-candidates', id, search, ids] as const,
  publicForm: (token: string) => [...surveyKeys.all(), 'public', token] as const,
  portal: () => [...surveyKeys.all(), 'portal'] as const,
  portalAnswers: (token: string) => [...surveyKeys.all(), 'portal', 'answers', token] as const,
}
