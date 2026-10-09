import * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { PayCardDetailsView } from '@/features/billing/components/PayCardDetailsView'
import { EmployeePayCardHistoryList } from '@/features/billing/components/EmployeePayCardHistoryList'
import {
  useDeleteEmployeeFunderPayAssignment,
  useEmployeeFunderPayAssignments,
  usePayCard,
  usePayCards,
  useResolveEmployeePayCard,
  useUpsertEmployeeFunderPayAssignment,
} from '@/features/billing/hooks/usePayCards'
import {
  PAY_CARD_ASSIGNMENT_OPTIONS,
  formatPayCardAssignmentDisplay,
  type PayCard,
} from '@/features/billing/types/billing-cards.types'
import {
  explainPayCardMatch,
  isPayCardAssignableToEmployment,
  type EmploymentPayCardMatchInput,
  type EmploymentPayCardMatchLabels,
} from '@/features/billing/utils/pay-card-match.util'
import { listEnterpriseFunders } from '@/features/service-users/api/service-users.api'
import { useEmployee } from '@/features/employees/hooks/useEmployees'
import { usePatchEmploymentMutation } from '@/features/employees/hooks/useEmployeeMutations'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useQuery } from '@tanstack/react-query'

function payCardOptionLabel(
  card: PayCard,
  matchInput: EmploymentPayCardMatchInput | null,
  labels: EmploymentPayCardMatchLabels | null,
  incompatible = false,
): string {
  const base = `${card.name} (${card.code}) · ${formatPayCardAssignmentDisplay(card)}`
  if (incompatible || !matchInput) {
    return incompatible ? `${base} — does not match this carer` : base
  }
  const explanation = explainPayCardMatch(matchInput, card, labels)
  return `${base} — ${explanation.reason}`
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
  const canReadBilling = useAuthStore(s => s.can('billing.pay_cards.read' as never))
  const canReadFunders = useAuthStore(s => s.can('funders.read'))
  const employeeQuery = useEmployee(employeeId)
  const payCardsQuery = usePayCards()
  const resolveQuery = useResolveEmployeePayCard(employeeId)
  const patchEmploymentMutation = usePatchEmploymentMutation()
  const funderAssignmentsQuery = useEmployeeFunderPayAssignments(
    employeeId,
    canReadBilling || canManageBilling,
  )
  const upsertFunderAssignment = useUpsertEmployeeFunderPayAssignment()
  const deleteFunderAssignment = useDeleteEmployeeFunderPayAssignment(employeeId)
  const fundersQuery = useQuery({
    queryKey: ['enterprise-funders', 'pay-card-panel'],
    queryFn: () => listEnterpriseFunders({ limit: 200 }),
    enabled: (canReadBilling || canManageBilling) && canReadFunders,
    staleTime: 5 * 60_000,
  })

  const [funderIdDraft, setFunderIdDraft] = React.useState('')
  const [funderPayCardIdDraft, setFunderPayCardIdDraft] = React.useState('')

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

  const matchLabels = React.useMemo<EmploymentPayCardMatchLabels | null>(() => {
    if (!employment) return null
    return {
      roleName: employment.role?.name ?? null,
      locationName: employment.location?.name ?? null,
      baseLocationName: employment.baseLocation?.name ?? null,
      contractTypeName: employment.contractType?.name ?? null,
    }
  }, [employment])

  const explainCard = React.useCallback(
    (card: PayCard | null | undefined) => {
      if (!card || !matchInput) return null
      return explainPayCardMatch(matchInput, card, matchLabels)
    },
    [matchInput, matchLabels],
  )

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
      label: payCardOptionLabel(card, matchInput, matchLabels),
    }))
    // Keep a currently selected incompatible card visible so it can be cleared.
    if (
      selectedPayCardId &&
      !options.some(o => o.value === selectedPayCardId) &&
      selectedCardMeta
    ) {
      options.unshift({
        value: selectedPayCardId,
        label: payCardOptionLabel(selectedCardMeta, matchInput, matchLabels, true),
      })
    } else if (selectedPayCardId && !options.some(o => o.value === selectedPayCardId)) {
      options.unshift({
        value: selectedPayCardId,
        label: '(saved pay card — does not match this carer)',
      })
    }
    return options
  }, [compatibleCards, selectedPayCardId, selectedCardMeta, matchInput, matchLabels])

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

  const funderAssignmentRows = funderAssignmentsQuery.data ?? []
  const funderOptions = React.useMemo(() => {
    const assigned = new Set(funderAssignmentRows.map(r => r.funderId))
    return (fundersQuery.data ?? [])
      .filter(f => !assigned.has(f.id) || f.id === funderIdDraft)
      .map(f => ({
        value: f.id,
        label: f.code ? `${f.name} (${f.code})` : f.name,
      }))
  }, [fundersQuery.data, funderAssignmentRows, funderIdDraft])

  const funderPayCardOptions = React.useMemo(
    () =>
      (payCardsQuery.data ?? [])
        .filter(card => card.status === 'ACTIVE' || card.status === 'DRAFT')
        .map(card => ({
          value: card.id,
          label: `${card.name} (${card.code})`,
        })),
    [payCardsQuery.data],
  )

  const onAddFunderAssignment = async () => {
    if (!canManageBilling || !funderIdDraft || !funderPayCardIdDraft) return
    try {
      await upsertFunderAssignment.mutateAsync({
        employeeId,
        funderId: funderIdDraft,
        payCardId: funderPayCardIdDraft,
      })
      setFunderIdDraft('')
      setFunderPayCardIdDraft('')
      toastSuccess('Funder pay card override saved.')
    } catch (err) {
      toastApiError(err, 'Could not save funder pay card override.')
    }
  }

  const onRemoveFunderAssignment = async (id: string) => {
    if (!canManageBilling) return
    try {
      await deleteFunderAssignment.mutateAsync(id)
      toastSuccess('Funder pay card override removed.')
    } catch (err) {
      toastApiError(err, 'Could not remove funder pay card override.')
    }
  }

  return (
    <div className="space-y-6" data-testid="employee-pay-card-panel">
      <ContentSectionHeader
        title="Pay card"
        description="Default pay rate card for this carer, plus optional council/funder overrides. Visit pay uses funder override when present, otherwise this default. Charge cards stay separate."
        icon={<CreditCard className="h-5 w-5" aria-hidden />}
        iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
        action={
          canManageBilling ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link
                  to="/employee/$employeeId/pay-card/change"
                  params={{ employeeId }}
                  className="inline-flex items-center gap-1.5"
                  data-testid="employee-pay-card-change-link"
                >
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  Change pay card / promotion
                </Link>
              </Button>
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
            </div>
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
                  {explainCard(suggestedCard)?.reason ??
                    `Matched by ${matchedLevelLabel?.toLowerCase() ?? 'criteria'}.`}{' '}
                  Save below to assign explicitly, or apply the suggestion now.
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
          matchReason={explainCard(attachedCard)?.reason}
          loading={Boolean(savedPayCardId) && attachedPayCardQuery.isLoading}
          showManageLink={canManageBilling}
        />
      ) : null}

      {!loading && !attachedCard && suggestedCard ? (
        <PayCardDetailsView
          card={suggestedCard}
          assignmentSource="MATCHED"
          matchedLevelLabel={matchedLevelLabel}
          matchReason={explainCard(suggestedCard)?.reason}
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
                matchReason={explainCard(previewCard)?.reason}
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

      {!loading && (canReadBilling || canManageBilling) ? (
        <EmployeePayCardHistoryList employeeId={employeeId} />
      ) : null}

      {!loading && (canReadBilling || canManageBilling) ? (
        <ContentCard className="space-y-4 p-4" data-testid="employee-funder-pay-card-panel">
          <div className="flex items-start gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
              <Target className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Pay by council / funder
              </h3>
              <p className="text-xs text-muted-foreground">
                Optional overrides: when this carer works a visit funded by a specific council,
                use that pay card instead of the default. Charge rates stay separate.
              </p>
            </div>
          </div>

          {funderAssignmentsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading funder overrides…
            </div>
          ) : null}

          {funderAssignmentRows.length > 0 ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {funderAssignmentRows.map(row => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-foreground">
                      {row.funder?.name ?? 'Unknown funder'}
                      {row.funder?.code ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          ({row.funder.code})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.payCard.name} ({row.payCard.code})
                    </p>
                  </div>
                  {canManageBilling ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      disabled={deleteFunderAssignment.isPending}
                      onClick={() => void onRemoveFunderAssignment(row.id)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : !funderAssignmentsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">
              No funder overrides yet. Visits use the default pay card above.
            </p>
          ) : null}

          {canManageBilling ? (
            <div className="space-y-3 border-t border-border pt-4">
              {!canReadFunders ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Your account needs the funders.read permission to load councils for overrides.
                </p>
              ) : fundersQuery.isError ? (
                <p className="text-xs text-destructive">
                  Could not load funders. Refresh the page or check you can open Service Users → Funding.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm">
                  <span className="text-xs font-medium text-foreground/90">Council / funder</span>
                  <Combobox
                    id="employee-funder-pay-funder"
                    options={funderOptions}
                    value={funderIdDraft}
                    onChange={setFunderIdDraft}
                    placeholder={
                      fundersQuery.isLoading
                        ? 'Loading funders…'
                        : funderOptions.length === 0
                          ? 'No active funders found'
                          : 'Select funder'
                    }
                    emptyText={
                      fundersQuery.isLoading
                        ? 'Loading…'
                        : funderOptions.length === 0
                          ? 'No active funders found.'
                          : 'No results found.'
                    }
                    loading={fundersQuery.isLoading}
                    disabled={
                      upsertFunderAssignment.isPending ||
                      !canReadFunders ||
                      fundersQuery.isLoading
                    }
                  />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="text-xs font-medium text-foreground/90">Pay card</span>
                  <Combobox
                    id="employee-funder-pay-card"
                    options={funderPayCardOptions}
                    value={funderPayCardIdDraft}
                    onChange={setFunderPayCardIdDraft}
                    placeholder={
                      funderPayCardOptions.length === 0
                        ? 'No pay cards available'
                        : 'Select pay card'
                    }
                    disabled={upsertFunderAssignment.isPending}
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  disabled={
                    !funderIdDraft ||
                    !funderPayCardIdDraft ||
                    upsertFunderAssignment.isPending
                  }
                  onClick={() => void onAddFunderAssignment()}
                  data-testid="employee-funder-pay-card-add"
                >
                  {upsertFunderAssignment.isPending ? 'Saving…' : 'Add override'}
                </Button>
              </div>
            </div>
          ) : null}
        </ContentCard>
      ) : null}
    </div>
  )
}
