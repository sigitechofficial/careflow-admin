import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  createCarePlanRecommendationRule,
  deleteCarePlanRecommendationRule,
  listAssessmentFieldKeys,
  listCarePlanFormsForRules,
  listCarePlanRecommendationRules,
  updateCarePlanRecommendationRule,
  type CarePlanRuleCondition,
  type CarePlanRuleConditionWhen,
} from '@/features/care-pathway/api/care-plan-recommendation-rules.api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

const WHEN_OPTIONS: { value: CarePlanRuleConditionWhen; label: string }[] = [
  { value: 'yes', label: 'Yes / positive' },
  { value: 'no', label: 'No' },
  { value: 'answered', label: 'Answered (any value)' },
  { value: 'not_answered', label: 'Not answered' },
  { value: 'select_equals', label: 'Select equals value' },
  { value: 'text_contains', label: 'Text contains' },
]

const emptyCondition = (): CarePlanRuleCondition => ({ fieldKey: '', when: 'yes' })

function patchCondition(
  list: CarePlanRuleCondition[],
  idx: number,
  patch: Partial<CarePlanRuleCondition>,
): CarePlanRuleCondition[] {
  const next = [...list]
  const prev = next[idx]
  if (!prev) return next
  next[idx] = { ...prev, ...patch }
  return next
}

export function InitialAssessmentCarePlanTriggersTab() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formId, setFormId] = React.useState('')
  const [label, setLabel] = React.useState('')
  const [matchMode, setMatchMode] = React.useState<'ANY' | 'ALL'>('ANY')
  const [suppressLegacyArea, setSuppressLegacyArea] = React.useState('')
  const [conditions, setConditions] = React.useState<CarePlanRuleCondition[]>([emptyCondition()])

  const rulesQuery = useQuery({
    queryKey: ['ia-care-plan-rules'],
    queryFn: listCarePlanRecommendationRules,
  })

  const formsQuery = useQuery({
    queryKey: ['ia-care-plan-rules', 'care-plans'],
    queryFn: listCarePlanFormsForRules,
  })

  const fieldKeysQuery = useQuery({
    queryKey: ['ia-field-keys'],
    queryFn: () => listAssessmentFieldKeys(),
  })

  const resetForm = () => {
    setEditingId(null)
    setFormId('')
    setLabel('')
    setMatchMode('ANY')
    setSuppressLegacyArea('')
    setConditions([emptyCondition()])
  }

  const loadRule = (rule: NonNullable<typeof rulesQuery.data>[number]) => {
    setEditingId(rule.id)
    setFormId(rule.carePathwayFormId)
    setLabel(rule.label ?? '')
    setMatchMode(rule.matchMode)
    setSuppressLegacyArea(rule.suppressLegacyArea ?? '')
    setConditions(rule.conditions.length ? rule.conditions : [emptyCondition()])
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        carePathwayFormId: formId,
        label: label.trim() || undefined,
        matchMode,
        conditions: conditions.filter((c) => c.fieldKey?.trim() || c.specRef?.trim() || c.questionTextContains?.trim()),
        suppressLegacyArea: suppressLegacyArea.trim() || undefined,
      }
      if (payload.conditions.length === 0) {
        throw new Error('Add at least one condition')
      }
      if (editingId) return updateCarePlanRecommendationRule(editingId, payload)
      return createCarePlanRecommendationRule(payload)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ia-care-plan-rules'] })
      toastSuccess('Saved', 'Care plan trigger rule saved.')
      resetForm()
    },
    onError: (e) => toastApiError(e, 'Could not save rule'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCarePlanRecommendationRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ia-care-plan-rules'] })
      toastSuccess('Deleted', 'Rule removed.')
      if (editingId) resetForm()
    },
    onError: (e) => toastApiError(e, 'Could not delete rule'),
  })

  const fieldOptions = fieldKeysQuery.data ?? []
  const carePlans = formsQuery.data ?? []
  const rules = rulesQuery.data ?? []

  return (
    <div className="space-y-6" data-testid="ia-care-plan-triggers-tab">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Initial assessment → care plan triggers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Link a predefined care plan to assessment answers. When a service user&apos;s assessment matches,
          the plan appears under Recommendations on submit — no re-seed required when you add new plans.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4 space-y-4">
          <h3 className="text-sm font-semibold">{editingId ? 'Edit rule' : 'New rule'}</h3>

          <div className="space-y-2">
            <Label>Care plan</Label>
            {formsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading care plans…</p>
            ) : formsQuery.isError ? (
              <p className="text-sm text-destructive">
                Could not load care plans. Check you are logged in and the API is running.
              </p>
            ) : carePlans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No care plans found. Add care plans in{' '}
                <strong>Care Pathway → Form Builder</strong> (type: Care plan), then refresh this page.
              </p>
            ) : (
              <Select value={formId} onValueChange={setFormId} disabled={Boolean(editingId)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select care plan" />
                </SelectTrigger>
                <SelectContent>
                  {carePlans.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Display label (optional)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Medication support — recommended" />
          </div>

          <div className="space-y-2">
            <Label>Match mode</Label>
            <Select value={matchMode} onValueChange={(v) => setMatchMode(v as 'ANY' | 'ALL')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any condition (OR)</SelectItem>
                <SelectItem value="ALL">All conditions (AND)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Suppress legacy area (optional)</Label>
            <Input
              value={suppressLegacyArea}
              onChange={(e) => setSuppressLegacyArea(e.target.value)}
              placeholder="e.g. Medication — hides old area-based card"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Conditions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConditions((c) => [...c, emptyCondition()])}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
            {conditions.map((cond, idx) => (
              <div key={idx} className="rounded-lg border border-border/80 p-3 space-y-2">
                <Select
                  value={cond.fieldKey ?? ''}
                  onValueChange={(v) => {
                    const opt = fieldOptions.find((o) => o.fieldKey === v)
                    const prev = conditions[idx]
                    setConditions(
                      patchCondition(conditions, idx, {
                        fieldKey: v,
                        specRef: opt?.specRef ?? prev?.specRef,
                      }),
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assessment field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions
                      .filter((o) => o.fieldKey)
                      .map((o) => (
                        <SelectItem key={o.questionId} value={o.fieldKey!}>
                          §{o.sectionNumber} {o.fieldKey} — {o.questionText.slice(0, 48)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or specRef (e.g. 9.6)"
                  value={cond.specRef ?? ''}
                  onChange={(e) => {
                    setConditions(patchCondition(conditions, idx, { specRef: e.target.value }))
                  }}
                />
                <Input
                  placeholder="Question text contains (optional)"
                  value={cond.questionTextContains ?? ''}
                  onChange={(e) => {
                    setConditions(
                      patchCondition(conditions, idx, { questionTextContains: e.target.value }),
                    )
                  }}
                />
                <Select
                  value={cond.when}
                  onValueChange={(v) => {
                    setConditions(
                      patchCondition(conditions, idx, { when: v as CarePlanRuleConditionWhen }),
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WHEN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(cond.when === 'select_equals' || cond.when === 'text_contains') && (
                  <Input
                    placeholder="Value"
                    value={cond.value ?? ''}
                    onChange={(e) => {
                      setConditions(patchCondition(conditions, idx, { value: e.target.value }))
                    }}
                  />
                )}
                {conditions.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setConditions((c) => c.filter((_, i) => i !== idx))}
                  >
                    Remove condition
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!formId || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {editingId ? 'Update rule' : 'Create rule'}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Active rules ({rules.length})</h3>
          {rulesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules yet. Create one to link a care plan to assessment answers.</p>
          ) : (
            <ul className="space-y-3">
              {rules.map((rule) => (
                <li key={rule.id} className="rounded-lg border border-border/80 p-3 text-sm">
                  <div className="font-medium">{rule.form?.name ?? 'Care plan'}</div>
                  <div className="text-muted-foreground mt-0.5">
                    {rule.matchMode} · {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
                    {rule.suppressLegacyArea ? ` · suppress “${rule.suppressLegacyArea}”` : ''}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => loadRule(rule)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
