import * as React from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useLearningSettings, useUpdateLearningSettings } from '@/features/learning/hooks/useLearning'
import type { LearningSettings } from '@/features/learning/types/learning.types'
import { ApiError } from '@/shared/api/api-client'

export function LearningSettingsPanel() {
  const settingsQuery = useLearningSettings()
  const updateMut = useUpdateLearningSettings()
  const [form, setForm] = React.useState<LearningSettings>({})

  React.useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data)
  }, [settingsQuery.data])

  const onSave = async () => {
    // Send only the editable fields: the GET response also has `id` and
    // `updatedAt`, which the API rejects (forbidNonWhitelisted).
    const body: Partial<LearningSettings> = {
      defaultExpiryWarningDays: form.defaultExpiryWarningDays,
      defaultAssignmentDueDays: form.defaultAssignmentDueDays,
      allowEmployeeExternalTrainingSubmission: form.allowEmployeeExternalTrainingSubmission,
      requireManagerApprovalForExternalTraining: form.requireManagerApprovalForExternalTraining,
      automaticRefresherAssignment: form.automaticRefresherAssignment,
      automaticOverdueEscalation: form.automaticOverdueEscalation,
      defaultCertificateValidityDays: form.defaultCertificateValidityDays,
      allowCourseAccessAfterExpiry: form.allowCourseAccessAfterExpiry,
      allowCourseRetakeAfterPass: form.allowCourseRetakeAfterPass,
      complianceCalculationMode: form.complianceCalculationMode,
    }
    try {
      await updateMut.mutateAsync(body)
      toastSuccess('Learning settings saved')
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Save failed'))
    }
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl" data-testid="learning-settings-panel">
      <ContentSectionHeader
        title="Settings"
        description="Organisation defaults for assignments, certificates, and compliance calculation."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Default assignment due (days)">
          <Input
            type="number"
            value={form.defaultAssignmentDueDays ?? ''}
            onChange={e =>
              setForm(p => ({ ...p, defaultAssignmentDueDays: Number(e.target.value) || undefined }))
            }
          />
        </FormField>
        <FormField label="Expiry warning (days)">
          <Input
            type="number"
            value={form.defaultExpiryWarningDays ?? ''}
            onChange={e =>
              setForm(p => ({ ...p, defaultExpiryWarningDays: Number(e.target.value) || undefined }))
            }
          />
        </FormField>
        <FormField label="Default certificate validity (days)">
          <Input
            type="number"
            value={form.defaultCertificateValidityDays ?? ''}
            onChange={e =>
              setForm(p => ({ ...p, defaultCertificateValidityDays: Number(e.target.value) || undefined }))
            }
          />
        </FormField>
        <FormField label="Compliance calculation mode">
          <Input
            value={form.complianceCalculationMode ?? ''}
            onChange={e => setForm(p => ({ ...p, complianceCalculationMode: e.target.value }))}
          />
        </FormField>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!form.allowEmployeeExternalTrainingSubmission}
            onCheckedChange={v => setForm(p => ({ ...p, allowEmployeeExternalTrainingSubmission: !!v }))}
          />
          Allow employees to submit external training
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!form.requireManagerApprovalForExternalTraining}
            onCheckedChange={v => setForm(p => ({ ...p, requireManagerApprovalForExternalTraining: !!v }))}
          />
          Require manager approval for external training
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!form.automaticRefresherAssignment}
            onCheckedChange={v => setForm(p => ({ ...p, automaticRefresherAssignment: !!v }))}
          />
          Automatic refresher assignment
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!form.automaticOverdueEscalation}
            onCheckedChange={v => setForm(p => ({ ...p, automaticOverdueEscalation: !!v }))}
          />
          Automatic overdue escalation
        </label>
      </div>

      <Button onClick={() => void onSave()} disabled={updateMut.isPending}>
        <Save className="mr-1 h-4 w-4" />
        Save settings
      </Button>
    </div>
  )
}
