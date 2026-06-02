import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import type { FormSelectionGroup } from '@/features/care-pathway/types/care-pathway.types'
import type { CarePathwayFormType } from '@/features/care-pathway/types/care-pathway.types'
import { useUpdateFormSelections } from '@/features/care-pathway/hooks/useCarePathwayMutations'
import {
  useFormSelections,
  useSelectableForms,
} from '@/features/care-pathway/hooks/useCarePathwayTabs'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { useAuthStore } from '@/features/auth/store'
import { toastError, toastSuccess } from '@/shared/lib/toast'

type GroupKey = keyof FormSelectionGroup

const GROUPS: {
  key: GroupKey
  label: string
  type: CarePathwayFormType
  listPath: 'care-plans' | 'assessments' | 'service-forms' | 'staff-forms'
}[] = [
  { key: 'carePlans', label: 'Care plans', type: 'CARE_PLAN', listPath: 'care-plans' },
  { key: 'assessments', label: 'Assessments', type: 'ASSESSMENT', listPath: 'assessments' },
  { key: 'serviceForms', label: 'Service forms', type: 'SERVICE_FORM', listPath: 'service-forms' },
  { key: 'staffForms', label: 'Staff forms', type: 'STAFF_FORM', listPath: 'staff-forms' },
]

function pickedFromSelections(sel: FormSelectionGroup): Record<GroupKey, Set<string>> {
  return {
    carePlans: new Set(sel.carePlans.map(s => s.formId)),
    assessments: new Set(sel.assessments.map(s => s.formId)),
    serviceForms: new Set(sel.serviceForms.map(s => s.formId)),
    staffForms: new Set(sel.staffForms.map(s => s.formId)),
  }
}

export function FormSelectionTab() {
  const canUpdate = useAuthStore(s => s.can('form_selection.update'))
  const selectionsQuery = useFormSelections()
  const carePlansQuery = useSelectableForms('care-plans', { limit: 100 })
  const assessmentsQuery = useSelectableForms('assessments', { limit: 100 })
  const serviceFormsQuery = useSelectableForms('service-forms', { limit: 100 })
  const staffFormsQuery = useSelectableForms('staff-forms', { limit: 100 })
  const updateMutation = useUpdateFormSelections()

  const [picked, setPicked] = React.useState<Record<GroupKey, Set<string>>>({
    carePlans: new Set(),
    assessments: new Set(),
    serviceForms: new Set(),
    staffForms: new Set(),
  })
  const [dirty, setDirty] = React.useState(false)

  const loading =
    selectionsQuery.isLoading ||
    carePlansQuery.isLoading ||
    assessmentsQuery.isLoading ||
    serviceFormsQuery.isLoading ||
    staffFormsQuery.isLoading

  const available: Record<GroupKey, { id: string; name: string }[]> = {
    carePlans: (carePlansQuery.data ?? []).map(f => ({ id: f.id, name: f.name })),
    assessments: (assessmentsQuery.data ?? []).map(f => ({ id: f.id, name: f.name })),
    serviceForms: (serviceFormsQuery.data ?? []).map(f => ({ id: f.id, name: f.name })),
    staffForms: (staffFormsQuery.data ?? []).map(f => ({ id: f.id, name: f.name })),
  }

  React.useEffect(() => {
    if (selectionsQuery.data && !dirty) {
      setPicked(pickedFromSelections(selectionsQuery.data))
    }
  }, [selectionsQuery.data, dirty])

  const toggle = (key: GroupKey, formId: string, checked: boolean) => {
    setDirty(true)
    setPicked(prev => {
      const next = new Set(prev[key])
      if (checked) next.add(formId)
      else next.delete(formId)
      return { ...prev, [key]: next }
    })
  }

  const onSave = async () => {
    if (!canUpdate) return
    try {
      await updateMutation.mutateAsync({
        carePlans: [...picked.carePlans],
        assessments: [...picked.assessments],
        serviceForms: [...picked.serviceForms],
        staffForms: [...picked.staffForms],
      })
      setDirty(false)
      toastSuccess('Default forms updated.')
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading form selection…</p>
  }

  return (
    <div className="space-y-6" data-testid="form-selection-tab">
      <div>
        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400">Form Selection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which published forms your organisation uses. If none are selected, standard forms apply.
        </p>
      </div>

      {GROUPS.map(g => (
        <section key={g.key} className="space-y-2 rounded-lg border border-border p-4">
          <h3 className="font-medium">{g.label}</h3>
          {available[g.key].length === 0 ? (
            <p className="text-sm text-muted-foreground">No published forms available.</p>
          ) : (
            <ul className="space-y-2">
              {available[g.key].map(form => (
                <li key={form.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={picked[g.key].has(form.id)}
                    onCheckedChange={v => toggle(g.key, form.id, v === true)}
                    disabled={!canUpdate}
                  />
                  <span>{form.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {canUpdate && (
        <Button type="button" onClick={() => void onSave()} disabled={updateMutation.isPending}>
          Save selections
        </Button>
      )}
      {selectionsQuery.data && !canUpdate && (
        <p className="text-xs text-muted-foreground">You have read-only access to form selection.</p>
      )}
    </div>
  )
}
