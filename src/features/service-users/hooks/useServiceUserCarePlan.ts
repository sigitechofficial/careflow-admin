import { useQueries } from '@tanstack/react-query'
import {
  fetchFormSelections,
  listSelectableForms,
} from '@/features/care-pathway/api/form-selection.api'
import { carePathwayKeys } from '@/features/care-pathway/keys'

const STALE_TIME = 30_000

/**
 * Fetches all data needed by ServiceUserCarePlanPage in parallel:
 * - the company's active form selection group
 * - the full catalogue of available care-plan forms
 */
export function useServiceUserCarePlan(_serviceUserId: string) {
  const [formSelections, carePlanCatalogue] = useQueries({
    queries: [
      {
        queryKey: carePathwayKeys.formSelections(),
        queryFn: fetchFormSelections,
        staleTime: STALE_TIME,
      },
      {
        queryKey: carePathwayKeys.selectableForms('care-plans'),
        queryFn: () => listSelectableForms('care-plans'),
        staleTime: STALE_TIME,
      },
    ],
  })

  return { formSelections, carePlanCatalogue }
}
