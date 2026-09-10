import { Link } from '@tanstack/react-router'
import { Info } from 'lucide-react'

type Props = {
  serviceUserId: string
  lines: string[]
}

/** Read-only context from Medical & Alerts usual / alert parameters. */
export function ObservationParameterContext({ serviceUserId, lines }: Props) {
  if (lines.length === 0) return null
  return (
    <div
      className="rounded-md border border-teal-200/80 bg-teal-50/60 px-3 py-2 text-xs text-teal-950 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100"
      data-testid="observation-parameter-context"
      role="status"
    >
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="text-[11px] text-teal-800/80 dark:text-teal-200/80">
            Source of truth:{' '}
            <Link
              to="/service-users/$serviceUserId/alerts"
              params={{ serviceUserId }}
              className="font-medium underline-offset-2 hover:underline"
            >
              Medical &amp; Alerts → Service User Parameters
            </Link>
            . Not a live reading.
          </p>
        </div>
      </div>
    </div>
  )
}
