import type { QueryClient } from '@tanstack/react-query'
import { fetchCarePathwayOverview } from '@/features/care-pathway/api/care-pathway.api'
import { listCarePlanTextTemplates } from '@/features/care-pathway/api/care-plan-text.api'
import { listCareForms } from '@/features/care-pathway/api/form-builder.api'
import { fetchFormSelections, listSelectableForms } from '@/features/care-pathway/api/form-selection.api'
import { listPathwayActions } from '@/features/care-pathway/api/pathway-actions.api'
import { listPathwayChecklists } from '@/features/care-pathway/api/pathway-checklists.api'
import { listCarePictures } from '@/features/care-pathway/api/picture-gallery.api'
import { carePathwayKeys } from '@/features/care-pathway/keys'
import type { CarePathwayTabId } from '@/features/settings/care-pathway/care-pathway.types'

const STALE_TIME = 30_000

const SELECTABLE_FORM_PATHS = [
  'care-plans',
  'assessments',
  'service-forms',
  'staff-forms',
] as const

export function prefetchCarePathwayTab(qc: QueryClient, tab: CarePathwayTabId = 'wizard') {
  switch (tab) {
    case 'wizard':
      void qc.prefetchQuery({
        queryKey: carePathwayKeys.overview(),
        queryFn: () => fetchCarePathwayOverview(),
        staleTime: STALE_TIME,
      })
      break
    case 'form-builder':
      void qc.prefetchQuery({
        queryKey: carePathwayKeys.forms({ limit: 50 }),
        queryFn: () => listCareForms({ limit: 50 }),
        staleTime: STALE_TIME,
      })
      break
    case 'form-selection':
      void qc.prefetchQuery({
        queryKey: carePathwayKeys.formSelections(),
        queryFn: () => fetchFormSelections(),
        staleTime: STALE_TIME,
      })
      for (const listPath of SELECTABLE_FORM_PATHS) {
        void qc.prefetchQuery({
          queryKey: carePathwayKeys.selectableForms(listPath, { limit: 100 }),
          queryFn: () => listSelectableForms(listPath, { limit: 100 }),
          staleTime: STALE_TIME,
        })
      }
      break
    case 'care-plan-text':
      void qc.prefetchQuery({
        queryKey: carePathwayKeys.carePlanText(),
        queryFn: () => listCarePlanTextTemplates(),
        staleTime: STALE_TIME,
      })
      break
    case 'checklists':
      void qc.prefetchQuery({
        queryKey: carePathwayKeys.checklists({ limit: 100 }),
        queryFn: () => listPathwayChecklists({ limit: 100 }),
        staleTime: STALE_TIME,
      })
      break
    case 'actions':
      void qc.prefetchQuery({
        queryKey: carePathwayKeys.actions({ limit: 100 }),
        queryFn: () => listPathwayActions({ limit: 100 }),
        staleTime: STALE_TIME,
      })
      break
    case 'gallery':
      void qc.prefetchQuery({
        queryKey: carePathwayKeys.gallery({ type: 'standard' }),
        queryFn: () => listCarePictures({ type: 'standard' }),
        staleTime: STALE_TIME,
      })
      void qc.prefetchQuery({
        queryKey: carePathwayKeys.gallery({ type: 'uploaded' }),
        queryFn: () => listCarePictures({ type: 'uploaded' }),
        staleTime: STALE_TIME,
      })
      break
  }
}
