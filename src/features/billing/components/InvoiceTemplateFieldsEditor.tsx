import * as React from 'react'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { BillingFieldLabel } from '@/features/billing/components/BillingFieldLabel'
import { cn } from '@/shared/lib/utils'
import type {
  InvoiceTemplateField,
  InvoiceTemplateSystemField,
} from '@/features/billing/types/invoice-templates.types'

const FIELD_EDITOR_TOOLTIPS = {
  section:
    'Tick the columns this funder’s export needs. Set an optional display label and mark fields required to block export when data is missing.',
  include: 'Include this column in the invoice export for this template.',
  columnLabel:
    'Column heading in the PDF, Excel, or CSV file — can differ from the internal system field name.',
  required:
    'When enabled, export is blocked if this value is missing on the service user or funding record.',
} as const

type Props = {
  fields: InvoiceTemplateField[]
  systemFields: InvoiceTemplateSystemField[]
  groups?: Array<{ id: string; label: string }>
  onChange: (fields: InvoiceTemplateField[]) => void
}

export function InvoiceTemplateFieldsEditor({
  fields,
  systemFields,
  groups = [],
  onChange,
}: Props) {
  const selectedByKey = React.useMemo(() => {
    const map = new Map<string, InvoiceTemplateField>()
    for (const field of fields) {
      if (!map.has(field.systemFieldKey)) {
        map.set(field.systemFieldKey, field)
      }
    }
    return map
  }, [fields])

  const rebuildFields = (nextSelected: Map<string, InvoiceTemplateField>) => {
    const next: InvoiceTemplateField[] = []
    systemFields.forEach((systemField, index) => {
      const existing = nextSelected.get(systemField.key)
      if (!existing) return
      next.push({
        ...existing,
        systemFieldKey: systemField.key,
        label: existing.label.trim() || systemField.label,
        sortOrder: index,
      })
    })
    onChange(next)
  }

  const toggleInclude = (systemField: InvoiceTemplateSystemField, included: boolean) => {
    const next = new Map(selectedByKey)
    if (included) {
      next.set(systemField.key, {
        label: systemField.label,
        systemFieldKey: systemField.key,
        isRequired: false,
        sortOrder: 0,
      })
    } else {
      next.delete(systemField.key)
    }
    rebuildFields(next)
  }

  const updateIncluded = (
    systemFieldKey: string,
    patch: Partial<Pick<InvoiceTemplateField, 'label' | 'isRequired'>>,
  ) => {
    const existing = selectedByKey.get(systemFieldKey)
    if (!existing) return
    const next = new Map(selectedByKey)
    next.set(systemFieldKey, { ...existing, ...patch })
    rebuildFields(next)
  }

  const selectedCount = selectedByKey.size

  const groupedFields = React.useMemo(() => {
    if (!groups.length) {
      return [{ id: 'ALL', label: 'All fields', fields: systemFields }]
    }
    const byGroup = new Map<string, InvoiceTemplateSystemField[]>()
    for (const field of systemFields) {
      const groupId = field.group ?? 'OTHER'
      const existing = byGroup.get(groupId) ?? []
      existing.push(field)
      byGroup.set(groupId, existing)
    }
    const ordered = groups
      .map(group => ({ ...group, fields: byGroup.get(group.id) ?? [] }))
      .filter(group => group.fields.length > 0)
    const other = byGroup.get('OTHER')
    if (other?.length) {
      ordered.push({ id: 'OTHER', label: 'Other', fields: other })
    }
    return ordered
  }, [groups, systemFields])

  const renderFieldRow = (systemField: InvoiceTemplateSystemField) => {
    const selected = selectedByKey.get(systemField.key)
    const included = !!selected
    const includeId = `invoice-field-include-${systemField.key}`
    const requiredId = `invoice-field-required-${systemField.key}`

    return (
      <div
        key={systemField.key}
        className={cn(
          'grid gap-2 px-3 py-2.5 sm:grid-cols-[auto_1fr_minmax(140px,1.2fr)_auto] sm:items-center sm:gap-3',
          included ? 'bg-background' : 'bg-muted/10',
        )}
      >
        <div className="flex items-center gap-2 sm:justify-center">
          <Checkbox
            id={includeId}
            checked={included}
            onCheckedChange={checked => toggleInclude(systemField, checked === true)}
          />
          <label htmlFor={includeId} className="text-sm font-medium sm:hidden">
            {systemField.label}
          </label>
        </div>

        <div className="hidden sm:block">
          <p className="text-sm font-medium text-foreground">{systemField.label}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{systemField.key}</p>
        </div>

        <div className={cn(!included && 'opacity-50')}>
          <p className="mb-1 text-xs font-medium text-muted-foreground sm:hidden">
            Template column label
          </p>
          <Input
            value={selected?.label ?? ''}
            disabled={!included}
            onChange={e => updateIncluded(systemField.key, { label: e.target.value })}
            placeholder={systemField.label}
            className="h-9"
          />
        </div>

        <div className={cn('flex items-center gap-2 sm:justify-end', !included && 'opacity-50')}>
          <Checkbox
            id={requiredId}
            checked={selected?.isRequired ?? false}
            disabled={!included}
            onCheckedChange={checked =>
              updateIncluded(systemField.key, { isRequired: checked === true })
            }
          />
          <label
            htmlFor={requiredId}
            className={cn('text-xs', included ? 'cursor-pointer' : 'cursor-not-allowed')}
          >
            <BillingFieldLabel
              label="Required"
              tooltip={FIELD_EDITOR_TOOLTIPS.required}
              size="sm"
            />
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BillingFieldLabel
          label="Field mappings & requirements"
          tooltip={FIELD_EDITOR_TOOLTIPS.section}
        />
        <p className="text-xs text-muted-foreground">
          {selectedCount} of {systemFields.length} selected
        </p>
      </div>

      {systemFields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading available fields…</p>
      ) : (
        <div className="space-y-4">
          {groupedFields.map(group => (
            <div key={group.id} className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
              <div className="hidden grid-cols-[auto_1fr_minmax(140px,1.2fr)_auto] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
                <span className="w-8 text-center">Use</span>
                <span>System field</span>
                <span>Template column label</span>
                <span className="pr-1">Required</span>
              </div>
              <div className="max-h-[280px] divide-y divide-border overflow-y-auto">
                {group.fields.map(renderFieldRow)}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Layout matches Birdie, Nourish, and Access Group invoice exports. Tick{' '}
        <strong className="font-medium text-foreground">Use</strong> to include a column.
      </p>
    </div>
  )
}
