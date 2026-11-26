import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { useActivateEnquiryServiceUser } from '@/features/crm/hooks/useCrm'
import type { Enquiry } from '@/features/crm/types/crm.types'

const fmtDate = (iso: string | null) => (iso ? formatOrganisationDate(iso) : '—')

/**
 * "Mark as won": shows the person's details and offers to create them as an active service user,
 * then opens that service user's page.
 */
export function MarkWonDialog({
  enquiry,
  open,
  onClose,
  onWonOnly,
  movePending,
}: {
  enquiry: Enquiry
  open: boolean
  onClose: () => void
  onWonOnly: () => void
  movePending: boolean
}) {
  const activate = useActivateEnquiryServiceUser(enquiry.id)
  const navigate = useNavigate()
  const linked = Boolean(enquiry.convertedServiceUserId)
  const missingBranch = !enquiry.locationId
  const busy = activate.isPending || movePending

  const create = () =>
    activate.mutate(undefined, {
      onSuccess: r => {
        toastSuccess(r.created ? 'Enquiry won — active service user created' : 'Enquiry won — service user made active')
        onClose()
        navigate({ to: '/service-users/$serviceUserId/view', params: { serviceUserId: r.serviceUserId } })
      },
      onError: e => toastApiError(e, 'Could not create the service user'),
    })

  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: `${enquiry.firstName} ${enquiry.lastName}`.trim() },
    { label: 'Date of birth', value: fmtDate(enquiry.dateOfBirth) },
    { label: 'Address', value: [enquiry.addressLine, enquiry.postcode].filter(Boolean).join(', ') || '—' },
    { label: 'Branch', value: enquiry.locationName ?? '—' },
    { label: 'Funding type', value: enquiry.fundingTypeName ?? '—' },
    { label: 'Service start', value: fmtDate(enquiry.requestedStartDate) },
    {
      label: 'Contact',
      value:
        [enquiry.contactName, enquiry.contactRelationship && `(${enquiry.contactRelationship})`, enquiry.contactPhone]
          .filter(Boolean)
          .join(' ') || '—',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Mark enquiry as won</DialogTitle>
          <DialogDescription>
            {linked
              ? 'This enquiry is already linked to a service user. Do you want to make that service user active?'
              : 'Do you want to create this service user? They will be added as an active service user.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
            {rows.map(r => (
              <React.Fragment key={r.label}>
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="font-medium">{r.value}</dd>
              </React.Fragment>
            ))}
          </dl>
          {missingBranch && (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              Set the branch on the enquiry before creating the service user.
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onWonOnly} disabled={busy}>
            Only mark as won
          </Button>
          <Button onClick={create} disabled={busy || missingBranch}>
            {activate.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            )}
            {linked ? 'Yes, make active' : 'Yes, create service user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
