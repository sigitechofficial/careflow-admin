import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchCarerOptions,
  fetchServiceUserOptions,
  fetchTaskOptions,
  fetchVisitCreationConfig,
  previewRotaDates,
  runOutcome,
  runVisitCreation,
  type CreateVisitsInput,
  type RunMeta,
  type RunOutcome,
  type Summary,
} from '@/features/scripts/create-visits.runner'

/** The automation configured on the server (Automatic Visit Creation). */
export function useVisitCreationConfig() {
  return useQuery({ queryKey: ['scripts', 'visit-creation', 'config'], queryFn: fetchVisitCreationConfig, retry: false })
}

export function useScriptServiceUserOptions() {
  return useQuery({ queryKey: ['scripts', 'service-user-options'], queryFn: fetchServiceUserOptions, staleTime: 60_000 })
}

export function useScriptCarerOptions() {
  return useQuery({ queryKey: ['scripts', 'carer-options'], queryFn: fetchCarerOptions, staleTime: 60_000 })
}

/** Active tasks from the task list, for a visit's task picker. */
export function useScriptTaskOptions() {
  return useQuery({ queryKey: ['scripts', 'task-options'], queryFn: fetchTaskOptions, staleTime: 60_000 })
}

/** The rota dates a run builds (today → the rota horizon), for the confirmation. */
export function useRotaDatesPreview(enabled: boolean) {
  return useQuery({
    queryKey: ['scripts', 'rota-dates'],
    queryFn: () => previewRotaDates({}),
    enabled,
    staleTime: 60_000,
  })
}

/**
 * The rota after a real run: `ask` — plans are saved and the rota waits for Generate rota / Not now;
 * `generating`, `generated`, `skipped` follow the choice; `none` — nothing waited (dry run, nothing saved).
 */
export type RotaChoice = 'none' | 'ask' | 'generating' | 'generated' | 'skipped'

export type RunState =
  | { kind: 'idle' }
  | { kind: 'running'; dryRun: boolean }
  | { kind: 'done'; dryRun: boolean; results: Summary[]; outcome: RunOutcome; rota: RotaChoice; rotaError?: string }
  | { kind: 'error'; message: string }

/**
 * One Visit Creation run at a time from this page: live progress lines, then the result. A second
 * start while one is going is ignored (the server also refuses a second real run).
 */
export function useVisitCreationRun() {
  const [state, setState] = React.useState<RunState>({ kind: 'idle' })
  const [log, setLog] = React.useState<string[]>([])
  const busy = React.useRef(false)
  const pendingRota = React.useRef<(() => Promise<Summary[]>) | null>(null)

  const start = React.useCallback(async (input: CreateVisitsInput, meta: RunMeta, dryRun: boolean) => {
    if (busy.current) return
    busy.current = true
    pendingRota.current = null
    setLog([])
    setState({ kind: 'running', dryRun })
    try {
      // The rota is left for the choice after the run (Generate rota / Not now).
      const { results, outcome, generateRota } = await runVisitCreation(input, meta, {
        dryRun,
        log: (line) => setLog((prev) => [...prev, line]),
        generateRota: false,
      })
      pendingRota.current = generateRota
      setState({ kind: 'done', dryRun, results, outcome, rota: generateRota ? 'ask' : 'none' })
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      busy.current = false
    }
  }, [])

  /** "Generate rota": activates waiting drafts and makes their rota, then shows the updated results. */
  const generateRota = React.useCallback(async () => {
    const run = pendingRota.current
    if (!run || busy.current) return
    busy.current = true
    setState((s) => (s.kind === 'done' ? { ...s, rota: 'generating' } : s))
    try {
      const results = await run()
      pendingRota.current = null
      setState((s) => (s.kind === 'done' ? { ...s, results: [...results], outcome: runOutcome(results), rota: 'generated' } : s))
    } catch (e) {
      setState((s) => (s.kind === 'done' ? { ...s, rota: 'ask', rotaError: e instanceof Error ? e.message : String(e) } : s))
    } finally {
      busy.current = false
    }
  }, [])

  /** "Not now": the plans stay as saved (new ones as drafts); no rota is made. */
  const skipRota = React.useCallback(() => {
    pendingRota.current = null
    setState((s) => (s.kind === 'done' && s.rota === 'ask' ? { ...s, rota: 'skipped' } : s))
  }, [])

  const running = state.kind === 'running' || (state.kind === 'done' && state.rota === 'generating')
  return { state, log, start, generateRota, skipRota, running }
}
