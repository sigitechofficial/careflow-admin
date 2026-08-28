import * as React from 'react'
import type { CareFormDetail, CareFormFieldRow, FormFieldType } from '@/features/care-pathway/types/care-pathway.types'
import { Input } from '@/shared/ui/input'
import { TooltipProvider } from '@/shared/ui/tooltip'
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
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'
import { CarePlanReviewRow } from '@/features/service-users/care-plans/components/CarePlanReviewRow'
import { CarePlanSectionHeader } from '@/features/service-users/care-plans/components/CarePlanSectionHeader'
import {
  parseCarePlanYesNoValue,
  suggestionConflictState,
  visibleFieldSuggestion,
} from '@/features/service-users/care-plans/care-plan-suggestion-state'
import { CarePlanAutoPrefillIndicator } from '@/features/service-users/care-plans/components/CarePlanAutoPrefillIndicator'
import {
  parseFieldOptions,
  parseMultiSelectValue,
  serializeMultiSelectValue,
} from '@/features/care-pathway/utils/form-builder-field-options.util'
import { isFieldVisible } from '@/features/care-pathway/utils/form-builder-conditional-logic.util'
import {
  carePlanNumberPlaceholder,
  formatCarePlanNumberInputValue,
} from '@/features/service-users/care-plan/care-plan-number-field.util'
import {
  CarePathwayFileUploadField,
  CarePathwayPhotoField,
  CarePathwaySignatureField,
} from '@/features/service-users/care-plan/CarePathwayMediaFields'
import { RichTextEditor } from '@/shared/ui/rich-text-editor'
import { SummernoteEditor } from '@/shared/ui/summernote-editor'

function fieldKey(sectionId: string, fieldId: string) {
  return `${sectionId}:${fieldId}`
}

function parseSelectOptions(optionsJson: unknown): string[] {
  return parseFieldOptions(optionsJson)
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
        value={parseCarePlanYesNoValue(value)}
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

  if (type === 'MULTI_SELECT') {
    const options = parseSelectOptions(field.optionsJson)
    const selected = parseMultiSelectValue(value)
    return (
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const checked = selected.includes(option)
          return (
            <label key={option} className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(next) => {
                  const nextSelected = next
                    ? [...selected, option]
                    : selected.filter((item) => item !== option)
                  onChange(serializeMultiSelectValue(nextSelected))
                }}
              />
              <span>{option}</span>
            </label>
          )
        })}
      </div>
    )
  }

  if (type === 'TEXTAREA') {
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

  if (type === 'RICH_TEXT') {
    return (
      <RichTextEditor
        value={typeof value === 'string' ? value : ''}
        onChange={html => onChange(html)}
        placeholder={field.placeholder ?? 'Start typing…'}
        disabled={disabled}
        minHeight={120}
      />
    )
  }

  if (type === 'SUMMERNOTE') {
    return (
      <SummernoteEditor
        value={typeof value === 'string' ? value : ''}
        onChange={html => onChange(html)}
        placeholder={field.placeholder ?? 'Start typing…'}
        disabled={disabled}
        minHeight={120}
      />
    )
  }

  if (type === 'PHOTO') {
    return (
      <CarePathwayPhotoField
        value={value}
        onChange={(next) => onChange(next)}
        disabled={disabled}
      />
    )
  }

  if (type === 'FILE_UPLOAD') {
    return (
      <CarePathwayFileUploadField
        value={value}
        onChange={(next) => onChange(next)}
        disabled={disabled}
      />
    )
  }

  if (type === 'SIGNATURE') {
    return (
      <CarePathwaySignatureField
        value={value}
        onChange={(next) => onChange(next)}
        disabled={disabled}
      />
    )
  }

  if (type === 'NUMBER') {
    return (
      <Input
        type="number"
        value={formatCarePlanNumberInputValue(value)}
        onChange={e => onChange(e.target.value)}
        placeholder={carePlanNumberPlaceholder(field.placeholder)}
        disabled={disabled}
      />
    )
  }

  const inputType =
    type === 'DATE'
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

function SectionTextBlock({ field }: { field: CareFormFieldRow }) {
  return (
    <div className="rounded-sm border border-sky-100 bg-sky-50/40 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
      {field.label?.trim() ? <p className="font-medium text-foreground">{field.label}</p> : null}
      {field.helpText?.trim() ? (
        <p className={field.label?.trim() ? 'mt-2' : undefined}>{field.helpText}</p>
      ) : null}
    </div>
  )
}

export function CarePathwayFormRenderer({
  form,
  values,
  onChange,
  disabled,
  embedded,
  suggestions,
  ignoredSuggestionIds,
  composedFrom,
  onUseSuggestion,
  onIgnoreSuggestion,
  onKeepCurrentSuggestion,
}: {
  form: CareFormDetail
  values: CarePlanDraftValues
  onChange: (values: CarePlanDraftValues) => void
  disabled?: boolean
  /** When true, renders without outer card chrome for embedding in care plan accordion. */
  embedded?: boolean
  suggestions?: CarePlanFieldSuggestion[]
  ignoredSuggestionIds?: string[]
  composedFrom?: Record<string, unknown>
  onUseSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onIgnoreSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
  onKeepCurrentSuggestion?: (suggestion: CarePlanFieldSuggestion) => void
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
        {form.description?.trim() && !embedded ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{form.description}</p>
        ) : null}
      {form.sections.map(section => (
        <section
          key={section.id}
          className={
            embedded
              ? 'space-y-4 border-t border-border pt-4'
              : 'rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,39,68,0.04)] dark:border-slate-700 dark:bg-card'
          }
        >
          {(() => {
            const visibleFields = section.fields.filter(
              field => field.fieldType === 'SECTION_TEXT' || isFieldVisible(field, values),
            )
            const pendingRecommendationCount = visibleFields.reduce((count, field) => {
              if (field.fieldType === 'SECTION_TEXT') return count
              if (!onUseSuggestion || !onIgnoreSuggestion || !onKeepCurrentSuggestion) return count
              const key = fieldKey(section.id, field.id)
              const suggestion = visibleFieldSuggestion(suggestions, key, ignoredSuggestionIds ?? [])
              if (!suggestion) return count
              if (suggestionConflictState(values[key], suggestion) === 'match') return count
              return count + 1
            }, 0)

            return (
              <>
                <CarePlanSectionHeader
                  title={section.title}
                  description={section.description}
                  recommendationCount={pendingRecommendationCount}
                  embedded={embedded}
                />
                <div className="mt-4 space-y-3">
                  {section.fields.length === 0 ? (
                    section.description ? null : (
                      <p className="text-sm text-muted-foreground">No fields in this section.</p>
                    )
                  ) : (
                    visibleFields.map(field => {
                      if (field.fieldType === 'SECTION_TEXT') {
                        return <SectionTextBlock key={field.id} field={field} />
                      }

                      const key = fieldKey(section.id, field.id)
                      const tooltip = field.helpText?.trim()
                      const suggestion = visibleFieldSuggestion(
                        suggestions,
                        key,
                        ignoredSuggestionIds ?? [],
                      )

                      return (
                        <CarePlanReviewRow
                          key={field.id}
                          label={field.label}
                          required={field.required}
                          helpText={tooltip}
                          category={section.title}
                          currentValue={values[key]}
                          disabled={disabled}
                          suggestion={suggestion}
                          onUseSuggestion={onUseSuggestion}
                          onDismissSuggestion={onIgnoreSuggestion}
                          onKeepCurrentSuggestion={onKeepCurrentSuggestion}
                          answerFooter={
                            composedFrom ? (
                              <CarePlanAutoPrefillIndicator composedFrom={composedFrom} fieldKey={key} />
                            ) : null
                          }
                          input={
                            <CarePathwayFieldInput
                              field={field}
                              value={values[key]}
                              onChange={v => setFieldValue(section.id, field, v)}
                              disabled={disabled}
                            />
                          }
                        />
                      )
                    })
                  )}
                </div>
              </>
            )
          })()}
        </section>
      ))}
      </div>
    </TooltipProvider>
  )
}
