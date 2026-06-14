import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { listSelectableForms } from '@/features/care-pathway/api/form-selection.api'
import { carePathwayKeys } from '@/features/care-pathway/keys'
import { useLinkAssessmentToCarePlan } from '@/features/service-users/assessments/hooks/useServiceUserAssessments'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  completionId: string
  completionTitle?: string | null
}

export function LinkAssessmentToCarePlanDialog({
  open,
  onOpenChange,
  serviceUserId,
  completionId,
  completionTitle,
}: Props) {
  const can = useAuthStore((s) => s.can)
  const canLink =
    can('service_users.assessments.link') || can('service_users.update')

  const formsQuery = useQuery({
    queryKey: carePathwayKeys.selectableForms('care-plans'),
    queryFn: () => listSelectableForms('care-plans'),
    enabled: open && canLink,
    staleTime: 30_000,
  })

  const [carePlanFormId, setCarePlanFormId] = React.useState<string | null>(null)
  const linkMutation = useLinkAssessmentToCarePlan(serviceUserId)

  React.useEffect(() => {
    if (!open) setCarePlanFormId(null)
  }, [open])

  const forms = formsQuery.data ?? []

  async function handleLink() {
    if (!carePlanFormId) return
    try {
      await linkMutation.mutateAsync({ carePlanFormId, completionId })
      toastSuccess('Assessment linked', 'This completion is now linked to the care plan form.')
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, 'Unable to link assessment')
    }
  }

  if (!canLink) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Link to care plan</DialogTitle>
          <DialogDescription>
            Attach {completionTitle ? `"${completionTitle}"` : 'this completion'} to a care plan
            form section.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {formsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading care plan forms…</p>
          )}
          {formsQuery.error && !formsQuery.isLoading && (
            <p className="text-sm text-destructive" role="alert">
              Unable to load care plan forms.
            </p>
          )}
          {!formsQuery.isLoading && forms.length === 0 && (
            <p className="text-sm text-muted-foreground">No care plan forms available.</p>
          )}
          {forms.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {forms.map((form) => (
                <button
                  key={form.id}
                  type="button"
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    carePlanFormId === form.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border/70 bg-muted/20 hover:bg-muted/40'
                  }`}
                  onClick={() => setCarePlanFormId(form.id)}
                >
                  {form.name}
                </button>
              ))}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!carePlanFormId || linkMutation.isPending}
            onClick={() => void handleLink()}
          >
            {linkMutation.isPending ? 'Linking…' : 'Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
