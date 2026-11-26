import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { SummernoteCustomEditor } from '@/shared/ui/summernote-custom-editor'
import { isEmptyRichText } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'

export type CarePlanRichTextFieldProps = {
  value?: string
  onChange?: (html: string) => void
  onBlur?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  /** Minimum editor height in px (IA-style defaults). */
  minHeight?: number
  className?: string
  /** Show the Dictate (speech-to-text) mic, e.g. supervision forms. */
  dictation?: boolean
}

/**
 * Care-plan long text using the same custom Summernote-style editor as Initial Assessment.
 * Stores HTML (bold, lists, fonts, etc.).
 */
export function CarePlanRichTextField({
  value = '',
  onChange,
  onBlur,
  placeholder,
  disabled,
  minHeight = 160,
  className,
  dictation,
}: CarePlanRichTextFieldProps) {
  // Empty → empty (e.g. "" → "<p></p>") is not a change, as in the Initial Assessment field.
  const handleChange = (html: string) => {
    if (isEmptyRichText(html) && isEmptyRichText(value)) return
    onChange?.(html)
  }

  return (
    <div
      data-care-plan-rich-text
      className={cn('care-plan-rich-text w-full max-w-none', className)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onBlur?.(value)
      }}
    >
      <SummernoteCustomEditor
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        minHeight={minHeight}
        className="summernote-custom-wrap"
        dictation={dictation}
      />
    </div>
  )
}
