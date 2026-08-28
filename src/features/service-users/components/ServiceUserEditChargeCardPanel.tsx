import * as React from 'react'
import { useQueries } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { fetchChargeCard } from '@/features/billing/api/charge-cards.api'
import { useResolveServiceUserChargeCard } from '@/features/billing/hooks/useChargeCards'
import { ChargeCardDetailsView } from '@/features/billing/components/ChargeCardDetailsView'
import { billingKeys } from '@/features/billing/keys'
import {
  CHARGE_CARD_ASSIGNMENT_OPTIONS,
  type ChargeCard,
} from '@/features/billing/types/billing-cards.types'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useUpdateServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import { useServiceUserEnterpriseFundings } from '@/features/service-users/hooks/useServiceUserTabs'
import type { EnterpriseServiceUserFundingRow } from '@/features/service-users/api/service-users.api'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

type ChargeCardSourceEntry = {
  cardId: string
  contexts: string[]
}

function fundingDisplayName(row: EnterpriseServiceUserFundingRow): string {
  return (
    row.packageName?.trim()
    || row.fundingReference?.trim()
    || row.fundingType?.name
    || 'Funding contract'
  )
}

function resolveChargeCardForFunding(row: EnterpriseServiceUserFundingRow): string | null {
  return (
    row.defaultChargeCardId
    ?? row.defaultChargeCard?.id
    ?? row.funder?.defaultChargeCardId
    ?? row.funder?.defaultChargeCard?.id
    ?? null
  )
}

function listActiveFundings(fundings: EnterpriseServiceUserFundingRow[]): EnterpriseServiceUserFundingRow[] {
  return fundings.filter(row => row.status !== 'ENDED' && row.status !== 'REJECTED')
}

function collectChargeCardSources(params: {
  fundings: EnterpriseServiceUserFundingRow[]
  serviceUserCardId: string | null
  resolvedCardId: string | null
  resolvedIsMatched: boolean
}): ChargeCardSourceEntry[] {
  const map = new Map<string, ChargeCardSourceEntry>()
  const activeFundings = listActiveFundings(params.fundings)

  const add = (cardId: string | null | undefined, context: string) => {
    const id = cardId?.trim()
    if (!id) return
    const existing = map.get(id) ?? { cardId: id, contexts: [] }
    if (!existing.contexts.includes(context)) existing.contexts.push(context)
    map.set(id, existing)
  }

  if (activeFundings.length > 0) {
    for (const row of activeFundings) {
      const cardId = resolveChargeCardForFunding(row)
      if (!cardId) continue
      const funderName = row.funder?.name?.trim() || 'Unknown funder'
      const fundingName = fundingDisplayName(row)
      const primarySuffix = row.isPrimary ? ' · primary' : ''
      add(cardId, `Funding: ${fundingName} (${funderName})${primarySuffix}`)
    }
    return [...map.values()]
  }

  if (params.serviceUserCardId) {
    add(params.serviceUserCardId, 'Service user override')
  } else if (params.resolvedCardId) {
    add(
      params.resolvedCardId,
      params.resolvedIsMatched ? 'Auto-matched for billing' : 'Resolved for billing',
    )
  }

  return [...map.values()]
}

function resolveBillingDefaultCardId(
  fundings: EnterpriseServiceUserFundingRow[],
  resolvedCardId: string | null,
): string | null {
  const activeFundings = listActiveFundings(fundings)
  if (activeFundings.length > 0) {
    const primary = activeFundings.find(row => row.isPrimary) ?? activeFundings[0]
    return primary ? resolveChargeCardForFunding(primary) : null
  }
  return resolvedCardId
}

function fundingRowsMissingChargeCard(fundings: EnterpriseServiceUserFundingRow[]): string[] {
  const missing: string[] = []
  for (const row of fundings) {
    if (row.status === 'ENDED' || row.status === 'REJECTED') continue
    if (resolveChargeCardForFunding(row)) continue
    const funderName = row.funder?.name?.trim() || 'Unknown funder'
    const fundingName = fundingDisplayName(row)
    missing.push(`${funderName} — ${fundingName}${row.isPrimary ? ' (primary)' : ''}`)
  }
  return missing
}

export function ServiceUserEditChargeCardPanel({ serviceUserId }: { serviceUserId: string }) {
  const canManageBilling = useAuthStore(
    s => s.can('billing.charge_cards.manage' as never) || s.can('billing.charge_cards.read' as never),
  )
  const canUpdateServiceUser = useAuthStore(s => s.can('service_users.update'))

  const serviceUserQuery = useServiceUser(serviceUserId)
  const fundingsQuery = useServiceUserEnterpriseFundings(serviceUserId)
  const resolveQuery = useResolveServiceUserChargeCard(serviceUserId)
  const updateServiceUserMutation = useUpdateServiceUser(serviceUserId)

  const serviceUserCardId =
    serviceUserQuery.data?.defaultChargeCardId
    ?? serviceUserQuery.data?.defaultChargeCard?.id
    ?? null
  const serviceUserCardName = serviceUserQuery.data?.defaultChargeCard?.name ?? 'Service user default'

  const fundings = fundingsQuery.data?.rows ?? []
  const resolved = resolveQuery.data
  const resolvedCardId = resolved?.chargeCard?.id ?? null
  const activeFundings = React.useMemo(() => listActiveFundings(fundings), [fundings])

  const billingDefaultCardId = React.useMemo(
    () => resolveBillingDefaultCardId(fundings, resolvedCardId),
    [fundings, resolvedCardId],
  )

  const legacyServiceUserOverride = React.useMemo(() => {
    if (!serviceUserCardId || activeFundings.length === 0) return null
    const fundingCardIds = new Set(
      activeFundings.map(row => resolveChargeCardForFunding(row)).filter((id): id is string => Boolean(id)),
    )
    if (fundingCardIds.has(serviceUserCardId)) return null
    return { id: serviceUserCardId, name: serviceUserCardName }
  }, [serviceUserCardId, serviceUserCardName, activeFundings])

  const sourceEntries = React.useMemo(
    () =>
      collectChargeCardSources({
        fundings,
        serviceUserCardId,
        resolvedCardId,
        resolvedIsMatched: resolved?.source === 'MATCHED',
      }),
    [fundings, serviceUserCardId, resolvedCardId, resolved?.source],
  )

  const cardIds = React.useMemo(() => sourceEntries.map(e => e.cardId), [sourceEntries])

  const cardQueries = useQueries({
    queries: cardIds.map(id => ({
      queryKey: billingKeys.chargeCard(id),
      queryFn: () => fetchChargeCard(id),
      enabled: Boolean(id),
      staleTime: 60_000,
    })),
  })

  const cardsById = React.useMemo(() => {
    const map = new Map<string, ChargeCard>()
    for (let i = 0; i < cardIds.length; i++) {
      const id = cardIds[i]!
      const fromQuery = cardQueries[i]?.data
      if (fromQuery) {
        map.set(id, fromQuery)
        continue
      }
      if (resolved?.chargeCard?.id === id) {
        map.set(id, resolved.chargeCard)
      }
    }
    return map
  }, [cardIds, cardQueries, resolved?.chargeCard])

  const missingFundings = React.useMemo(() => fundingRowsMissingChargeCard(fundings), [fundings])

  const listLoading =
    serviceUserQuery.isLoading || fundingsQuery.isLoading || resolveQuery.isLoading
  const cardsLoading = cardQueries.some(q => q.isLoading)

  const error =
    serviceUserQuery.error instanceof ApiError
      ? serviceUserQuery.error.message
      : fundingsQuery.error instanceof ApiError
        ? fundingsQuery.error.message
        : resolveQuery.error instanceof ApiError
          ? resolveQuery.error.message
          : cardQueries.find(q => q.error instanceof ApiError)?.error instanceof ApiError
            ? (cardQueries.find(q => q.error instanceof ApiError)?.error as ApiError).message
            : serviceUserQuery.error || fundingsQuery.error || resolveQuery.error || cardQueries.some(q => q.error)
              ? 'Could not load charge cards.'
              : null

  const activeFundingCount = activeFundings.length

  const removeLegacyOverride = async () => {
    try {
      await updateServiceUserMutation.mutateAsync({ body: { defaultChargeCardId: null } })
      toastSuccess('Service user default charge card removed')
      void resolveQuery.refetch()
    } catch (e) {
      toastApiError(e, 'Could not remove default charge card')
    }
  }

  const matchedLevelLabel = resolved?.matchedLevel
    ? CHARGE_CARD_ASSIGNMENT_OPTIONS.find(o => o.value === resolved.matchedLevel)?.label
    : null

  const loading = listLoading || (cardIds.length > 0 && cardsLoading && cardsById.size === 0)

  return (
    <div className="space-y-6" data-testid="service-user-charge-card-panel">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Charge cards</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only view of charge rates linked to each active funding contract (funding-level card,
          otherwise the funder default). With split funding, one card is shown per funding line. The
          card marked Default for billing is what invoicing uses for the primary funding unless a
          visit is tied to another contract.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading charge cards…
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && legacyServiceUserOverride ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-3 text-sm">
          <p className="font-medium text-foreground">Legacy service user default</p>
          <p className="mt-1 text-muted-foreground">
            <span className="font-medium text-foreground">{legacyServiceUserOverride.name}</span> is still
            assigned on this service user from an earlier setup. Split funding uses the charge cards on each
            funding line instead — you can remove this legacy default.
          </p>
          {canUpdateServiceUser ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={updateServiceUserMutation.isPending}
              onClick={() => void removeLegacyOverride()}
            >
              {updateServiceUserMutation.isPending ? 'Removing…' : 'Remove service user default'}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && sourceEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No charge cards linked</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Attach a charge card on the Funding tab (per funder or funding contract), or in Billing.
          </p>
        </div>
      ) : null}

      {!loading && missingFundings.length > 0 ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-3 text-sm">
          <p className="font-medium text-foreground">Fundings without a charge card</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {missingFundings.map(label => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!loading && sourceEntries.length > 0 ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Showing {sourceEntries.length} charge card{sourceEntries.length === 1 ? '' : 's'}
            {activeFundingCount > 0
              ? ` across ${activeFundingCount} funding${activeFundingCount === 1 ? '' : 's'}`
              : ''}
            .
          </p>
          {sourceEntries.map((entry) => {
            const card = cardsById.get(entry.cardId)
            if (!card) {
              return (
                <div
                  key={entry.cardId}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-6 text-sm text-muted-foreground"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading {entry.contexts[0] ?? 'charge card'}…
                </div>
              )
            }
            const isBillingDefault = billingDefaultCardId === entry.cardId
            return (
              <ChargeCardDetailsView
                key={entry.cardId}
                card={card}
                resolveSource={
                  isBillingDefault
                    ? activeFundings.length > 0
                      ? 'EXPLICIT_FUNDING'
                      : (resolved?.source ?? null)
                    : null
                }
                matchedLevelLabel={isBillingDefault ? matchedLevelLabel : null}
                contextLabels={entry.contexts}
                isBillingDefault={isBillingDefault}
                showManageLink={canManageBilling}
                showRules
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
