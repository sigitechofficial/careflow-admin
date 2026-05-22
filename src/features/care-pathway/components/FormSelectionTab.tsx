import * as React from 'react'
import { ApiError } from '@/lib/api-client'
import {
  fetchFormSelections,
  listSelectableForms,
  updateFormSelections,
  type FormSelectionGroup,
} from '../api/form-selection.api'
import type { CarePathwayFormType } from '../types/care-pathway.types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/toggle-controls'
import { useAuthStore } from '@/store/auth.store'
import { toastError, toastSuccess } from '@/lib/toast'

type GroupKey = keyof FormSelectionGroup

const GROUPS: { key: GroupKey; label: string; type: CarePathwayFormType; listPath: 'care-plans' | 'assessments' | 'service-forms' | 'staff-forms' }[] = [
  { key: 'carePlans', label: 'Care plans', type: 'CARE_PLAN', listPath: 'care-plans' },
  { key: 'assessments', label: 'Assessments', type: 'ASSESSMENT', listPath: 'assessments' },
  { key: 'serviceForms', label: 'Service forms', type: 'SERVICE_FORM', listPath: 'service-forms' },
  { key: 'staffForms', label: 'Staff forms', type: 'STAFF_FORM', listPath: 'staff-forms' },
]

export function FormSelectionTab() {
  const canUpdate = useAuthStore(s => s.can('form_selection.update'))
  const [selections, setSelections] = React.useState<FormSelectionGroup | null>(null)
  const [available, setAvailable] = React.useState<Record<GroupKey, { id: string; name: string }[]>>({
    carePlans: [],
    assessments: [],
    serviceForms: [],
    staffForms: [],
  })
  const [picked, setPicked] = React.useState<Record<GroupKey, Set<string>>>({
    carePlans: new Set(),
    assessments: new Set(),
    serviceForms: new Set(),
    staffForms: new Set(),
  })
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [sel, ...lists] = await Promise.all([
        fetchFormSelections(),
        ...GROUPS.map(g => listSelectableForms(g.listPath, { limit: 100 })),
      ])
      setSelections(sel)
      const avail: Record<GroupKey, { id: string; name: string }[]> = {
        carePlans: lists[0].map(f => ({ id: f.id, name: f.name })),
        assessments: lists[1].map(f => ({ id: f.id, name: f.name })),
        serviceForms: lists[2].map(f => ({ id: f.id, name: f.name })),
        staffForms: lists[3].map(f => ({ id: f.id, name: f.name })),
      }
      setAvailable(avail)
      setPicked({
        carePlans: new Set(sel.carePlans.map(s => s.formId)),
        assessments: new Set(sel.assessments.map(s => s.formId)),
        serviceForms: new Set(sel.serviceForms.map(s => s.formId)),
        staffForms: new Set(sel.staffForms.map(s => s.formId)),
      })
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Could not load form selection.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const toggle = (key: GroupKey, formId: string, checked: boolean) => {
    setPicked(prev => {
      const next = new Set(prev[key])
      if (checked) next.add(formId)
      else next.delete(formId)
      return { ...prev, [key]: next }
    })
  }

  const onSave = async () => {
    if (!canUpdate) return
    setSaving(true)
    try {
      await updateFormSelections({
        carePlans: [...picked.carePlans],
        assessments: [...picked.assessments],
        serviceForms: [...picked.serviceForms],
        staffForms: [...picked.staffForms],
      })
      toastSuccess('Default forms updated.')
      await load()
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
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
        <Button type="button" onClick={() => void onSave()} disabled={saving}>
          Save selections
        </Button>
      )}
      {selections && !canUpdate && (
        <p className="text-xs text-muted-foreground">You have read-only access to form selection.</p>
      )}
    </div>
  )
}
