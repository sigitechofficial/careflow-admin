import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { PayCardDetailsView } from '@/features/billing/components/PayCardDetailsView'
import { usePayCard, usePayCards, useResolveEmployeePayCard } from '@/features/billing/hooks/usePayCards'
import {
  PAY_CARD_ASSIGNMENT_OPTIONS,
  formatPayCardAssignmentDisplay,
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
  const canManageBilling = useAuthStore(s => s.can('billing.pay_cards.manage' as never))
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

  const attachedPayCardQuery = usePayCard(savedPayCardId || null, Boolean(savedPayCardId))
  const previewPayCardQuery = usePayCard(
    dirty && selectedPayCardId && selectedPayCardId !== savedPayCardId ? selectedPayCardId : null,
    Boolean(dirty && selectedPayCardId && selectedPayCardId !== savedPayCardId),
  )

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

  const resolved = resolveQuery.data
  const suggestedCard =
    !savedPayCardId && resolved?.source === 'MATCHED' ? resolved.payCard : null

  const matchedLevelLabel =
    PAY_CARD_ASSIGNMENT_OPTIONS.find(o => o.value === resolved?.matchedLevel)?.label ?? null

  const attachedCard = savedPayCardId
    ? attachedPayCardQuery.data ?? null
    : resolved?.payCard ?? null

  const previewCard = dirty && selectedPayCardId !== savedPayCardId
    ? previewPayCardQuery.data ?? null
    : null

  const loading =
    employeeQuery.isLoading ||
    payCardsQuery.isLoading ||
    resolveQuery.isLoading ||
    (Boolean(savedPayCardId) && attachedPayCardQuery.isLoading)

  const error =
    employeeQuery.error instanceof ApiError
      ? employeeQuery.error.message
      : payCardsQuery.error instanceof ApiError
        ? payCardsQuery.error.message
        : resolveQuery.error instanceof ApiError
          ? resolveQuery.error.message
          : attachedPayCardQuery.error instanceof ApiError
            ? attachedPayCardQuery.error.message
            : employeeQuery.error || payCardsQuery.error || resolveQuery.error || attachedPayCardQuery.error
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
          Default pay rate card for this carer. Payroll uses these rules when calculating visit pay.
          Bulk-assign from Billing → Pay cards, or override here for an individual carer.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pay card settings…
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && attachedCard ? (
        <PayCardDetailsView
          card={attachedCard}
          assignmentSource={savedPayCardId ? 'EXPLICIT' : resolved?.source === 'MATCHED' ? 'MATCHED' : null}
          matchedLevelLabel={matchedLevelLabel}
          loading={Boolean(savedPayCardId) && attachedPayCardQuery.isLoading}
          showManageLink={canManageBilling}
        />
      ) : null}

      {!loading && !attachedCard && suggestedCard ? (
        <>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Suggested pay card</p>
              <p className="text-xs text-muted-foreground">
                Matched by {matchedLevelLabel?.toLowerCase() ?? 'criteria'}. Save below to assign explicitly,
                or use the suggestion now.
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
          <PayCardDetailsView
            card={suggestedCard}
            assignmentSource="MATCHED"
            matchedLevelLabel={matchedLevelLabel}
            showManageLink={canManageBilling}
          />
        </>
      ) : null}

      {!loading && !attachedCard && !suggestedCard ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No pay card assigned. Payroll will raise a missing rate exception until a card is selected.
        </p>
      ) : null}

      {!loading ? (
        <>
          <FormField label="Change pay card" htmlFor="employee-default-pay-card">
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

          {previewCard ? (
            <PayCardDetailsView
              card={previewCard}
              assignmentSource="PREVIEW"
              loading={previewPayCardQuery.isLoading}
              showManageLink={canManageBilling}
            />
          ) : null}

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
