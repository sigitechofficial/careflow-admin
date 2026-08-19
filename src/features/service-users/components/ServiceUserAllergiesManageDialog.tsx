import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { ServiceUserAllergiesTab } from '@/features/service-users/components/ServiceUserAllergiesTab'

type Props = {
  serviceUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ServiceUserAllergiesManageDialog({ serviceUserId, open, onOpenChange }: Props) {
  const lookupsQuery = useServiceUserLookups()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allergies</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="mb-3 text-sm text-muted-foreground">
            Choose from the allergy catalogue. Updates are saved to this service user’s profile.
          </p>
          <ServiceUserAllergiesTab
            serviceUserId={serviceUserId}
            allergyCatalog={lookupsQuery.data?.allergies ?? []}
            hideHeading
            formMode="inline"
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
