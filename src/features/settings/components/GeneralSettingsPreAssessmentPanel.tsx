import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  type OrganisationGeneralSettings,
  type OrganisationPreAssessmentSettings,
  type PreAssessmentChecklistItem,
} from '@/lib/general-settings-api'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/toggle-controls'
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
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

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
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<OrganisationPreAssessmentSettings | null>(null)
  const [draft, setDraft] = React.useState<OrganisationPreAssessmentSettings>(
    DEFAULT_PRE_ASSESSMENT_SETTINGS,
  )

  const apply = React.useCallback((s: OrganisationGeneralSettings) => {
    const d = toDraft(s)
    setSaved(structuredClone(d))
    setDraft(structuredClone(d))
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const settings = await fetchGeneralSettings()
        if (!cancelled) apply(settings)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load pre-assessment settings.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

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
    setSaving(true)
    try {
      const updated = await updateGeneralSettings(preAssessmentSettingsToPayload(draft))
      apply(updated)
      toastSuccess('Saved', 'Pre-assessment settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
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
