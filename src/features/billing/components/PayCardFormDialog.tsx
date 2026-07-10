import * as React from 'react'
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
  BILLING_CARD_STATUS_OPTIONS,
  PAY_CARD_ASSIGNMENT_OPTIONS,
  PAY_CARD_WORKER_TYPE_OPTIONS,
  slugBillingCode,
  type PayCard,
  type PayCardInput,
  type PayCardRule,
  type PayCardWorkerTypeKey,
} from '@/features/billing/types/billing-cards.types'
import { serializePayCardRulesForApi, normalizePayCardRulesForEditor } from '@/features/billing/utils/billing-card-payload.util'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'

type PayCardFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: PayCard | null
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

  React.useEffect(() => {
    if (open) {
      setForm(toFormState(card))
      setError(null)
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and code are required.')
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
    setError(null)
    const payload: PayCardInput = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      assignmentTargetId:
        form.assignmentLevel === 'ORGANISATION_DEFAULT' || form.assignmentLevel === 'WORKER_TYPE'
          ? null
          : form.assignmentTargetId || null,
      assignmentTargetKey:
        form.assignmentLevel === 'WORKER_TYPE' ? form.assignmentTargetKey ?? null : null,
      assignmentLabel: form.assignmentLabel?.trim() || undefined,
      effectiveTo: form.effectiveTo?.trim() || null,
      notes: form.notes?.trim() || undefined,
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
      <DialogContent size="lg" className="max-w-3xl">
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit pay card' : 'New pay card'}</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-5">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <p className="text-sm text-muted-foreground">
              Reusable pay rate templates like Birdie and Access. Set who the card applies to, then
              bulk-assign from the pay cards list or override on each employee&apos;s Pay card tab.
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
                onChange={e => patch({ status: e.target.value as PayCardInput['status'] })}
                disabled={saving}
              >
                {BILLING_CARD_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Applies to</span>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.assignmentLevel}
                onChange={e =>
                  onAssignmentLevelChange(e.target.value as PayCardInput['assignmentLevel'])
                }
                disabled={saving}
              >
                {PAY_CARD_ASSIGNMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>

            {form.assignmentLevel === 'WORKER_TYPE' ? (
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Worker type</span>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.assignmentTargetKey ?? 'INTERNAL'}
                  onChange={e =>
                    patch({ assignmentTargetKey: e.target.value as PayCardWorkerTypeKey, assignmentLabel: '' })
                  }
                  disabled={saving}
                >
                  {PAY_CARD_WORKER_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            ) : null}

            {form.assignmentLevel &&
            form.assignmentLevel !== 'ORGANISATION_DEFAULT' &&
            form.assignmentLevel !== 'WORKER_TYPE' ? (
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">
                  {form.assignmentLevel === 'BRANCH'
                    ? 'Branch'
                    : form.assignmentLevel === 'ROLE'
                      ? 'Role'
                      : 'Employment type'}
                </span>
                <Combobox
                  options={targetOptions}
                  value={form.assignmentTargetId ?? ''}
                  onChange={value => patch({ assignmentTargetId: value, assignmentLabel: '' })}
                  placeholder="Select target"
                  disabled={saving || lookupsQuery.isLoading}
                />
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
            mode="pay"
            rules={form.rules ?? []}
            onChange={rules => patch({ rules: rules as PayCardRule[] })}
            disabled={saving}
          />
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create pay card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
