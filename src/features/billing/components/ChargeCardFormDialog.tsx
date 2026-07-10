import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { serializeChargeCardRulesForApi, normalizeChargeCardRulesForEditor } from '@/features/billing/utils/billing-card-payload.util'
import { useCreateChargeCard, useUpdateChargeCard } from '@/features/billing/hooks/useChargeCards'
import {
  BILLING_CARD_STATUS_OPTIONS,
  BILLING_CHARGE_METHOD_OPTIONS,
  BILLING_FREQUENCY_OPTIONS,
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

type ChargeCardFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: ChargeCard | null
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

export function ChargeCardFormDialog({ open, onOpenChange, card }: ChargeCardFormDialogProps) {
  const isEdit = !!card
  const createMutation = useCreateChargeCard()
  const updateMutation = useUpdateChargeCard()
  const lookupsQuery = useEmployeeLookups()
  const fundersQuery = useEnterpriseFunders(open)
  const serviceUsersQuery = useQuery({
    queryKey: ['billing', 'charge-card-service-users'],
    queryFn: () => listServiceUsers({ limit: 100, showInactive: false }),
    enabled: open,
  })
  const saving = createMutation.isPending || updateMutation.isPending

  const [form, setForm] = React.useState<ChargeCardInput>(() => toFormState(card))
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setForm(toFormState(card))
      setError(null)
    }
  }, [open, card])

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
      if (isEdit && card) {
        await updateMutation.mutateAsync({ id: card.id, body: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save charge card.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-3xl">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit charge card' : 'New charge card'}</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-5">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <p className="text-sm text-muted-foreground">
              Reusable invoice rate templates like Birdie and Access. Attach to a funder, service user,
              branch, or contract — then bulk-assign or override on individual records.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">Card name</span>
              <Input
                value={form.name}
                onChange={e => {
                  const name = e.target.value
                  patch({
                    name,
                    code: !isEdit && !form.code ? slugBillingCode(name) : form.code,
                  })
                }}
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Code</span>
              <Input
                value={form.code}
                onChange={e => patch({ code: e.target.value.toUpperCase() })}
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Status</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={e => patch({ status: e.target.value as ChargeCardInput['status'] })}
                disabled={saving}
              >
                {BILLING_CARD_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Attach to</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.assignmentLevel}
                onChange={e =>
                  onAssignmentLevelChange(e.target.value as ChargeCardInput['assignmentLevel'])
                }
                disabled={saving}
              >
                {CHARGE_CARD_ASSIGNMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>

            {needsTargetKey ? (
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">{keyTargetLabel(form.assignmentLevel)}</span>
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
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">
                  {form.assignmentLevel === 'FUNDER'
                    ? 'Funder / payer'
                    : form.assignmentLevel === 'SERVICE_USER'
                      ? 'Service user'
                      : form.assignmentLevel === 'FUNDING_CONTRACT'
                        ? 'Funding contract'
                        : 'Branch / region'}
                </span>
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

            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Display label (optional)</span>
              <Input
                value={form.assignmentLabel ?? ''}
                onChange={e => patch({ assignmentLabel: e.target.value })}
                placeholder="Auto-filled from selection if left blank"
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Billing frequency</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.billingFrequency}
                onChange={e =>
                  patch({ billingFrequency: e.target.value as ChargeCardInput['billingFrequency'] })
                }
                disabled={saving}
              >
                {BILLING_FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Default charge method</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.defaultChargeMethod}
                onChange={e =>
                  patch({ defaultChargeMethod: e.target.value as ChargeCardInput['defaultChargeMethod'] })
                }
                disabled={saving}
              >
                {BILLING_CHARGE_METHOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Payment terms</span>
              <Input
                value={form.paymentTerms ?? ''}
                onChange={e => patch({ paymentTerms: e.target.value })}
                placeholder="Net 30"
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Tax / VAT treatment</span>
              <Input
                value={form.taxTreatment ?? ''}
                onChange={e => patch({ taxTreatment: e.target.value })}
                placeholder="VAT exempt"
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">Invoice grouping rule</span>
              <Input
                value={form.invoiceGroupingRule ?? ''}
                onChange={e => patch({ invoiceGroupingRule: e.target.value })}
                placeholder="One invoice per service user"
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Effective from</span>
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={e => patch({ effectiveFrom: e.target.value })}
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Effective to</span>
              <Input
                type="date"
                value={form.effectiveTo ?? ''}
                onChange={e => patch({ effectiveTo: e.target.value })}
                disabled={saving}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">Notes</span>
              <Input
                value={form.notes ?? ''}
                onChange={e => patch({ notes: e.target.value })}
                disabled={saving}
              />
            </label>
          </div>

          <BillingCardRulesEditor
            mode="charge"
            rules={form.rules ?? []}
            onChange={rules => patch({ rules: rules as ChargeCardRule[] })}
            disabled={saving}
          />
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create charge card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
