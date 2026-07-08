import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  useChargeCards,
  useResolveServiceUserChargeCard,
} from '@/features/billing/hooks/useChargeCards'
import { RateCardStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import {
  CHARGE_CARD_ASSIGNMENT_OPTIONS,
  formatBillingDate,
  formatChargeCardAssignmentDisplay,
  type ChargeCard,
} from '@/features/billing/types/billing-cards.types'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useUpdateServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { FormField } from '@/shared/ui/form-field'

function chargeCardOptionLabel(card: ChargeCard): string {
  return `${card.name} (${card.code})`
}

export function ServiceUserEditChargeCardPanel({ serviceUserId }: { serviceUserId: string }) {
  const canUpdate = useAuthStore(s => s.can('service_users.update'))
  const serviceUserQuery = useServiceUser(serviceUserId)
  const chargeCardsQuery = useChargeCards()
  const resolveQuery = useResolveServiceUserChargeCard(serviceUserId)
  const updateMutation = useUpdateServiceUser(serviceUserId)

  const savedCard = serviceUserQuery.data?.defaultChargeCard ?? null
  const savedCardId = serviceUserQuery.data?.defaultChargeCardId ?? savedCard?.id ?? ''

  const [selectedCardId, setSelectedCardId] = React.useState('')
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    setSelectedCardId(savedCardId)
    setDirty(false)
  }, [savedCardId])

  const cardOptions = React.useMemo(() => {
    const cards = chargeCardsQuery.data ?? []
    const options = cards.map(card => ({
      value: card.id,
      label: chargeCardOptionLabel(card),
    }))
    if (selectedCardId && !options.some(o => o.value === selectedCardId)) {
      const label = savedCard ? chargeCardOptionLabel(savedCard as ChargeCard) : '(saved charge card)'
      return [{ value: selectedCardId, label }, ...options]
    }
    return options
  }, [chargeCardsQuery.data, selectedCardId, savedCard])

  const selectedCard = React.useMemo(() => {
    const fromList = (chargeCardsQuery.data ?? []).find(card => card.id === selectedCardId)
    if (fromList) return fromList
    if (savedCard && savedCard.id === selectedCardId) return savedCard as ChargeCard
    return null
  }, [chargeCardsQuery.data, selectedCardId, savedCard])

  const resolved = resolveQuery.data
  const suggestedCard =
    !savedCardId && resolved?.source === 'MATCHED' ? resolved.chargeCard : null

  const loading = serviceUserQuery.isLoading || chargeCardsQuery.isLoading || resolveQuery.isLoading
  const error =
    serviceUserQuery.error instanceof ApiError
      ? serviceUserQuery.error.message
      : chargeCardsQuery.error instanceof ApiError
        ? chargeCardsQuery.error.message
        : resolveQuery.error instanceof ApiError
          ? resolveQuery.error.message
          : serviceUserQuery.error || chargeCardsQuery.error || resolveQuery.error
            ? 'Could not load charge card settings.'
            : null

  const onSave = async () => {
    if (!canUpdate) return
    try {
      await updateMutation.mutateAsync({ body: { defaultChargeCardId: selectedCardId || null } })
      setDirty(false)
      toastSuccess('Charge card saved.')
    } catch (err) {
      toastApiError(err, 'Could not save charge card.')
    }
  }

  const applySuggested = () => {
    if (!suggestedCard) return
    setSelectedCardId(suggestedCard.id)
    setDirty(suggestedCard.id !== savedCardId)
  }

  return (
    <div className="space-y-6" data-testid="service-user-charge-card-panel">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Charge card</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Default invoice rates for this service user. Funder and funding-contract cards take priority
          when set — override here for private or self-funded clients.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading charge card settings…
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && resolved && resolved.source !== 'NONE' && resolved.source !== 'MATCHED' && resolved.chargeCard ? (
        <div className="rounded-lg border border-border bg-muted/10 p-4 text-sm">
          <p className="font-medium text-foreground">Currently resolving from</p>
          <p className="mt-1 text-muted-foreground">
            {resolved.source === 'EXPLICIT_FUNDING'
              ? 'Primary funding contract'
              : resolved.source === 'EXPLICIT_FUNDER'
                ? 'Funder / payer profile'
                : 'Service user override'}
            : {resolved.chargeCard.name}
          </p>
        </div>
      ) : null}

      {!loading && suggestedCard ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Suggested charge card</p>
            <p className="text-xs text-muted-foreground">
              Matched by{' '}
              {CHARGE_CARD_ASSIGNMENT_OPTIONS.find(o => o.value === resolved?.matchedLevel)?.label?.toLowerCase() ??
                'attach-to criteria'}
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{suggestedCard.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatChargeCardAssignmentDisplay(suggestedCard)}
              </p>
            </div>
            {canUpdate ? (
              <Button type="button" size="sm" variant="outline" onClick={applySuggested}>
                Use suggested card
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!loading ? (
        <>
          <FormField label="Service user charge card" htmlFor="service-user-default-charge-card">
            <Combobox
              id="service-user-default-charge-card"
              options={cardOptions}
              value={selectedCardId}
              onChange={value => {
                setSelectedCardId(value)
                setDirty(value !== savedCardId)
              }}
              placeholder="Select charge card"
              disabled={!canUpdate || updateMutation.isPending}
              allowDeselect
            />
          </FormField>

          {selectedCard ? (
            <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{selectedCard.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedCard.code}</p>
                </div>
                <RateCardStatusBadge status={selectedCard.status} />
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Attach to</dt>
                  <dd>{formatChargeCardAssignmentDisplay(selectedCard)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Effective</dt>
                  <dd>
                    {formatBillingDate(selectedCard.effectiveFrom)}
                    {selectedCard.effectiveTo
                      ? ` → ${formatBillingDate(selectedCard.effectiveTo)}`
                      : ' → open'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rate rules</dt>
                  <dd>{selectedCard.rules?.length ?? 0}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              No service-user charge card set. Billing will use the funder or funding contract card, or
              raise a missing rate exception.
            </p>
          )}

          {canUpdate ? (
            <div className="flex justify-end border-t border-border pt-4">
              <Button type="button" onClick={onSave} disabled={!dirty || updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save charge card'}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
