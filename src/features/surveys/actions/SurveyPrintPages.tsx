import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { PrintPageStyles } from '@/features/surveys/sharing/PrintPageStyles'
import { ACTION_STATUS_LABELS, formatDay, usePublicUpdate, useSurveyPack, useUpdateLetter, type Organisation, type PublicUpdate } from './survey-actions'

function Toolbar({ back, label }: { back: React.ReactNode; label: string }) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-2 print:hidden">
      {back}
      <Button type="button" size="sm" className="gap-1" onClick={() => window.print()}>
        <Printer className="h-4 w-4" aria-hidden /> {label}
      </Button>
    </header>
  )
}

function Waiting({ error }: { error?: boolean }) {
  return error ? (
    <p className="p-8 text-center text-sm text-muted-foreground" role="alert">
      This could not be loaded. It may be limited to particular people, or no longer available.
    </p>
  ) : (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading…
    </div>
  )
}

function Letterhead({ org }: { org: Organisation }) {
  if (!org) return null
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-300 pb-3">
      <div>
        <p className="text-lg font-semibold">{org.name}</p>
        <p className="text-xs text-neutral-600">{[org.phone, org.email].filter(Boolean).join(' · ')}</p>
      </div>
      {org.logoUrl ? <img src={org.logoUrl} alt="" className="h-12 w-auto" /> : null}
    </div>
  )
}

function UpdateBody({ update }: { update: PublicUpdate }) {
  return (
    <>
      <h1 className="mt-6 text-2xl font-semibold">{update.title}</h1>
      {update.intro ? <p className="mt-3 whitespace-pre-line">{update.intro}</p> : null}
      {update.headline ? (
        <p className="mt-3">
          {update.headline.percent}% answered positively to “{update.headline.label}” ({update.headline.base} people).
        </p>
      ) : null}
      <dl className="mt-5 space-y-4">
        {update.items.map((i, n) => (
          <div key={n} className="break-inside-avoid rounded-lg border border-neutral-300 p-3">
            <dt className="font-semibold">You said</dt>
            <dd className="mt-0.5">{i.youSaid}</dd>
            <dt className="mt-2 font-semibold">We did</dt>
            <dd className="mt-0.5">{i.weDid}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

/** /surveys/:surveyId/you-said-we-did/:updateId/letter — the printable letter (no names, no answers). */
export function SurveyUpdateLetterPage() {
  const { surveyId = '', updateId = '' } = useParams({ strict: false }) as { surveyId?: string; updateId?: string }
  const { data, isError } = useUpdateLetter(surveyId, updateId)
  useDocumentTitle('You said, we did (letter) – CareAdmin')
  return (
    <div className="min-h-screen bg-background">
      <PrintPageStyles orientation="portrait" />
      <Toolbar
        label="Print"
        back={
          <Link to="/surveys/$surveyId/actions" params={{ surveyId }} className="inline-flex items-center gap-1 text-sm text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Link>
        }
      />
      {!data ? (
        <Waiting error={isError} />
      ) : (
        <article className="mx-auto max-w-[180mm] bg-white p-4 sm:p-8 text-[15px] leading-relaxed text-neutral-900" data-testid="ysw-letter">
          <Letterhead org={data.organisation} />
          <p className="mt-4 text-sm">{formatDay(new Date().toISOString())}</p>
          <p className="mt-4">{data.audience === 'EMPLOYEE' ? 'Dear colleague,' : 'Dear reader,'}</p>
          <UpdateBody update={data.update} />
          <p className="mt-6">If you would like to talk about anything in this letter, please contact us{data.organisation?.phone ? ` on ${data.organisation.phone}` : ''}.</p>
          <p className="mt-4">With thanks,</p>
          <p className="mt-1 font-medium">{data.organisation?.name}</p>
        </article>
      )}
    </div>
  )
}

/** /you-said-we-did/:token — the public page (no login). */
export function PublicUpdatePage() {
  const { token = '' } = useParams({ strict: false }) as { token?: string }
  const { data, isError } = usePublicUpdate(token)
  useDocumentTitle(data ? `${data.update.title}` : 'You said, we did')
  return (
    <main className="min-h-screen bg-white px-4 py-8 text-neutral-900">
      {!data ? (
        <Waiting error={isError} />
      ) : (
        <article className="mx-auto max-w-2xl" data-testid="ysw-public">
          <Letterhead org={data.organisation} />
          <UpdateBody update={data.update} />
          {data.update.publishedOn ? <p className="mt-6 text-sm text-neutral-600">Published {formatDay(data.update.publishedOn)}</p> : null}
        </article>
      )}
    </main>
  )
}

/** /surveys/:surveyId/pack — the CQC and commissioner pack, ready to print or save as PDF. */
export function SurveyPackPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const { data, isError } = useSurveyPack(surveyId)
  useDocumentTitle(data ? `Pack: ${data.survey.title} – CareAdmin` : 'Survey pack – CareAdmin')
  const h2 = 'mt-6 break-after-avoid text-lg font-semibold'
  return (
    <div className="min-h-screen bg-background">
      <PrintPageStyles orientation="portrait" />
      <Toolbar
        label="Print or save as PDF"
        back={
          <Link to="/surveys/$surveyId/actions" params={{ surveyId }} className="inline-flex items-center gap-1 text-sm text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Link>
        }
      />
      {!data ? (
        <Waiting error={isError} />
      ) : (
        <article className="mx-auto max-w-[190mm] bg-white p-4 sm:p-8 text-sm leading-relaxed text-neutral-900" data-testid="survey-pack">
          <Letterhead org={data.organisation} />
          <h1 className="mt-5 text-2xl font-semibold">{data.survey.title}</h1>
          <p className="text-neutral-600">
            Survey results pack for CQC and commissioners{data.period ? ` · ${data.period.title}` : ''} · prepared {formatDay(data.generatedOn)}
            {data.survey.isAnonymous ? ' · anonymous survey' : ''}
          </p>
          <p className="mt-2 text-xs text-neutral-600">
            {data.threshold > 1 ? `Figures show only where at least ${data.threshold} people answered, and never` : 'Figures never show'} individual answers or who gave them.
            Staff are named by role only.
          </p>

          <h2 className={h2}>Who took part</h2>
          <p>
            {data.participation.sentTo !== null ? `Sent to ${data.participation.sentTo}. ` : ''}
            {data.trends && data.trends.units.length > 1 ? 'Answers in the periods that can be shown' : 'Answered'}: {data.participation.answered}
            {data.participation.responseRate !== null ? ` (${data.participation.responseRate}%)` : ''}.
          </p>

          <h2 className={h2}>Headlines</h2>
          {data.figuresShown ? (
            <>
              {data.headline ? <p>{data.headline.percent}% gave a positive answer to “{data.headline.questionText}” ({data.headline.base} answers).</p> : null}
              <table className="mt-2 w-full border-collapse">
                <caption className="sr-only">Each question</caption>
                <tbody>
                  {data.questions.map(q => (
                    <tr key={q.questionText} className="border-b border-neutral-200">
                      <th scope="row" className="py-1 pr-3 text-left font-normal">{q.questionText}</th>
                      <td className="py-1 text-right tabular-nums">{q.figure}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>{data.figuresNote}</p>
          )}

          {data.trends && data.trends.units.length > 1 ? (
            <>
              <h2 className={h2}>Trends</h2>
              <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse text-xs">
                <caption className="sr-only">Questions by period</caption>
                <thead>
                  <tr className="border-b border-neutral-300">
                    <th scope="col" className="py-1 text-left">Question</th>
                    {data.trends.units.map(u => (
                      <th key={u.id} scope="col" className="px-1 py-1 text-right">{u.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.trends.questions.map(q => (
                    <tr key={q.key} className="border-b border-neutral-200">
                      <th scope="row" className="py-1 pr-2 text-left font-normal">{q.questionText}</th>
                      {q.points.map(p => (
                        <td key={p.unitId} className="px-1 py-1 text-right tabular-nums">
                          {p.point ? (p.point.kind === 'AVERAGE' ? p.point.average : `${p.point.percent}%`) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          ) : null}

          {data.scores.length ? (
            <>
              <h2 className={h2}>Scores</h2>
              <ul className="list-disc pl-5">
                {data.scores.map(s => (
                  <li key={s.key}>
                    {s.label}: {s.average ?? '—'}
                    {s.method === 'PERCENT_OF_MAX' && s.average !== null ? '%' : ''}
                    {s.band ? ` (${s.band})` : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {data.themes.length ? (
            <>
              <h2 className={h2}>What people wrote about</h2>
              <p>{data.themes.map(t => `${t.label} (${t.count ?? 'fewer than 3'})`).join(' · ')}</p>
            </>
          ) : null}

          <h2 className={h2}>Actions taken</h2>
          {data.actions.length ? (
            <table className="w-full border-collapse">
              <caption className="sr-only">Actions</caption>
              <thead>
                <tr className="border-b border-neutral-300 text-left">
                  <th scope="col" className="py-1">Action</th>
                  <th scope="col" className="py-1">Owner</th>
                  <th scope="col" className="py-1">Due</th>
                  <th scope="col" className="py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.actions.map((a, i) => (
                  <tr key={i} className="border-b border-neutral-200 align-top">
                    <td className="py-1 pr-2">
                      {a.title}
                      {a.source ? <span className="block text-xs text-neutral-600">{a.source}</span> : null}
                      {a.outcome ? <span className="block text-xs">Done: {a.outcome}</span> : null}
                    </td>
                    <td className="py-1 pr-2">{a.ownerRole ?? '—'}</td>
                    <td className="py-1 pr-2">{formatDay(a.dueOn)}</td>
                    <td className="py-1">{ACTION_STATUS_LABELS[a.status]}{a.completedOn ? `, ${formatDay(a.completedOn)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No actions recorded yet.</p>
          )}

          {data.discussions.length ? (
            <>
              <h2 className={h2}>Discussed with the team</h2>
              <ul className="list-disc pl-5">
                {data.discussions.map((d, i) => (
                  <li key={i}>
                    {d.kind}, {formatDay(d.heldOn)}
                    {d.attendees ? ` (${d.attendees} attended)` : ''}
                    {d.agreed ? `: ${d.agreed}` : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {data.youSaidWeDid.length ? (
            <>
              <h2 className={h2}>You said, we did</h2>
              {data.youSaidWeDid.map((u, i) => (
                <div key={i} className="mt-2">
                  <p className="font-medium">
                    {u.title}
                    {u.publishedOn ? ` (published ${formatDay(u.publishedOn)})` : ''}
                  </p>
                  <ul className="list-disc pl-5">
                    {u.items.map((it, n) => (
                      <li key={n}>
                        You said: {it.youSaid} — We did: {it.weDid}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          ) : null}

          {data.cqcStatements.length ? (
            <>
              <h2 className={h2}>CQC quality statements this evidences</h2>
              <p>{data.cqcStatements.map(s => s.title).join(' · ')}</p>
            </>
          ) : null}
        </article>
      )}
    </div>
  )
}
