import * as React from 'react'
import {
  Calculator,
  CalendarDays,
  ClipboardList,
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
import { BillingStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { BillingCardRulesEditor } from '@/features/billing/components/BillingCardRulesEditor'
import { PayCardWageTypeSummary } from '@/features/billing/components/PayCardWageTypeSummary'
import { PayCardPayPreview } from '@/features/billing/components/PayCardPayPreview'
import { PayCardConflictCheckNotice } from '@/features/billing/components/PayCardConflictNotice'
import { BANK_HOLIDAY_REGION_OPTIONS, type BankHolidayRegion } from '@/features/billing/types/wage-types.types'
import { useCreatePayCard, useUpdatePayCard } from '@/features/billing/hooks/usePayCards'
import {
  formatBillingDate,
  formatPayCardAssignmentDisplay,
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
  /** Native id on the <form>, so a header Save button outside the form can submit it. */
  formId?: string
}

/** Scroll the app's main scroll surface to a section, leaving the sticky header clear. */
function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const scroller = el.closest<HTMLElement>('[data-app-main-scroll]')
  if (scroller) {
    const top =
      el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 168
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
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

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground">{children}</dd>
    </div>
  )
}

/** Sticky summary of the live form values + a jump to the pay preview. Reflects unsaved edits. */
function PayCardSummarySidebar({ form }: { form: PayCardInput }) {
  const ratesCount = (form.rules ?? []).length
  const matching = formatPayCardAssignmentDisplay({
    assignmentLevel: form.assignmentLevel ?? 'ORGANISATION_DEFAULT',
    assignmentLabel: form.assignmentLabel,
    assignmentTargetKey: form.assignmentTargetKey,
  })

  return (
    <>
      <ContentCard className="space-y-4" data-testid="pay-card-summary">
        <SectionTitle
          icon={<ClipboardList className="h-4 w-4" aria-hidden />}
          iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          title="Summary"
          description="Live values, including unsaved changes."
        />
        <dl className="text-sm">
          <SummaryRow label="Starts">{formatBillingDate(form.effectiveFrom)}</SummaryRow>
          <SummaryRow label="Ends">{form.effectiveTo ? formatBillingDate(form.effectiveTo) : '—'}</SummaryRow>
          <SummaryRow label="Matching">{matching}</SummaryRow>
          <SummaryRow label="Rates">
            <span className="tabular-nums">{ratesCount}</span>
          </SummaryRow>
          <SummaryRow label="Status">
            <BillingStatusBadge status={form.status ?? 'DRAFT'} size="sm" />
          </SummaryRow>
        </dl>
      </ContentCard>

      <ContentCard className="space-y-4">
        <SectionTitle
          icon={<Calculator className="h-4 w-4" aria-hidden />}
          iconClassName="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
          title="Pay preview"
          description="Check a sample visit against these rates."
        />
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          Price a sample visit with the rates on this card. Nothing is saved and no pay is created.
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => scrollToSection('pay-card-preview')}
        >
          Open pay preview
        </Button>
      </ContentCard>
    </>
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

/** How holiday pay is handled for carers on this card ('' = not on the card). */
const HOLIDAY_PAY_CHOICES: { value: string; title: string; description: string }[] = [
  {
    value: '',
    title: 'Paid when taken (default)',
    description: 'Holiday is recorded and paid separately through Billing → Pay items. Nothing is added to visit pay.',
  },
  {
    value: 'ROLLED_UP_12_07',
    title: 'Rolled-up 12.07% on every visit',
    description: '12.07% holiday pay is added to each visit pay run. Only for irregular-hours or part-year workers.',
  },
]

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Full-page create / edit form for a carer pay card. Remount (via `key`) to load a different card. */
export function PayCardForm({ card, onSaved, onCancel, formId }: PayCardFormProps) {
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

  // PC-32: the card as entered is checked against the other active cards before it is saved.
  const conflictCheckInput = React.useMemo(
    () =>
      DATE_ONLY.test(form.effectiveFrom ?? '') && form.status !== 'ARCHIVED'
        ? {
            ...(card?.id ? { id: card.id } : {}),
            assignmentLevel: form.assignmentLevel,
            assignmentTargetId: form.assignmentTargetId || null,
            assignmentTargetKey: form.assignmentTargetKey || null,
            effectiveFrom: form.effectiveFrom,
            effectiveTo: DATE_ONLY.test(form.effectiveTo ?? '') ? form.effectiveTo : null,
          }
        : null,
    [
      card?.id,
      form.assignmentLevel,
      form.assignmentTargetId,
      form.assignmentTargetKey,
      form.effectiveFrom,
      form.effectiveTo,
      form.status,
    ],
  )

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
    <form onSubmit={onSubmit} id={formId} className="space-y-6" data-testid="pay-card-form">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-[999] space-y-6">
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
        <PayCardConflictCheckNotice input={conflictCheckInput} />
      </ContentCard>

      <ContentCard className="space-y-3" id="pay-card-rates">
        <SectionTitle
          icon={<PoundSterling className="h-4 w-4" aria-hidden />}
          iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          title="Pay rates"
          description="Add at least one rate: choose when it applies and the £ amount."
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

      <ContentCard className="space-y-4" id="pay-card-rules-policy" data-testid="pay-card-rules-policy">
        <SectionTitle
          icon={<CalendarDays className="h-4 w-4" aria-hidden />}
          iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
          title="Holidays"
          description="How holiday pay works for carers on this card, and which bank holidays it uses."
        />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">How is holiday paid?</legend>
          <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Holiday pay" data-testid="pay-card-holiday-pay-method">
            {HOLIDAY_PAY_CHOICES.concat(
              form.holidayPayMethod && !HOLIDAY_PAY_CHOICES.some(c => c.value === form.holidayPayMethod)
                ? [{ value: form.holidayPayMethod, title: form.holidayPayMethod, description: 'Saved on this card.' }]
                : [],
            ).map(choice => {
              const active = (form.holidayPayMethod ?? '') === choice.value
              return (
                <label
                  key={choice.value || 'none'}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                    active ? 'border-primary bg-primary/5' : 'border-border bg-muted/10'
                  } ${saving ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    name="pay-card-holiday-pay"
                    className="mt-0.5 shrink-0"
                    checked={active}
                    onChange={() => patch({ holidayPayMethod: choice.value })}
                    disabled={saving}
                    data-testid={`holiday-pay-${choice.value || 'NONE'}`}
                  />
                  <span>
                    <span className="block font-medium text-foreground">{choice.title}</span>
                    <span className="block text-xs text-muted-foreground">{choice.description}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {form.holidayPayMethod === 'ROLLED_UP_12_07' ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Rolled-up holiday pay is only allowed for irregular-hours and part-year workers. Confirm with your payroll
              adviser before using it.
            </p>
          ) : null}
        </fieldset>
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
          <p className="text-xs text-muted-foreground">Bank holiday rates use these dates (managed in Billing → Bank holidays).</p>
        </label>

        <details
          className="rounded-lg border border-border p-3"
          open={(form.stackingPolicy ?? 'PRIORITY') !== 'PRIORITY'}
          data-testid="pay-card-overlap"
        >
          <summary className="cursor-pointer text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Scale className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              When rates overlap:
            </span>{' '}
            <span className="text-muted-foreground">
              {STACKING_POLICY_CHOICES.find(c => c.value === (form.stackingPolicy ?? 'PRIORITY'))?.title}
            </span>
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            For a time slot that matches more than one rate (e.g. a Sunday that is also a bank holiday). Leave the default
            unless the contract says otherwise.
          </p>
          <div className="mt-2 grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="When rates overlap">
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
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              This changes how visits priced from now on are paid. Visits already priced keep their amounts.
            </p>
          ) : null}
        </details>
      </ContentCard>


      <PayCardWageTypeSummary rules={form.rules ?? []} />

      <PayCardPayPreview
        rules={form.rules ?? []}
        stackingPolicy={form.stackingPolicy ?? 'PRIORITY'}
        bankHolidayRegion={(form.bankHolidayRegion || 'UK') as BankHolidayRegion}
      />
        </div>

        <aside
          className="w-full space-y-6 lg:sticky lg:top-[168px] lg:w-[340px] lg:shrink-0 lg:self-start"
          aria-label="Pay card summary"
        >
          <PayCardSummarySidebar form={form} />
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-[22px] md:px-[22px]">
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
