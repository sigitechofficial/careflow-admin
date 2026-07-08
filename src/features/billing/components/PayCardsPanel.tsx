import * as React from 'react'
import { Pencil, Plus, Search, Trash2, UserPlus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { PayCardFormDialog } from '@/features/billing/components/PayCardFormDialog'
import { PayCardAssignDialog } from '@/features/billing/components/PayCardAssignDialog'
import { RateCardStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { useDeletePayCard, usePayCards } from '@/features/billing/hooks/usePayCards'
import {
  formatBillingDate,
  formatPayCardAssignmentDisplay,
  type PayCard,
} from '@/features/billing/types/billing-cards.types'
import { useAuthStore } from '@/features/auth/store'

export function PayCardsPanel() {
  const canManage = useAuthStore(s => s.can('billing.pay_cards.manage' as never))
  const [search, setSearch] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<PayCard | null>(null)
  const [assigning, setAssigning] = React.useState<PayCard | null>(null)

  const listQuery = usePayCards({ search: search.trim() || undefined })
  const deleteMutation = useDeletePayCard()

  const rows = listQuery.data ?? []
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load pay cards.'
        : null

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (card: PayCard) => {
    setEditing(card)
    setDialogOpen(true)
  }

  const openAssign = (card: PayCard) => {
    setAssigning(card)
    setAssignDialogOpen(true)
  }

  const onDelete = async (card: PayCard) => {
    if (!canManage) return
    if (!window.confirm(`Delete pay card "${card.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(card.id)
    } catch {
      // mutation error surfaced via UI if needed
    }
  }

  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Carer pay cards"
        description="Reusable pay rate templates. Set branch, role, or employment type criteria, then bulk-assign carers here or override on each employee profile."
        action={
          canManage ? (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New pay card
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
            placeholder="Search pay cards…"
            className="pl-8"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[960px] text-sm" data-testid="pay-cards-table">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Applies to</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Carers</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Effective</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Rules</th>
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
                  Loading pay cards…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="px-3 py-10 text-center text-muted-foreground">
                  No pay cards found. Create one to define carer pay rules.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{row.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.code}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatPayCardAssignmentDisplay(row)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.assignedCarerCount ?? 0}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                    {formatBillingDate(row.effectiveFrom)}
                    {row.effectiveTo ? ` → ${formatBillingDate(row.effectiveTo)}` : ' → open'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.rules.length}</td>
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
                          title="Assign to matching carers"
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

      <p className="text-xs text-muted-foreground">
        Carer pay and client charge must stay separate. Use premiums or overrides when a service user needs higher carer pay.
      </p>

      <PayCardFormDialog open={dialogOpen} onOpenChange={setDialogOpen} card={editing} />
      <PayCardAssignDialog
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
