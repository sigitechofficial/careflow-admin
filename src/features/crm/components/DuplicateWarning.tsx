import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { useEnquiryDuplicates } from '@/features/crm/hooks/useCrm'
import { STAGE_LABELS } from '@/features/crm/crm-labels'

type Props = {
  firstName: string
  lastName: string
  dateOfBirth: string
  phone: string
  /** Enquiry being edited, so it doesn't match itself. */
  excludeId?: string
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Non-blocking warning when the person may already exist as an enquiry or service user. */
export function DuplicateWarning({ firstName, lastName, dateOfBirth, phone, excludeId }: Props) {
  const q = useDebounced(
    {
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      phone: phone.trim() || undefined,
      excludeId,
    },
    500,
  )
  const enoughToMatch = Boolean((q.firstName && q.lastName) || (q.phone && q.phone.replace(/\D/g, '').length >= 7))
  const { data } = useEnquiryDuplicates(q, enoughToMatch)

  const enquiries = data?.enquiries ?? []
  const serviceUsers = data?.serviceUsers ?? []
  if (!enoughToMatch || (enquiries.length === 0 && serviceUsers.length === 0)) return null

  return (
    <div
      role="status"
      className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      data-testid="enquiry-duplicate-warning"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="flex flex-col gap-2">
        <p className="font-medium">This person may already be on the system</p>
        {enquiries.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Enquiries</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {enquiries.map(e => (
                <li key={e.id}>
                  <Link to="/crm/$enquiryId" params={{ enquiryId: e.id }} target="_blank" className="underline">
                    {e.referenceNumber} · {e.name}
                  </Link>{' '}
                  <span className="opacity-80">({STAGE_LABELS[e.stage]})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {serviceUsers.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Service users</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {serviceUsers.map(s => (
                <li key={s.id}>
                  <Link
                    to="/service-users/$serviceUserId/view"
                    params={{ serviceUserId: s.id }}
                    target="_blank"
                    className="underline"
                  >
                    {s.name}
                  </Link>
                  {s.dateOfBirth && (
                    <span className="opacity-80"> · born {new Date(s.dateOfBirth).toLocaleDateString()}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs opacity-80">You can still save — check the records above first to avoid a duplicate.</p>
      </div>
    </div>
  )
}
