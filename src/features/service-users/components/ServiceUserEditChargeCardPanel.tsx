import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import {
  useChargeCard,
  useResolveServiceUserChargeCard,
} from '@/features/billing/hooks/useChargeCards'
import { ChargeCardDetailsView } from '@/features/billing/components/ChargeCardDetailsView'
import {
  CHARGE_CARD_ASSIGNMENT_OPTIONS,
  type ChargeCard,
} from '@/features/billing/types/billing-cards.types'

export function ServiceUserEditChargeCardPanel({ serviceUserId }: { serviceUserId: string }) {
  const canManageBilling = useAuthStore(
    s => s.can('billing.charge_cards.manage' as never) || s.can('billing.charge_cards.read' as never),
  )
  const resolveQuery = useResolveServiceUserChargeCard(serviceUserId)

  const resolvedCardId = resolveQuery.data?.chargeCard?.id ?? null
  const detailQuery = useChargeCard(resolvedCardId, Boolean(resolvedCardId))

  const card: ChargeCard | null =
    detailQuery.data
    ?? resolveQuery.data?.chargeCard
    ?? null

  const loading = resolveQuery.isLoading || (Boolean(resolvedCardId) && detailQuery.isLoading)
  const error =
    resolveQuery.error instanceof ApiError
      ? resolveQuery.error.message
      : detailQuery.error instanceof ApiError
        ? detailQuery.error.message
        : resolveQuery.error || detailQuery.error
          ? 'Could not load charge card.'
          : null

  const matchedLevelLabel = resolveQuery.data?.matchedLevel
    ? CHARGE_CARD_ASSIGNMENT_OPTIONS.find(o => o.value === resolveQuery.data?.matchedLevel)?.label
    : null

  return (
    <div className="space-y-6" data-testid="service-user-charge-card-panel">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Charge card</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only view of the charge rates used when invoicing this service user. Cards are managed
          in Billing; funder and funding-contract cards take priority when set.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading charge card…
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error && !card ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No charge card resolved</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No funder, funding-contract, or service-user charge card applies. Billing may raise a
            missing rate exception until a card is attached in Billing.
          </p>
        </div>
      ) : null}

      {!loading && card ? (
        <ChargeCardDetailsView
          card={card}
          resolveSource={resolveQuery.data?.source ?? null}
          matchedLevelLabel={matchedLevelLabel}
          loading={detailQuery.isFetching && !detailQuery.data}
          showManageLink={canManageBilling}
        />
      ) : null}
    </div>
  )
}
