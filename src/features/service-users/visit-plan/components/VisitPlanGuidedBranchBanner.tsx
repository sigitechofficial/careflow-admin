import { Link } from '@tanstack/react-router'
import { Info } from 'lucide-react'

type Props = {
  suggestsUseAbsence?: boolean
  reasonCode?: string | null
  serviceUserId: string
  className?: string
}

export function VisitPlanGuidedBranchBanner({
  suggestsUseAbsence,
  reasonCode,
  serviceUserId,
  className,
}: Props) {
  const code = reasonCode?.toUpperCase() ?? ''
  const hospitalOrHoliday =
    suggestsUseAbsence || code === 'HOSPITAL' || code === 'HOLIDAY' || /hospital|holiday/i.test(code)

  if (!hospitalOrHoliday) return null

  return (
    <div
      className={`flex gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 ${className ?? ''}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Known dates away from home?</p>
        <p className="mt-0.5 text-sky-900">
          Prefer{' '}
          <Link
            to="/service-users/$serviceUserId"
            params={{ serviceUserId }}
            search={{ tab: 'absences' }}
            className="font-medium underline underline-offset-2"
          >
            Record Absences
          </Link>{' '}
          when return is expected. Use suspend only when the whole package should stay off until manual
          re-activation.
        </p>
      </div>
    </div>
  )
}
