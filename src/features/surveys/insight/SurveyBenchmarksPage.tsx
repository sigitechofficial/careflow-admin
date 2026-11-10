import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Scale } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { formatSurveyDate } from '@/features/surveys/survey-datetime'

/** API: careflow-api src/surveys/survey-benchmarks.service.ts. */
export type BenchmarkStatus = {
  sharing: boolean
  agreement: { version: string; text: string[] }
  agreed: { version: string | null; at: string; by: string | null } | null
  agreementOutdated: boolean
  serviceConnected: boolean
  lastSyncedAt: string | null
  lastSyncError: string | null
  canChange: boolean
  minAnswers: number
  minOrganisations: number
  wouldShare: Array<{ reference: string; questionKey: string; percent: number; band: string; surveyTitle: string; questionText: string }>
}

type SectorFigure = { organisations: number; median: number; lowerQuartile: number; upperQuartile: number }
export type BenchmarkComparison = {
  sharing: boolean
  receivedAt?: string | null
  surveys: Array<{
    reference: string
    title: string
    questions: Array<{ key: string; questionText: string; ours: { percent: number; band: string } | null; sector: SectorFigure | null }>
  }>
}

const statusKey = ['surveys', 'benchmarks', 'status'] as const
const compareKey = ['surveys', 'benchmarks', 'compare'] as const
const card = 'rounded-xl border border-border bg-card p-4'
const BAND_LABELS: Record<string, string> = { '10-29': '10 to 29 answered', '30-99': '30 to 99 answered', '100+': '100 or more answered' }

/** Where our figure sits against the middle half of agencies. */
function position(ours: number, s: SectorFigure): { label: string; className: string } | null {
  if (ours < s.lowerQuartile) return { label: 'Below most agencies', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' }
  if (ours > s.upperQuartile) return { label: 'Above most agencies', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' }
  return { label: 'Like most agencies', className: 'bg-muted text-foreground' }
}

/**
 * /surveys/insight/benchmarks: anonymised sector benchmarks (Phase 3). An agency agrees to share (someone who can
 * change company settings, under the data-sharing agreement shown here in full), sees exactly what is shared, and
 * then sees its ready-made survey figures beside other agencies'.
 */
export default function SurveyBenchmarksPage() {
  useDocumentTitle('Compared with other agencies – CareAdmin')
  const canManage = useAuthStore(s => s.can('surveys.manage'))
  const qc = useQueryClient()
  const status = useQuery({
    queryKey: statusKey,
    enabled: canManage,
    queryFn: async () => (await apiJson<ApiEnvelope<BenchmarkStatus>>('/surveys-benchmarks', { method: 'GET' })).data,
  })
  const compare = useQuery({
    queryKey: compareKey,
    queryFn: async () => (await apiJson<ApiEnvelope<BenchmarkComparison>>('/surveys-benchmarks/compare', { method: 'GET' })).data,
  })
  const [agree, setAgree] = React.useState(false)
  const set = useMutation({
    mutationFn: async (sharing: boolean) =>
      (
        await apiJson<ApiEnvelope<BenchmarkStatus>>('/surveys-benchmarks', {
          method: 'PUT',
          body: JSON.stringify(sharing ? { sharing, agreementVersion: status.data?.agreement.version } : { sharing }),
        })
      ).data,
    onSuccess: (next, sharing) => {
      qc.setQueryData(statusKey, next)
      void qc.invalidateQueries({ queryKey: compareKey })
      setAgree(false)
      toastSuccess(sharing ? 'Sharing anonymised figures with the sector benchmark' : 'No longer sharing; our figures are withdrawn')
    },
    onError: e => toastApiError(e, 'Could not change benchmark sharing'),
  })

  const s = status.data
  const surveysToShare = s ? new Set(s.wouldShare.map(r => r.reference)).size : 0

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-start gap-2 border-b border-border pb-4">
        <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
          <Link to="/surveys/insight">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Scale className="h-3.5 w-3.5" aria-hidden /> Survey insight
          </div>
          <h1 className="mt-0.5 text-xl font-semibold text-foreground">Compared with other agencies</h1>
        </div>
      </div>

      <div className="space-y-5">
        {canManage ? (
          <section className={card} aria-labelledby="sharing-heading" data-testid="benchmark-sharing">
            <h2 id="sharing-heading" className="text-base font-semibold">Sharing anonymised figures</h2>
            {!s ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground" role="status">
                {status.isError ? 'Benchmark sharing could not be loaded.' : <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…</>}
              </p>
            ) : (
              <div className="mt-2 space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Agencies using CareFlow’s ready-made surveys can compare their results. Each shares only the share of
                  positive answers to each ready-made question it asked unchanged, and sees other agencies’ figures once
                  at least {s.minOrganisations} share that question. Nobody sees who any figure belongs to.
                </p>
                {s.sharing && !s.agreementOutdated ? (
                  <>
                    <p>
                      <span className="font-medium">We share anonymised figures.</span>{' '}
                      {s.agreed ? `Agreed on ${formatSurveyDate(s.agreed.at)}${s.agreed.by ? ` by ${s.agreed.by}` : ''}.` : null}
                    </p>
                    {!s.serviceConnected ? (
                      <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                        CareFlow is not connected to the benchmark service yet, so nothing has been sent. Your CareFlow
                        provider sets this up.
                      </p>
                    ) : s.lastSyncError ? (
                      <p className="text-rose-700 dark:text-rose-300">The last send failed ({s.lastSyncError}). CareFlow tries again every Monday.</p>
                    ) : s.lastSyncedAt ? (
                      <p className="text-muted-foreground">Last sent on {formatSurveyDate(s.lastSyncedAt)}; sent again every Monday.</p>
                    ) : null}
                    {s.canChange ? (
                      <Button type="button" variant="outline" size="sm" disabled={set.isPending} onClick={() => set.mutate(false)}>
                        Stop sharing
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    {s.agreementOutdated ? (
                      <p className="font-medium">The data-sharing agreement has changed, so nothing is shared until it is accepted again.</p>
                    ) : null}
                    <div className="rounded-md border border-border bg-muted/40 p-3">
                      <h3 className="font-medium">Data-sharing agreement ({s.agreement.version})</h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {s.agreement.text.map(t => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <p data-testid="benchmark-would-share">
                      {s.wouldShare.length
                        ? `Shared now: ${s.wouldShare.length} ${s.wouldShare.length === 1 ? 'figure' : 'figures'} from ${surveysToShare} ready-made ${surveysToShare === 1 ? 'survey' : 'surveys'}.`
                        : `Nothing would be shared yet: no ready-made question has ${s.minAnswers} or more answers in surveys closed in the last 12 months.`}
                    </p>
                    {s.wouldShare.length ? (
                      <details>
                        <summary className="cursor-pointer text-primary">See exactly what is shared</summary>
                        <table className="mt-2 w-full border-collapse text-xs">
                          <caption className="sr-only">Figures shared with the benchmark</caption>
                          <thead>
                            <tr className="border-b border-border text-left text-muted-foreground">
                              <th scope="col" className="py-1 pr-3 font-medium">Ready-made survey</th>
                              <th scope="col" className="px-2 py-1 font-medium">Question</th>
                              <th scope="col" className="px-2 py-1 text-right font-medium">Positive</th>
                              <th scope="col" className="px-2 py-1 font-medium">How many answered</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.wouldShare.map(r => (
                              <tr key={`${r.reference}|${r.questionKey}`} className="border-b border-border/60">
                                <td className="py-1 pr-3">{r.surveyTitle}</td>
                                <td className="px-2 py-1">{r.questionText}</td>
                                <td className="px-2 py-1 text-right tabular-nums">{r.percent}%</td>
                                <td className="px-2 py-1">{BAND_LABELS[r.band] ?? r.band}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    ) : null}
                    {s.canChange ? (
                      <div className="space-y-2">
                        <label className="flex items-start gap-2">
                          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" checked={agree} onChange={e => setAgree(e.target.checked)} />
                          <span>I have read the agreement and agree to it for our organisation.</span>
                        </label>
                        <Button type="button" size="sm" disabled={!agree || set.isPending} onClick={() => set.mutate(true)} className="gap-1.5">
                          {set.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                          Agree and share
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Someone who can change the company settings must agree before figures are shared.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        ) : null}

        <section className={card} aria-labelledby="compare-heading" data-testid="benchmark-compare">
          <h2 id="compare-heading" className="text-base font-semibold">Our results beside other agencies</h2>
          {!compare.data ? (
            <p className="mt-2 text-sm text-muted-foreground" role="status">
              {compare.isError ? 'The comparison could not be loaded. Only staff who see every branch can open it.' : 'Loading…'}
            </p>
          ) : !compare.data.sharing ? (
            <p className="mt-2 text-sm text-muted-foreground">Shown once we share our own anonymised figures.</p>
          ) : compare.data.surveys.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing to compare yet.</p>
          ) : (
            <div className="mt-2 space-y-5">
              <p className="text-xs text-muted-foreground">
                Share of positive answers over the last 12 months, from surveys that have closed. “Other agencies” is the
                middle agency’s figure, and the range is where the middle half of agencies sit. A question shows other
                agencies’ figures only once enough share it.
              </p>
              {compare.data.surveys.map(sv => (
                <div key={sv.reference}>
                  <h3 className="text-sm font-semibold">
                    {sv.title} <span className="font-normal text-muted-foreground">({sv.reference})</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="mt-2 w-full min-w-[560px] border-collapse text-sm">
                      <caption className="sr-only">{sv.title}: our figures beside other agencies</caption>
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th scope="col" className="py-2 pr-3 font-medium">Question</th>
                          <th scope="col" className="px-2 py-2 text-right font-medium">Us</th>
                          <th scope="col" className="px-2 py-2 text-right font-medium">Other agencies</th>
                          <th scope="col" className="px-2 py-2 text-right font-medium">Middle half</th>
                          <th scope="col" className="px-2 py-2 font-medium">Where we sit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sv.questions.map(q => {
                          const pos = q.ours && q.sector ? position(q.ours.percent, q.sector) : null
                          return (
                            <tr key={q.key} className="border-b border-border/60">
                              <th scope="row" className="py-2 pr-3 text-left font-normal">{q.questionText}</th>
                              <td className="px-2 py-2 text-right tabular-nums">{q.ours ? `${q.ours.percent}%` : '—'}</td>
                              <td className="px-2 py-2 text-right tabular-nums">
                                {q.sector ? `${q.sector.median}%` : 'Not enough agencies yet'}
                                {q.sector ? <span className="block text-xs text-muted-foreground">{q.sector.organisations} agencies</span> : null}
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums">{q.sector ? `${q.sector.lowerQuartile}% to ${q.sector.upperQuartile}%` : '—'}</td>
                              <td className="px-2 py-2">
                                {pos ? <span className={`rounded px-2 py-0.5 text-xs ${pos.className}`}>{pos.label}</span> : q.ours ? null : <span className="text-xs text-muted-foreground">Too few of our answers</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
