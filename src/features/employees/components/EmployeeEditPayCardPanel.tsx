import * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Save,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
import {
  isPayCardAssignableToEmployment,
  type EmploymentPayCardMatchInput,
} from '@/features/billing/utils/pay-card-match.util'
import { useEmployee } from '@/features/employees/hooks/useEmployees'
import { usePatchEmploymentMutation } from '@/features/employees/hooks/useEmployeeMutations'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'

function payCardOptionLabel(card: PayCard, incompatible = false): string {
  const base = `${card.name} (${card.code}) · ${formatPayCardAssignmentDisplay(card)}`
  return incompatible ? `${base} — does not match this carer` : base
}

function StatusChip({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode
  label: string
  className: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
        className,
      )}
    >
      {icon}
      {label}
    </div>
  )
}

export function EmployeeEditPayCardPanel({ employeeId }: { employeeId: string }) {
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const canManageBilling = useAuthStore(s => s.can('billing.pay_cards.manage' as never))
  const employeeQuery = useEmployee(employeeId)
  const payCardsQuery = usePayCards()
  const resolveQuery = useResolveEmployeePayCard(employeeId)
  const patchEmploymentMutation = usePatchEmploymentMutation()

  const employment = employeeQuery.data?.employment
  const matchInput = React.useMemo<EmploymentPayCardMatchInput | null>(() => {
    if (!employment) return null
    return {
      employeeId,
      roleId: employment.roleId ?? null,
      locationId: employment.locationId ?? null,
      baseLocationId: employment.baseLocationId ?? null,
      contractTypeId: employment.contractTypeId ?? null,
      isAgencyStaff: employment.isAgencyStaff ?? false,
      isBankStaff: employment.isBankStaff ?? false,
    }
  }, [employeeId, employment])

  const savedPayCard = employment?.defaultPayCard ?? null
  const savedPayCardId = employment?.defaultPayCardId ?? savedPayCard?.id ?? ''

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

  const compatibleCards = React.useMemo(() => {
    const cards = payCardsQuery.data ?? []
    if (!matchInput) return []
    return cards.filter(card => isPayCardAssignableToEmployment(card, matchInput))
  }, [payCardsQuery.data, matchInput])

  const selectedCardMeta = React.useMemo(() => {
    const fromList = (payCardsQuery.data ?? []).find(c => c.id === selectedPayCardId)
    if (fromList) return fromList
    if (selectedPayCardId && savedPayCard?.id === selectedPayCardId) {
      return savedPayCard as PayCard
    }
    return null
  }, [payCardsQuery.data, selectedPayCardId, savedPayCard])

  const selectedIsCompatible =
    !selectedPayCardId ||
    (selectedCardMeta
      ? isPayCardAssignableToEmployment(selectedCardMeta, matchInput)
      : false)

  const savedIsIncompatible =
    Boolean(savedPayCardId) &&
    Boolean(attachedPayCardQuery.data) &&
    !isPayCardAssignableToEmployment(attachedPayCardQuery.data!, matchInput)

  const payCardOptions = React.useMemo(() => {
    const options = compatibleCards.map(card => ({
      value: card.id,
      label: payCardOptionLabel(card),
    }))
    // Keep a currently selected incompatible card visible so it can be cleared.
    if (
      selectedPayCardId &&
      !options.some(o => o.value === selectedPayCardId) &&
      selectedCardMeta
    ) {
      options.unshift({
        value: selectedPayCardId,
        label: payCardOptionLabel(selectedCardMeta, true),
      })
    } else if (selectedPayCardId && !options.some(o => o.value === selectedPayCardId)) {
      options.unshift({
        value: selectedPayCardId,
        label: '(saved pay card — does not match this carer)',
      })
    }
    return options
  }, [compatibleCards, selectedPayCardId, selectedCardMeta])

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

  const assignmentKind = savedPayCardId
    ? 'explicit'
    : suggestedCard || resolved?.source === 'MATCHED'
      ? 'matched'
      : 'none'

  const onSave = async () => {
    if (!canUpdate) return
    if (selectedPayCardId && !selectedIsCompatible) {
      toastApiError(
        new Error(
          'Selected pay card does not match this carer’s branch, role, or employment details.',
        ),
        'Could not save pay card assignment.',
      )
      return
    }
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

  const branchLabel =
    employment?.location?.name ?? employment?.baseLocation?.name ?? null

  return (
    <div className="space-y-6" data-testid="employee-pay-card-panel">
      <ContentSectionHeader
        title="Pay card"
        description="Default pay rate card for this carer. Only cards that match this carer’s branch, role, employment type, or worker type can be assigned. Bulk-assign from Billing → Pay cards, or override here."
        icon={<CreditCard className="h-5 w-5" aria-hidden />}
        iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
        action={
          canManageBilling ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/billing"
                search={{ tab: 'pay-cards' }}
                className="inline-flex items-center gap-1.5"
              >
                Manage pay cards
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pay card settings…
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      {!loading && (savedIsIncompatible || (dirty && selectedPayCardId && !selectedIsCompatible)) ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-950 dark:text-amber-100"
          data-testid="employee-pay-card-mismatch-warning"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">Pay card does not match this carer</p>
            <p className="text-xs opacity-90">
              {branchLabel
                ? `This carer’s branch is ${branchLabel}. Choose a card for that branch (or organisation default / matching role), or clear the selection.`
                : 'Choose a card that matches this carer’s branch, role, or employment type, or clear the selection.'}
            </p>
          </div>
        </div>
      ) : null}

      {!loading ? (
        <div className="flex flex-wrap gap-2">
          {assignmentKind === 'explicit' ? (
            <StatusChip
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
              label="Explicitly assigned"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
            />
          ) : null}
          {assignmentKind === 'matched' ? (
            <StatusChip
              icon={<Sparkles className="h-4 w-4" aria-hidden />}
              label={matchedLevelLabel ? `Auto-matched · ${matchedLevelLabel}` : 'Auto-matched'}
              className="border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200"
            />
          ) : null}
          {assignmentKind === 'none' ? (
            <StatusChip
              icon={<AlertCircle className="h-4 w-4" aria-hidden />}
              label="No pay card assigned"
              className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
            />
          ) : null}
          {dirty ? (
            <StatusChip
              icon={<Target className="h-4 w-4" aria-hidden />}
              label="Unsaved change"
              className="border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200"
            />
          ) : null}
        </div>
      ) : null}

      {!loading && !attachedCard && suggestedCard ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Suggested pay card</p>
                <p className="text-xs text-muted-foreground">
                  Matched by {matchedLevelLabel?.toLowerCase() ?? 'criteria'}. Save below to assign
                  explicitly, or apply the suggestion now.
                </p>
                <p className="pt-1 font-medium text-foreground">{suggestedCard.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPayCardAssignmentDisplay(suggestedCard)}
                </p>
              </div>
            </div>
            {canUpdate ? (
              <Button type="button" size="sm" variant="outline" onClick={applySuggested}>
                Use suggested card
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

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
        <PayCardDetailsView
          card={suggestedCard}
          assignmentSource="MATCHED"
          matchedLevelLabel={matchedLevelLabel}
          showManageLink={canManageBilling}
        />
      ) : null}

      {!loading && !attachedCard && !suggestedCard ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <CreditCard className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">No pay card assigned</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Payroll will raise a missing rate exception until a card is selected below.
          </p>
        </div>
      ) : null}

      {!loading ? (
        <ContentCard className="space-y-4 p-4">
          <div className="flex items-start gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Users className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Assign or change card</h3>
              <p className="text-xs text-muted-foreground">
                Only cards matching this carer
                {branchLabel ? ` (branch: ${branchLabel})` : ''} are listed. Clear the selection to
                remove an explicit assignment.
              </p>
            </div>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              Pay card
            </span>
            <Combobox
              id="employee-default-pay-card"
              options={payCardOptions}
              value={selectedPayCardId}
              onChange={value => {
                setSelectedPayCardId(value)
                setDirty(value !== savedPayCardId)
              }}
              placeholder={
                compatibleCards.length === 0
                  ? 'No matching pay cards'
                  : 'Select matching pay card'
              }
              disabled={!canUpdate || patchEmploymentMutation.isPending}
              allowDeselect
            />
          </label>

          {previewCard ? (
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                <Target className="h-3.5 w-3.5" aria-hidden />
                Preview of selected card (not saved yet)
              </p>
              <PayCardDetailsView
                card={previewCard}
                assignmentSource="PREVIEW"
                loading={previewPayCardQuery.isLoading}
                showManageLink={canManageBilling}
              />
            </div>
          ) : null}

          {canUpdate ? (
            <div className="flex justify-end border-t border-border pt-4">
              <Button
                type="button"
                leftIcon={<Save className="h-4 w-4" />}
                onClick={() => void onSave()}
                disabled={
                  !dirty ||
                  patchEmploymentMutation.isPending ||
                  Boolean(selectedPayCardId && !selectedIsCompatible)
                }
                data-testid="employee-pay-card-save"
              >
                {patchEmploymentMutation.isPending ? 'Saving…' : 'Save pay card'}
              </Button>
            </div>
          ) : null}
        </ContentCard>
      ) : null}
    </div>
  )
}
