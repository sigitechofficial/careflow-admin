import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  CheckCircle2,
  CreditCard,
  Eye,
  FileEdit,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { PayCardAssignDialog } from '@/features/billing/components/PayCardAssignDialog'
import { PayCardConflictsBanner } from '@/features/billing/components/PayCardConflictNotice'
import { RateCardStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { SectionInfoTip } from '@/features/billing/components/SectionInfoTip'
import {
  useDeletePayCard,
  usePayCard,
  usePayCards,
  useUnassignPayCardEmployee,
} from '@/features/billing/hooks/usePayCards'
import {
  formatBillingDate,
  formatPayCardAssignmentDisplay,
  type PayCard,
} from '@/features/billing/types/billing-cards.types'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'

function PayCardStatCard({
  title,
  value,
  hint,
  icon,
  iconClassName,
  loading,
}: {
  title: string
  value: number
  hint: string
  icon: React.ReactNode
  iconClassName: string
  loading?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-display font-bold tabular-nums text-foreground">
            {loading ? '—' : value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            iconClassName,
          )}
        >
          {icon}
        </span>
      </div>
    </div>
  )
}

function usePayCardStats(cards: PayCard[] | undefined) {
  return React.useMemo(() => {
    const list = cards ?? []
    const total = list.length
    const active = list.filter(c => c.status === 'ACTIVE').length
    const draft = list.filter(c => c.status === 'DRAFT').length
    const assignedCards = list.filter(c => (c.assignedCarerCount ?? c.assignedCarers?.length ?? 0) > 0).length
    const assignedCarers = list.reduce(
      (sum, c) => sum + (c.assignedCarerCount ?? c.assignedCarers?.length ?? 0),
      0,
    )
    return { total, active, draft, assignedCards, assignedCarers }
  }, [cards])
}

type AssignedCarersDialogProps = {
  cardId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AssignedCarersDialog({ cardId, open, onOpenChange }: AssignedCarersDialogProps) {
  const canManage = useAuthStore(s => s.can('billing.pay_cards.manage' as never))
  const cardQuery = usePayCard(cardId, open && !!cardId)
  const unassignMutation = useUnassignPayCardEmployee()
  const card = cardQuery.data ?? null
  const carers = card?.assignedCarers ?? []
  const totalCount = card?.assignedCarerCount ?? carers.length
  const [unassigningId, setUnassigningId] = React.useState<string | null>(null)

  const onUnassign = async (carer: { employeeId: string; fullName: string }) => {
    if (!cardId) return
    if (!window.confirm(`Unassign ${carer.fullName} from this pay card?`)) return
    setUnassigningId(carer.employeeId)
    try {
      await unassignMutation.mutateAsync({ id: cardId, employeeId: carer.employeeId })
      toastSuccess(`${carer.fullName} unassigned from pay card.`)
    } catch (err) {
      toastApiError(err, 'Could not unassign carer.')
    } finally {
      setUnassigningId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assigned carers</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {cardQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading assigned carers…</p>
          ) : cardQuery.error ? (
            <p className="text-sm text-destructive">
              {cardQuery.error instanceof ApiError
                ? cardQuery.error.message
                : 'Could not load assigned carers.'}
            </p>
          ) : card ? (
            <>
              <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{card.name}</p>
                <p className="text-xs text-muted-foreground">
                  {card.code} · {formatPayCardAssignmentDisplay(card)}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                {totalCount} carer{totalCount === 1 ? '' : 's'} assigned to this pay card
              </p>

              {totalCount <= 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  No carers assigned yet. Use Assign to attach this card to matching carers.
                </p>
              ) : (
                <div className="max-h-[360px] overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Carer</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee no.</th>
                        {canManage ? (
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {carers.map(carer => (
                        <tr key={carer.employeeId} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5">
                            <Link
                              to="/employee/$employeeId/edit"
                              params={{ employeeId: carer.employeeId }}
                              className="font-medium text-foreground underline-offset-2 hover:underline"
                              onClick={() => onOpenChange(false)}
                            >
                              {carer.fullName}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {carer.employeeNumber?.trim() || '—'}
                          </td>
                          {canManage ? (
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-destructive hover:text-destructive"
                                disabled={unassignMutation.isPending}
                                onClick={() => onUnassign(carer)}
                              >
                                <UserMinus className="size-3.5" />
                                {unassigningId === carer.employeeId ? 'Unassigning…' : 'Unassign'}
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalCount > carers.length ? (
                    <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                      Showing {carers.length} of {totalCount} carers
                    </p>
                  ) : null}
                </div>
              )}
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PayCardsPanel() {
  const canManage = useAuthStore(s => s.can('billing.pay_cards.manage' as never))
  const navigate = useNavigate()
  const { locationId } = useGlobalLocationScope()
  const [search, setSearch] = React.useState('')
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false)
  const [viewCarersOpen, setViewCarersOpen] = React.useState(false)
  const [assigning, setAssigning] = React.useState<PayCard | null>(null)
  const [viewingCarersId, setViewingCarersId] = React.useState<string | null>(null)

  const listFilters = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(locationId ? { locationId } : {}),
  }
  const listQuery = usePayCards(Object.keys(listFilters).length ? listFilters : undefined)
  const statsQuery = usePayCards(locationId ? { locationId } : undefined)
  const deleteMutation = useDeletePayCard()
  const stats = usePayCardStats(statsQuery.data)

  const rows = listQuery.data ?? []
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load pay cards.'
        : null

  const openCreate = () => void navigate({ to: '/billing/pay-cards/new' })

  const openEdit = (card: PayCard) =>
    void navigate({ to: '/billing/pay-cards/$payCardId/edit', params: { payCardId: card.id } })

  const openAssign = (card: PayCard) => {
    setAssigning(card)
    setAssignDialogOpen(true)
  }

  const openViewCarers = (card: PayCard) => {
    setViewingCarersId(card.id)
    setViewCarersOpen(true)
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
        title={
          <TooltipProvider delayDuration={150}>
            <span className="inline-flex items-center gap-1.5">
              Carer pay cards
              <SectionInfoTip label="carer pay cards">
                Reusable pay rate templates. Set branch, role, or employment type criteria, then bulk-assign
                carers here or override on each employee profile.
              </SectionInfoTip>
            </span>
          </TooltipProvider>
        }
        action={
          canManage ? (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New pay card
            </Button>
          ) : undefined
        }
      />

      <PayCardConflictsBanner />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PayCardStatCard
          title="Total pay cards"
          value={stats.total}
          hint="All rate templates"
          loading={statsQuery.isLoading}
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
        />
        <PayCardStatCard
          title="Active cards"
          value={stats.active}
          hint="Ready to use for pay"
          loading={statsQuery.isLoading}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
          iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        />
        <PayCardStatCard
          title="Assigned cards"
          value={stats.assignedCards}
          hint={`${stats.assignedCarers} carer${stats.assignedCarers === 1 ? '' : 's'} linked`}
          loading={statsQuery.isLoading}
          icon={<Users className="h-5 w-5" aria-hidden />}
          iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
        />
        <PayCardStatCard
          title="Draft cards"
          value={stats.draft}
          hint="Not yet activated"
          loading={statsQuery.isLoading}
          icon={<FileEdit className="h-5 w-5" aria-hidden />}
          iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
        />
      </div>

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
        <table className="w-full min-w-[1080px] text-sm" data-testid="pay-cards-table">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Applies to</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Assigned carers</th>
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
              rows.map(row => {
                const carerCount = row.assignedCarerCount ?? row.assignedCarers?.length ?? 0
                return (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-medium">{row.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {row.code}
                      <span className="ml-1.5 font-sans">· v{row.version ?? 1}</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatPayCardAssignmentDisplay(row)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-muted-foreground">
                          {carerCount}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => openViewCarers(row)}
                        >
                          View
                        </Button>
                      </div>
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
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Carer pay and client charge must stay separate. Use premiums or overrides when a service user needs higher carer pay.
      </p>

      <PayCardAssignDialog
        card={assigning}
        open={assignDialogOpen}
        onOpenChange={open => {
          setAssignDialogOpen(open)
          if (!open) setAssigning(null)
        }}
      />
      <AssignedCarersDialog
        cardId={viewingCarersId}
        open={viewCarersOpen}
        onOpenChange={open => {
          setViewCarersOpen(open)
          if (!open) setViewingCarersId(null)
        }}
      />
    </div>
  )
}
