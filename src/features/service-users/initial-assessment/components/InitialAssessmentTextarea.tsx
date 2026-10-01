import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { SummernoteCustomEditor } from '@/shared/ui/summernote-custom-editor'

export function plainTextFromHtml(html: string): string {
  if (!html?.trim()) return ''
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  }
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent ?? tmp.innerText ?? '').replace(/ /g, ' ').trim()
}

/** No visible text and no embedded media (e.g. "", "<p></p>", "<p><br></p>"). */
export function isEmptyRichText(html: string | undefined): boolean {
  if (!html?.trim()) return true
  if (/<(img|iframe|video|audio|table)\b/i.test(html)) return false
  return plainTextFromHtml(html) === ''
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
  /** Native textarea — no rich editor (e.g. About Me routine grid cells). */
  plain?: boolean
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
      plain = false,
      ...rest
    },
    ref,
  ) {
    void rest

    const minHeight = compact ? Math.min(rowsToMinHeight(rows), 120) : rowsToMinHeight(rows)

    if (plain) {
      const plainValue = plainTextFromHtml(value)
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={id}
          rows={rows ?? (compact ? 2 : 3)}
          className={cn(
            'initial-assessment-textarea w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            error && 'border-destructive',
            className,
          )}
          value={plainValue}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          aria-describedby={rest['aria-describedby']}
          onChange={(e) => {
            if (maxLength != null && e.target.value.length > maxLength) return
            onChange?.(e)
          }}
          onBlur={onBlur}
        />
      )
    }

    const handleChange = (html: string): void => {
      // The editor normalises an empty field to "<p></p>" on mount. Reporting that as a change made
      // worksheet panels save a block rebuilt from an empty value, wiping saved data when a tab was
      // opened before the assessment finished loading. Empty → empty is not a change.
      if (isEmptyRichText(html) && isEmptyRichText(value)) return
      if (maxLength != null && plainTextFromHtml(html).length > maxLength) return
      onChange?.({
        target: { value: html },
      } as React.ChangeEvent<HTMLTextAreaElement>)
    }

    const handleBlur = () => {
      onBlur?.({
        target: { value: value },
      } as React.FocusEvent<HTMLTextAreaElement>)
    }

    return (
      <div
        ref={ref}
        id={id}
        data-ia-rich-text
        className={cn(
          'initial-assessment-textarea col-span-full w-full max-w-none',
          error && '[&_.summernote-custom-wrap]:border-destructive',
          className,
        )}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) handleBlur()
        }}
      >
        <SummernoteCustomEditor
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          minHeight={minHeight}
          className="summernote-custom-wrap"
        />
      </div>
    )
  },
)

InitialAssessmentTextarea.displayName = 'InitialAssessmentTextarea'

/** Focus the editor region inside a rich-text field wrapper. */
export function focusInitialAssessmentTextarea(host: HTMLElement | null | undefined) {
  host?.querySelector<HTMLElement>('.ProseMirror')?.focus()
}

/** Read current HTML from a mounted editor inside `container` (`[data-ia-rich-text]`). */
export function readInitialAssessmentTextareaValue(host: HTMLElement | null | undefined): string {
  if (!host) return ''
  const pm = host.querySelector('.ProseMirror')
  if (pm instanceof HTMLElement) return pm.innerHTML
  return ''
}
