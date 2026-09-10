import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { SummernoteEditor } from '@/shared/ui/summernote-editor'

export type CarePlanRichTextFieldProps = {
  value?: string
  onChange?: (html: string) => void
  onBlur?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  /** Minimum editor height in px (IA-style defaults). */
  minHeight?: number
  className?: string
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
}: CarePlanRichTextFieldProps) {
  return (
    <div
      data-care-plan-rich-text
      className={cn('care-plan-rich-text w-full max-w-none', className)}
    >
      <SummernoteEditor
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        minHeight={minHeight}
      />
    </div>
  )
}
