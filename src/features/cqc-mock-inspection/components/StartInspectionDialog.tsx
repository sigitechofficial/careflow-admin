import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { flattenLocationOptionsFromTree } from '@/features/locations/utils/flatten-location-options.util'
import { feedbackSelectClass, feedbackTextareaClass } from '@/features/complaints/components/FeedbackFormDialog'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { useCreateMockInspection } from '../hooks'
import type { MockInspectionTemplate } from '../types'
import { HELP } from '../help'
import { FieldWithInfo } from './InfoTip'
import { TemplateFacts } from './TemplateDetail'

const WHOLE_ORG = ''

/** Branches the user may run an inspection for (theirs; every branch plus "whole organisation" otherwise). */
export function useBranchOptions(enabled: boolean) {
  const assignedLocationIds = useAuthStore(s => s.user?.assignedLocationIds)
  const assignedLocations = useAuthStore(s => s.user?.assignedLocations)
  const tree = useLocationManagementTree(enabled && assignedLocationIds == null)
  return React.useMemo(() => {
    if (assignedLocationIds != null) {
      return {
        wholeOrg: false,
        options: (assignedLocations ?? []).map(l => ({ id: l.id, label: l.name?.trim() || 'Branch' })),
      }
    }
    return { wholeOrg: true, options: flattenLocationOptionsFromTree(tree.data) }
  }, [assignedLocationIds, assignedLocations, tree.data])
}

/** Start a mock inspection: every quality statement, or only those of a ready-made `template`. */
export function StartInspectionDialog({
  open,
  onOpenChange,
  onStarted,
  template = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted: (id: string) => void
  template?: MockInspectionTemplate | null
}) {
  const { wholeOrg, options } = useBranchOptions(open)
  const mutation = useCreateMockInspection()
  const [title, setTitle] = React.useState('')
  const [locationId, setLocationId] = React.useState(WHOLE_ORG)
  const [notes, setNotes] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    setTitle(`${template ? template.title : 'Mock inspection'}, ${month}`)
    setLocationId(wholeOrg ? WHOLE_ORG : (options[0]?.id ?? WHOLE_ORG))
    setNotes('')
    setError(null)
    // Only reset when the dialog opens (not when the branch list loads).
  }, [open])

  const onSave = async () => {
    if (title.trim().length < 3) return setError('Give the inspection a title.')
    if (!wholeOrg && !locationId) return setError('Choose your branch.')
    setError(null)
    try {
      const created = await mutation.mutateAsync({
        title: title.trim(),
        locationId: locationId || undefined,
        notes: notes.trim() || undefined,
        templateCode: template?.code,
      })
      toastSuccess('Mock inspection started', 'The current CQC evidence has been taken for each quality statement.')
      onOpenChange(false)
      onStarted(created.id)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the mock inspection.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="mock-inspection-start-dialog">
        <DialogHeader>
          <DialogTitle>{template ? `Start: ${template.title}` : 'Start a mock CQC inspection'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {template ? (
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3" data-testid="mock-start-template">
              <p className="text-sm text-foreground">{template.summary}</p>
              <TemplateFacts t={template} />
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {template
              ? `You will score its ${template.statementCount} quality statements 1 to 4 against the CQC evidence kept for the service. The ratings are worked out as you go.`
              : 'You will score each of the quality statements 1 to 4 against the CQC evidence kept for the service. The ratings for each key question and overall are worked out as you go.'}
          </p>
          <FieldWithInfo id="mock-inspection-title" label="Title" help={HELP.startTitle}>
            <Input id="mock-inspection-title" value={title} onChange={e => setTitle(e.target.value)} data-testid="mock-inspection-title" />
          </FieldWithInfo>
          <FieldWithInfo id="mock-inspection-location" label="Service" help={HELP.startService}>
            <select
              id="mock-inspection-location"
              className={feedbackSelectClass}
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              data-testid="mock-inspection-location"
            >
              {wholeOrg ? <option value={WHOLE_ORG}>Whole organisation</option> : null}
              {options.map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </FieldWithInfo>
          <FieldWithInfo id="mock-inspection-notes" label="Notes (optional)" help={HELP.startNotes}>
            <textarea
              id="mock-inspection-notes"
              className={feedbackTextareaClass}
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </FieldWithInfo>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={mutation.isPending} data-testid="mock-inspection-start">
            {mutation.isPending ? 'Starting…' : 'Start inspection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
