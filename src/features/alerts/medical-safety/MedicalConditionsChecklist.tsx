import * as React from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/misc'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { cn } from '@/shared/lib/utils'
import type { MedicalConditionCatalogRow } from '@/features/alerts/api/medical-clinical.types'
import {
  useMedicalConditionCatalog,
  useMedicalConditionMutations,
  useMedicalClinicalPermissions,
  useServiceUserMedicalConditions,
} from '@/features/alerts/hooks/useMedicalClinical'
import { ClinicalBand } from '@/features/alerts/medical-safety/ClinicalRecordPrimitives'
import { CONDITION_CARE_PLAN_HINTS } from '@/features/alerts/medical-safety/suggest-conditions-from-ia'

export type ConditionsChecklistHandle = {
  isDirty: boolean
  save: () => Promise<boolean>
  cancel: () => void
}

export const MedicalConditionsChecklist = React.forwardRef<
  ConditionsChecklistHandle,
  {
    serviceUserId: string
    onDirtyChange?: (dirty: boolean) => void
    /** Catalogue codes suggested from IA / legal evidence (not yet saved). */
    suggestedCodes?: string[]
  }
>(function MedicalConditionsChecklist(
  { serviceUserId, onDirtyChange, suggestedCodes = [] },
  ref,
) {
  const perms = useMedicalClinicalPermissions().conditions
  const catalogQuery = useMedicalConditionCatalog('', perms.read)
  const assignedQuery = useServiceUserMedicalConditions(serviceUserId, perms.read)
  const mutations = useMedicalConditionMutations(serviceUserId)

  const catalog = React.useMemo(
    () =>
      (catalogQuery.data ?? [])
        .filter((c) => c.isActive)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [catalogQuery.data],
  )

  const codeToId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const c of catalog) map.set(c.code.toUpperCase(), c.id)
    return map
  }, [catalog])

  const assignedActive = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const row of assignedQuery.data ?? []) {
      if (row.status === 'ACTIVE') map.set(row.conditionId, row.id)
    }
    return map
  }, [assignedQuery.data])

  const [draft, setDraft] = React.useState<Set<string>>(new Set())
  /** Condition IDs that were applied from IA suggestions (for source provenance on create). */
  const [iaOriginIds, setIaOriginIds] = React.useState<Set<string>>(new Set())
  const [synced, setSynced] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (assignedQuery.isLoading || catalogQuery.isLoading) return
    setDraft(new Set(assignedActive.keys()))
    setIaOriginIds(new Set())
    setSynced(true)
  }, [assignedActive, assignedQuery.isLoading, catalogQuery.isLoading, serviceUserId])

  const baseline = React.useMemo(() => new Set(assignedActive.keys()), [assignedActive])
  const dirty =
    synced &&
    (draft.size !== baseline.size || [...draft].some((id) => !baseline.has(id)))

  React.useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  const suggestedIdSet = React.useMemo(() => {
    const ids = new Set<string>()
    for (const code of suggestedCodes) {
      const id = codeToId.get(code.toUpperCase())
      if (id && !baseline.has(id)) ids.add(id)
    }
    return ids
  }, [baseline, codeToId, suggestedCodes])

  const pendingSuggestionCount = [...suggestedIdSet].filter((id) => !draft.has(id)).length

  const toggle = (conditionId: string) => {
    if (!perms.create && !perms.delete) return
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(conditionId)) {
        if (perms.delete || (perms.update && baseline.has(conditionId))) next.delete(conditionId)
        setIaOriginIds((origins) => {
          const o = new Set(origins)
          o.delete(conditionId)
          return o
        })
      } else if (perms.create || (perms.update && !baseline.has(conditionId))) {
        next.add(conditionId)
        if (suggestedIdSet.has(conditionId)) {
          setIaOriginIds((origins) => new Set(origins).add(conditionId))
        }
      }
      return next
    })
  }

  const applyAllSuggestions = () => {
    if (!perms.create && !perms.update) return
    setDraft((prev) => {
      const next = new Set(prev)
      for (const id of suggestedIdSet) next.add(id)
      return next
    })
    setIaOriginIds((prev) => {
      const next = new Set(prev)
      for (const id of suggestedIdSet) next.add(id)
      return next
    })
  }

  const cancel = React.useCallback(() => {
    setDraft(new Set(baseline))
    setIaOriginIds(new Set())
  }, [baseline])

  const save = React.useCallback(async () => {
    if (!dirty) return true
    setSaving(true)
    try {
      const toAdd = [...draft].filter((id) => !baseline.has(id))
      const toRemove = [...baseline].filter((id) => !draft.has(id))
      const addedCodes: string[] = []
      for (const conditionId of toAdd) {
        const cat = catalog.find((c) => c.id === conditionId)
        if (cat) addedCodes.push(cat.code)
        await mutations.create.mutateAsync({
          conditionId,
          source: iaOriginIds.has(conditionId) ? 'INITIAL_ASSESSMENT' : 'MANUAL',
        })
      }
      for (const conditionId of toRemove) {
        const recordId = assignedActive.get(conditionId)
        if (recordId) await mutations.discontinue.mutateAsync(recordId)
      }
      const planHints = [
        ...new Set(
          addedCodes
            .map((code) => CONDITION_CARE_PLAN_HINTS[code.toUpperCase()])
            .filter((v): v is string => Boolean(v)),
        ),
      ]
      if (planHints.length) {
        toastSuccess(
          `Medical conditions saved. Care Plan recommendations updated for: ${planHints.join(', ')}.`,
        )
      } else {
        toastSuccess('Medical conditions saved')
      }
      setIaOriginIds(new Set())
      return true
    } catch (err) {
      toastApiError(err, 'Could not save medical conditions')
      return false
    } finally {
      setSaving(false)
    }
  }, [
    assignedActive,
    baseline,
    catalog,
    dirty,
    draft,
    iaOriginIds,
    mutations.create,
    mutations.discontinue,
  ])

  React.useImperativeHandle(ref, () => ({ isDirty: dirty, save, cancel }), [dirty, save, cancel])

  if (!perms.read) {
    return (
      <ClinicalBand title="Medical Conditions" testId="medical-conditions-checklist">
        <p className="text-sm text-slate-600">You do not have permission to view medical conditions.</p>
      </ClinicalBand>
    )
  }

  return (
    <ClinicalBand
      title="Medical Conditions"
      testId="medical-conditions-checklist"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {pendingSuggestionCount > 0 && (perms.create || perms.update) ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 rounded-none bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
              data-testid="medical-conditions-apply-suggestions"
              disabled={saving}
              onClick={applyAllSuggestions}
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Apply {pendingSuggestionCount} IA suggestion
              {pendingSuggestionCount === 1 ? '' : 's'}
            </Button>
          ) : null}
          {saving ? (
            <span className="inline-flex items-center gap-1 text-xs text-white/90">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </span>
          ) : dirty ? (
            <span className="text-xs text-amber-100">Unsaved changes</span>
          ) : null}
          {(perms.create || perms.update || perms.delete) && (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 rounded-none bg-white/15 text-white hover:bg-white/25"
                disabled={!dirty || saving}
                onClick={cancel}
                data-testid="medical-conditions-cancel"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 rounded-none bg-white text-[#0f6b6b] hover:bg-white"
                disabled={!dirty || saving}
                onClick={() => void save()}
                data-testid="medical-conditions-save"
              >
                {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Save
              </Button>
            </>
          )}
        </div>
      }
    >
      {catalogQuery.isLoading || assignedQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : catalogQuery.isError || assignedQuery.isError ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">Unable to load medical conditions</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
            onClick={() => {
              void catalogQuery.refetch()
              void assignedQuery.refetch()
            }}
          >
            Retry
          </Button>
        </div>
      ) : catalog.length === 0 ? (
        <p className="text-sm text-slate-600">No conditions in the catalogue.</p>
      ) : (
        <>
          {suggestedIdSet.size > 0 ? (
            <p
              className="mb-2 rounded-xl border border-emerald-200/70 bg-[#f0faf5] px-3 py-2 text-xs text-emerald-900"
              data-testid="medical-conditions-ia-banner"
            >
              <Sparkles className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
              Initial Assessment suggests {suggestedIdSet.size} condition
              {suggestedIdSet.size === 1 ? '' : 's'} (highlighted). Tick to confirm, then use{' '}
              <span className="font-semibold">Save</span> in this section header — this does not
              change the IA record.
            </p>
          ) : null}
          <div
            className="grid grid-cols-1 gap-x-5 border border-slate-300 bg-white px-2.5 py-0.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [grid-auto-rows:1.75rem]"
            data-testid="medical-conditions-grid"
          >
            {catalog.map((c: MedicalConditionCatalogRow) => {
              const checked = draft.has(c.id)
              const suggested = suggestedIdSet.has(c.id)
              const canToggle =
                (checked && (perms.delete || perms.update)) ||
                (!checked && (perms.create || perms.update))
              return (
                <label
                  key={c.id}
                  className={cn(
                    'flex h-full min-h-0 items-center gap-2 text-xs leading-none',
                    suggested && !baseline.has(c.id)
                      ? 'rounded-sm bg-emerald-50/80 px-1 font-medium text-emerald-950'
                      : checked
                        ? 'font-medium text-slate-900'
                        : 'text-slate-800',
                  )}
                  title={c.name}
                  data-testid={`condition-check-${c.code}`}
                  data-suggested={suggested && !baseline.has(c.id) ? 'true' : undefined}
                >
                  <Checkbox
                    checked={checked}
                    disabled={!canToggle || saving}
                    onCheckedChange={() => toggle(c.id)}
                    className="h-3.5 w-3.5 shrink-0 rounded-none shadow-none"
                  />
                  <span className="min-w-0 truncate">
                    {c.name}
                    {suggested && !baseline.has(c.id) ? (
                      <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        IA
                      </span>
                    ) : null}
                  </span>
                </label>
              )
            })}
          </div>
        </>
      )}
    </ClinicalBand>
  )
})
