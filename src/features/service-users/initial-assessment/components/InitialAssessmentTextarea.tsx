import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import {
  readSummernoteEditorHtml,
  SummernoteEditor,
} from '@/shared/ui/summernote-editor'

export function plainTextFromHtml(html: string): string {
  if (!html?.trim()) return ''
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  }
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent ?? tmp.innerText ?? '').replace(/\u00a0/g, ' ').trim()
}

function rowsToMinHeight(rows?: number): number {
  if (rows == null) return 160
  return Math.max(96, rows * 28)
}

export type InitialAssessmentTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange' | 'value'
> & {
  value?: string
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>
  error?: boolean
  compact?: boolean
}

export const InitialAssessmentTextarea = React.forwardRef<HTMLDivElement, InitialAssessmentTextareaProps>(
  function InitialAssessmentTextarea(
    {
      value = '',
      onChange,
      onBlur,
      placeholder,
      disabled,
      className,
      id,
      rows,
      compact,
      error,
      maxLength,
      ...rest
    },
    ref,
  ) {
    void rest

    const minHeight = compact ? Math.min(rowsToMinHeight(rows), 120) : rowsToMinHeight(rows)

    const handleChange = (html: string) => {
      if (maxLength != null && plainTextFromHtml(html).length > maxLength) return
      onChange?.({
        target: { value: html },
      } as React.ChangeEvent<HTMLTextAreaElement>)
    }

    const handleBlur = (html: string) => {
      onBlur?.({
        target: { value: html },
      } as React.FocusEvent<HTMLTextAreaElement>)
    }

    return (
      <div
        ref={ref}
        id={id}
        data-ia-rich-text
        className={cn(
          'initial-assessment-textarea col-span-full w-full max-w-none',
          error && '[&_.note-editor]:border-destructive',
          className,
        )}
      >
        <SummernoteEditor
          value={value}
          onChange={handleChange}
          onBlur={onBlur ? handleBlur : undefined}
          placeholder={placeholder}
          disabled={disabled}
          minHeight={minHeight}
        />
      </div>
    )
  },
)

InitialAssessmentTextarea.displayName = 'InitialAssessmentTextarea'

/** Focus the Summernote editable region inside a rich-text field wrapper. */
export function focusInitialAssessmentTextarea(host: HTMLElement | null | undefined) {
  host?.querySelector<HTMLElement>('.note-editable')?.focus()
}

/** Read current Summernote HTML from an `InitialAssessmentTextarea` wrapper (`[data-ia-rich-text]`). */
export function readInitialAssessmentTextareaValue(host: HTMLElement | null | undefined): string {
  return readSummernoteEditorHtml(host)
}
