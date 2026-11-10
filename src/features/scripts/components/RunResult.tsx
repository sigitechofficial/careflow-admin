import * as React from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import type { RunState } from '@/features/scripts/hooks'
import type { Summary } from '@/features/scripts/create-visits.runner'

/** Live progress while a run goes, then what it did — per service user, nothing claimed that did not happen. */
export function RunResult({
  state,
  log,
  onGenerateRota,
  onSkipRota,
}: {
  state: RunState
  log: string[]
  onGenerateRota?: () => void
  onSkipRota?: () => void
}) {
  const logRef = React.useRef<HTMLPreElement>(null)
  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  if (state.kind === 'idle') return null
  return (
    <div className="space-y-3" aria-live="polite">
      <div className="space-y-1.5">
        <Label>Progress</Label>
        <pre
          ref={logRef}
          className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed"
        >
          {log.join('\n') || 'Starting…'}
        </pre>
      </div>
      {state.kind === 'error' ? (
        <p className="flex items-start gap-1.5 text-sm text-destructive" role="alert">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          The run did not complete: {state.message}
        </p>
      ) : null}
      {state.kind === 'done' ? (
        <RotaChoicePanel state={state} onGenerateRota={onGenerateRota} onSkipRota={onSkipRota} />
      ) : null}
      {state.kind === 'done' ? <RunSummary results={state.results} dryRun={state.dryRun} outcome={state.outcome} /> : null}
    </div>
  )
}

/** After a real run: plans are saved, and the rota is made only if you choose Generate rota. */
function RotaChoicePanel({
  state,
  onGenerateRota,
  onSkipRota,
}: {
  state: Extract<RunState, { kind: 'done' }>
  onGenerateRota?: () => void
  onSkipRota?: () => void
}) {
  if (state.rota === 'none') return null
  const waiting = state.results.filter((r) => r.rotaPending).length
  if (state.rota === 'generated') {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> Rota generated — the visits below are on the rota board.
      </p>
    )
  }
  if (state.rota === 'skipped') {
    return (
      <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        Rota not generated. New visit plans are saved as <strong className="text-foreground">drafts</strong> — activate them and use
        Generate rota on each Visit plan tab, or Scheduling → Bulk generate rota. Changes to plans that were already active are saved;
        the nightly rolling rota (if switched on) adds their new visits.
      </p>
    )
  }
  return (
    <div className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3" role="region" aria-label="Generate the rota">
      <p className="flex items-start gap-1.5 text-sm font-medium text-foreground">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        Visit plans, tasks and medicines are saved for {waiting} service user{waiting === 1 ? '' : 's'}. Generate their rota now?
      </p>
      <p className="text-xs text-muted-foreground">
        Generate rota activates new plans and makes the visits for the rota horizon, as on the Visit plan tab. Not now leaves new plans as
        drafts with no rota.
      </p>
      {state.rotaError ? (
        <p className="text-sm text-destructive" role="alert">
          The rota could not be generated: {state.rotaError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={state.rota === 'generating'}
          leftIcon={state.rota === 'generating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
          onClick={onGenerateRota}
        >
          {state.rota === 'generating' ? 'Generating rota…' : 'Generate rota'}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={state.rota === 'generating'} onClick={onSkipRota}>
          Not now
        </Button>
      </div>
    </div>
  )
}

function RunSummary({ results, dryRun, outcome }: { results: Summary[]; dryRun: boolean; outcome: string }) {
  const done = results.filter((r) => !r.failed)
  const created = results.reduce((n, r) => n + (r.visitsCreated ?? 0), 0)
  const withCarers = results.reduce((n, r) => n + (r.visits?.fullyStaffed ?? 0), 0)
  const total = results.reduce((n, r) => n + (r.visits?.total ?? 0), 0)
  const held = results.reduce((n, r) => n + (r.heldForApproval ?? 0), 0)
  const carers = new Set(results.flatMap((r) => Object.keys(r.visits?.carers ?? {})))
  const tone = outcome === 'SUCCESS' ? 'text-emerald-700 dark:text-emerald-400' : outcome === 'PARTIAL' ? 'text-amber-700 dark:text-amber-400' : 'text-destructive'
  return (
    <div className="space-y-3" data-testid="script-summary">
      <p className={`text-sm font-medium ${tone}`}>
        {dryRun ? 'Check finished — nothing was saved. ' : outcome === 'SUCCESS' ? 'Finished. ' : outcome === 'PARTIAL' ? 'Finished with problems. ' : 'Failed. '}
        {done.length} of {results.length} service user{results.length === 1 ? '' : 's'} done.
      </p>
      {!dryRun ? (
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Stat label="Visits created" value={created} />
          <Stat label="Visits with all carers" value={`${withCarers} of ${total}`} />
          <Stat label="Carers on the visits" value={carers.size} />
          <Stat label="Held for approval" value={held} />
        </dl>
      ) : null}
      {results.map((r) => (
        <div key={r.serviceUser} className="space-y-1.5 rounded-md border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {r.failed ? <XCircle className="h-4 w-4 text-destructive" aria-hidden /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />}
            <span className="font-medium text-foreground">{r.serviceUser}</span>
            {r.failed ? <Badge variant="destructive">Failed</Badge> : null}
            {r.heldForApproval ? (
              <Badge variant="warning">
                <Clock className="mr-1 h-3 w-3" aria-hidden />
                {r.heldForApproval} waiting in Hours approvals
              </Badge>
            ) : null}
          </div>
          {r.failed ? <p className="text-destructive">{r.failed}</p> : null}
          {r.plan ? <p className="text-muted-foreground">Visit plan: {r.plan}</p> : null}
          {r.rotaPending ? <p className="text-muted-foreground">Rota: not generated yet — choose Generate rota or Not now above.</p> : null}
          <SummaryList title="Visits" items={r.slots} />
          <SummaryList title="Tasks" items={r.tasks} />
          <SummaryList title="Medicines" items={r.medicines} />
          {r.visits ? (
            <div className="space-y-0.5">
              <p className="text-foreground">
                Rota: {r.visitsCreated ?? 0} created · {r.visits.fullyStaffed} of {r.visits.total} with all carers
                {Object.keys(r.visits.carers).length
                  ? ` — ${Object.entries(r.visits.carers)
                      .map(([name, n]) => `${name} ${n}`)
                      .join(', ')}`
                  : ''}
              </p>
              {r.visits.missing.length ? (
                <SummaryList
                  title="Still missing carers (waiting in Hours approvals, or no available carer that day — see the rota)"
                  items={r.visits.missing}
                />
              ) : null}
            </div>
          ) : null}
          {r.weeklyHoursDefaulted ? (
            <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                No weekly contracted hours were set — the plan and the service user&rsquo;s weekly hours are set to{' '}
                {r.weeklyHoursDefaulted}h.{' '}
                {r.serviceUserId ? (
                  <Link
                    to="/service-users/$serviceUserId"
                    params={{ serviceUserId: r.serviceUserId }}
                    search={{ tab: 'dom' }}
                    className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300"
                  >
                    Change them in the DOM Care tab
                  </Link>
                ) : (
                  'Change them in the DOM Care tab.'
                )}
              </span>
            </p>
          ) : null}
          {r.warnings.length ? (
            <ul className="space-y-0.5">
              {r.warnings.map((w) => (
                <li key={w} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="list-disc pl-5 text-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
