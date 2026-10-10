import * as React from 'react'
import {
  CalendarDays,
  CreditCard,
  FileText,
  GitBranch,
  Hash,
  PoundSterling,
  Save,
  Scale,
  Target,
  Users,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { ContentCard } from '@/shared/ui/content-section'
import { BillingCardRulesEditor } from '@/features/billing/components/BillingCardRulesEditor'
import { PayCardWageTypeSummary } from '@/features/billing/components/PayCardWageTypeSummary'
import { PayCardPayPreview } from '@/features/billing/components/PayCardPayPreview'
import { BANK_HOLIDAY_REGION_OPTIONS, type BankHolidayRegion } from '@/features/billing/types/wage-types.types'
import { useCreatePayCard, useUpdatePayCard } from '@/features/billing/hooks/usePayCards'
import {
  PAY_CARD_ASSIGNMENT_OPTIONS,
  PAY_CARD_WORKER_TYPE_OPTIONS,
  slugBillingCode,
  type PayCard,
  type PayCardInput,
  type PayCardRule,
  type PayCardWorkerTypeKey,
  type PayStackingPolicy,
} from '@/features/billing/types/billing-cards.types'
import { serializePayCardRulesForApi, normalizePayCardRulesForEditor } from '@/features/billing/utils/billing-card-payload.util'
import { validatePayCardRules } from '@/features/billing/utils/billing-card-rule.util'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'

type PayCardFormProps = {
  card?: PayCard | null
  /** Called after a successful save. */
  onSaved: (card: PayCard) => void
  onCancel: () => void
}

/** Levels we can configure in this form (no orphan Individual / Client–funder without pickers). */
const FORM_ASSIGNMENT_OPTIONS = PAY_CARD_ASSIGNMENT_OPTIONS.filter(
  opt => opt.value !== 'INDIVIDUAL' && opt.value !== 'CLIENT_FUNDER',
)

const CREATE_STATUS_OPTIONS = [
  { value: 'DRAFT' as const, label: 'Draft' },
  { value: 'ACTIVE' as const, label: 'Active' },
]

const EDIT_STATUS_OPTIONS = [
  { value: 'DRAFT' as const, label: 'Draft' },
  { value: 'ACTIVE' as const, label: 'Active' },
  { value: 'SUSPENDED' as const, label: 'Suspended' },
  { value: 'ARCHIVED' as const, label: 'Archived' },
]

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

function SectionTitle({
  icon,
  iconClassName,
  title,
  description,
}: {
  icon: React.ReactNode
  iconClassName: string
  title: string
  description?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
      >
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  )
}

function toFormState(card?: PayCard | null): PayCardInput {
  return {
    name: card?.name ?? '',
    code: card?.code ?? '',
    assignmentLevel: card?.assignmentLevel ?? 'ORGANISATION_DEFAULT',
    assignmentTargetId: card?.assignmentTargetId ?? '',
    assignmentTargetKey: card?.assignmentTargetKey ?? 'INTERNAL',
    assignmentLabel: card?.assignmentLabel ?? '',
    currency: card?.currency ?? 'GBP',
    status: card?.status ?? 'DRAFT',
    effectiveFrom: card?.effectiveFrom?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    effectiveTo: card?.effectiveTo?.slice(0, 10) ?? '',
    notes: card?.notes ?? '',
    rules: normalizePayCardRulesForEditor(card?.rules ?? []),
    stackingPolicy: card?.stackingPolicy ?? 'PRIORITY',
    // '' = default calendar (England & Wales); stored as null so existing cards are not rewritten.
    bankHolidayRegion: card?.bankHolidayRegion && card.bankHolidayRegion !== 'UK' ? card.bankHolidayRegion : '',
    // '' = holiday pay not calculated on the pay card (entered as pay items).
    holidayPayMethod: card?.holidayPayMethod === 'ROLLED_UP_12_07' ? 'ROLLED_UP_12_07' : (card?.holidayPayMethod ?? ''),
  }
}

/** How overlapping rates (e.g. Sunday + bank holiday + night) are resolved for a time slot. */
const STACKING_POLICY_CHOICES: { value: PayStackingPolicy; title: string; description: string }[] = [
  {
    value: 'PRIORITY',
    title: 'Most specific rate wins (default)',
    description: 'One rate per time slot: bank holiday beats Sunday beats weekday. Rates are never added together.',
  },
  {
    value: 'HIGHEST',
    title: 'Highest applicable rate',
    description: 'Every matching rate is worked out (premiums on the base rate) and only the highest is paid.',
  },
  {
    value: 'STACK',
    title: 'Contractual stacking',
    description: 'Premiums, % uplifts and multipliers are added on top of the most specific rate. Only if the contract says enhancements stack.',
  },
]

/** Full-page create / edit form for a carer pay card. Remount (via `key`) to load a different card. */
export function PayCardForm({ card, onSaved, onCancel }: PayCardFormProps) {
  const isEdit = !!card
  const createMutation = useCreatePayCard()
  const updateMutation = useUpdatePayCard()
  const lookupsQuery = useEmployeeLookups()
  const saving = createMutation.isPending || updateMutation.isPending

  const [form, setForm] = React.useState<PayCardInput>(() => toFormState(card))
  const [error, setError] = React.useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const [versionEffectiveFrom, setVersionEffectiveFrom] = React.useState(today)
  const [versionNote, setVersionNote] = React.useState('')

  // Rates of an active (non-draft) card are versioned: the old rules are kept and a new version is saved.
  const initialRulesKey = React.useMemo(
    () => JSON.stringify(serializePayCardRulesForApi(normalizePayCardRulesForEditor(card?.rules ?? []))),
    [card],
  )
  const ratesChanged =
    isEdit && JSON.stringify(serializePayCardRulesForApi(form.rules ?? [])) !== initialRulesKey
  const createsVersion = ratesChanged && card?.status !== 'DRAFT'
  const currentVersion = card?.version ?? 1

  const patch = (next: Partial<PayCardInput>) => setForm(prev => ({ ...prev, ...next }))

  const onAssignmentLevelChange = (assignmentLevel: PayCardInput['assignmentLevel']) => {
    patch({
      assignmentLevel,
      assignmentTargetId: '',
      assignmentTargetKey: assignmentLevel === 'WORKER_TYPE' ? 'INTERNAL' : undefined,
      assignmentLabel: '',
    })
  }

  const targetOptions = React.useMemo(() => {
    const lookups = lookupsQuery.data
    if (!lookups) return []
    switch (form.assignmentLevel) {
      case 'BRANCH':
        return lookups.locations.map(row => ({ value: row.id, label: row.name }))
      case 'ROLE':
        return lookups.roles.map(row => ({ value: row.id, label: row.name }))
      case 'EMPLOYMENT_TYPE':
        return lookups.contractTypes.map(row => ({ value: row.id, label: row.name }))
      default:
        return []
    }
  }, [form.assignmentLevel, lookupsQuery.data])

  const assignmentOptions = React.useMemo(() => {
    const current = form.assignmentLevel
    if (current === 'INDIVIDUAL' || current === 'CLIENT_FUNDER') {
      const extra = PAY_CARD_ASSIGNMENT_OPTIONS.find(o => o.value === current)
      return extra ? [...FORM_ASSIGNMENT_OPTIONS, extra] : FORM_ASSIGNMENT_OPTIONS
    }
    return FORM_ASSIGNMENT_OPTIONS
  }, [form.assignmentLevel])
  const statusOptions = isEdit ? EDIT_STATUS_OPTIONS : CREATE_STATUS_OPTIONS
  const statusValue = statusOptions.some(o => o.value === form.status)
    ? form.status
    : isEdit
      ? form.status
      : 'DRAFT'

  const showError = (message: string) => {
    setError(message)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showError('Name is required.')
      return
    }
    if (!form.code.trim()) {
      showError('Code is required.')
      return
    }
    if (!form.effectiveFrom?.trim()) {
      showError('Starts from date is required.')
      return
    }
    if (!form.effectiveTo?.trim()) {
      showError('Ends on date is required.')
      return
    }
    if (form.effectiveTo < form.effectiveFrom) {
      showError('Ends on must be on or after Starts from.')
      return
    }
    if (!form.assignmentLabel?.trim()) {
      showError('Display label is required.')
      return
    }
    if (!form.notes?.trim()) {
      showError('Notes are required.')
      return
    }
    if (form.assignmentLevel === 'WORKER_TYPE' && !form.assignmentTargetKey) {
      showError('Select a worker type for this pay card.')
      return
    }
    if (
      form.assignmentLevel &&
      form.assignmentLevel !== 'ORGANISATION_DEFAULT' &&
      form.assignmentLevel !== 'WORKER_TYPE' &&
      !form.assignmentTargetId
    ) {
      showError('Select the branch, role, or employment type this card applies to.')
      return
    }

    const rulesError = validatePayCardRules(form.rules ?? [])
    if (rulesError) {
      showError(rulesError)
      return
    }

    if (createsVersion && !versionEffectiveFrom) {
      showError('Choose the date the new rates apply from.')
      return
    }

    setError(null)
    const payload: PayCardInput = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      status: statusValue,
      assignmentTargetId:
        form.assignmentLevel === 'ORGANISATION_DEFAULT' || form.assignmentLevel === 'WORKER_TYPE'
          ? null
          : form.assignmentTargetId || null,
      assignmentTargetKey:
        form.assignmentLevel === 'WORKER_TYPE' ? form.assignmentTargetKey ?? null : null,
      assignmentLabel: form.assignmentLabel.trim(),
      effectiveTo: form.effectiveTo.trim(),
      notes: form.notes.trim(),
      rules: serializePayCardRulesForApi(form.rules ?? []),
      stackingPolicy: form.stackingPolicy ?? 'PRIORITY',
      bankHolidayRegion: form.bankHolidayRegion || null,
      holidayPayMethod: form.holidayPayMethod || null,
      ...(createsVersion
        ? { versionEffectiveFrom, versionNote: versionNote.trim() || undefined }
        : {}),
    }
    try {
      const saved = isEdit && card
        ? await updateMutation.mutateAsync({ id: card.id, body: payload })
        : await createMutation.mutateAsync(payload)
      onSaved(saved)
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Could not save pay card.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" data-testid="pay-card-form">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <ContentCard className="space-y-4" id="pay-card-general">
        <SectionTitle
          icon={<FileText className="h-4 w-4" aria-hidden />}
          iconClassName="bg-slate-500/10 text-slate-700 dark:text-slate-300"
          title="Card details"
          description="All fields are required."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label
            className={`space-y-1 text-sm${
              form.assignmentLevel === 'WORKER_TYPE' ? '' : ' sm:col-span-2 lg:col-span-1'
            }`}
          >
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
              placeholder="e.g. Standard weekday rates"
              disabled={saving}
              required
            />
          </label>

          {form.assignmentLevel === 'WORKER_TYPE' ? (
            <label className="space-y-1 text-sm">
              <FieldLabel icon={<Users className="h-3.5 w-3.5" aria-hidden />} required>
                Worker type
              </FieldLabel>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.assignmentTargetKey ?? 'INTERNAL'}
                onChange={e =>
                  patch({
                    assignmentTargetKey: e.target.value as PayCardWorkerTypeKey,
                    assignmentLabel: '',
                  })
                }
                disabled={saving}
                required
              >
                {PAY_CARD_WORKER_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          ) : null}

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
              value={statusValue}
              onChange={e => patch({ status: e.target.value as PayCardInput['status'] })}
              disabled={saving}
              required
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              {isEdit && !statusOptions.some(o => o.value === form.status) ? (
                <option value={form.status}>{form.status}</option>
              ) : null}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <FieldLabel icon={<Target className="h-3.5 w-3.5" aria-hidden />} required>
              Matching
            </FieldLabel>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.assignmentLevel}
              onChange={e =>
                onAssignmentLevelChange(e.target.value as PayCardInput['assignmentLevel'])
              }
              disabled={saving}
              required
            >
              {assignmentOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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

          {form.assignmentLevel === 'INDIVIDUAL' ? (
            <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-1">
              <FieldLabel icon={<Users className="h-3.5 w-3.5" aria-hidden />}>Carer</FieldLabel>
              <Input
                value={card?.assignmentLabel?.replace(/^Individual:\s*/, '') || 'One carer only'}
                disabled
                readOnly
              />
              <p className="text-xs text-muted-foreground">
                Personal card — set from the carer&apos;s profile (Pay card → Change pay card).
              </p>
            </label>
          ) : form.assignmentLevel &&
          form.assignmentLevel !== 'ORGANISATION_DEFAULT' &&
          form.assignmentLevel !== 'WORKER_TYPE' ? (
            <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-1">
              <FieldLabel icon={<Users className="h-3.5 w-3.5" aria-hidden />} required>
                {form.assignmentLevel === 'BRANCH'
                  ? 'Branch'
                  : form.assignmentLevel === 'ROLE'
                    ? 'Role'
                    : 'Employment type'}
              </FieldLabel>
              <Combobox
                options={targetOptions}
                value={form.assignmentTargetId ?? ''}
                onChange={value => patch({ assignmentTargetId: value, assignmentLabel: '' })}
                placeholder="Select…"
                disabled={saving || lookupsQuery.isLoading}
              />
            </label>
          ) : null}

          <label className="space-y-1 text-sm">
            <FieldLabel icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />} required>
              Ends on
            </FieldLabel>
            <Input
              type="date"
              value={form.effectiveTo ?? ''}
              onChange={e => patch({ effectiveTo: e.target.value })}
              disabled={saving}
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <FieldLabel required>Display label</FieldLabel>
            <Input
              value={form.assignmentLabel ?? ''}
              onChange={e => patch({ assignmentLabel: e.target.value })}
              placeholder="e.g. Organisation default"
              disabled={saving}
              required
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
            <FieldLabel icon={<FileText className="h-3.5 w-3.5" aria-hidden />} required>
              Notes
            </FieldLabel>
            <Input
              value={form.notes ?? ''}
              onChange={e => patch({ notes: e.target.value })}
              placeholder="Describe when this card should be used"
              disabled={saving}
              required
            />
          </label>
        </div>
      </ContentCard>

      <ContentCard className="space-y-4" id="pay-card-rules-policy" data-testid="pay-card-rules-policy">
        <SectionTitle
          icon={<Scale className="h-4 w-4" aria-hidden />}
          iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
          title="Pay rules & conflicts"
          description="How overlapping rates are paid, and which bank holiday calendar this card uses."
        />
        <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="When rates overlap">
          {STACKING_POLICY_CHOICES.map(choice => {
            const active = (form.stackingPolicy ?? 'PRIORITY') === choice.value
            return (
              <label
                key={choice.value}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                  active ? 'border-primary bg-primary/5' : 'border-border bg-muted/10'
                } ${saving ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input
                  type="radio"
                  name="pay-card-stacking-policy"
                  className="mt-0.5 shrink-0"
                  checked={active}
                  onChange={() => patch({ stackingPolicy: choice.value })}
                  disabled={saving}
                  data-testid={`stacking-policy-${choice.value}`}
                />
                <span>
                  <span className="block font-medium text-foreground">{choice.title}</span>
                  <span className="block text-xs text-muted-foreground">{choice.description}</span>
                </span>
              </label>
            )
          })}
        </div>
        {isEdit && card && (form.stackingPolicy ?? 'PRIORITY') !== (card.stackingPolicy ?? 'PRIORITY') ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This changes how visits priced from now on are paid. Visits already priced keep their amounts.
          </p>
        ) : null}
        <label className="block space-y-1 text-sm sm:max-w-sm">
          <FieldLabel icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />}>Bank holiday calendar</FieldLabel>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.bankHolidayRegion ?? ''}
            onChange={e => patch({ bankHolidayRegion: e.target.value })}
            disabled={saving}
            data-testid="pay-card-bank-holiday-region"
          >
            {BANK_HOLIDAY_REGION_OPTIONS.map(o => (
              <option key={o.value} value={o.value === 'UK' ? '' : o.value}>
                {o.value === 'UK' ? `${o.label} (default)` : o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Dates are managed in Billing → Bank holidays.</p>
        </label>
        <label className="block space-y-1 text-sm sm:max-w-xl">
          <FieldLabel icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />}>Holiday pay</FieldLabel>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.holidayPayMethod ?? ''}
            onChange={e => patch({ holidayPayMethod: e.target.value })}
            disabled={saving}
            data-testid="pay-card-holiday-pay-method"
          >
            <option value="">Not on this pay card — enter holiday pay as pay items (default)</option>
            <option value="ROLLED_UP_12_07">Rolled-up 12.07% added to each visit pay run</option>
            {form.holidayPayMethod && form.holidayPayMethod !== 'ROLLED_UP_12_07' ? (
              <option value={form.holidayPayMethod}>{form.holidayPayMethod}</option>
            ) : null}
          </select>
          {form.holidayPayMethod === 'ROLLED_UP_12_07' ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Rolled-up holiday pay is only allowed for irregular-hours and part-year workers. Confirm with your payroll
              adviser before using it.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Holiday taken is paid through Billing → Pay items.</p>
          )}
        </label>
      </ContentCard>

      <ContentCard className="space-y-3" id="pay-card-rates">
        <SectionTitle
          icon={<PoundSterling className="h-4 w-4" aria-hidden />}
          iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          title="Pay rates"
          description="Add at least one rate. Every rule needs an amount and From / Until times."
        />
        {createsVersion ? (
          <div
            className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
            data-testid="pay-card-new-version"
          >
            <div className="flex items-start gap-2">
              <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
              <p className="text-sm text-foreground">
                Rates changed — saving creates <strong>version {currentVersion + 1}</strong>. Version{' '}
                {currentVersion} rates are kept and still pay visits dated before the date below.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <FieldLabel icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />} required>
                  New rates apply from
                </FieldLabel>
                <Input
                  type="date"
                  value={versionEffectiveFrom}
                  onChange={e => setVersionEffectiveFrom(e.target.value)}
                  disabled={saving}
                  required
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <FieldLabel icon={<FileText className="h-3.5 w-3.5" aria-hidden />}>Reason for change</FieldLabel>
                <Input
                  value={versionNote}
                  onChange={e => setVersionNote(e.target.value)}
                  placeholder="e.g. Annual pay review 2027"
                  maxLength={500}
                  disabled={saving}
                />
              </label>
            </div>
          </div>
        ) : isEdit && card?.status !== 'DRAFT' ? (
          <p className="text-xs text-muted-foreground">
            Current rates: version {currentVersion}. Changing a rate saves a new version and keeps these rates in the
            history below.
          </p>
        ) : null}
        <BillingCardRulesEditor
          mode="pay"
          rules={form.rules ?? []}
          onChange={rules => patch({ rules: rules as PayCardRule[] })}
          disabled={saving}
        />
      </ContentCard>

      <PayCardWageTypeSummary rules={form.rules ?? []} />

      <PayCardPayPreview
        rules={form.rules ?? []}
        stackingPolicy={form.stackingPolicy ?? 'PRIORITY'}
        bankHolidayRegion={(form.bankHolidayRegion || 'UK') as BankHolidayRegion}
      />

      <div className="sticky bottom-0 z-10 -mx-1 flex justify-end gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          leftIcon={isEdit ? <Save className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create pay card'}
        </Button>
      </div>
    </form>
  )
}
