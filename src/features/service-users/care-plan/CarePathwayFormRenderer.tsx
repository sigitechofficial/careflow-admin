import * as React from 'react'
import { HelpCircle } from 'lucide-react'
import type { CareFormDetail, CareFormFieldRow, FormFieldType } from '@/features/care-pathway/types/care-pathway.types'
import { Input } from '@/shared/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { CarePlanDraftValues } from './care-plan-draft-storage'

function fieldKey(sectionId: string, fieldId: string) {
  return `${sectionId}:${fieldId}`
}

function parseSelectOptions(optionsJson: unknown): string[] {
  if (!optionsJson) return []
  if (Array.isArray(optionsJson)) {
    return optionsJson.map(o => (typeof o === 'string' ? o : String(o))).filter(Boolean)
  }
  if (typeof optionsJson === 'object' && optionsJson !== null && 'options' in optionsJson) {
    const opts = (optionsJson as { options: unknown }).options
    if (Array.isArray(opts)) return opts.map(o => String(o))
  }
  return []
}

function CarePathwayFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: CareFormFieldRow
  value: string | boolean | undefined
  onChange: (v: string | boolean) => void
  disabled?: boolean
}) {
  const type = field.fieldType as FormFieldType

  if (type === 'YES_NO') {
    return (
      <NoYesToggle
        value={value === true || value === 'true'}
        onChange={v => onChange(v)}
        disabled={disabled}
      />
    )
  }

  if (type === 'CHECKBOX') {
    return (
      <Checkbox
        checked={value === true || value === 'true'}
        onCheckedChange={v => onChange(v === true)}
        disabled={disabled}
      />
    )
  }

  if (type === 'SELECT' || type === 'RADIO') {
    const options = parseSelectOptions(field.optionsJson)
    return (
      <Select
        value={typeof value === 'string' ? value : ''}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder ?? 'Select…'} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (type === 'TEXTAREA' || type === 'RICH_TEXT') {
    return (
      <textarea
        className="min-h-[88px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder ?? undefined}
        disabled={disabled}
      />
    )
  }

  const inputType =
    type === 'NUMBER'
      ? 'number'
      : type === 'DATE'
        ? 'date'
        : type === 'TIME'
          ? 'time'
          : 'text'

  return (
    <Input
      type={inputType}
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder ?? undefined}
      disabled={disabled}
    />
  )
}

export function CarePathwayFormRenderer({
  form,
  values,
  onChange,
  disabled,
  embedded,
}: {
  form: CareFormDetail
  values: CarePlanDraftValues
  onChange: (values: CarePlanDraftValues) => void
  disabled?: boolean
  /** When true, renders without outer card chrome for embedding in care plan accordion. */
  embedded?: boolean
}) {
  const setFieldValue = (sectionId: string, field: CareFormFieldRow, next: string | boolean) => {
    onChange({ ...values, [fieldKey(sectionId, field.id)]: next })
  }

  if (!form.sections.length) {
    return <p className="text-sm text-muted-foreground">This form has no sections yet.</p>
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
      {form.sections.map(section => (
        <section
          key={section.id}
          className={embedded ? 'space-y-4 border-t border-border pt-4' : 'rounded-lg border border-border bg-card p-4 shadow-sm'}
        >
          <h3 className={embedded ? 'text-base font-normal text-[#5a7a96]' : 'text-sm font-semibold text-primary'}>
            {section.title}
          </h3>
          {section.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
          ) : null}
          <div className="mt-4 space-y-4">
            {section.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fields in this section.</p>
            ) : (
              section.fields.map(field => {
                const key = fieldKey(section.id, field.id)
                const tooltip = field.helpText?.trim()
                return (
                  <div key={field.id} className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-sm font-medium text-foreground">
                        {field.label}
                        {field.required ? <span className="text-destructive"> *</span> : null}
                      </label>
                      {tooltip ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex shrink-0 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Help: ${tooltip}`}
                            >
                              <HelpCircle className="h-4 w-4" aria-hidden />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            {tooltip}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                    <CarePathwayFieldInput
                      field={field}
                      value={values[key]}
                      onChange={v => setFieldValue(section.id, field, v)}
                      disabled={disabled}
                    />
                  </div>
                )
              })
            )}
          </div>
        </section>
      ))}
      </div>
    </TooltipProvider>
  )
}
