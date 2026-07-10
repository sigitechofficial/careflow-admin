import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { BillingFieldLabel } from '@/features/billing/components/BillingFieldLabel'
import { InvoiceTemplateFieldsEditor } from '@/features/billing/components/InvoiceTemplateFieldsEditor'
import {
  useCreateInvoiceTemplate,
  useInvoiceTemplateLayoutPresets,
  useInvoiceTemplateSystemFields,
  useUpdateInvoiceTemplate,
} from '@/features/billing/hooks/useInvoiceTemplates'
import { BILLING_CARD_STATUS_OPTIONS, BILLING_FREQUENCY_OPTIONS } from '@/features/billing/types/billing-cards.types'
import {
  INVOICE_LAYOUT_PRESET_OPTIONS,
  INVOICE_DELIVERY_PRESETS,
  INVOICE_GROUPING_PRESETS,
  INVOICE_TEMPLATE_SCOPE_OPTIONS,
  INVOICE_TEMPLATE_TYPE_OPTIONS,
  slugInvoiceTemplateCode,
  type InvoiceTemplate,
  type InvoiceTemplateInput,
  type InvoiceTemplateLayoutPreset,
} from '@/features/billing/types/invoice-templates.types'
import { useEnterpriseFunders } from '@/features/service-users/hooks/useServiceUserTabs'
import { fetchFundingContractOptions } from '@/features/billing/api/invoice-templates.api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: InvoiceTemplate | null
}

const TEMPLATE_FIELD_TOOLTIPS = {
  name: 'Display name for this export profile — shown in billing setup and on funder records.',
  code: 'Unique short code (e.g. LA-LON-XLSX). Used in file names and audit logs.',
  templateType: 'Output format the funder expects: PDF for families, XLSX/CSV for councils, API for integrations.',
  version: 'Template version for change control. Invoice runs use the version effective on the billing date.',
  status: 'Only ACTIVE templates are used for export. Use DRAFT while configuring, then activate when ready.',
  scope:
    'Who this template applies to: organisation fallback, a specific funder, or one funding contract line.',
  funderId: 'Funder this template is designed for. Used when scope is Funder profile.',
  serviceUserFundingId:
    'Specific funding contract line. Overrides funder and organisation templates for that package.',
  deliveryMethod: 'How the invoice file is sent — email, council portal, secure upload, etc.',
  groupingRule: 'How invoice lines are combined — per service user, per PO, per billing contact, etc.',
  billingFrequency: 'How often invoices are produced for this template — weekly, 4-weekly, or monthly.',
  effectiveFrom: 'Date this template version can be selected for invoice runs.',
  effectiveTo: 'Optional end date. After this, the template is not used unless a newer version exists.',
  fileNamePattern:
    'Pattern for exported files, e.g. INV-{funder}-{week}.xlsx. Tokens are filled at export time.',
  fields:
    'Map funder column names to system data. Mark fields required to block export when values are missing.',
  notes: 'Internal notes for finance staff. Not included in exported invoice files.',
} as const

function toFormState(template?: InvoiceTemplate | null): InvoiceTemplateInput {
  return {
    name: template?.name ?? '',
    code: template?.code ?? '',
    templateType: template?.templateType ?? 'PDF',
    version: template?.version ?? '1.0',
    scope: template?.scope ?? 'FUNDER',
    funderId: template?.funderId ?? '',
    serviceUserFundingId: template?.serviceUserFundingId ?? '',
    deliveryMethod: template?.deliveryMethod ?? '',
    groupingRule: template?.groupingRule ?? '',
    fileNamePattern: template?.fileNamePattern ?? '',
    billingFrequency: template?.billingFrequency ?? 'WEEKLY',
    status: template?.status ?? 'DRAFT',
    effectiveFrom: template?.effectiveFrom?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    effectiveTo: template?.effectiveTo?.slice(0, 10) ?? '',
  notes: template?.notes ?? '',
  layoutPreset: template?.layoutPreset ?? 'STANDARD',
  includeRemittance: template?.includeRemittance ?? false,
  fields: template?.fields ?? [],
  }
}

function presetCodeForLayout(key: InvoiceTemplateLayoutPreset): string {
  switch (key) {
    case 'STANDARD':
      return 'INV-STD-UK'
    case 'LOCAL_AUTHORITY':
      return 'INV-LA-XLSX'
    case 'NHS':
      return 'INV-NHS-UK'
    case 'PRIVATE_CLIENT':
      return 'INV-PVT-UK'
    default:
      return `INV-${key}`
  }
}

export function InvoiceTemplateFormDialog({ open, onOpenChange, template }: Props) {
  const isEdit = !!template
  const createMutation = useCreateInvoiceTemplate()
  const updateMutation = useUpdateInvoiceTemplate()
  const systemFieldsQuery = useInvoiceTemplateSystemFields(open)
  const presetsQuery = useInvoiceTemplateLayoutPresets(open)
  const fundersQuery = useEnterpriseFunders(open)

  const [form, setForm] = React.useState<InvoiceTemplateInput>(() => toFormState(template))
  const [fundingOptions, setFundingOptions] = React.useState<Array<{ value: string; label: string }>>([])
  const [loadingFundings, setLoadingFundings] = React.useState(false)

  React.useEffect(() => {
    if (open) setForm(toFormState(template))
  }, [open, template])

  React.useEffect(() => {
    if (!open || form.scope !== 'FUNDING_CONTRACT') return
    let cancelled = false
    setLoadingFundings(true)
    void fetchFundingContractOptions()
      .then(rows => {
        if (!cancelled) {
          setFundingOptions(rows.map(r => ({ value: r.id, label: r.label })))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFundings(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, form.scope])

  const saving = createMutation.isPending || updateMutation.isPending
  const systemFields = systemFieldsQuery.data?.fields ?? []
  const systemFieldGroups = systemFieldsQuery.data?.groups ?? []
  const layoutPresets = presetsQuery.data ?? []

  const applyLayoutPreset = (key: InvoiceTemplateLayoutPreset) => {
    const preset = layoutPresets.find(row => row.key === key)
    if (!preset) {
      setForm(f => ({ ...f, layoutPreset: key }))
      return
    }
    setForm(f => ({
      ...f,
      layoutPreset: preset.key,
      templateType: preset.templateType,
      billingFrequency: preset.billingFrequency,
      deliveryMethod: preset.deliveryMethod,
      groupingRule: preset.groupingRule,
      fileNamePattern: preset.fileNamePattern,
      includeRemittance: preset.includeRemittance,
      scope: preset.scope,
      fields: preset.fields.map((field, index) => ({
        label: field.label,
        systemFieldKey: field.systemFieldKey,
        isRequired: field.isRequired,
        sortOrder: index,
      })),
      ...(!isEdit
        ? {
            name: preset.name,
            code: presetCodeForLayout(preset.key),
          }
        : {}),
    }))
  }

  const funderOptions = React.useMemo(
    () => (fundersQuery.data ?? []).map(f => ({ value: f.id, label: f.name })),
    [fundersQuery.data],
  )

  const deliveryOptions = React.useMemo(() => {
    const presets = INVOICE_DELIVERY_PRESETS.map(v => ({ value: v, label: v }))
    if (form.deliveryMethod && !presets.some(p => p.value === form.deliveryMethod)) {
      return [{ value: form.deliveryMethod, label: form.deliveryMethod }, ...presets]
    }
    return presets
  }, [form.deliveryMethod])

  const groupingOptions = React.useMemo(() => {
    const presets = INVOICE_GROUPING_PRESETS.map(v => ({ value: v, label: v }))
    if (form.groupingRule && !presets.some(p => p.value === form.groupingRule)) {
      return [{ value: form.groupingRule, label: form.groupingRule }, ...presets]
    }
    return presets
  }, [form.groupingRule])

  const onSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toastApiError(new Error('Name and code are required'), 'Validation')
      return
    }
    const body: InvoiceTemplateInput = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      funderId: form.scope === 'FUNDER' ? form.funderId || null : null,
      serviceUserFundingId:
        form.scope === 'FUNDING_CONTRACT' ? form.serviceUserFundingId || null : null,
      deliveryMethod: form.deliveryMethod || null,
      groupingRule: form.groupingRule || null,
      fileNamePattern: form.fileNamePattern || null,
      effectiveTo: form.effectiveTo || null,
      notes: form.notes || null,
      layoutPreset: form.layoutPreset,
      includeRemittance: form.includeRemittance,
      fields: form.fields.map((f, index) => ({
        label: f.label.trim(),
        systemFieldKey: f.systemFieldKey,
        isRequired: f.isRequired,
        sortOrder: index,
      })),
    }
    try {
      if (isEdit && template) {
        await updateMutation.mutateAsync({ id: template.id, body })
        toastSuccess('Invoice template updated')
      } else {
        await createMutation.mutateAsync(body)
        toastSuccess('Invoice template created')
      }
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'Save failed')
    }
  }

  const error =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : updateMutation.error instanceof ApiError
        ? updateMutation.error.message
        : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit invoice template' : 'New invoice template'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
          <TooltipProvider delayDuration={200}>
          <div className="space-y-2">
            <BillingFieldLabel
              label="Invoice layout"
              tooltip="Industry-standard layouts used by Birdie, Nourish, and Access Group. Selecting a layout fills format, columns, and delivery settings."
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {INVOICE_LAYOUT_PRESET_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    form.layoutPreset === option.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/30',
                  )}
                  onClick={() => applyLayoutPreset(option.value)}
                >
                  <p className="text-sm font-semibold text-foreground">{option.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{option.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <BillingFieldLabel
                className="mb-1"
                label="Template name"
                tooltip={TEMPLATE_FIELD_TOOLTIPS.name}
                required
              />
              <Input
                value={form.name}
                onChange={e => {
                  const name = e.target.value
                  setForm(f => ({
                    ...f,
                    name,
                    code: !isEdit && !f.code ? slugInvoiceTemplateCode(name) : f.code,
                  }))
                }}
              />
            </div>
            <div>
              <BillingFieldLabel
                className="mb-1"
                label="Code"
                tooltip={TEMPLATE_FIELD_TOOLTIPS.code}
                required
              />
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <BillingFieldLabel className="mb-1" label="Format" tooltip={TEMPLATE_FIELD_TOOLTIPS.templateType} />
              <Select
                value={form.templateType}
                onValueChange={v =>
                  setForm(f => ({ ...f, templateType: v as InvoiceTemplateInput['templateType'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TEMPLATE_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <BillingFieldLabel className="mb-1" label="Version" tooltip={TEMPLATE_FIELD_TOOLTIPS.version} />
              <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
            </div>
            <div>
              <BillingFieldLabel className="mb-1" label="Status" tooltip={TEMPLATE_FIELD_TOOLTIPS.status} />
              <Select
                value={form.status}
                onValueChange={v => setForm(f => ({ ...f, status: v as InvoiceTemplateInput['status'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CARD_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <BillingFieldLabel className="mb-1" label="Attach to" tooltip={TEMPLATE_FIELD_TOOLTIPS.scope} />
              <Select
                value={form.scope}
                onValueChange={v => setForm(f => ({ ...f, scope: v as InvoiceTemplateInput['scope'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TEMPLATE_SCOPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.scope === 'FUNDER' ? (
              <div>
                <BillingFieldLabel className="mb-1" label="Funder" tooltip={TEMPLATE_FIELD_TOOLTIPS.funderId} />
                <Combobox
                  options={funderOptions}
                  value={form.funderId ?? ''}
                  onChange={value => setForm(f => ({ ...f, funderId: value }))}
                  placeholder="Select funder"
                />
              </div>
            ) : form.scope === 'FUNDING_CONTRACT' ? (
              <div>
                <BillingFieldLabel
                  className="mb-1"
                  label="Funding contract"
                  tooltip={TEMPLATE_FIELD_TOOLTIPS.serviceUserFundingId}
                />
                {loadingFundings ? (
                  <p className="text-xs text-muted-foreground">Loading contracts…</p>
                ) : (
                  <Combobox
                    options={fundingOptions}
                    value={form.serviceUserFundingId ?? ''}
                    onChange={value => setForm(f => ({ ...f, serviceUserFundingId: value }))}
                    placeholder="Select funding contract"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-end text-sm text-muted-foreground">
                Used when no funder or contract template applies.
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <BillingFieldLabel
                className="mb-1"
                label="Delivery method"
                tooltip={TEMPLATE_FIELD_TOOLTIPS.deliveryMethod}
              />
              <Combobox
                options={deliveryOptions}
                value={form.deliveryMethod ?? ''}
                onChange={value => setForm(f => ({ ...f, deliveryMethod: value }))}
                placeholder="e.g. Council portal upload"
                allowDeselect
              />
            </div>
            <div>
              <BillingFieldLabel
                className="mb-1"
                label="Invoice grouping"
                tooltip={TEMPLATE_FIELD_TOOLTIPS.groupingRule}
              />
              <Combobox
                options={groupingOptions}
                value={form.groupingRule ?? ''}
                onChange={value => setForm(f => ({ ...f, groupingRule: value }))}
                placeholder="e.g. One invoice per service user"
                allowDeselect
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <BillingFieldLabel
                className="mb-1"
                label="Billing frequency"
                tooltip={TEMPLATE_FIELD_TOOLTIPS.billingFrequency}
              />
              <Select
                value={form.billingFrequency}
                onValueChange={v =>
                  setForm(f => ({ ...f, billingFrequency: v as InvoiceTemplateInput['billingFrequency'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_FREQUENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <BillingFieldLabel
                className="mb-1"
                label="Effective from"
                tooltip={TEMPLATE_FIELD_TOOLTIPS.effectiveFrom}
              />
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))}
              />
            </div>
            <div>
              <BillingFieldLabel
                className="mb-1"
                label="Effective to"
                tooltip={TEMPLATE_FIELD_TOOLTIPS.effectiveTo}
              />
              <Input
                type="date"
                value={form.effectiveTo ?? ''}
                onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <BillingFieldLabel
              className="mb-1"
              label="File name pattern"
              tooltip={TEMPLATE_FIELD_TOOLTIPS.fileNamePattern}
            />
            <Input
              value={form.fileNamePattern ?? ''}
              onChange={e => setForm(f => ({ ...f, fileNamePattern: e.target.value }))}
              placeholder="e.g. INV-{funder}-{week}.xlsx"
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <Checkbox
              id="include-remittance"
              checked={form.includeRemittance}
              onCheckedChange={checked =>
                setForm(f => ({ ...f, includeRemittance: checked === true }))
              }
            />
            <label htmlFor="include-remittance" className="text-sm text-foreground">
              Include remittance advice page (Birdie-style payment slip at end of PDF)
            </label>
          </div>

          <InvoiceTemplateFieldsEditor
            fields={form.fields}
            systemFields={systemFields}
            groups={systemFieldGroups}
            onChange={fields => setForm(f => ({ ...f, fields }))}
          />

          <div>
            <BillingFieldLabel className="mb-1" label="Notes" tooltip={TEMPLATE_FIELD_TOOLTIPS.notes} />
            <Input value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </TooltipProvider>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void onSave()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
