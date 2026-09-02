import { useQueries } from '@tanstack/react-query'
import {
  fetchFormSelections,
  listSelectableForms,
} from '@/features/care-pathway/api/form-selection.api'
import { carePathwayKeys } from '@/features/care-pathway/keys'
import { fetchAcceptedCarePlans } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'

const STALE_TIME = 30_000

/**
 * Fetches all data needed by ServiceUserCarePlanPage in parallel:
 * - the company's active form selection group
 * - the full catalogue of available care-plan forms
 * - care plans accepted via initial assessment for this service user
 */
export function useServiceUserCarePlan(serviceUserId: string) {
  const [formSelections, carePlanCatalogue, acceptedCarePlans] = useQueries({
    queries: [
      {
        queryKey: carePathwayKeys.formSelections(),
        queryFn: fetchFormSelections,
        staleTime: STALE_TIME,
      },
      {
        // API default is 20; 29 published CARE_PLAN templates exist. Match Form Builder.
        queryKey: carePathwayKeys.selectableForms('care-plans', { limit: 100 }),
        queryFn: () => listSelectableForms('care-plans', { limit: 100 }),
        staleTime: STALE_TIME,
      },
      {
        queryKey: initialAssessmentKeys.acceptedCarePlans(serviceUserId),
        queryFn: () => fetchAcceptedCarePlans(serviceUserId),
        enabled: Boolean(serviceUserId),
        staleTime: STALE_TIME,
      },
    ],
  })

  return { formSelections, carePlanCatalogue, acceptedCarePlans }
}
