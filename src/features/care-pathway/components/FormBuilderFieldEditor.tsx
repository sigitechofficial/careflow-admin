import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { CareFormFieldRow, FormFieldType } from '@/features/care-pathway/types/care-pathway.types'
import {
  fieldTypeUsesOptions,
  OPTIONS_PRESETS,
  parseFieldOptions,
  serializeFieldOptions,
} from '@/features/care-pathway/utils/form-builder-field-options.util'
import {
  flattenPriorFieldOptions,
  operatorNeedsValue,
  operatorsForFieldType,
  parseConditionalLogic,
  serializeConditionalLogic,
  type ConditionalOperator,
  type FieldConditionalLogic,
  type PriorFieldOption,
} from '@/features/care-pathway/utils/form-builder-conditional-logic.util'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const descriptionTextareaClass =
  'min-h-[72px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

type Props = {
  field: CareFormFieldRow
  fieldTypes: { value: FormFieldType; label: string }[]
  priorFieldOptions: PriorFieldOption[]
  disabled?: boolean
  onChange: (patch: Partial<CareFormFieldRow>) => void
  onRemove: () => void
}

function FieldOptionsEditor({
  options,
  disabled,
  onChange,
}: {
  options: string[]
  disabled?: boolean
  onChange: (next: string[]) => void
}) {
  const updateOption = (index: number, value: string) => {
    onChange(options.map((option, i) => (i === index ? value : option)))
  }

  const addOption = () => onChange([...options, ''])
  const removeOption = (index: number) => onChange(options.filter((_, i) => i !== index))

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-background/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Dropdown options</span>
        <div className="flex flex-wrap gap-1">
          {Object.entries(OPTIONS_PRESETS).map(([label, preset]) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={disabled}
              onClick={() => onChange([...preset])}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {(options.length ? options : ['']).map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={option}
              placeholder={`Option ${index + 1}`}
              disabled={disabled}
              onChange={(event) => updateOption(index, event.target.value)}
            />
            {options.length > 0 && !disabled && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="mr-1 h-3 w-3" />
          Add option
        </Button>
      )}
    </div>
  )
}

function ConditionalLogicEditor({
  logic,
  priorFieldOptions,
  disabled,
  onChange,
}: {
  logic: FieldConditionalLogic | null
  priorFieldOptions: PriorFieldOption[]
  disabled?: boolean
  onChange: (next: FieldConditionalLogic | null) => void
}) {
  const enabled = Boolean(logic?.showWhen?.length)
  const rule = logic?.showWhen?.[0]
  const selectedField = priorFieldOptions.find(
    (option) => option.fieldId === rule?.fieldId && option.sectionId === rule?.sectionId,
  )
  const operators: ConditionalOperator[] = selectedField
    ? operatorsForFieldType(selectedField.fieldType)
    : ['equals', 'not_equals']
  const currentOperator: ConditionalOperator = rule?.operator ?? operators[0] ?? 'equals'

  const setEnabled = (next: boolean) => {
    if (!next) {
      onChange(null)
      return
    }
    const first = priorFieldOptions[0]
    if (!first) return
    onChange({
      showWhen: [
        {
          sectionId: first.sectionId,
          fieldId: first.fieldId,
          operator: operatorsForFieldType(first.fieldType)[0] ?? 'equals',
        },
      ],
    })
  }

  const updateRule = (patch: Partial<NonNullable<FieldConditionalLogic['showWhen']>[number]>) => {
    if (!rule) return
    onChange({
      showWhen: [{ ...rule, ...patch }],
    })
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-background/60 p-3">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={enabled} disabled={disabled || priorFieldOptions.length === 0} onCheckedChange={(value) => setEnabled(value === true)} />
        <span>Show only when another field matches</span>
      </label>
      {priorFieldOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Add a field above this one to configure conditional visibility.</p>
      ) : null}
      {enabled && rule ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">When field</span>
            <Select
              value={`${rule.sectionId}:${rule.fieldId}`}
              disabled={disabled}
              onValueChange={(value) => {
                const [sectionId, fieldId] = value.split(':')
                const nextField = priorFieldOptions.find(
                  (option) => option.sectionId === sectionId && option.fieldId === fieldId,
                )
                if (!nextField) return
                updateRule({
                  sectionId,
                  fieldId,
                  operator: operatorsForFieldType(nextField.fieldType)[0] ?? 'equals',
                  value: undefined,
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {priorFieldOptions.map((option) => (
                  <SelectItem key={`${option.sectionId}:${option.fieldId}`} value={`${option.sectionId}:${option.fieldId}`}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Condition</span>
            <Select
              value={currentOperator}
              disabled={disabled}
              onValueChange={(value) =>
                updateRule({
                  operator: value as ConditionalOperator,
                  value: operatorNeedsValue(value as ConditionalOperator) ? rule.value : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((operator) => (
                  <SelectItem key={operator} value={operator}>
                    {operator.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {operatorNeedsValue(currentOperator) ? (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Value</span>
              <Input
                value={rule.value ?? ''}
                disabled={disabled}
                placeholder="e.g. No"
                onChange={(event) => updateRule({ value: event.target.value })}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function FormBuilderFieldEditor({
  field,
  fieldTypes,
  priorFieldOptions,
  disabled,
  onChange,
  onRemove,
}: Props) {
  const usesOptions = fieldTypeUsesOptions(field.fieldType)
  const isSectionText = field.fieldType === 'SECTION_TEXT'
  const options = parseFieldOptions(field.optionsJson)

  const handleFieldTypeChange = (nextType: FormFieldType) => {
    const patch: Partial<CareFormFieldRow> = { fieldType: nextType }
    if (fieldTypeUsesOptions(nextType) && !fieldTypeUsesOptions(field.fieldType)) {
      patch.optionsJson = serializeFieldOptions([])
    }
    if (nextType === 'SECTION_TEXT') {
      patch.required = false
      patch.placeholder = null
    }
    onChange(patch)
  }

  const handleOptionsChange = (nextOptions: string[]) => {
    onChange({ optionsJson: serializeFieldOptions(nextOptions) })
  }

  return (
    <li className="space-y-2 rounded-md bg-muted/40 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto_auto]">
        <Input
          placeholder={isSectionText ? 'Guidance heading (optional)' : 'Field label'}
          value={field.label}
          onChange={(event) => onChange({ label: event.target.value })}
          disabled={disabled}
        />
        <Select
          value={field.fieldType}
          onValueChange={(value) => handleFieldTypeChange(value as FormFieldType)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fieldTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isSectionText && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={field.required}
              onCheckedChange={(value) => onChange({ required: value === true })}
              disabled={disabled}
            />
            Required
          </label>
        )}
        {!disabled && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isSectionText ? (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Business key (optional)</span>
          <Input
            placeholder="e.g. hsp_personal_care_tasks"
            value={field.fieldKey ?? ''}
            onChange={(event) => {
              const raw = event.target.value
              onChange({ fieldKey: raw.trim() === '' ? null : raw })
            }}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Stable lowercase snake_case key for future IA → care plan mapping. Label can change without breaking the key.
          </p>
        </div>
      ) : null}

      {isSectionText ? (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Guidance text</span>
          <textarea
            className={descriptionTextareaClass}
            value={field.helpText ?? ''}
            onChange={(event) => onChange({ helpText: event.target.value || null })}
            disabled={disabled}
            rows={4}
            placeholder="Display-only guidance shown to staff (no input field)."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Tooltip</span>
              <Input
                placeholder="Help text shown on hover (optional)"
                value={field.helpText ?? ''}
                onChange={(event) => onChange({ helpText: event.target.value || null })}
                disabled={disabled}
                maxLength={2000}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Placeholder</span>
              <Input
                placeholder="Placeholder inside the field (optional)"
                value={field.placeholder ?? ''}
                onChange={(event) => onChange({ placeholder: event.target.value || null })}
                disabled={disabled}
                maxLength={500}
              />
            </div>
          </div>
          {usesOptions && (
            <FieldOptionsEditor options={options} disabled={disabled} onChange={handleOptionsChange} />
          )}
          {!isSectionText ? (
            <ConditionalLogicEditor
              logic={parseConditionalLogic(field.conditionalLogicJson)}
              priorFieldOptions={priorFieldOptions}
              disabled={disabled}
              onChange={(next) =>
                onChange({
                  conditionalLogicJson: serializeConditionalLogic(next),
                })
              }
            />
          ) : null}
        </>
      )}
    </li>
  )
}
