import type { SurveyListFilters } from '@/features/surveys/types'

export const surveyKeys = {
  all: () => ['surveys'] as const,
  list: (filters: SurveyListFilters) => [...surveyKeys.all(), 'list', filters] as const,
  detail: (id: string) => [...surveyKeys.all(), 'detail', id] as const,
  results: (id: string) => [...surveyKeys.all(), 'results', id] as const,
}
