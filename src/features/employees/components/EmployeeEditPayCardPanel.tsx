import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { usePayCards, useResolveEmployeePayCard } from '@/features/billing/hooks/usePayCards'
import { RateCardStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import {
  formatBillingDate,
  formatPayCardAssignmentDisplay,
  PAY_CARD_ASSIGNMENT_OPTIONS,
  type PayCard,
} from '@/features/billing/types/billing-cards.types'
import { useEmployee } from '@/features/employees/hooks/useEmployees'
import { usePatchEmploymentMutation } from '@/features/employees/hooks/useEmployeeMutations'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { FormField } from '@/shared/ui/form-field'

function payCardOptionLabel(card: PayCard): string {
  return `${card.name} (${card.code})`
}

export function EmployeeEditPayCardPanel({ employeeId }: { employeeId: string }) {
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const employeeQuery = useEmployee(employeeId)
  const payCardsQuery = usePayCards()
  const resolveQuery = useResolveEmployeePayCard(employeeId)
  const patchEmploymentMutation = usePatchEmploymentMutation()

  const savedPayCard = employeeQuery.data?.employment?.defaultPayCard ?? null
  const savedPayCardId =
    employeeQuery.data?.employment?.defaultPayCardId ?? savedPayCard?.id ?? ''

  const [selectedPayCardId, setSelectedPayCardId] = React.useState('')
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    setSelectedPayCardId(savedPayCardId)
    setDirty(false)
  }, [savedPayCardId])

  const payCardOptions = React.useMemo(() => {
    const cards = payCardsQuery.data ?? []
    const options = cards.map(card => ({
      value: card.id,
      label: payCardOptionLabel(card),
    }))
    if (selectedPayCardId && !options.some(o => o.value === selectedPayCardId)) {
      const label = savedPayCard
        ? payCardOptionLabel(savedPayCard as PayCard)
        : '(saved pay card)'
      return [{ value: selectedPayCardId, label }, ...options]
    }
    return options
  }, [payCardsQuery.data, selectedPayCardId, savedPayCard])

  const selectedPayCard = React.useMemo(() => {
    const fromList = (payCardsQuery.data ?? []).find(card => card.id === selectedPayCardId)
    if (fromList) return fromList
    if (savedPayCard && savedPayCard.id === selectedPayCardId) {
      return savedPayCard as PayCard
    }
    return null
  }, [payCardsQuery.data, selectedPayCardId, savedPayCard])

  const resolved = resolveQuery.data
  const suggestedCard =
    !savedPayCardId && resolved?.source === 'MATCHED' ? resolved.payCard : null

  const loading = employeeQuery.isLoading || payCardsQuery.isLoading || resolveQuery.isLoading
  const error =
    employeeQuery.error instanceof ApiError
      ? employeeQuery.error.message
      : payCardsQuery.error instanceof ApiError
        ? payCardsQuery.error.message
        : resolveQuery.error instanceof ApiError
          ? resolveQuery.error.message
          : employeeQuery.error || payCardsQuery.error || resolveQuery.error
            ? 'Could not load pay card settings.'
            : null

  const onSave = async () => {
    if (!canUpdate) return
    try {
      await patchEmploymentMutation.mutateAsync({
        employeeId,
        body: { defaultPayCardId: selectedPayCardId || null },
      })
      setDirty(false)
      toastSuccess('Pay card assignment saved.')
    } catch (err) {
      toastApiError(err, 'Could not save pay card assignment.')
    }
  }

  const applySuggested = () => {
    if (!suggestedCard) return
    setSelectedPayCardId(suggestedCard.id)
    setDirty(suggestedCard.id !== savedPayCardId)
  }

  return (
    <div className="space-y-6" data-testid="employee-pay-card-panel">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Pay card</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set this carer&apos;s default pay rate card. Like Birdie and Access, you can bulk-assign
          from Billing → Pay cards, or override here for an individual carer.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pay card settings…
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && suggestedCard ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Suggested pay card</p>
            <p className="text-xs text-muted-foreground">
              Matched by{' '}
              {PAY_CARD_ASSIGNMENT_OPTIONS.find(o => o.value === resolved?.matchedLevel)?.label?.toLowerCase() ??
                'criteria'}
              . Save to apply, or choose a different card below.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{suggestedCard.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatPayCardAssignmentDisplay(suggestedCard)}
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
          <FormField label="Default pay card" htmlFor="employee-default-pay-card">
            <Combobox
              id="employee-default-pay-card"
              options={payCardOptions}
              value={selectedPayCardId}
              onChange={value => {
                setSelectedPayCardId(value)
                setDirty(value !== savedPayCardId)
              }}
              placeholder="Select pay card"
              disabled={!canUpdate || patchEmploymentMutation.isPending}
              allowDeselect
            />
          </FormField>

          {selectedPayCard ? (
            <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{selectedPayCard.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedPayCard.code}</p>
                </div>
                <RateCardStatusBadge status={selectedPayCard.status} />
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Applies to</dt>
                  <dd>{formatPayCardAssignmentDisplay(selectedPayCard)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Effective</dt>
                  <dd>
                    {formatBillingDate(selectedPayCard.effectiveFrom)}
                    {selectedPayCard.effectiveTo
                      ? ` → ${formatBillingDate(selectedPayCard.effectiveTo)}`
                      : ' → open'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rate rules</dt>
                  <dd>{selectedPayCard.rules?.length ?? 0}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              {resolved?.source === 'MATCHED' && resolved.payCard
                ? 'No explicit pay card saved yet. Use the suggestion above or pick a card manually.'
                : 'No pay card assigned. Payroll will raise a missing rate exception until a card is selected.'}
            </p>
          )}

          {canUpdate ? (
            <div className="flex justify-end border-t border-border pt-4">
              <Button
                type="button"
                onClick={onSave}
                disabled={!dirty || patchEmploymentMutation.isPending}
                data-testid="employee-pay-card-save"
              >
                {patchEmploymentMutation.isPending ? 'Saving…' : 'Save pay card'}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
