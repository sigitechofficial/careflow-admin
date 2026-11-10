import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ClipboardCheck, FlaskConical, Loader2, Play, XCircle } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { operationalTodayIso, getSyncedOperationalTimeZone } from '@/shared/lib/operational-day.util'
import { useScriptCarerOptions } from '@/features/scripts/hooks'
import {
  SCENARIO_LABELS,
  fetchCarerVisits,
  runCompleteVisits,
  type CarerVisit,
  type CompletionScenario,
  type VisitCompletionResult,
} from '@/features/scripts/complete-visits.runner'

const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: getSyncedOperationalTimeZone() })

const money = (n: number | null, currency: string) =>
  n == null ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(n)

type RunState =
  | { kind: 'idle' }
  | { kind: 'running'; dryRun: boolean }
  | { kind: 'done'; dryRun: boolean; results: VisitCompletionResult[] }
  | { kind: 'error'; message: string }

/** Scripts → Visit Completion: a carer's visits on a day, completed as the office records them. */
export default function VisitCompletionPage() {
  const queryClient = useQueryClient()
  const carers = useScriptCarerOptions()
  const [carerId, setCarerId] = React.useState('')
  const [date, setDate] = React.useState(() => operationalTodayIso())
  const [scenario, setScenario] = React.useState<CompletionScenario>('AS_PLANNED')
  const [selected, setSelected] = React.useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [state, setState] = React.useState<RunState>({ kind: 'idle' })
  const [log, setLog] = React.useState<string[]>([])
  const running = state.kind === 'running'

  const visitsQuery = useQuery({
    queryKey: ['scripts', 'carer-visits', carerId, date],
    queryFn: () => fetchCarerVisits(carerId, date),
    enabled: Boolean(carerId && /^\d{4}-\d{2}-\d{2}$/.test(date)),
  })
  const visits = React.useMemo(() => visitsQuery.data ?? [], [visitsQuery.data])

  // Every visit that can be completed is ticked when the list loads.
  React.useEffect(() => {
    setSelected(visits.filter((v) => !v.blockedReason).map((v) => v.jobId))
  }, [visits])

  const chosen = visits.filter((v) => selected.includes(v.jobId) && !v.blockedReason)
  const notEnded = chosen.filter((v) => !v.ended).length
  const carerName = (carers.data?.find((o) => o.value === carerId)?.label ?? '').split(' — ')[0]

  const start = async (dryRun: boolean) => {
    if (!chosen.length || running) return
    setLog([])
    setState({ kind: 'running', dryRun })
    try {
      const results = await runCompleteVisits(
        { employeeId: carerId, date, visits: chosen, scenario },
        { dryRun, log: (line) => setLog((prev) => [...prev, line]) },
      )
      setState({ kind: 'done', dryRun, results })
      if (!dryRun) {
        await queryClient.invalidateQueries({ queryKey: ['scripts', 'carer-visits', carerId, date] })
      }
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const toggle = (v: CarerVisit) =>
    setSelected((prev) => (prev.includes(v.jobId) ? prev.filter((id) => id !== v.jobId) : [...prev, v.jobId]))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Visit Completion"
        description="Complete a carer's visits on a day as the office does with Record visit — tasks ticked, actual times, reasons — then see the pay, charge, travel time and mileage CareFlow works out for each visit."
        icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Scripts', href: '/scripts' }, { label: 'Visit Completion' }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Which visits</CardTitle>
          <CardDescription>
            Pick a carer and a day. Their visits are listed in time order; complete two or more in a row to see the travel time and
            mileage between them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Carer</Label>
              <Select value={carerId} onValueChange={setCarerId} disabled={running}>
                <SelectTrigger aria-label="Carer">
                  <SelectValue placeholder={carers.isLoading ? 'Loading carers…' : 'Choose a carer'} />
                </SelectTrigger>
                <SelectContent>
                  {(carers.data ?? []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Input type="date" aria-label="Day" value={date} disabled={running} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>How the visits went</Label>
              <Select value={scenario} onValueChange={(v) => setScenario(v as CompletionScenario)} disabled={running}>
                <SelectTrigger aria-label="How the visits went">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SCENARIO_LABELS) as CompletionScenario[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SCENARIO_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!carerId ? null : visitsQuery.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading {carerName}&rsquo;s visits…
            </p>
          ) : visitsQuery.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {visitsQuery.error instanceof Error ? visitsQuery.error.message : 'Could not load the visits.'}
            </p>
          ) : !visits.length ? (
            <p className="text-sm text-muted-foreground">{carerName} has no visits on this day.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 font-medium">Planned</th>
                    <th className="px-3 py-2 font-medium">Visit</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visits.map((v) => (
                    <tr key={v.jobId} className={v.blockedReason ? 'text-muted-foreground' : undefined}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Complete ${v.jobName}`}
                          checked={selected.includes(v.jobId) && !v.blockedReason}
                          disabled={running || Boolean(v.blockedReason)}
                          onChange={() => toggle(v)}
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {hm(v.plannedStart)}–{hm(v.plannedEnd)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-foreground">{v.serviceUserName}</span>{' '}
                        <span className="text-muted-foreground">· {v.jobName}</span>
                        {v.requiredCarers > 1 ? <span className="text-muted-foreground"> · double-up</span> : null}
                      </td>
                      <td className="px-3 py-2">
                        {v.blockedReason ? (
                          <span>{v.blockedReason}</span>
                        ) : v.ended ? (
                          <Badge variant="secondary">Ready</Badge>
                        ) : (
                          <Badge variant="warning">Not ended yet</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {notEnded ? (
            <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {notEnded} chosen visit{notEnded === 1 ? ' has' : 's have'} not ended yet. Record visit allows it, but use this only on test
              data — completing creates pay and charge records.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={running || !chosen.length}
              leftIcon={<FlaskConical className="h-4 w-4" />}
              onClick={() => void start(true)}
            >
              Check first (nothing saved)
            </Button>
            <Button
              type="button"
              disabled={running || !chosen.length}
              leftIcon={running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              onClick={() => setConfirmOpen(true)}
            >
              {running ? 'Running…' : `Complete ${chosen.length || ''} visit${chosen.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {state.kind !== 'idle' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {log.join('\n') || 'Starting…'}
            </pre>
            {state.kind === 'error' ? (
              <p className="flex items-start gap-1.5 text-sm text-destructive" role="alert">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> The run did not complete: {state.message}
              </p>
            ) : null}
            {state.kind === 'done' ? <CompletionResults results={state.results} dryRun={state.dryRun} /> : null}
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Complete {chosen.length} visit{chosen.length === 1 ? '' : 's'} for {carerName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Saved for real, under your name, as Record visit does: tasks ticked, actual times {SCENARIO_LABELS[scenario].toLowerCase()},
              then CareFlow prices each visit (pay, charge, travel, mileage).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {chosen.map((v) => (
              <li key={v.jobId}>
                {hm(v.plannedStart)}–{hm(v.plannedEnd)} · {v.serviceUserName}
                {!v.ended ? ' (not ended yet)' : ''}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                void start(false)
              }}
            >
              Complete visits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CompletionResults({ results, dryRun }: { results: VisitCompletionResult[]; dryRun: boolean }) {
  const priced = results.filter((r) => r.pay)
  const currency = priced[0]?.pay?.currency ?? 'GBP'
  const sum = (pick: (r: VisitCompletionResult) => number | null | undefined) =>
    priced.reduce((n, r) => n + (pick(r) ?? 0), 0)
  return (
    <div className="space-y-3" data-testid="visit-completion-results">
      <p className="text-sm font-medium text-foreground">
        {dryRun
          ? 'Check finished — nothing was saved. Pay, charge, travel and mileage are worked out by CareFlow when the visits are completed.'
          : `${results.filter((r) => r.completed).length} of ${results.length} visit(s) completed.`}
      </p>
      {priced.length ? (
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          {[
            ['Carer pay', money(sum((r) => r.pay?.payAmount), currency)],
            ['Client charge', money(sum((r) => r.pay?.chargeAmount), currency)],
            ['Travel time', `${sum((r) => r.pay?.travelMinutes)} min`],
            ['Mileage', `${sum((r) => r.pay?.travelMiles).toFixed(1)} mi`],
            ['Travel + mileage pay', money(sum((r) => (r.pay?.mileageAmount ?? 0) + (r.pay?.travelAmount ?? 0)), currency)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border px-3 py-2">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-base font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {results.map((r) => (
        <div key={r.jobId} className="space-y-1.5 rounded-md border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {r.completed || (dryRun && r.outcome.startsWith('Would')) ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" aria-hidden />
            )}
            <span className="font-medium text-foreground">{r.label}</span>
            <span className="text-muted-foreground">
              planned {r.planned} · actual {r.actual}
            </span>
            {r.pay ? <Badge variant="secondary">{r.pay.status.replace(/_/g, ' ').toLowerCase()}</Badge> : null}
          </div>
          <p className="text-muted-foreground">{r.outcome}</p>
          {r.tasksDone.length ? <p className="text-foreground">Tasks done: {r.tasksDone.join(', ')}</p> : null}
          {r.tasksLeft.length ? (
            <ul className="space-y-0.5">
              {r.tasksLeft.map((t) => (
                <li key={t} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          ) : null}
          {r.pay ? (
            <div className="grid gap-1 rounded-md bg-muted/40 p-2 sm:grid-cols-2">
              <span>
                Carer pay: <strong>{money(r.pay.payAmount, r.pay.currency)}</strong> ({r.pay.payable || '—'})
              </span>
              <span>
                Client charge: <strong>{money(r.pay.chargeAmount, r.pay.currency)}</strong> ({r.pay.billable || '—'})
              </span>
              <span>
                Travel from {r.pay.fromPreviousVisit ?? 'no earlier visit that day'}: <strong>{r.pay.travelMinutes ?? 0} min</strong>
                {r.pay.travelAmount != null ? ` · ${money(r.pay.travelAmount, r.pay.currency)}` : ''}
              </span>
              <span>
                Mileage: <strong>{r.pay.travelMiles ?? 0} mi</strong>
                {r.pay.mileageAmount != null ? ` · ${money(r.pay.mileageAmount, r.pay.currency)}` : ''}
              </span>
              {r.pay.travelExplanation ? <span className="text-xs text-muted-foreground sm:col-span-2">{r.pay.travelExplanation}</span> : null}
              {r.pay.mileageExplanation ? (
                <span className="text-xs text-muted-foreground sm:col-span-2">{r.pay.mileageExplanation}</span>
              ) : null}
              {r.pay.exceptions.map((x) => (
                <span key={x} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 sm:col-span-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {x}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
