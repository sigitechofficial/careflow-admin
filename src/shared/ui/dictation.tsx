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

/** Dictated text already in a field: where it starts and exactly what was written. */
export interface DictatedRange {
  start: number
  text: string
}

/**
 * Write dictated text into the field and fire a native input event so React's onChange sees it.
 * With `replace` (words shown while still being spoken), those are swapped for `text`; otherwise
 * it goes at the caret (after any selection — selected text is kept). Returns what was written.
 */
export function writeIntoTextControl(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  replace?: DictatedRange | null,
): DictatedRange | null {
  const value = el.value
  // Only replace words still there as written (the user may have edited them meanwhile).
  const live = replace && value.slice(replace.start, replace.start + replace.text.length) === replace.text
  const from = live ? replace.start : (el.selectionEnd ?? value.length)
  const to = live ? replace.start + replace.text.length : from
  let chunk = dictationChunk(value.slice(0, from), text, value.slice(to))
  if (el.maxLength >= 0) chunk = chunk.slice(0, Math.max(0, el.maxLength - (value.length - (to - from))))
  if (!chunk && from === to) return null
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value.slice(0, from) + chunk + value.slice(to))
  el.dispatchEvent(new Event('input', { bubbles: true }))
  const caret = from + chunk.length
  el.setSelectionRange(caret, caret)
  return chunk ? { start: from, text: chunk } : null
}

/** Insert at the caret (after any selection — selected text is kept). */
export function insertIntoTextControl(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  writeIntoTextControl(el, text)
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
/** The recognition the user wants running (it may still be waiting to start). */
let activeRecognition: SpeechRecognitionLike | null = null

/**
 * The recognition the browser is running: started and not ended yet. Browsers run one at a time,
 * and one started while another is still ending can fail, so the next one waits for it.
 */
let busyRecognition: SpeechRecognitionLike | null = null
let idleWaiters: Array<() => void> = []

/** How long to wait for an ending recognition before starting the next one anyway. */
const IDLE_WAIT_MS = 1000

function markIdle() {
  busyRecognition = null
  const waiters = idleWaiters
  idleWaiters = []
  for (const run of waiters) run()
}

/** Runs `run` once no recognition is running (or after `IDLE_WAIT_MS`, if one never reports its end). */
function whenIdle(run: () => void) {
  const busy = busyRecognition
  if (!busy) {
    run()
    return
  }
  idleWaiters.push(run)
  setTimeout(() => {
    if (busyRecognition === busy && idleWaiters.includes(run)) markIdle()
  }, IDLE_WAIT_MS)
}

function toastRecognitionError(error: string) {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    toastError('Microphone blocked', 'Allow microphone access for this site in your browser to dictate.')
  } else if (error === 'audio-capture') {
    toastError('No microphone found', 'Connect a microphone and try again.')
  } else if (error === 'network') {
    toastError('Dictation unavailable', 'The speech service could not be reached. Check your connection.')
  } else if (error === 'language-not-supported') {
    toastError('Dictation unavailable', 'This browser cannot recognise English (UK) speech.')
  }
}

/** Errors after which listening again would only fail again. */
const FATAL_RECOGNITION_ERRORS = new Set([
  // Something else took the microphone (another tab or app): listening again would loop.
  'aborted',
  'not-allowed',
  'service-not-allowed',
  'audio-capture',
  'network',
  'language-not-supported',
])

export interface DictationButtonProps {
  /**
   * Called once per finished phrase. Where `onInterim` showed the phrase's words while it was
   * spoken, these final words replace them.
   */
  onText: (text: string) => void
  /**
   * Words heard so far in the phrase still being spoken (not final yet), so they can be shown
   * while the user talks. '' once the phrase is finished or listening has ended: whatever was
   * shown stays as it is.
   */
  onInterim?: (text: string) => void
  /** Called just before recording starts (e.g. to focus the field). */
  onStart?: () => void
  disabled?: boolean
  /** Outlined button with "Dictate" / "Stop" text instead of a bare icon. */
  withText?: boolean
  className?: string
}

/** Toggles browser speech-to-text (en-GB). Renders nothing where the Web Speech API is missing. */
export function DictationButton({ onText, onInterim, onStart, disabled, withText, className }: DictationButtonProps) {
  const [recording, setRecording] = React.useState(false)
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)
  const onTextRef = React.useRef(onText)
  onTextRef.current = onText
  const onInterimRef = React.useRef(onInterim)
  onInterimRef.current = onInterim

  const stop = React.useCallback(() => {
    // Cleared first, so onend knows the user stopped it and does not listen again.
    const rec = recognitionRef.current
    recognitionRef.current = null
    // The browser still sends the final words of the phrase being spoken; onend then ends it.
    rec?.stop()
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
    // Another field's mic stops (its last words still go to its field); clearing activeRecognition
    // first stops it from listening again.
    const previous = activeRecognition
    activeRecognition = null
    previous?.stop()
    // Words left from an earlier run of this mic (if its end never came) stay as they are.
    onInterimRef.current?.('')
    const rec = new Ctor()
    rec.lang = 'en-GB'
    rec.continuous = true
    // Partial words arrive while the user speaks; only finished phrases go into the field.
    rec.interimResults = true
    let fatal = false
    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result?.[0]?.transcript ?? ''
        if (result?.isFinal) {
          if (transcript.trim()) onTextRef.current(transcript)
        } else {
          interim += transcript
        }
      }
      onInterimRef.current?.(interim.trim())
    }
    rec.onerror = (event) => {
      if (FATAL_RECOGNITION_ERRORS.has(event.error)) fatal = true
      toastRecognitionError(event.error)
    }
    rec.onend = () => {
      onInterimRef.current?.('')
      // Browsers end recognition after a pause in speech; keep listening until the user presses Stop.
      if (!fatal && recognitionRef.current === rec && activeRecognition === rec) {
        try {
          rec.start()
          return
        } catch {
          /* could not listen again: treat as stopped */
        }
      }
      if (activeRecognition === rec) activeRecognition = null
      if (recognitionRef.current === rec) {
        recognitionRef.current = null
        setRecording(false)
      }
      if (busyRecognition === rec) markIdle()
    }
    recognitionRef.current = rec
    activeRecognition = rec
    setRecording(true)
    onStart?.()
    // Starts once the previous field's recognition (if any) has ended.
    whenIdle(() => {
      if (recognitionRef.current !== rec) {
        // Stopped, or the field went away, while waiting.
        if (activeRecognition === rec) activeRecognition = null
        return
      }
      try {
        rec.start()
        busyRecognition = rec
      } catch {
        toastError('Dictation unavailable', 'Speech recognition could not start. Try again.')
        if (activeRecognition === rec) activeRecognition = null
        recognitionRef.current = null
        setRecording(false)
      }
    })
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
  /** Words of the phrase still being spoken, already written into the field. */
  const interimRef = React.useRef<DictatedRange | null>(null)
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
          const interim = interimRef.current
          interimRef.current = null
          if (el) writeIntoTextControl(el, text, interim)
        }}
        // Words appear in the field as they are spoken; the phrase's final words replace them.
        onInterim={(text) => {
          if (!text) {
            interimRef.current = null
            return
          }
          const el = control()
          if (el) interimRef.current = writeIntoTextControl(el, text, interimRef.current)
        }}
      />
    </div>
  )
}
