import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  CreditCard,
  FileText,
  Hash,
  PoundSterling,
  Save,
  Target,
  Users,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { CollapsibleCard } from '@/shared/ui/content-section'
import { BillingCardRulesEditor } from '@/features/billing/components/BillingCardRulesEditor'
import { serializeChargeCardRulesForApi, normalizeChargeCardRulesForEditor } from '@/features/billing/utils/billing-card-payload.util'
import { isNightDutyChargeRule } from '@/features/billing/utils/billing-card-rule.util'
import { useCreateChargeCard, useUpdateChargeCard } from '@/features/billing/hooks/useChargeCards'
import {
  BILLING_CARD_STATUS_OPTIONS,
  CHARGE_CARD_ASSIGNMENT_OPTIONS,
  CHARGE_CARD_KEY_TARGET_LEVELS,
  slugBillingCode,
  type ChargeCard,
  type ChargeCardInput,
  type ChargeCardRule,
} from '@/features/billing/types/billing-cards.types'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useEnterpriseFunders } from '@/features/service-users/hooks/useServiceUserTabs'
import { listServiceUsers } from '@/features/service-users/api/service-users.api'

type ChargeCardFormProps = {
  card?: ChargeCard | null
  /** Called after a successful save. */
  onSaved: (card: ChargeCard) => void
  onCancel: () => void
  /** Native id on the <form>, so a header Save button outside the form can submit it. */
  formId?: string
}

const fieldLabel = 'text-xs font-medium text-foreground/90'

function FieldLabel({
  icon,
  children,
  required,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${fieldLabel}`}>
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      {children}
      {required ? <span className="text-destructive" aria-hidden>*</span> : null}
    </span>
  )
}

function toFormState(card?: ChargeCard | null): ChargeCardInput {
  return {
    name: card?.name ?? '',
    code: card?.code ?? '',
    assignmentLevel: card?.assignmentLevel ?? 'ORGANISATION_DEFAULT',
    assignmentTargetId: card?.assignmentTargetId ?? '',
    assignmentTargetKey: card?.assignmentTargetKey ?? '',
    assignmentLabel: card?.assignmentLabel ?? '',
    currency: card?.currency ?? 'GBP',
    billingFrequency: card?.billingFrequency ?? 'WEEKLY',
    paymentTerms: card?.paymentTerms ?? '',
    taxTreatment: card?.taxTreatment ?? '',
    invoiceGroupingRule: card?.invoiceGroupingRule ?? '',
    defaultChargeMethod: card?.defaultChargeMethod ?? 'FIXED_VISIT',
    status: card?.status ?? 'DRAFT',
    effectiveFrom: card?.effectiveFrom?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    effectiveTo: card?.effectiveTo?.slice(0, 10) ?? '',
    notes: card?.notes ?? '',
    rules: normalizeChargeCardRulesForEditor(card?.rules ?? []),
  }
}

function keyTargetLabel(level: ChargeCardInput['assignmentLevel']): string {
  switch (level) {
    case 'CARE_PACKAGE':
      return 'Care package name'
    case 'SERVICE_TYPE':
      return 'Service type'
    case 'GROUP_HOUSEHOLD':
      return 'Household identifier'
    default:
      return 'Target value'
  }
}

/** Full-page create / edit form for a charge card. Remount (via `key`) to load a different card. */
export function ChargeCardForm({ card, onSaved, onCancel, formId }: ChargeCardFormProps) {
  const isEdit = !!card
  const createMutation = useCreateChargeCard()
  const updateMutation = useUpdateChargeCard()
  const lookupsQuery = useEmployeeLookups()
  const fundersQuery = useEnterpriseFunders(true)
  const serviceUsersQuery = useQuery({
    queryKey: ['billing', 'charge-card-service-users'],
    queryFn: () => listServiceUsers({ limit: 100, showInactive: false }),
  })
  const saving = createMutation.isPending || updateMutation.isPending

  const [form, setForm] = React.useState<ChargeCardInput>(() => toFormState(card))
  const [error, setError] = React.useState<string | null>(null)
  const editorKey = card?.id ?? 'new-charge-card'

  const patch = (next: Partial<ChargeCardInput>) => setForm(prev => ({ ...prev, ...next }))

  const onAssignmentLevelChange = (assignmentLevel: ChargeCardInput['assignmentLevel']) => {
    patch({
      assignmentLevel,
      assignmentTargetId: '',
      assignmentTargetKey: '',
      assignmentLabel: '',
    })
  }

  const targetOptions = React.useMemo(() => {
    switch (form.assignmentLevel) {
      case 'FUNDER':
        return (fundersQuery.data ?? []).map(row => ({ value: row.id, label: row.name }))
      case 'SERVICE_USER':
        return (serviceUsersQuery.data?.rows ?? []).map(row => ({
          value: row.id,
          label:
            row.preferredName?.trim() ||
            `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() ||
            row.serviceUserNumber ||
            row.id,
        }))
      case 'BRANCH_REGION':
        return (lookupsQuery.data?.locations ?? []).map(row => ({ value: row.id, label: row.name }))
      default:
        return []
    }
  }, [form.assignmentLevel, fundersQuery.data, serviceUsersQuery.data, lookupsQuery.data])

  const needsTargetId =
    form.assignmentLevel &&
    form.assignmentLevel !== 'ORGANISATION_DEFAULT' &&
    !CHARGE_CARD_KEY_TARGET_LEVELS.includes(form.assignmentLevel)

  const needsTargetKey =
    form.assignmentLevel && CHARGE_CARD_KEY_TARGET_LEVELS.includes(form.assignmentLevel)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and code are required.')
      return
    }
    if (needsTargetKey && !form.assignmentTargetKey?.trim()) {
      setError(`Enter the ${keyTargetLabel(form.assignmentLevel).toLowerCase()}.`)
      return
    }
    if (needsTargetId && !form.assignmentTargetId) {
      setError('Select who this charge card attaches to.')
      return
    }

    const rules = form.rules ?? []
    if (rules.length === 0) {
      setError('Add at least one charge rate rule.')
      return
    }
    for (const rule of rules) {
      const isSupplement =
        rule.rateType === 'MILEAGE'
        || rule.rateType === 'TRAVEL_TIME'
        || rule.rateType === 'WAITING_TIME'
        || isNightDutyChargeRule(rule)
      if (!(Number(rule.amount) > 0)) {
        setError('Every rate rule needs an amount greater than zero.')
        return
      }
      if (!isSupplement) {
        if (!rule.startTime?.trim() || !rule.endTime?.trim()) {
          setError('Every visit rate rule needs From and Until times.')
          return
        }
      }
    }

    setError(null)
    const payload: ChargeCardInput = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      assignmentTargetId:
        form.assignmentLevel === 'ORGANISATION_DEFAULT' || needsTargetKey
          ? null
          : form.assignmentTargetId || null,
      assignmentTargetKey: needsTargetKey ? form.assignmentTargetKey?.trim() || null : null,
      assignmentLabel: form.assignmentLabel?.trim() || undefined,
      paymentTerms: form.paymentTerms?.trim() || undefined,
      taxTreatment: form.taxTreatment?.trim() || undefined,
      invoiceGroupingRule: form.invoiceGroupingRule?.trim() || undefined,
      effectiveTo: form.effectiveTo?.trim() || null,
      notes: form.notes?.trim() || undefined,
      rules: serializeChargeCardRulesForApi(form.rules ?? []),
    }
    try {
      const saved =
        isEdit && card
          ? await updateMutation.mutateAsync({ id: card.id, body: payload })
          : await createMutation.mutateAsync(payload)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save charge card.')
    }
  }

  return (
    <form onSubmit={onSubmit} id={formId} noValidate className="space-y-6" data-testid="charge-card-form">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <CollapsibleCard
        id="charge-card-general"
        icon={<FileText className="h-4 w-4" aria-hidden />}
        iconClassName="bg-slate-500/10 text-slate-700 dark:text-slate-300"
        title="Card details"
        description="Who this rate card applies to. Invoice cadence, VAT, and grouping live on Invoice templates."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm sm:col-span-2">
            <FieldLabel icon={<CreditCard className="h-3.5 w-3.5" aria-hidden />} required>
              Name
            </FieldLabel>
            <Input
              value={form.name}
              onChange={e => {
                const name = e.target.value
                patch({
                  name,
                  code: !isEdit && !form.code ? slugBillingCode(name) : form.code,
                })
              }}
              placeholder="e.g. Private client default"
              disabled={saving}
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <FieldLabel icon={<Hash className="h-3.5 w-3.5" aria-hidden />} required>
              Code
            </FieldLabel>
            <Input
              value={form.code}
              onChange={e => patch({ code: e.target.value.toUpperCase() })}
              disabled={saving}
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <FieldLabel required>Status</FieldLabel>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={e => patch({ status: e.target.value as ChargeCardInput['status'] })}
              disabled={saving}
              required
            >
              {BILLING_CARD_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <FieldLabel icon={<Target className="h-3.5 w-3.5" aria-hidden />} required>
              Attach to
            </FieldLabel>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.assignmentLevel}
              onChange={e =>
                onAssignmentLevelChange(e.target.value as ChargeCardInput['assignmentLevel'])
              }
              disabled={saving}
              required
            >
              {CHARGE_CARD_ASSIGNMENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          {needsTargetKey ? (
            <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
              <FieldLabel icon={<Users className="h-3.5 w-3.5" aria-hidden />} required>
                {keyTargetLabel(form.assignmentLevel)}
              </FieldLabel>
              <Input
                value={form.assignmentTargetKey ?? ''}
                onChange={e => patch({ assignmentTargetKey: e.target.value, assignmentLabel: '' })}
                placeholder={
                  form.assignmentLevel === 'SERVICE_TYPE' ? 'e.g. Personal care' : 'Exact match value'
                }
                disabled={saving}
              />
            </label>
          ) : null}

          {needsTargetId ? (
            <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
              <FieldLabel icon={<Users className="h-3.5 w-3.5" aria-hidden />} required>
                {form.assignmentLevel === 'FUNDER'
                  ? 'Funder / payer'
                  : form.assignmentLevel === 'SERVICE_USER'
                    ? 'Service user'
                    : form.assignmentLevel === 'FUNDING_CONTRACT'
                      ? 'Funding contract'
                      : 'Branch / region'}
              </FieldLabel>
              {form.assignmentLevel === 'FUNDING_CONTRACT' ? (
                <Input
                  value={form.assignmentTargetId ?? ''}
                  onChange={e => patch({ assignmentTargetId: e.target.value, assignmentLabel: '' })}
                  placeholder="Funding contract ID from service user Funding tab"
                  disabled={saving}
                />
              ) : (
                <Combobox
                  options={targetOptions}
                  value={form.assignmentTargetId ?? ''}
                  onChange={value => patch({ assignmentTargetId: value, assignmentLabel: '' })}
                  placeholder="Select target"
                  disabled={saving || fundersQuery.isLoading || serviceUsersQuery.isLoading || lookupsQuery.isLoading}
                />
              )}
            </label>
          ) : null}

          <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
            <FieldLabel>Display label</FieldLabel>
            <Input
              value={form.assignmentLabel ?? ''}
              onChange={e => patch({ assignmentLabel: e.target.value })}
              placeholder="Auto-filled from selection if left blank"
              disabled={saving}
            />
          </label>

          <label className="space-y-1 text-sm">
            <FieldLabel icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />} required>
              Starts from
            </FieldLabel>
            <Input
              type="date"
              value={form.effectiveFrom}
              onChange={e => patch({ effectiveFrom: e.target.value })}
              disabled={saving}
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <FieldLabel icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />}>
              Ends on
            </FieldLabel>
            <Input
              type="date"
              value={form.effectiveTo ?? ''}
              onChange={e => patch({ effectiveTo: e.target.value })}
              disabled={saving}
            />
          </label>

          <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
            <FieldLabel icon={<FileText className="h-3.5 w-3.5" aria-hidden />}>
              Notes
            </FieldLabel>
            <Input
              value={form.notes ?? ''}
              onChange={e => patch({ notes: e.target.value })}
              placeholder="Describe when this card should be used"
              disabled={saving}
            />
          </label>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        id="charge-card-rates"
        bodyClassName="space-y-3"
        icon={<PoundSterling className="h-4 w-4" aria-hidden />}
        iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        title="Charge rates"
        description="Add at least one rate. Every visit rule needs an amount and From / Until times."
      >
        <BillingCardRulesEditor
          key={editorKey}
          mode="charge"
          rules={form.rules ?? []}
          onChange={rules => patch({ rules: rules as ChargeCardRule[] })}
          disabled={saving}
        />
      </CollapsibleCard>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-[22px] md:px-[22px]">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          leftIcon={isEdit ? <Save className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create charge card'}
        </Button>
      </div>
    </form>
  )
}
