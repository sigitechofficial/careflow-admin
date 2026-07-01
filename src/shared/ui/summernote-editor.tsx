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

type SummernoteCallbacks = {
  onChange?: (contents: string) => void
  onBlur?: () => void
  onImageUpload?: (files: FileList | File[]) => void
}

type SummernoteOptions = {
  placeholder?: string
  height?: number
  tabsize?: number
  disableDragAndDrop?: boolean
  toolbar?: unknown[]
  popover?: Record<string, unknown>
  colors?: string[][]
  colorButton?: { foreColor?: string; backColor?: string }
  callbacks?: SummernoteCallbacks
}

type SummernoteJQuery = ReturnType<typeof $> & {
  summernote(options: SummernoteOptions): SummernoteJQuery
  summernote(command: 'code', html?: string): string
  summernote(command: 'insertImage', url: string, filename?: string): SummernoteJQuery
  summernote(command: 'destroy' | 'disable' | 'enable'): SummernoteJQuery
  on(
    events: string,
    handler: (event: unknown, contents?: string) => void,
  ): SummernoteJQuery
  off(events: string): SummernoteJQuery
}

function summernoteEl(el: HTMLElement): SummernoteJQuery {
  return $(el) as SummernoteJQuery
}

if (typeof window !== 'undefined') {
  const w = window as typeof window & { jQuery: typeof $; $: typeof $ }
  w.jQuery = $
  w.$ = $
}

/** Treat empty Summernote placeholders as blank so we do not reset the editor while typing. */
export function normalizeSummernoteHtml(html: string | null | undefined): string {
  const raw = (html ?? '').trim()
  if (!raw || raw === '<p><br></p>' || raw === '<p></p>' || raw === '<br>') return ''
  return raw
}

function summernoteHtmlEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeSummernoteHtml(a) === normalizeSummernoteHtml(b)
}

/** Highlight-friendly palette (row 2 = common marker colours). */
export const SUMMERNOTE_HIGHLIGHT_COLORS: string[][] = [
  ['#000000', '#424242', '#636363', '#9C9C94', '#CEC6CE', '#EFEFEF', '#F7F7F7', '#FFFFFF'],
  ['#FF0000', '#FF9C00', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#9C00FF', '#FF00FF'],
  ['#F7C6CE', '#FFE7CE', '#FFEFC6', '#D6EFD6', '#CEDEE7', '#CEE7F7', '#D6D6E7', '#E7D6DE'],
  ['#E79C9C', '#FFC69C', '#FFE79C', '#B5D6A5', '#A5C6CE', '#9CC6EF', '#B5A5D6', '#D6A5BD'],
  ['#E76363', '#F7AD6B', '#FFD663', '#94BD7B', '#73A5AD', '#6BADDE', '#8C7BC6', '#C67BA5'],
  ['#CE0000', '#E79439', '#EFC631', '#6BA54A', '#4A7B8C', '#3984C6', '#634AA5', '#A54A7B'],
  ['#9C0000', '#B56308', '#BD9400', '#397B21', '#104A5A', '#085294', '#311873', '#731842'],
  ['#630000', '#7B3900', '#846300', '#295218', '#083139', '#003163', '#21104A', '#4A1031'],
]

/**
 * Summernote 0.9 registers colour buttons as `forecolor` / `backcolor` (all lowercase).
 * CamelCase names are silently skipped and never appear in the toolbar.
 */
export const SUMMERNOTE_DEFAULT_TOOLBAR: unknown[] = [
  ['style', ['style']],
  ['font', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
  ['fontname', ['fontname']],
  ['fontsize', ['fontsize']],
  ['forecolor', ['forecolor']],
  ['backcolor', ['backcolor']],
  ['para', ['ul', 'ol', 'paragraph']],
  ['height', ['height']],
  ['insert', ['link', 'picture', 'hr']],
  ['view', ['fullscreen', 'codeview', 'help']],
]

export const SUMMERNOTE_DEFAULT_POPOVERS = {
  image: [
    ['image', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
    ['float', ['floatLeft', 'floatRight', 'floatNone']],
    ['remove', ['removeMedia']],
  ],
  link: [['link', ['linkDialogShow', 'unlink']]],
  table: [
    ['add', ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
    ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
  ],
}

interface SummernoteEditorProps {
  value?: string
  /** Return `false` to reject the edit (editor keeps previous content). */
  onChange?: (html: string) => void | false
  onBlur?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: number
  className?: string
  toolbar?: unknown[]
}

export function SummernoteEditor({
  value = '',
  onChange,
  onBlur,
  placeholder = 'Start typing…',
  disabled = false,
  minHeight = 160,
  className,
  toolbar = SUMMERNOTE_DEFAULT_TOOLBAR,
}: SummernoteEditorProps) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const onBlurRef = React.useRef(onBlur)
  onBlurRef.current = onBlur
  const mountedRef = React.useRef(false)
  const isFocusedRef = React.useRef(false)
  const lastEmittedRef = React.useRef(value ?? '')

  const emitChange = React.useCallback((html: string) => {
    const handler = onChangeRef.current
    if (handler) {
      const accepted = handler(html)
      if (accepted === false) return
    }
    lastEmittedRef.current = html
  }, [])

  const emitChangeRef = React.useRef(emitChange)
  emitChangeRef.current = emitChange

  React.useEffect(() => {
    const el = hostRef.current
    if (!el || mountedRef.current) return
    mountedRef.current = true

    const $el = summernoteEl(el)

    const syncFromEditor = () => {
      emitChangeRef.current($el.summernote('code'))
    }

    const onFocus = () => {
      isFocusedRef.current = true
    }
    const onBlurEvent = () => {
      isFocusedRef.current = false
    }

    $el.summernote({
      placeholder,
      height: minHeight,
      tabsize: 2,
      disableDragAndDrop: false,
      toolbar,
      popover: SUMMERNOTE_DEFAULT_POPOVERS,
      colors: SUMMERNOTE_HIGHLIGHT_COLORS,
      colorButton: {
        foreColor: '#000000',
        backColor: '#FFFF00',
      },
      callbacks: {
        onChange: (contents: string) => {
          emitChangeRef.current(contents)
        },
        onBlur: () => {
          isFocusedRef.current = false
          const html = $el.summernote('code')
          lastEmittedRef.current = html
          onChangeRef.current?.(html)
          onBlurRef.current?.(html)
        },
        onImageUpload: (files: FileList | File[]) => {
          const list = Array.from(files)
          for (const file of list) {
            if (!file.type.startsWith('image/')) continue
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = typeof reader.result === 'string' ? reader.result : ''
              if (!dataUrl) return
              $el.summernote('insertImage', dataUrl, file.name)
              syncFromEditor()
            }
            reader.readAsDataURL(file)
          }
        },
      },
    })

    $el.on('summernote.focus', onFocus)
    $el.on('summernote.blur', onBlurEvent)

    const initial = value ?? ''
    if (initial) {
      $el.summernote('code', initial)
    }
    lastEmittedRef.current = initial

    if (disabled) {
      $el.summernote('disable')
    }

    return () => {
      $el.off('summernote.focus', onFocus)
      $el.off('summernote.blur', onBlurEvent)
      $el.summernote('destroy')
      mountedRef.current = false
      isFocusedRef.current = false
    }
  }, [minHeight, placeholder, toolbar])

  React.useEffect(() => {
    const el = hostRef.current
    if (!el || !mountedRef.current) return
    if (isFocusedRef.current) return

    const next = value ?? ''
    if (summernoteHtmlEqual(next, lastEmittedRef.current)) return

    const $el = summernoteEl(el)
    const current = $el.summernote('code')
    if (summernoteHtmlEqual(next, current)) {
      lastEmittedRef.current = next
      return
    }

    $el.summernote('code', next)
    lastEmittedRef.current = next
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
        '[&_.note-toolbar]:flex-wrap [&_.note-toolbar]:gap-0.5 [&_.note-toolbar]:overflow-visible',
        '[&_.note-btn]:pointer-events-auto',
        '[&_.note-color-back_.note-recent-color]:inline-block [&_.note-color-back_.note-recent-color]:min-h-3.5 [&_.note-color-back_.note-recent-color]:min-w-3.5',
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

/** Read live HTML from a mounted Summernote inside `container` (e.g. `[data-ia-rich-text]`). */
export function readSummernoteEditorHtml(container: HTMLElement | null | undefined): string {
  if (!container) return ''
  const mount = container.querySelector('.summernote-editor-host > div')
  if (!(mount instanceof HTMLElement)) return ''
  try {
    const $el = summernoteEl(mount)
    if (!$el.length) return ''
    const code = $el.summernote('code')
    return typeof code === 'string' ? code : ''
  } catch {
    const editable = container.querySelector('.note-editable')
    return editable instanceof HTMLElement ? editable.innerHTML : ''
  }
}
