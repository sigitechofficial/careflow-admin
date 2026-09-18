import * as React from 'react'
import { Loader2, Pencil, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  useFundingContracts,
  useFundingContractsSummary,
} from '@/features/billing/hooks/useFundingContracts'
import type { FundingContractReadiness } from '@/features/billing/api/funding-contracts.api'
import { BillingStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'

const READINESS_OPTIONS: Array<{ value: FundingContractReadiness | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'READY', label: 'Ready for billing' },
  { value: 'INCOMPLETE', label: 'Setup incomplete' },
  { value: 'ENDED', label: 'Ended' },
]

function statusBadgeCode(status: FundingContractReadiness): string {
  switch (status) {
    case 'READY':
      return 'READY'
    case 'INCOMPLETE':
      return 'SETUP_INCOMPLETE'
    case 'ENDED':
      return 'ENDED'
    case 'NO_FUNDING':
      return 'NO_FUNDING'
    default:
      return status
  }
}

function fundingEditLink(serviceUserId: string) {
  return {
    to: '/service-users/$serviceUserId' as const,
    params: { serviceUserId },
    search: { tab: 'funding' },
  }
}

export function BillingFundingContractsPanel() {
  const canRead = useAuthStore(s => s.can('billing.funding_contracts.read' as never))
  const { locationId } = useGlobalLocationScope()
  const [search, setSearch] = React.useState('')
  const [readiness, setReadiness] = React.useState<FundingContractReadiness | 'ALL'>('ALL')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const query = useFundingContracts({
    search: debouncedSearch || undefined,
    readiness,
    limit: 100,
    locationId: locationId ?? undefined,
  })
  const summaryQuery = useFundingContractsSummary(locationId)

  const rows = query.data?.rows ?? []
  const summary = summaryQuery.data

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view funding contracts. Required:{' '}
        <span className="font-mono text-xs">billing.funding_contracts.read</span>.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Funding contracts"
        description="Assign funders, split rules, caps, authorised hours, purchase orders, and billing contacts to service users."
      />

      {summary ? (
        <div className="flex flex-wrap gap-2">
          <Badge variant="success" size="md">
            {summary.ready} ready
          </Badge>
          <Badge variant="destructive" size="md">
            {summary.incomplete} incomplete
          </Badge>
          <Badge variant="muted" size="md">
            {summary.ended} ended
          </Badge>
          <Badge variant="secondary" size="md">
            {summary.serviceUsersWithFunding} with funding
          </Badge>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search service user, funder, PO…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={readiness}
          onValueChange={v => setReadiness(v as FundingContractReadiness | 'ALL')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {READINESS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading funding contracts…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Could not load funding contracts.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No funding contracts match your filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="min-w-[180px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Service user
                </th>
                <th className="min-w-[160px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Funders / split
                </th>
                <th className="min-w-[120px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Package ref
                </th>
                <th className="min-w-[120px] px-4 py-3 text-left font-medium text-muted-foreground">
                  PO number
                </th>
                <th className="min-w-[110px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Authorised hours
                </th>
                <th className="min-w-[160px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Billing contact
                </th>
                <th className="min-w-[220px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="w-[130px] px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 align-top">
                    <Link
                      {...fundingEditLink(row.serviceUserId)}
                      className="group block min-w-0"
                    >
                      <div className="font-medium text-foreground group-hover:text-primary group-hover:underline">
                        {row.serviceUserName}
                      </div>
                      {row.serviceUserNumber ? (
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {row.serviceUserNumber}
                        </div>
                      ) : null}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{row.funders}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs">{row.packageRef ?? '—'}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs">
                    {row.poNumber ?? '—'}
                    {row.poExpiresAt ? (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">Exp {row.poExpiresAt}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">{row.authorisedHours ?? '—'}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{row.billingContact ?? '—'}</td>
                  <td className="px-4 py-3 align-top">
                    <BillingStatusBadge status={statusBadgeCode(row.status)} />
                    {row.readinessIssues.length > 0 ? (
                      <ul className="mt-2 max-w-[260px] space-y-0.5 text-xs leading-snug text-muted-foreground">
                        {row.readinessIssues.map(issue => (
                          <li key={issue} className="flex gap-1.5">
                            <span className="text-muted-foreground/60" aria-hidden>
                              ·
                            </span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Button variant="outline" size="sm" asChild className="h-8">
                      <Link {...fundingEditLink(row.serviceUserId)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit funding
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Funding splits affect invoice lines only — they do not change normal carer pay calculation.
      </p>
    </div>
  )
}
