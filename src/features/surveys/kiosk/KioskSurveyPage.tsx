import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, Loader2, WifiOff } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { fetchPublicSurvey } from '@/features/surveys/api/surveys.api'
import type { PublicSurveyForm, SubmitSurveyResponseInput } from '@/features/surveys/types'
import { SurveyRespondentForm } from '@/features/surveys/components/SurveyRespondentForm'
import { DISPLAY_KEY } from '@/features/surveys/components/SurveyPageOptions'
import { STORAGE_KEY as LANGUAGE_KEY } from '@/features/surveys/survey-translate'
import { surveyStrings } from '@/features/surveys/survey-ui-strings'
import { unavailablePage } from '@/features/surveys/pages/TakeSurveyPage'
import {
  KIOSK_STOCK_FULL,
  KIOSK_STOCK_LOW,
  addFormTokens,
  cacheKioskForm,
  cachedKioskForm,
  fetchFormTokens,
  flushKioskQueue,
  formTokenStock,
  kioskQueue,
  queueAnswer,
  takeFormToken,
} from '@/features/surveys/kiosk/kiosk-queue'

/** No touch for this long while answering: ask whether the person is still there. */
export const KIOSK_IDLE_MS = 2 * 60_000
/** Then clear the answers after this long with no reply. */
export const KIOSK_STILL_THERE_MS = 30_000
/** The thank-you screen goes back to the start for the next person after this long. */
export const KIOSK_THANKS_MS = 20_000
const RETRY_EVERY_MS = 30_000

function useOnline(): boolean {
  const [online, setOnline] = React.useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  React.useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** The next person starts with the page as it first was: no language or display choices left over. */
function forgetChoices() {
  try {
    window.localStorage.removeItem(LANGUAGE_KEY)
    window.localStorage.removeItem(DISPLAY_KEY)
  } catch {
    /* nothing was kept */
  }
}

function Shell({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  useDocumentTitle(title)
  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-background" data-testid="survey-kiosk">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-pb-32">{children}</main>
      {footer}
    </div>
  )
}

function Centered({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  const heading = React.useRef<HTMLHeadingElement>(null)
  React.useEffect(() => heading.current?.focus(), [title])
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted" aria-hidden="true">
          {icon}
        </div>
        <h1 ref={heading} tabIndex={-1} className="text-lg font-semibold text-foreground focus:outline-none">
          {title}
        </h1>
        {children}
      </div>
    </div>
  )
}

/**
 * Kiosk (Phase 3): the shared link on a tablet in the office, a day centre or at an event, for one
 * person after another. No sign-in (so nobody can reach CareFlow from the tablet). After each answer a
 * thank-you, then a fresh page for the next person; answers left half-done are cleared after a while.
 * Answers are kept on the tablet while it is offline and sent when it reconnects (kiosk-queue.ts).
 */
export default function KioskSurveyPage() {
  const { token = '' } = useParams({ strict: false }) as { token?: string }
  const online = useOnline()
  const live = useQuery({
    queryKey: ['surveys', 'kiosk', token],
    queryFn: ({ signal }) => fetchPublicSurvey(token, { signal }),
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 15 * 60_000,
  })
  const [cached] = React.useState(() => (token ? cachedKioskForm(token) : null))
  const form: PublicSurveyForm | null = live.data ?? cached

  // Keep the form and its token, so the tablet can carry on if the connection drops.
  React.useEffect(() => {
    if (!live.data || live.data.linkKind !== 'share') return
    cacheKioskForm(token, live.data)
    if (live.data.formToken) addFormTokens(token, [live.data.formToken])
  }, [live.data, token])

  const [waiting, setWaiting] = React.useState(() => (token ? kioskQueue(token).length : 0))
  const [dropped, setDropped] = React.useState(0)
  const [stock, setStock] = React.useState(() => (token ? formTokenStock(token) : 0))

  const flush = React.useCallback(async () => {
    if (!token) return null
    const result = await flushKioskQueue(token)
    setWaiting(result.left)
    if (result.dropped) setDropped(n => n + result.dropped)
    return result
  }, [token])

  const topUp = React.useCallback(async () => {
    if (!token || formTokenStock(token) >= KIOSK_STOCK_LOW) return
    try {
      addFormTokens(token, await fetchFormTokens(token, KIOSK_STOCK_FULL - formTokenStock(token)))
    } catch {
      /* offline: tried again later */
    }
    setStock(formTokenStock(token))
  }, [token])

  // Send what is waiting and refill the stock when the connection is back, and every so often.
  React.useEffect(() => {
    if (!online || !form || form.linkKind !== 'share') return
    void flush()
    void topUp()
    const timer = window.setInterval(() => {
      void flush()
      void topUp()
    }, RETRY_EVERY_MS)
    return () => window.clearInterval(timer)
  }, [online, form, flush, topUp])

  // One person after another.
  const [person, setPerson] = React.useState(0)
  const [thanks, setThanks] = React.useState<{ language: string | null; closing: string | null } | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const nextPerson = React.useCallback(() => {
    forgetChoices()
    setThanks(null)
    setSaveError(null)
    setPerson(n => n + 1)
  }, [])

  // Start fresh: the first person on this tablet gets no choices left from earlier use.
  React.useEffect(() => forgetChoices(), [])

  const submit = async (input: SubmitSurveyResponseInput, meta?: { language: string | null }) => {
    setSaveError(null)
    const formToken = takeFormToken(token)
    if (!formToken) {
      setSaveError('This tablet needs to connect to the internet before it can take more answers. Please ask a member of staff.')
      return
    }
    setSubmitting(true)
    try {
      if (!queueAnswer(token, { formToken, input })) {
        setSaveError('Your answers could not be kept on this tablet. Please ask a member of staff.')
        return
      }
      setWaiting(kioskQueue(token).length)
      setStock(formTokenStock(token))
      const result = online ? await flush() : null
      const sentNow = result?.closing[formToken]
      const lang = meta?.language ?? null
      setThanks({
        language: lang,
        closing: (sentNow && ((lang && sentNow.closingMessages?.[lang]) || sentNow.closingMessage)) || null,
      })
      void topUp()
    } finally {
      setSubmitting(false)
    }
  }

  // Half-done answers are cleared when the person has walked away.
  const [stillThere, setStillThere] = React.useState(false)
  const lastTouch = React.useRef(Date.now())
  const touched = React.useRef(false)
  React.useEffect(() => {
    lastTouch.current = Date.now()
    touched.current = false
    setStillThere(false)
    const mark = () => {
      lastTouch.current = Date.now()
      touched.current = true
    }
    const events = ['pointerdown', 'keydown', 'input', 'scroll'] as const
    events.forEach(e => window.addEventListener(e, mark, { capture: true, passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, mark, { capture: true }))
  }, [person])
  React.useEffect(() => {
    if (thanks) return
    const timer = window.setInterval(() => {
      if (touched.current && !stillThere && Date.now() - lastTouch.current > KIOSK_IDLE_MS) setStillThere(true)
    }, 5_000)
    return () => window.clearInterval(timer)
  }, [thanks, stillThere])
  React.useEffect(() => {
    if (!stillThere) return
    const timer = window.setTimeout(nextPerson, KIOSK_STILL_THERE_MS)
    return () => window.clearTimeout(timer)
  }, [stillThere, nextPerson])
  React.useEffect(() => {
    if (!thanks) return
    const timer = window.setTimeout(nextPerson, KIOSK_THANKS_MS)
    return () => window.clearTimeout(timer)
  }, [thanks, nextPerson])

  const footer = (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground" data-testid="kiosk-status">
      <span className="inline-flex items-center gap-1.5">
        {online ? null : <WifiOff className="h-3.5 w-3.5" aria-hidden />}
        {online ? 'Tablet survey' : 'Offline: answers are kept on this tablet and sent when it reconnects (within 24 hours).'}
      </span>
      <span>
        {waiting ? `${waiting} ${waiting === 1 ? 'answer' : 'answers'} waiting to send` : 'All answers sent'}
        {dropped ? ` · ${dropped} could not be sent (the survey changed or closed)` : ''}
        {!online && stock < 5 ? ` · room for ${stock} more` : ''}
      </span>
    </footer>
  )

  if (!form) {
    return (
      <Shell title="Survey">
        {live.isLoading ? (
          <div role="status" className="flex min-h-full items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading survey…
          </div>
        ) : (
          <Centered icon={<ClipboardList className="h-6 w-6 text-muted-foreground" />} title="Survey unavailable">
            <p className="mt-2 text-sm text-muted-foreground">
              {(live.error as Error | null)?.message || 'This survey link is invalid or no longer available.'}
            </p>
          </Centered>
        )}
      </Shell>
    )
  }

  if (form.linkKind !== 'share') {
    return (
      <Shell title="Survey">
        <Centered icon={<ClipboardList className="h-6 w-6 text-muted-foreground" />} title="Not a shared link">
          <p className="mt-2 text-sm text-muted-foreground">
            A tablet can only use a survey’s shared link. A person’s own link is for them alone.
          </p>
        </Centered>
      </Shell>
    )
  }

  const unavailable = unavailablePage(form)
  if (unavailable) {
    return (
      <Shell title={`${unavailable.title} – Survey`} footer={footer}>
        <Centered icon={unavailable.icon} title={unavailable.title}>
          <p className="mt-2 text-sm text-muted-foreground">{unavailable.description}</p>
        </Centered>
      </Shell>
    )
  }

  if (thanks) {
    const t = surveyStrings(thanks.language ? form.translations?.[thanks.language] : null)
    return (
      <Shell title={`${t('thankYouTitle')} – Survey`} footer={footer}>
        <Centered icon={<CheckCircle2 className="h-6 w-6 text-teal-600" />} title={t('thankYouTitle')}>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('thankYou')}</p>
          {thanks.closing ? (
            <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-left text-sm leading-relaxed text-foreground" data-testid="survey-closing-message">
              {thanks.closing}
            </p>
          ) : null}
          <Button type="button" size="lg" className="mt-6" onClick={nextPerson}>
            Start for the next person
          </Button>
        </Centered>
      </Shell>
    )
  }

  // One answer per device does not apply: the tablet is for one person after another.
  const kioskForm: PublicSurveyForm = { ...form, oncePerDeviceNote: null, deviceMarker: null }
  return (
    <Shell title={`${form.title} – Survey`} footer={footer}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {saveError ? (
          <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}
        <SurveyRespondentForm key={person} data={kioskForm} submitting={submitting} onSubmit={submit} />
      </div>
      {stillThere ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="kiosk-still-there" className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-lg">
            <h2 id="kiosk-still-there" className="text-lg font-semibold text-foreground">
              Are you still answering?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">If not, your answers will be cleared in a moment so nobody else sees them.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button
                type="button"
                autoFocus
                onClick={() => {
                  lastTouch.current = Date.now()
                  setStillThere(false)
                }}
              >
                Yes, carry on
              </Button>
              <Button type="button" variant="outline" onClick={nextPerson}>
                Clear and start again
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  )
}
