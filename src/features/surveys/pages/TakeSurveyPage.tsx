import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { CalendarClock, CalendarX2, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { AppToaster } from '@/components/layout/AppToaster'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { usePublicSurvey, useSubmitPublicSurvey } from '@/features/surveys/hooks/useSurveys'
import type { PublicSurveyForm, SubmitSurveyResponseInput } from '@/features/surveys/types'
import { SurveyRespondentForm } from '@/features/surveys/components/SurveyRespondentForm'

function PublicShell({ title, children }: { title: string; children: React.ReactNode }) {
  useDocumentTitle(title)
  // #root is overflow:hidden for the admin shell — this page must own scrolling. The bottom scroll
  // padding keeps a focused answer clear of the sticky Submit bar (WCAG 2.4.11).
  return (
    <div className="h-full overflow-y-auto overscroll-y-contain scroll-pb-32 bg-slate-50 dark:bg-background">
      <AppToaster />
      <main>{children}</main>
    </div>
  )
}

function CenteredState({
  icon,
  title,
  description,
  action,
  closingMessage,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  /** The survey's closing screen message, shown under the thank-you (plain text, kept line breaks). */
  closingMessage?: string | null
}) {
  // A new state (e.g. "Response recorded" after submitting) replaces the form: focus moves to its
  // heading so keyboard and screen reader users are told what happened (WCAG 2.4.3, 4.1.3).
  const heading = React.useRef<HTMLHeadingElement>(null)
  React.useEffect(() => {
    heading.current?.focus()
  }, [title])
  return (
    <PublicShell title={`${title} – Survey`}>
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted" aria-hidden="true">
            {icon}
          </div>
          <h1 ref={heading} tabIndex={-1} className="text-lg font-semibold text-foreground focus:outline-none">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          {closingMessage ? (
            <p
              className="mt-4 whitespace-pre-line border-t border-border pt-4 text-left text-sm leading-relaxed text-foreground"
              data-testid="survey-closing-message"
            >
              {closingMessage}
            </p>
          ) : null}
          {action ? <div className="mt-5">{action}</div> : null}
        </div>
      </div>
    </PublicShell>
  )
}

/** One answer per device: a random marker under the link's name, kept only in this browser. */
export function answeredOnThisDevice(marker: string): boolean {
  try {
    return Boolean(window.localStorage.getItem(marker))
  } catch {
    return false
  }
}

export function rememberAnswered(marker: string): void {
  try {
    const random = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('')
    window.localStorage.setItem(marker, random)
  } catch {
    /* private browsing: nothing is remembered, nothing is lost */
  }
}

/** "20 November 2026" (UK). */
function dayOf(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
}

/** The page for a survey that cannot be answered now, or null when it can (or was just answered). */
export function unavailablePage(
  data: PublicSurveyForm,
): { title: string; description: string; icon: React.ReactNode } | null {
  if (data.canSubmit || data.unavailableKind === 'COMPLETED' || !data.unavailableKind) return null
  const icon = <CalendarX2 className="h-6 w-6 text-muted-foreground" aria-hidden />
  switch (data.unavailableKind) {
    case 'ENDED': {
      const ended = data.status === 'CLOSED' ? null : dayOf(data.closesAt)
      return {
        icon,
        title: 'This survey has ended',
        description: `“${data.title}” is no longer taking answers${ended ? ` (it closed on ${ended})` : ''}. Thank you for your interest.`,
      }
    }
    case 'NOT_OPEN': {
      const opens = dayOf(data.opensAt)
      return {
        icon: <CalendarClock className="h-6 w-6 text-muted-foreground" aria-hidden />,
        title: 'This survey is not open yet',
        description: opens ? `“${data.title}” opens on ${opens}. Please come back then.` : `“${data.title}” is not open yet.`,
      }
    }
    case 'CLOSED_FOR_YOU':
      return {
        icon,
        title: 'This survey is closed for you',
        description: data.unavailableReason ?? 'This survey is closed for you. Thank you.',
      }
    case 'NO_OPEN_PERIOD':
      return {
        icon: <CalendarClock className="h-6 w-6 text-muted-foreground" aria-hidden />,
        title: 'No survey is open right now',
        description: data.unavailableReason ?? 'There is no survey open on this link right now.',
      }
    default:
      return { icon, title: 'This survey is not available', description: data.unavailableReason ?? 'This survey is not taking answers.' }
  }
}

function ContactLine({ contact }: { contact: PublicSurveyForm['contact'] }) {
  if (!contact || (!contact.phone && !contact.email)) return null
  return (
    <p className="text-sm text-muted-foreground" data-testid="survey-contact">
      If you would like to tell {contact.name} something, please{' '}
      {contact.phone ? (
        <>
          call <a className="font-medium text-foreground underline" href={`tel:${contact.phone.replace(/\s+/g, '')}`}>{contact.phone}</a>
        </>
      ) : null}
      {contact.phone && contact.email ? ' or ' : ''}
      {contact.email ? (
        <>
          email <a className="font-medium text-foreground underline" href={`mailto:${contact.email}`}>{contact.email}</a>
        </>
      ) : null}
      .
    </p>
  )
}

export default function TakeSurveyPage() {
  const { token = '' } = useParams({ strict: false }) as { token?: string }
  const { data, isLoading, isError, error } = usePublicSurvey(token || undefined)
  const submitMut = useSubmitPublicSurvey(token)
  const [submitted, setSubmitted] = React.useState(false)
  // The closing-screen message, from the submit (the form never holds it before answering).
  const [closing, setClosing] = React.useState<string | null>(null)

  // Spam protection on shared links: a field people never see or reach (bots fill it in).
  const honeypot = React.useRef<HTMLInputElement>(null)
  const submit = async (input: SubmitSurveyResponseInput) => {
    try {
      const result = await submitMut.mutateAsync({
        ...input,
        ...(data?.formToken ? { formToken: data.formToken } : {}),
        ...(honeypot.current?.value ? { website: honeypot.current.value } : {}),
      })
      // One answer per device: remember it here only (a random value, never sent anywhere).
      if (data?.deviceMarker) rememberAnswered(data.deviceMarker)
      setClosing(result?.closingMessage ?? null)
      setSubmitted(true)
      toastSuccess('Thank you — your response was submitted.')
    } catch (err) {
      toastApiError(err, 'Could not submit survey')
    }
  }

  if (isLoading) {
    return (
      <PublicShell title="Loading survey – Survey">
        <div role="status" className="flex min-h-full items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading survey…
        </div>
      </PublicShell>
    )
  }

  if (isError || !data) {
    return (
      <CenteredState
        icon={<ClipboardList className="h-6 w-6 text-muted-foreground" />}
        title="Survey unavailable"
        description={
          (error as Error)?.message || 'This survey link is invalid or no longer available.'
        }
      />
    )
  }

  if (submitted || (data.alreadyCompleted && data.linkKind !== 'share')) {
    return (
      <CenteredState
        icon={<CheckCircle2 className="h-6 w-6 text-teal-600" />}
        title="Response recorded"
        description={
          data.alreadyCompleted && !submitted
            ? 'You have already completed this survey. Thank you.'
            : 'Thank you for completing this survey.'
        }
        closingMessage={submitted ? closing : data.closingMessage}
        action={
          data.askRespondent ? (
            <Button asChild variant="outline">
              <Link to="/portal/surveys">Back to my surveys</Link>
            </Button>
          ) : undefined
        }
      />
    )
  }

  if (data.deviceMarker && answeredOnThisDevice(data.deviceMarker)) {
    return (
      <CenteredState
        icon={<CheckCircle2 className="h-6 w-6 text-teal-600" />}
        title="You have already answered"
        description="This survey has already been answered on this device. Thank you. If someone else would like to answer, please use their own phone or computer."
      />
    )
  }

  // Cannot be answered (ended, not open yet, no period open): a clear page of its own, with who to
  // contact instead. Never the questions.
  const unavailable = unavailablePage(data)
  if (unavailable) {
    return (
      <CenteredState
        icon={unavailable.icon}
        title={unavailable.title}
        description={unavailable.description}
        action={<ContactLine contact={data.contact ?? null} />}
      />
    )
  }

  return (
    <PublicShell title={`${data.title} – Survey`}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {data.linkKind === 'share' ? (
          <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
            <label>
              Leave this empty
              <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>
        ) : null}
        <SurveyRespondentForm data={data} submitting={submitMut.isPending} onSubmit={submit} />
      </div>
    </PublicShell>
  )
}
