import * as React from 'react'
import {
  CalendarDays,
  CreditCard,
  FileText,
  Hash,
  Pencil,
  PoundSterling,
  Save,
  Target,
  Users,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { BillingCardRulesEditor } from '@/features/billing/components/BillingCardRulesEditor'
import { useCreatePayCard, useUpdatePayCard } from '@/features/billing/hooks/usePayCards'
import {
  PAY_CARD_ASSIGNMENT_OPTIONS,
  PAY_CARD_WORKER_TYPE_OPTIONS,
  slugBillingCode,
  type PayCard,
  type PayCardInput,
  type PayCardRule,
  type PayCardWorkerTypeKey,
} from '@/features/billing/types/billing-cards.types'
import { serializePayCardRulesForApi, normalizePayCardRulesForEditor } from '@/features/billing/utils/billing-card-payload.util'
import { isNightDutyPayRule } from '@/features/billing/utils/billing-card-rule.util'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'

type PayCardFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: PayCard | null
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
  }
}

export function PayCardFormDialog({ open, onOpenChange, card }: PayCardFormDialogProps) {
  const isEdit = !!card
  const createMutation = useCreatePayCard()
  const updateMutation = useUpdatePayCard()
  const lookupsQuery = useEmployeeLookups()
  const saving = createMutation.isPending || updateMutation.isPending

  const [form, setForm] = React.useState<PayCardInput>(() => toFormState(card))
  const [error, setError] = React.useState<string | null>(null)
  const [editorKey, setEditorKey] = React.useState(0)

  React.useEffect(() => {
    if (open) {
      setForm(toFormState(card))
      setError(null)
      setEditorKey(k => k + 1)
    }
  }, [open, card])

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    if (!form.code.trim()) {
      setError('Code is required.')
      return
    }
    if (!form.effectiveFrom?.trim()) {
      setError('Starts from date is required.')
      return
    }
    if (!form.effectiveTo?.trim()) {
      setError('Ends on date is required.')
      return
    }
    if (form.effectiveTo < form.effectiveFrom) {
      setError('Ends on must be on or after Starts from.')
      return
    }
    if (!form.assignmentLabel?.trim()) {
      setError('Display label is required.')
      return
    }
    if (!form.notes?.trim()) {
      setError('Notes are required.')
      return
    }
    if (form.assignmentLevel === 'WORKER_TYPE' && !form.assignmentTargetKey) {
      setError('Select a worker type for this pay card.')
      return
    }
    if (
      form.assignmentLevel &&
      form.assignmentLevel !== 'ORGANISATION_DEFAULT' &&
      form.assignmentLevel !== 'WORKER_TYPE' &&
      !form.assignmentTargetId
    ) {
      setError('Select the branch, role, or employment type this card applies to.')
      return
    }

    const rules = form.rules ?? []
    if (rules.length === 0) {
      setError('Add at least one pay rate rule.')
      return
    }
    for (const rule of rules) {
      const isSupplement =
        rule.rateType === 'MILEAGE'
        || rule.rateType === 'TRAVEL_TIME'
        || rule.rateType === 'WAITING_TIME'
        || isNightDutyPayRule(rule)
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
    }
    try {
      if (isEdit && card) {
        await updateMutation.mutateAsync({ id: card.id, body: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save pay card.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" className="h-[min(90dvh,90vh)] max-w-6xl">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                {isEdit
                  ? <Pencil className="h-4 w-4" aria-hidden />
                  : <CreditCard className="h-4 w-4" aria-hidden />}
              </span>
              {isEdit ? 'Edit pay card' : 'New pay card'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Set who this template is for, then add the £ rates carers are paid.
            </p>
          </DialogHeader>

          <DialogBody className="flex min-h-0 flex-1 flex-col overflow-y-auto p-0 lg:overflow-hidden">
            {error ? (
              <p className="shrink-0 border-b border-border px-5 py-3 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="grid min-h-0 flex-1 lg:grid-cols-2 lg:overflow-hidden">
              <section className="space-y-4 border-b border-border p-5 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
                <SectionTitle
                  icon={<FileText className="h-4 w-4" aria-hidden />}
                  iconClassName="bg-slate-500/10 text-slate-700 dark:text-slate-300"
                  title="Card details"
                  description="All fields are required."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label
                    className={`space-y-1 text-sm${
                      form.assignmentLevel === 'WORKER_TYPE' ? '' : ' sm:col-span-2'
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

                  {form.assignmentLevel &&
                  form.assignmentLevel !== 'ORGANISATION_DEFAULT' &&
                  form.assignmentLevel !== 'WORKER_TYPE' ? (
                    <label className="space-y-1 text-sm sm:col-span-2">
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
                  <label className="space-y-1 text-sm sm:col-span-2">
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
              </section>

              <section className="space-y-3 bg-muted/5 p-5 lg:min-h-0 lg:overflow-y-auto">
                <SectionTitle
                  icon={<PoundSterling className="h-4 w-4" aria-hidden />}
                  iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  title="Pay rates"
                  description="Add at least one rate. Every rule needs an amount and From / Until times."
                />
                <BillingCardRulesEditor
                  key={editorKey}
                  mode="pay"
                  rules={form.rules ?? []}
                  onChange={rules => patch({ rules: rules as PayCardRule[] })}
                  disabled={saving}
                />
              </section>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              leftIcon={isEdit ? <Save className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create pay card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
