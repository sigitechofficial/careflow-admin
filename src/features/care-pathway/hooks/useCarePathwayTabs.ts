import { useQuery } from '@tanstack/react-query'
import { listCarePlanTextCategories, listCarePlanTextTemplates } from '@/features/care-pathway/api/care-plan-text.api'
import { listCareForms, getCareForm } from '@/features/care-pathway/api/form-builder.api'
import {
  fetchCarePlanRequiredAssessments,
  fetchFormSelections,
  listSelectableForms,
} from '@/features/care-pathway/api/form-selection.api'
import { listPathwayActions, listPathwayChecklistsBrief } from '@/features/care-pathway/api/pathway-actions.api'
import { listPathwayChecklists } from '@/features/care-pathway/api/pathway-checklists.api'
import { listCarePictures } from '@/features/care-pathway/api/picture-gallery.api'
import { carePathwayKeys } from '@/features/care-pathway/keys'
import type { CarePathwayFormType } from '@/features/care-pathway/types/care-pathway.types'

const STALE_TIME = 30_000

export function useCareForms(
  params?: {
    page?: number
    limit?: number
    search?: string
    formType?: CarePathwayFormType
  },
  enabled = true,
) {
  return useQuery({
    queryKey: carePathwayKeys.forms(params),
    queryFn: () => listCareForms(params),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useCareForm(id: string, enabled = true) {
  return useQuery({
    queryKey: carePathwayKeys.formDetail(id),
    queryFn: () => getCareForm(id),
    enabled: !!id && enabled,
    staleTime: STALE_TIME,
  })
}

export function useFormSelections(enabled = true) {
  return useQuery({
    queryKey: carePathwayKeys.formSelections(),
    queryFn: () => fetchFormSelections(),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useCarePlanRequiredAssessments(enabled = true) {
  return useQuery({
    queryKey: carePathwayKeys.carePlanRequiredAssessments(),
    queryFn: () => fetchCarePlanRequiredAssessments(),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useSelectableForms(
  listPath: 'care-plans' | 'assessments' | 'service-forms' | 'staff-forms',
  params?: { search?: string; limit?: number; page?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: carePathwayKeys.selectableForms(listPath, params),
    queryFn: () => listSelectableForms(listPath, params),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useCarePlanTextTemplates(
  params?: { search?: string; categoryId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: carePathwayKeys.carePlanText(params),
    queryFn: () => listCarePlanTextTemplates(params),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useCarePlanTextCategories(enabled = true) {
  return useQuery({
    queryKey: carePathwayKeys.carePlanTextCategories(),
    queryFn: () => listCarePlanTextCategories(),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function usePathwayChecklists(
  params?: { page?: number; limit?: number; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: carePathwayKeys.checklists(params),
    queryFn: () => listPathwayChecklists(params),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function usePathwayActions(
  params?: { page?: number; limit?: number; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: carePathwayKeys.actions(params),
    queryFn: () => listPathwayActions(params),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function usePathwayChecklistsBrief(enabled = true) {
  return useQuery({
    queryKey: [...carePathwayKeys.all(), 'checklists-brief'] as const,
    queryFn: () => listPathwayChecklistsBrief(),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useCarePictures(
  params?: { type?: 'standard' | 'uploaded'; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: carePathwayKeys.gallery(params),
    queryFn: () => listCarePictures(params),
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useStandardCarePictures(enabled = true) {
  return useCarePictures({ type: 'standard' }, enabled)
}
