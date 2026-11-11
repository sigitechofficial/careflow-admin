import * as React from 'react'
import { Loader2, Scale } from 'lucide-react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { EmptyState, PageHeader } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { formatMinutes } from '@/features/timebank/timebank-format'
import { useOverCareReviews } from '@/features/over-care-reviews/hooks'
import type { OverCareReviewStatus } from '@/features/over-care-reviews/types'
import {
  OVER_CARE_STATUS_BADGE,
  OVER_CARE_STATUS_LABEL,
  OverCareReviewDialog,
} from '@/features/over-care-reviews/components/OverCareReviewDialog'

/**
 * Over care reviews (Workforce › Time & absence): a service user got more care than their weekly
 * hours in a finished week. The weekly check raises a request; a manager cancels upcoming visits
 * ("Action taken") or closes it with a reason ("No action needed"). Nothing is cancelled by itself.
 */

const TABS: { id: OverCareReviewStatus; search: string }[] = [
  { id: 'PENDING', search: 'pending' },
  { id: 'ACTION_TAKEN', search: 'action-taken' },
  { id: 'NO_ACTION_NEEDED', search: 'no-action-needed' },
]

const EMPTY_TEXT: Record<OverCareReviewStatus, string> = {
  PENDING:
    'A request appears here when a service user got more care than their weekly hours in a finished week.',
  ACTION_TAKEN: 'Requests where a manager cancelled visits show here.',
  NO_ACTION_NEEDED: 'Requests a manager looked at and left as they are show here.',
}

export default function OverCareReviewsPage() {
  const { formatDate } = useOrganisationDisplayFormat()
  const canManage = useAuthStore(s => s.can('hours_approvals.manage'))
  // The tab is in the URL (?tab=action-taken), so a notification can open it.
  const search = useSearch({ strict: false }) as { tab?: string }
  const navigate = useNavigate()
  const tab = TABS.find(t => t.search === search.tab)?.id ?? 'PENDING'
  const setTab = (next: OverCareReviewStatus) =>
    void navigate({
      to: '/over-care-reviews',
      search: { tab: TABS.find(t => t.id === next)!.search },
      replace: true,
    })
  const [openId, setOpenId] = React.useState<string | null>(null)

  const { data, isLoading, isError } = useOverCareReviews(tab)
  const rows = data?.rows ?? []
  const pending = tab === 'PENDING'
  const actionTaken = tab === 'ACTION_TAKEN'

  return (
    <div className="flex w-full flex-col gap-4" data-testid="over-care-reviews-page">
      <PageHeader
        title="Over care reviews"
        description="Service users who got more care than their weekly hours in a finished week. Nothing is cancelled until a manager decides."
        icon={<Scale className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Workforce' }, { label: 'Over care reviews' }]}
      />

      <div className="flex items-center gap-1 self-start rounded-lg border border-border bg-muted/40 p-1">
        {TABS.map(t => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tab === t.id ? 'default' : 'ghost'}
            className="gap-1.5"
            onClick={() => setTab(t.id)}
            data-testid={`over-care-tab-${t.search}`}
          >
            {OVER_CARE_STATUS_LABEL[t.id]}
            {data ? (
              <span className="rounded-full bg-background/20 px-1.5 py-0 text-[10px] font-semibold tabular-nums">
                {data.counts[t.id]}
              </span>
            ) : null}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading reviews…
          </div>
        ) : isError ? (
          <div className="px-6 py-12 text-center text-sm text-destructive">Couldn&apos;t load the reviews.</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Scale className="h-6 w-6" aria-hidden />}
            title={`No ${OVER_CARE_STATUS_LABEL[tab].toLowerCase()} requests`}
            description={EMPTY_TEXT[tab]}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm" data-testid="over-care-reviews-table">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5">Service user</th>
                  <th className="px-4 py-2.5">Week of</th>
                  <th className="px-4 py-2.5 text-right">Weekly hours</th>
                  <th className="px-4 py-2.5 text-right">Care given</th>
                  <th className="px-4 py-2.5 text-right">Over care</th>
                  {actionTaken ? <th className="px-4 py-2.5 text-right">Hours cancelled</th> : null}
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">{pending ? 'Raised' : 'Decided'}</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to="/service-users/$serviceUserId/view"
                        params={{ serviceUserId: r.serviceUserId }}
                        className="text-primary underline-offset-2 hover:underline"
                        data-testid={`over-care-su-link-${r.id}`}
                      >
                        {r.serviceUserName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(r.weekStart)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMinutes(r.weeklyMinutes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMinutes(r.careGivenMinutes)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-amber-700 dark:text-amber-300">
                      {formatMinutes(r.overMinutes)}
                    </td>
                    {actionTaken ? (
                      <td
                        className="px-4 py-3 text-right tabular-nums"
                        title={`${r.cancelledVisits} visit${r.cancelledVisits === 1 ? '' : 's'} cancelled`}
                      >
                        {formatMinutes(r.cancelledMinutes)}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <Badge variant={OVER_CARE_STATUS_BADGE[r.status]} size="sm">
                        {OVER_CARE_STATUS_LABEL[r.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatDate((pending ? r.raisedAt : (r.decidedAt ?? r.raisedAt)).slice(0, 10))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={pending && canManage ? 'default' : 'outline'}
                        onClick={() => setOpenId(r.id)}
                        data-testid={`over-care-open-${r.id}`}
                      >
                        {pending && canManage ? 'Review' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OverCareReviewDialog reviewId={openId} canManage={canManage} onClose={() => setOpenId(null)} />
    </div>
  )
}
