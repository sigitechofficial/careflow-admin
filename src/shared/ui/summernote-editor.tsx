import * as React from 'react'
import $ from 'jquery'
import 'summernote/dist/summernote-lite.min.css'
import 'summernote/dist/summernote-lite.min.js'
import { cn } from '@/shared/lib/utils'

/** Summernote 0.9.x calls `jQuery.now()` for IDs; removed in jQuery 4. */
const jqueryWithNow = $ as typeof $ & { now?: () => number }
if (typeof jqueryWithNow.now !== 'function') {
  jqueryWithNow.now = () => Date.now()
}

type SummernoteJQuery = ReturnType<typeof $> & {
  summernote(options: {
    placeholder?: string
    height?: number
    disableDragAndDrop?: boolean
    toolbar?: unknown[]
    callbacks?: { onChange?: (contents: string) => void }
  }): SummernoteJQuery
  summernote(command: 'code', html?: string): string
  summernote(command: 'destroy' | 'disable' | 'enable'): SummernoteJQuery
}

function summernoteEl(el: HTMLElement): SummernoteJQuery {
  return $(el) as SummernoteJQuery
}

if (typeof window !== 'undefined') {
  const w = window as typeof window & { jQuery: typeof $; $: typeof $ }
  w.jQuery = $
  w.$ = $
}

/** Summernote toolbar: includes text/background colour (highlight) via the colour palette. */
export const SUMMERNOTE_DEFAULT_TOOLBAR: unknown[] = [
  ['style', ['style']],
  ['font', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
  ['fontname', ['fontname']],
  ['fontsize', ['fontsize']],
  ['color', ['color']],
  ['para', ['ul', 'ol', 'paragraph']],
  ['height', ['height']],
  ['insert', ['link', 'hr']],
  ['view', ['fullscreen', 'codeview', 'help']],
]

interface SummernoteEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: number
  className?: string
  toolbar?: unknown[]
}

export function SummernoteEditor({
  value = '',
  onChange,
  placeholder = 'Start typing…',
  disabled = false,
  minHeight = 160,
  className,
  toolbar = SUMMERNOTE_DEFAULT_TOOLBAR,
}: SummernoteEditorProps) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const mountedRef = React.useRef(false)

  React.useEffect(() => {
    const el = hostRef.current
    if (!el || mountedRef.current) return
    mountedRef.current = true

    const $el = summernoteEl(el)
    $el.summernote({
      placeholder,
      height: minHeight,
      disableDragAndDrop: true,
      toolbar,
      callbacks: {
        onChange: (contents: string) => {
          onChangeRef.current?.(contents)
        },
      },
    })
    if (value) {
      $el.summernote('code', value)
    }
    if (disabled) {
      $el.summernote('disable')
    }

    return () => {
      $el.summernote('destroy')
      mountedRef.current = false
    }
  }, [disabled, minHeight, placeholder, toolbar])

  React.useEffect(() => {
    const el = hostRef.current
    if (!el || !mountedRef.current) return
    const $el = summernoteEl(el)
    const current = $el.summernote('code')
    if ((value ?? '') !== current) {
      $el.summernote('code', value ?? '')
    }
  }, [value])

  React.useEffect(() => {
    const el = hostRef.current
    if (!el || !mountedRef.current) return
    summernoteEl(el).summernote(disabled ? 'disable' : 'enable')
  }, [disabled])

  return (
    <div
      className={cn(
        'summernote-editor-host rounded-md border border-input bg-background [&_.note-editor]:mb-0',
        '[&_.note-toolbar]:flex-wrap',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <div ref={hostRef} />
    </div>
  )
}

export function looksLikeHtmlContent(text: string | null | undefined): boolean {
  if (!text?.trim()) return false
  return /<[a-z][\s\S]*>/i.test(text.trim())
}
