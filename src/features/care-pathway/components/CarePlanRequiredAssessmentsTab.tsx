import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import {
  useCarePlanRequiredAssessments,
  useSelectableForms,
} from '@/features/care-pathway/hooks/useCarePathwayTabs'
import { useUpdateCarePlanRequiredAssessments } from '@/features/care-pathway/hooks/useCarePathwayMutations'
import { MultiSelect } from '@/shared/ui/multi-select'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

/**
 * Care pathway settings: which assessment forms each care plan form requires. After an Initial
 * Assessment, the assessments required by its recommended care plans are listed for the assessor.
 */
export function CarePlanRequiredAssessmentsTab() {
  const canUpdate = useAuthStore((s) => s.can('form_selection.update'))
  const carePlansQuery = useSelectableForms('care-plans', { limit: 100 })
  const assessmentsQuery = useSelectableForms('assessments', { limit: 100 })
  const requiredQuery = useCarePlanRequiredAssessments()
  const update = useUpdateCarePlanRequiredAssessments()
  const [savingId, setSavingId] = React.useState<string | null>(null)

  const requiredByCarePlan = React.useMemo(
    () => new Map((requiredQuery.data ?? []).map((r) => [r.carePlanFormId, r.assessmentFormIds] as const)),
    [requiredQuery.data],
  )
  const assessmentOptions = React.useMemo(
    () => (assessmentsQuery.data ?? []).map((f) => ({ value: f.id, label: f.name })),
    [assessmentsQuery.data],
  )
  const carePlans = carePlansQuery.data ?? []

  const save = (carePlanFormId: string, assessmentFormIds: string[]) => {
    setSavingId(carePlanFormId)
    update.mutate(
      { carePlanFormId, assessmentFormIds },
      {
        onSuccess: () => toastSuccess('Saved', 'Required assessments updated.'),
        onError: (err) => toastApiError(err, 'Could not save required assessments'),
        onSettled: () => setSavingId(null),
      },
    )
  }

  const loading = carePlansQuery.isLoading || assessmentsQuery.isLoading || requiredQuery.isLoading

  return (
    <div className="space-y-4" data-testid="care-plan-required-assessments-tab">
      <div>
        <h2 className="text-base font-semibold">Required assessments per care plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the assessments that must be completed whenever a care plan is recommended. After an Initial
          Assessment is submitted, the assessor sees the assessments required by its recommended care plans and
          which of them the service user has already had.
        </p>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : assessmentOptions.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          There are no assessment forms yet. Create one in the Form Builder first.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-1/3 px-3 py-2">Care plan</th>
                <th className="px-3 py-2">Required assessments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {carePlans.map((carePlan) => {
                const value = requiredByCarePlan.get(carePlan.id) ?? []
                return (
                  <tr key={carePlan.id} data-testid={`required-assessments-row-${carePlan.id}`}>
                    <td className="px-3 py-2 align-top font-medium">{carePlan.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <MultiSelect
                          className="min-w-0 flex-1"
                          options={assessmentOptions}
                          value={value}
                          onChange={(next) => save(carePlan.id, next)}
                          placeholder="None required"
                          searchPlaceholder="Search assessments…"
                          disabled={!canUpdate || savingId === carePlan.id}
                        />
                        {savingId === carePlan.id ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {!canUpdate ? (
        <p className="text-xs text-muted-foreground">You can view these settings but not change them.</p>
      ) : null}
    </div>
  )
}
