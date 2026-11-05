import * as React from 'react'
import { AlertTriangle, CheckCircle2, FileUp, FlaskConical, Loader2, Play, RotateCcw, ScrollText, XCircle } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label, Textarea } from '@/shared/ui/form-field'
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
import { SCRIPTS, type ScriptDefinition } from '@/features/scripts/scripts.registry'
import type { Summary } from '@/features/scripts/create-visits.runner'

/** Automation scripts, runnable from the browser as the signed-in user. */
export default function ScriptsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Scripts"
        description="Automation scripts that do several steps at once. They use the same checks as the screens, and everything they change is recorded under your name."
        icon={<ScrollText className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Scripts' }]}
      />
      {SCRIPTS.map(script => (
        <ScriptCard key={script.id} script={script} />
      ))}
    </div>
  )
}

type RunState = { kind: 'idle' } | { kind: 'running'; dryRun: boolean } | { kind: 'done'; dryRun: boolean; results: Summary[] } | { kind: 'error'; message: string }

function ScriptCard({ script }: { script: ScriptDefinition }) {
  const [input, setInput] = React.useState(() => JSON.stringify(script.exampleInput(), null, 2))
  const [inputError, setInputError] = React.useState<string | null>(null)
  const [log, setLog] = React.useState<string[]>([])
  const [state, setState] = React.useState<RunState>({ kind: 'idle' })
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const logRef = React.useRef<HTMLPreElement>(null)
  const running = state.kind === 'running'

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  const parsed = (): unknown | null => {
    try {
      const value = JSON.parse(input)
      setInputError(null)
      return value
    } catch (e) {
      setInputError(`The input is not valid JSON: ${e instanceof Error ? e.message : String(e)}`)
      return null
    }
  }

  const start = async (dryRun: boolean) => {
    const value = parsed()
    if (value == null) return
    setLog([])
    setState({ kind: 'running', dryRun })
    try {
      const results = await script.run(value, { dryRun, log: line => setLog(prev => [...prev, line]) })
      setState({ kind: 'done', dryRun, results })
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const loadFile = async (file: File | undefined) => {
    if (!file) return
    setInput(await file.text())
    setInputError(null)
  }

  return (
    <Card data-testid={`script-${script.id}`}>
      <CardHeader>
        <CardTitle className="text-base">{script.title}</CardTitle>
        <CardDescription>{script.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal space-y-0.5 pl-5 text-sm text-muted-foreground">
          {script.steps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label htmlFor={`script-input-${script.id}`}>Input (JSON)</Label>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={e => {
                  void loadFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <Button type="button" size="sm" variant="outline" disabled={running} leftIcon={<FileUp className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
                Upload .json
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={running}
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => {
                  setInput(JSON.stringify(script.exampleInput(), null, 2))
                  setInputError(null)
                }}
              >
                Reset to example
              </Button>
            </div>
          </div>
          <Textarea
            id={`script-input-${script.id}`}
            rows={16}
            spellCheck={false}
            className="font-mono text-xs"
            value={input}
            disabled={running}
            onChange={e => setInput(e.target.value)}
          />
          {inputError ? (
            <p className="text-xs text-destructive" role="alert">
              {inputError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Edit the example for your service users, carers, tasks and medicines. A dry run checks it and saves nothing.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={running} leftIcon={<FlaskConical className="h-4 w-4" />} onClick={() => void start(true)}>
            Dry run
          </Button>
          <Button
            type="button"
            disabled={running}
            leftIcon={running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            onClick={() => {
              if (parsed() != null) setConfirmOpen(true)
            }}
          >
            {running ? (state.dryRun ? 'Dry run in progress…' : 'Running…') : 'Run'}
          </Button>
        </div>

        {log.length || state.kind !== 'idle' ? (
          <div className="space-y-1.5">
            <Label>Progress</Label>
            <pre ref={logRef} className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {log.join('\n') || 'Starting…'}
            </pre>
          </div>
        ) : null}

        {state.kind === 'error' ? (
          <p className="flex items-start gap-1.5 text-sm text-destructive" role="alert">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {state.message}
          </p>
        ) : null}
        {state.kind === 'done' ? <RunSummary results={state.results} dryRun={state.dryRun} /> : null}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run “{script.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This saves for real: visit plans, rota visits, carers, tasks and medicines are created or updated, under your name. Run a dry run first
              if you have not checked the input.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                void start(false)
              }}
            >
              Run now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/** What each service user got: the same summary as the terminal script. */
function RunSummary({ results, dryRun }: { results: Summary[]; dryRun: boolean }) {
  const failed = results.filter(r => r.failed).length
  return (
    <div className="space-y-3" data-testid="script-summary">
      <p className="text-sm font-medium text-foreground">
        {results.length - failed} of {results.length} service user{results.length === 1 ? '' : 's'} done{dryRun ? ' (dry run — nothing was saved)' : ''}.
      </p>
      {results.map(r => (
        <div key={r.serviceUser} className="space-y-1.5 rounded-md border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {r.failed ? <XCircle className="h-4 w-4 text-destructive" aria-hidden /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />}
            <span className="font-medium text-foreground">{r.serviceUser}</span>
            {r.failed ? <Badge variant="destructive">Failed</Badge> : null}
          </div>
          {r.failed ? <p className="text-destructive">{r.failed}</p> : null}
          {r.plan ? <p className="text-muted-foreground">Plan: {r.plan}</p> : null}
          <SummaryList title="Visits" items={r.slots} />
          <SummaryList title="Tasks" items={r.tasks} />
          <SummaryList title="Medicines" items={r.medicines} />
          {r.visits ? (
            <div className="space-y-0.5">
              <p className="text-foreground">
                Rota: {r.visits.total} visit{r.visits.total === 1 ? '' : 's'}, {r.visits.fullyStaffed} with all carers on
                {Object.keys(r.visits.carers).length
                  ? ` — ${Object.entries(r.visits.carers)
                      .map(([name, n]) => `${name} ${n}`)
                      .join(', ')}`
                  : ''}
              </p>
              {r.visits.missing.length ? (
                <SummaryList
                  title="Still missing carers (a clash, leave, working pattern or Hours approvals — see the rota)"
                  items={r.visits.missing}
                />
              ) : null}
            </div>
          ) : null}
          {r.warnings.length ? (
            <ul className="space-y-0.5">
              {r.warnings.map(w => (
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

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="list-disc pl-5 text-foreground">
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
