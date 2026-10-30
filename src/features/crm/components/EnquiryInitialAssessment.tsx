import { useNavigate } from '@tanstack/react-router'
import { ClipboardList, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError } from '@/shared/lib/toast'
import { useStartEnquiryInitialAssessment } from '@/features/crm/hooks/useCrm'
import type { Enquiry } from '@/features/crm/types/crm.types'

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString()

const IA_STATUS: Record<NonNullable<Enquiry['initialAssessment']>['status'], { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  IN_PROGRESS: { label: 'In progress', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
  SUBMITTED: { label: 'Submitted · awaiting review', className: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200' },
  REVIEWED: { label: 'Reviewed', className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' },
}

/**
 * The full initial assessment (the same one a service user has). It is kept on a service user, so
 * an enquiry without one first gets a Pre-admission service user made from its details.
 */
export function EnquiryInitialAssessment({ enquiry, canManage }: { enquiry: Enquiry; canManage: boolean }) {
  const navigate = useNavigate()
  const can = useAuthStore(s => s.can)
  const start = useStartEnquiryInitialAssessment(enquiry.id)
  const ia = enquiry.initialAssessment
  const serviceUserId = enquiry.convertedServiceUserId
  const canOpen = Boolean(serviceUserId) && (can('service_users.initial_assessment.read') || can('service_users.read'))
  const canStart =
    !serviceUserId &&
    canManage &&
    can('service_users.create') &&
    (can('service_users.initial_assessment.create') || can('service_users.update'))

  const open = (id: string) => navigate({ to: '/service-users/initial-assessment', search: { serviceUserId: id } })
  const onClick = () => {
    if (serviceUserId) {
      void open(serviceUserId)
      return
    }
    start.mutate(undefined, {
      onSuccess: res => void open(res.serviceUserId),
      onError: err => toastApiError(err, 'Could not start the initial assessment'),
    })
  }

  const label = !ia
    ? serviceUserId
      ? 'Open initial assessment'
      : 'Start full initial assessment'
    : ia.status === 'DRAFT' || ia.status === 'IN_PROGRESS'
      ? 'Continue initial assessment'
      : 'View initial assessment'

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3" data-testid="crm-enquiry-initial-assessment">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Full initial assessment</p>
        {ia ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${IA_STATUS[ia.status].className}`}>
            {IA_STATUS[ia.status].label}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not started</span>
        )}
      </div>
      {ia ? <p className="mt-1 text-xs text-muted-foreground">Last updated {fmtDateTime(ia.updatedAt)}</p> : null}
      {!serviceUserId ? (
        <p className="mt-1 text-xs text-muted-foreground">
          The same assessment as on a service user. Starting it makes a Pre-admission service user from this
          enquiry; the enquiry stays at its stage.
        </p>
      ) : null}
      {canOpen || canStart ? (
        <Button type="button" size="sm" variant="outline" className="mt-2" disabled={start.isPending} onClick={onClick}>
          {start.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {label}
        </Button>
      ) : null}
    </div>
  )
}
