import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CreditCard,
  FileText,
  Loader2,
  PoundSterling,
  Save,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { BillingCardRulesEditor } from '@/features/billing/components/BillingCardRulesEditor'
import {
  useChangeEmployeePayCard,
  useEmployeePayCardHistory,
  usePayCards,
  useResolveEmployeePayCard,
} from '@/features/billing/hooks/usePayCards'
import {
  formatBillingDate,
  formatPayCardAssignmentDisplay,
  type PayCardRule,
} from '@/features/billing/types/billing-cards.types'
import {
  normalizePayCardRulesForEditor,
  serializePayCardRulesForApi,
} from '@/features/billing/utils/billing-card-payload.util'
import { validatePayCardRules } from '@/features/billing/utils/billing-card-rule.util'
import {
  isPayCardAssignableToEmployment,
  type EmploymentPayCardMatchInput,
} from '@/features/billing/utils/pay-card-match.util'
import { useEmployee, useEmployeeLookups } from '@/features/employees/hooks/useEmployees'

type Mode = 'personal' | 'existing'

function BackToEmployee({ employeeId }: { employeeId: string }) {
  return (
    <Link
      to="/employee/$employeeId/edit"
      params={{ employeeId }}
      search={{ tab: 'pay-card' }}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to pay card
    </Link>
  )
}

function ModeOption({
  active,
  title,
  description,
  onSelect,
  testId,
}: {
  active: boolean
  title: string
  description: string
  onSelect: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={testId}
      aria-pressed={active}
      className={cn(
        'flex-1 rounded-lg border p-4 text-left transition-colors',
        active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/30',
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  )
}

/**
 * Change one carer's pay card from a date (e.g. promotion). The card other carers use is never edited:
 * the carer moves to another card, or to a new personal card copied from their current rates.
 */
export default function EmployeePayCardChangePage() {
  const navigate = useNavigate()
  const { employeeId } = useParams({ strict: false }) as { employeeId: string }
  const employeeQuery = useEmployee(employeeId)
  const resolveQuery = useResolveEmployeePayCard(employeeId)
  const historyQuery = useEmployeePayCardHistory(employeeId)
  const payCardsQuery = usePayCards()
  const changeMutation = useChangeEmployeePayCard(employeeId)
  const lookupsQuery = useEmployeeLookups()

  const employee = employeeQuery.data
  const employment = employee?.employment
  const employeeName =
    [employee?.personalDetail?.firstName, employee?.personalDetail?.lastName].filter(Boolean).join(' ').trim() ||
    'this carer'
  const currentCard = resolveQuery.data?.payCard ?? null
  const earliest = historyQuery.data?.earliestEffectiveFrom ?? null
  const today = new Date().toISOString().slice(0, 10)
  const defaultDate = earliest && earliest > today ? earliest : today

  const [mode, setMode] = React.useState<Mode>('personal')
  const [effectiveFrom, setEffectiveFrom] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [cardName, setCardName] = React.useState('')
  const [rules, setRules] = React.useState<PayCardRule[] | null>(null)
  const [targetCardId, setTargetCardId] = React.useState('')
  const [gradeId, setGradeId] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  // Prefill once the carer's current card is known: the personal card starts as a copy of it.
  React.useEffect(() => {
    if (resolveQuery.isLoading || employeeQuery.isLoading || rules !== null) return
    setRules(normalizePayCardRulesForEditor(currentCard?.rules ?? []))
    setCardName(currentCard ? `${currentCard.name} – ${employeeName}` : `Pay card – ${employeeName}`)
  }, [resolveQuery.isLoading, employeeQuery.isLoading, currentCard, employeeName, rules])

  React.useEffect(() => {
    if (!effectiveFrom && !historyQuery.isLoading) setEffectiveFrom(defaultDate)
  }, [effectiveFrom, historyQuery.isLoading, defaultDate])

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

  const cardOptions = React.useMemo(
    () =>
      (payCardsQuery.data ?? [])
        .filter(card => card.status === 'ACTIVE' && card.id !== currentCard?.id)
        .filter(card => isPayCardAssignableToEmployment(card, matchInput))
        .map(card => ({
          value: card.id,
          label: `${card.name} (${card.code}) · ${formatPayCardAssignmentDisplay(card)}`,
        })),
    [payCardsQuery.data, currentCard?.id, matchInput],
  )
  const targetCard = (payCardsQuery.data ?? []).find(c => c.id === targetCardId) ?? null
  const currentGradeName = employment?.grade?.name ?? null
  const gradeOptions = (lookupsQuery.data?.grades ?? []).filter(g => g.id !== employment?.gradeId)
  const newGradeName = gradeOptions.find(g => g.id === gradeId)?.name ?? null

  const loading = employeeQuery.isLoading || resolveQuery.isLoading || historyQuery.isLoading
  const saving = changeMutation.isPending

  const showError = (message: string) => {
    setError(message)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveFrom) return showError('Choose the date the new rates apply from.')
    if (earliest && effectiveFrom < earliest) {
      return showError(`The new rates can apply from ${formatBillingDate(earliest)} at the earliest.`)
    }
    if (!reason.trim()) return showError('Reason is required.')
    if (mode === 'personal') {
      if (!cardName.trim()) return showError('Card name is required.')
      const rulesError = validatePayCardRules(rules ?? [])
      if (rulesError) return showError(rulesError)
    } else if (!targetCardId) {
      return showError('Choose the pay card to move this carer to.')
    }
    setError(null)
    try {
      const result = await changeMutation.mutateAsync({
        effectiveFrom,
        reason: reason.trim(),
        ...(gradeId ? { gradeId } : {}),
        ...(mode === 'personal'
          ? { personalCard: { name: cardName.trim(), rules: serializePayCardRulesForApi(rules ?? []) } }
          : { payCardId: targetCardId }),
      })
      toastSuccess(
        `New pay rates apply to ${employeeName} from ${formatBillingDate(result.effectiveFrom)}.`,
        result.gradeName ? `Grade updated to ${result.gradeName}.` : undefined,
      )
      if (result.affectedPricedVisitCount > 0) {
        toastWarning(
          `${result.affectedPricedVisitCount} visit${result.affectedPricedVisitCount === 1 ? ' was' : 's were'} already priced on the old card`,
          'Recalculate them in Visit reconciliation to apply the new rates.',
        )
      }
      void navigate({ to: '/employee/$employeeId/edit', params: { employeeId }, search: { tab: 'pay-card' } })
    } catch (err) {
      if (err instanceof ApiError) showError(err.message)
      else toastApiError(err, 'Could not change pay card.')
    }
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-6 pb-10">
        <BackToEmployee employeeId={employeeId} />
        <ContentCard>
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading pay card details…
          </p>
        </ContentCard>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-4">
        <BackToEmployee employeeId={employeeId} />
        <ContentSectionHeader
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          title={`Change pay card · ${employeeName}`}
          description="For a promotion or pay rise of this carer only. The card other carers use is not changed, and visits before the chosen date keep the current rates."
        />
      </div>

      <form onSubmit={onSubmit} className="space-y-6" data-testid="employee-pay-card-change-form">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <ContentCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <CreditCard className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Current pay card</p>
                <p className="text-sm font-semibold text-foreground">
                  {currentCard ? `${currentCard.name} (${currentCard.code}) · v${currentCard.version ?? 1}` : 'None'}
                </p>
                {currentCard ? (
                  <p className="text-xs text-muted-foreground">{formatPayCardAssignmentDisplay(currentCard)}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ModeOption
              active={mode === 'personal'}
              onSelect={() => setMode('personal')}
              title="New rates for this carer only"
              description="Creates a personal pay card copied from the current rates. Edit the rates below."
              testId="pay-card-change-mode-personal"
            />
            <ModeOption
              active={mode === 'existing'}
              onSelect={() => setMode('existing')}
              title="Move to another pay card"
              description="For example a Senior Carer card that already exists."
              testId="pay-card-change-mode-existing"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                New rates apply from <span className="text-destructive">*</span>
              </span>
              <Input
                type="date"
                value={effectiveFrom}
                min={earliest ?? undefined}
                onChange={e => setEffectiveFrom(e.target.value)}
                disabled={saving}
                required
              />
              {earliest ? (
                <p className="text-xs text-muted-foreground">Earliest: {formatBillingDate(earliest)}</p>
              ) : null}
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Reason <span className="text-destructive">*</span>
              </span>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Promoted to Senior Carer"
                maxLength={500}
                disabled={saving}
                required
              />
            </label>
          </div>

          <label className="block space-y-1 text-sm sm:max-w-md">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
              <Award className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              New grade (optional)
            </span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={gradeId}
              onChange={e => setGradeId(e.target.value)}
              disabled={saving || lookupsQuery.isLoading}
              data-testid="pay-card-change-grade"
            >
              <option value="">
                {currentGradeName ? `Keep current grade (${currentGradeName})` : 'Keep current grade (none)'}
              </option>
              {gradeOptions.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {gradeId && effectiveFrom > today ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                The grade changes as soon as you save — grades have no start date. The new rates still start on{' '}
                {formatBillingDate(effectiveFrom)}.
              </p>
            ) : null}
          </label>

          {mode === 'existing' ? (
            <label className="block space-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                New pay card <span className="text-destructive">*</span>
              </span>
              <Combobox
                options={cardOptions}
                value={targetCardId}
                onChange={setTargetCardId}
                placeholder={cardOptions.length ? 'Select pay card' : 'No other active pay cards match this carer'}
                disabled={saving}
              />
            </label>
          ) : (
            <label className="block space-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Personal card name <span className="text-destructive">*</span>
              </span>
              <Input value={cardName} onChange={e => setCardName(e.target.value)} disabled={saving} required />
            </label>
          )}

          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground" data-testid="pay-card-change-summary">
            From {effectiveFrom ? formatBillingDate(effectiveFrom) : '—'}, {employeeName} will be paid on{' '}
            {mode === 'personal' ? 'a new personal card' : targetCard ? `"${targetCard.name}"` : 'the selected card'}.
            Visits before that date stay on {currentCard ? `"${currentCard.name}"` : 'their current pay'}.
            {currentCard ? ` Other carers on "${currentCard.name}" are not affected.` : ''}
            {newGradeName ? ` Grade changes from ${currentGradeName ?? 'none'} to ${newGradeName} when you save.` : ''}
          </p>
        </ContentCard>

        {mode === 'personal' ? (
          <ContentCard className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <PoundSterling className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-foreground">New pay rates</h3>
                <p className="text-xs text-muted-foreground">
                  Copied from the current card — change the amounts for this carer.
                </p>
              </div>
            </div>
            {rules !== null ? (
              <BillingCardRulesEditor
                mode="pay"
                rules={rules}
                onChange={next => setRules(next as PayCardRule[])}
                disabled={saving}
              />
            ) : null}
          </ContentCard>
        ) : null}

        <div className="sticky bottom-0 z-10 -mx-1 flex justify-end gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() =>
              void navigate({ to: '/employee/$employeeId/edit', params: { employeeId }, search: { tab: 'pay-card' } })
            }
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} leftIcon={<Save className="h-4 w-4" />}>
            {saving ? 'Saving…' : 'Save pay card change'}
          </Button>
        </div>
      </form>
    </div>
  )
}
