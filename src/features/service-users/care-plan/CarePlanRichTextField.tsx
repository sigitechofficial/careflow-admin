import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { SummernoteEditor } from '@/shared/ui/summernote-editor'
import { SummernoteCustomEditor } from '@/shared/ui/summernote-custom-editor'

export type CarePlanRichTextFieldProps = {
  value?: string
  onChange?: (html: string) => void
  onBlur?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  /** Minimum editor height in px (IA-style defaults). */
  minHeight?: number
  className?: string
  /** IA-style editor with a Dictate (speech-to-text) mic, e.g. supervision forms. */
  dictation?: boolean
}

/**
 * Care-plan long text using the same Summernote editor as Initial Assessment.
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
  return (
    <div
      data-care-plan-rich-text
      className={cn('care-plan-rich-text w-full max-w-none', className)}
    >
      {dictation ? (
        <SummernoteCustomEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          minHeight={minHeight}
          dictation
        />
      ) : (
      <SummernoteEditor
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        minHeight={minHeight}
      />
      )}
    </div>
  )
}
