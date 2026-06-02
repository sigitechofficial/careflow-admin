import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import {
  type OrganisationGeneralSettings,
  type OrganisationPreAssessmentSettings,
  type PreAssessmentChecklistItem,
} from '@/features/settings/types'
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from '@/features/settings/hooks/useGeneralSettings'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  GeneralSettingsCard,
  SettingsHint,
  SettingsNoYesToggle,
  SettingsRow,
} from '@/features/settings/components/GeneralSettingsCard'
import {
  DEFAULT_PRE_ASSESSMENT_SETTINGS,
  PRE_ASSESSMENT_TOOLTIPS,
  preAssessmentSettingsToPayload,
} from '@/features/settings/pre-assessment/pre-assessment-settings-defaults'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

function toDraft(s: OrganisationGeneralSettings): OrganisationPreAssessmentSettings {
  return s.preAssessmentSettings ?? DEFAULT_PRE_ASSESSMENT_SETTINGS
}

function ChecklistSection({
  title,
  hint,
  items,
  onToggle,
  disabled,
}: {
  title: string
  hint?: string
  items: PreAssessmentChecklistItem[]
  onToggle: (key: string, selected: boolean) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {title}
        {hint ? <SettingsHint text={hint} /> : null}
      </p>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={item.key}
            className={cn(
              'flex items-start gap-3 rounded-md px-2 py-1.5',
              index % 2 === 1 && 'bg-muted/20',
            )}
          >
            <Checkbox
              id={`pre-assessment-${item.key}`}
              checked={item.selected}
              onCheckedChange={checked => onToggle(item.key, checked === true)}
              disabled={disabled}
              className="mt-0.5"
            />
            <label
              htmlFor={`pre-assessment-${item.key}`}
              className="cursor-pointer text-sm leading-snug text-foreground"
            >
              {item.label}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function GeneralSettingsPreAssessmentPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const { data: settingsData, isLoading: loading, error: queryError } = useGeneralSettings()
  const updateMutation = useUpdateGeneralSettings()
  const [saved, setSaved] = React.useState<OrganisationPreAssessmentSettings | null>(null)
  const [draft, setDraft] = React.useState<OrganisationPreAssessmentSettings>(
    DEFAULT_PRE_ASSESSMENT_SETTINGS,
  )
  const saving = updateMutation.isPending
  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load pre-assessment settings.'
        : null

  React.useEffect(() => {
    if (settingsData) {
      const d = toDraft(settingsData)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
    }
  }, [settingsData])

  function patch(p: Partial<OrganisationPreAssessmentSettings>) {
    setDraft(d => ({ ...d, ...p }))
  }

  function toggleComponent(key: string, selected: boolean) {
    setDraft(d => ({
      ...d,
      assessmentComponents: d.assessmentComponents.map(item =>
        item.key === key ? { ...item, selected } : item,
      ),
    }))
  }

  function toggleForm(key: string, selected: boolean) {
    setDraft(d => ({
      ...d,
      assessmentForms: d.assessmentForms.map(item =>
        item.key === key ? { ...item, selected } : item,
      ),
    }))
  }

  async function onSave() {
    if (!canUpdate) return
    try {
      const updated = await updateMutation.mutateAsync(preAssessmentSettingsToPayload(draft))
      const d = toDraft(updated)
      setSaved(structuredClone(d))
      setDraft(structuredClone(d))
      toastSuccess('Saved', 'Pre-assessment settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  function onReset() {
    if (saved) setDraft(structuredClone(saved))
    else setDraft(structuredClone(DEFAULT_PRE_ASSESSMENT_SETTINGS))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-pre-assessment-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <GeneralSettingsCard title="Care Assessment">
        <SettingsRow
          label="Care assessment required"
          hint={PRE_ASSESSMENT_TOOLTIPS.careAssessmentRequired}
        >
          <SettingsNoYesToggle
            value={draft.careAssessmentRequired}
            onChange={v => patch({ careAssessmentRequired: v })}
            disabled={!canUpdate}
          />
        </SettingsRow>
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Care Assessment Components">
        <ChecklistSection
          title="Please select Assessment Components for Checklist"
          hint={PRE_ASSESSMENT_TOOLTIPS.assessmentComponents}
          items={draft.assessmentComponents}
          onToggle={toggleComponent}
          disabled={!canUpdate}
        />
        <div className="border-t border-border pt-6">
          <ChecklistSection
            title="Please select assessments forms"
            hint={PRE_ASSESSMENT_TOOLTIPS.assessmentForms}
            items={draft.assessmentForms}
            onToggle={toggleForm}
            disabled={!canUpdate}
          />
        </div>
      </GeneralSettingsCard>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
          Reset
        </Button>
        <Button type="button" onClick={() => void onSave()} disabled={!canUpdate || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  )
}
