import * as React from 'react'
import { Mic } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { toastError } from '@/shared/lib/toast'

/* ─── Web Speech API (not in TypeScript's DOM lib) ───────────── */
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly [index: number]: { readonly transcript: string }
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: { readonly length: number; readonly [index: number]: SpeechRecognitionResultLike }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { readonly error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isDictationSupported(): boolean {
  return getSpeechRecognitionCtor() != null
}

/* ─── Opt-in context ─────────────────────────────────────────── */
const DictationContext = React.createContext(false)

/** Shows a mic button on text `Input`s and `Textarea`s rendered inside it. */
export function DictationProvider({ enabled = true, children }: { enabled?: boolean; children: React.ReactNode }) {
  return <DictationContext.Provider value={enabled}>{children}</DictationContext.Provider>
}

/** True inside a `DictationProvider` when the browser has speech recognition. */
export function useDictationEnabled(): boolean {
  return React.useContext(DictationContext) && isDictationSupported()
}

/* ─── Text helpers ───────────────────────────────────────────── */
/** Dictated text with a space added where it would otherwise run into its neighbours. */
export function dictationChunk(before: string, text: string, after: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const lead = before && !/\s$/.test(before) ? ' ' : ''
  const trail = after && !/^\s/.test(after) ? ' ' : ''
  return lead + trimmed + trail
}

/**
 * Insert at the caret (after any selection — selected text is kept) and fire a native input
 * event so React's onChange sees it.
 */
export function insertIntoTextControl(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const value = el.value
  const pos = el.selectionEnd ?? value.length
  let chunk = dictationChunk(value.slice(0, pos), text, value.slice(pos))
  if (el.maxLength >= 0) chunk = chunk.slice(0, Math.max(0, el.maxLength - value.length))
  if (!chunk) return
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value.slice(0, pos) + chunk + value.slice(pos))
  el.dispatchEvent(new Event('input', { bubbles: true }))
  const caret = pos + chunk.length
  el.setSelectionRange(caret, caret)
}

const LAYOUT_CLASS =
  /^-?(?:m[trblxy]?-|w-|min-w-|max-w-|flex-(?!row|col|wrap|nowrap)|basis-|grow|shrink|self-|justify-self-|col-|row-span-|row-start-|row-end-|order-)/

/** Split classes that place a control in its parent (margin, width, flex/grid item) from the rest. */
export function splitLayoutClasses(className: string | undefined): [layout: string, control: string] {
  const layout: string[] = []
  const control: string[] = []
  for (const token of (className ?? '').split(/\s+/).filter(Boolean)) {
    const utility = token.slice(token.lastIndexOf(':') + 1)
    ;(LAYOUT_CLASS.test(utility) ? layout : control).push(token)
  }
  return [layout.join(' '), control.join(' ')]
}

/* ─── Mic button ─────────────────────────────────────────────── */
let activeRecognition: SpeechRecognitionLike | null = null

function toastRecognitionError(error: string) {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    toastError('Microphone blocked', 'Allow microphone access for this site in your browser to dictate.')
  } else if (error === 'audio-capture') {
    toastError('No microphone found', 'Connect a microphone and try again.')
  } else if (error === 'network') {
    toastError('Dictation unavailable', 'The speech service could not be reached. Check your connection.')
  }
}

export interface DictationButtonProps {
  /** Called once per finished phrase. */
  onText: (text: string) => void
  /** Called just before recording starts (e.g. to focus the field). */
  onStart?: () => void
  disabled?: boolean
  /** Outlined button with "Dictate" / "Stop" text instead of a bare icon. */
  withText?: boolean
  className?: string
}

/** Toggles browser speech-to-text (en-GB). Renders nothing where the Web Speech API is missing. */
export function DictationButton({ onText, onStart, disabled, withText, className }: DictationButtonProps) {
  const [recording, setRecording] = React.useState(false)
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)
  const onTextRef = React.useRef(onText)
  onTextRef.current = onText

  const stop = React.useCallback(() => {
    recognitionRef.current?.stop()
    setRecording(false)
  }, [])

  React.useEffect(() => {
    if (disabled) stop()
  }, [disabled, stop])

  React.useEffect(
    () => () => {
      const rec = recognitionRef.current
      recognitionRef.current = null
      rec?.abort()
    },
    [],
  )

  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) return null

  const start = () => {
    activeRecognition?.stop()
    const rec = new Ctor()
    rec.lang = 'en-GB'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result?.[0]?.transcript ?? ''
        if (result?.isFinal && transcript.trim()) onTextRef.current(transcript)
      }
    }
    rec.onerror = (event) => toastRecognitionError(event.error)
    rec.onend = () => {
      if (activeRecognition === rec) activeRecognition = null
      if (recognitionRef.current === rec) {
        recognitionRef.current = null
        setRecording(false)
      }
    }
    onStart?.()
    try {
      rec.start()
    } catch {
      toastError('Dictation unavailable', 'Speech recognition could not start. Try again.')
      return
    }
    recognitionRef.current = rec
    activeRecognition = rec
    setRecording(true)
  }

  const label = recording ? 'Stop dictation' : 'Dictate (speech to text)'

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={recording}
      aria-label={label}
      title={label}
      data-dictation-button
      // Keep focus (and the caret) in the field being dictated into.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => (recording ? stop() : start())}
      className={cn(
        'relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-40',
        recording
          ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-400'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        withText && 'w-auto gap-1.5 border px-2.5 text-xs font-medium',
        withText &&
          (recording
            ? 'border-red-300 text-red-700 dark:border-red-800'
            : 'border-border bg-background text-foreground'),
        className,
      )}
    >
      {withText && recording ? (
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      ) : (
        <Mic className="h-3.5 w-3.5" aria-hidden />
      )}
      {withText ? <span aria-hidden>{recording ? 'Stop' : 'Dictate'}</span> : null}
      {!withText && recording ? (
        <span className="absolute right-1 top-1 flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
      ) : null}
    </button>
  )
}

/* ─── Text input / textarea wrapper ──────────────────────────── */
/** Wraps one `<input>` or `<textarea>` and overlays a mic button on its right edge. */
export function DictationTextControl({
  multiline,
  disabled,
  className,
  children,
}: {
  multiline?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const control = () =>
    wrapRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea') ?? null

  return (
    <div ref={wrapRef} className={cn('relative w-full', className)}>
      {children}
      <DictationButton
        disabled={disabled}
        className={cn('absolute right-1', multiline ? 'top-1' : 'top-1/2 -translate-y-1/2')}
        onStart={() => {
          const el = control()
          if (!el || document.activeElement === el) return
          el.focus()
          el.setSelectionRange(el.value.length, el.value.length)
        }}
        onText={(text) => {
          const el = control()
          if (el) insertIntoTextControl(el, text)
        }}
      />
    </div>
  )
}
