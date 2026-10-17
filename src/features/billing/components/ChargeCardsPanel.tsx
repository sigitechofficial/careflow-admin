import * as React from 'react'
import { Pencil, Plus, Search, Trash2, UserPlus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useNavigate } from '@tanstack/react-router'
import { ChargeCardAssignDialog } from '@/features/billing/components/ChargeCardAssignDialog'
import { RateCardStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { useChargeCards, useDeleteChargeCard } from '@/features/billing/hooks/useChargeCards'
import {
  formatBillingDate,
  formatChargeCardAssignmentDisplay,
  formatVisitDurationLabel,
  fixedVisitRuleTitle,
  type ChargeCard,
} from '@/features/billing/types/billing-cards.types'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { formatBillingLabel } from '@/features/billing/components/BillingStatusBadge'

function rulesSummary(card: ChargeCard): string {
  if (!card.rules.length) return 'No rules'
  const first = card.rules[0]!
  const title =
    first.rateType === 'FIXED'
      && (first.minimumMinutes ?? 0) > 0
      && first.chargeMethod !== 'SLEEP_IN'
      ? fixedVisitRuleTitle(first, first.minimumMinutes!)
      : (first.label ?? formatBillingLabel(first.chargeMethod))
  const parts = [
    title,
    `£${Number(first.amount).toFixed(2)}`,
  ]
  const durationLabel = formatVisitDurationLabel(first.minimumMinutes)
  if (durationLabel) parts.push(durationLabel)
  if (card.rules.length > 1) parts.push(`+${card.rules.length - 1} more`)
  return parts.join(' · ')
}

export function ChargeCardsPanel() {
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('billing.charge_cards.manage' as never))
  const { locationId } = useGlobalLocationScope()
  const [search, setSearch] = React.useState('')
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false)
  const [assigning, setAssigning] = React.useState<ChargeCard | null>(null)

  const listQuery = useChargeCards({
    search: search.trim() || undefined,
    locationId: locationId ?? undefined,
  })
  const deleteMutation = useDeleteChargeCard()

  const rows = listQuery.data ?? []
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load charge cards.'
        : null

  const openCreate = () => void navigate({ to: '/billing/charge-cards/new' })

  const openEdit = (card: ChargeCard) =>
    void navigate({ to: '/billing/charge-cards/$chargeCardId/edit', params: { chargeCardId: card.id } })

  const openAssign = (card: ChargeCard) => {
    setAssigning(card)
    setAssignDialogOpen(true)
  }

  const onDelete = async (card: ChargeCard) => {
    if (!canManage) return
    if (!window.confirm(`Delete charge card "${card.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(card.id)
    } catch {
      // handled silently
    }
  }

  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Service user charge cards"
        description="Invoice rate templates for funders and service users. Attach by funder, contract, branch, or individual — like Birdie payer profiles and Access invoice rate sheets."
        action={
          canManage ? (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New charge card
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search charge cards…"
            className="pl-8"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[960px] text-sm" data-testid="charge-cards-table">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Attach to</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Attached</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Rules summary</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Effective</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              {canManage ? (
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="px-3 py-10 text-center text-muted-foreground">
                  Loading charge cards…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="px-3 py-10 text-center text-muted-foreground">
                  No charge cards found. Create one before invoicing can calculate visit charges.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{row.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.code}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatChargeCardAssignmentDisplay(row)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.attachedRecordCount ?? 0}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[240px] truncate" title={rulesSummary(row)}>
                    {rulesSummary(row)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                    {formatBillingDate(row.effectiveFrom)}
                    {row.effectiveTo ? ` → ${formatBillingDate(row.effectiveTo)}` : ' → open'}
                  </td>
                  <td className="px-3 py-2.5">
                    <RateCardStatusBadge status={row.status} />
                  </td>
                  {canManage ? (
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openAssign(row)}
                          title="Attach to matching records"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(row)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => void onDelete(row)}
                          title="Delete"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs text-muted-foreground">
        {[
          'Funder-level rates (Access style)',
          'Funding contract overrides',
          'Fixed visit charges up to 1 hour; hourly beyond',
          'Missing card → billing exception',
        ].map(item => (
          <div key={item} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            {item}
          </div>
        ))}
      </div>

      <ChargeCardAssignDialog
        card={assigning}
        open={assignDialogOpen}
        onOpenChange={open => {
          setAssignDialogOpen(open)
          if (!open) setAssigning(null)
        }}
      />
    </div>
  )
}
