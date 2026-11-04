import type { CarePathwayFormType } from '@/features/care-pathway/types/care-pathway.types'

export const carePathwayKeys = {
  all: () => ['care-pathway'] as const,

  overview: () => [...carePathwayKeys.all(), 'overview'] as const,

  forms: (params?: {
    page?: number
    limit?: number
    search?: string
    formType?: CarePathwayFormType
  }) => [...carePathwayKeys.all(), 'forms', params ?? {}] as const,

  formSelections: () => [...carePathwayKeys.all(), 'form-selections'] as const,

  carePlanRequiredAssessments: () => [...carePathwayKeys.all(), 'care-plan-required-assessments'] as const,

  selectableForms: (
    listPath: 'care-plans' | 'assessments' | 'service-forms' | 'staff-forms',
    params?: { search?: string; limit?: number; page?: number },
  ) => [...carePathwayKeys.all(), 'selectable-forms', listPath, params ?? {}] as const,

  carePlanText: (params?: { search?: string; categoryId?: string }) =>
    [...carePathwayKeys.all(), 'care-plan-text', params ?? {}] as const,

  checklists: (params?: { page?: number; limit?: number; search?: string }) =>
    [...carePathwayKeys.all(), 'checklists', params ?? {}] as const,

  actions: (params?: { page?: number; limit?: number; search?: string }) =>
    [...carePathwayKeys.all(), 'actions', params ?? {}] as const,

  gallery: (params?: { type?: 'standard' | 'uploaded'; search?: string }) =>
    [...carePathwayKeys.all(), 'gallery', params ?? {}] as const,

  formDetail: (id: string) => [...carePathwayKeys.all(), 'form-detail', id] as const,

  carePlanTextCategories: () => [...carePathwayKeys.all(), 'care-plan-text-categories'] as const,
} as const
