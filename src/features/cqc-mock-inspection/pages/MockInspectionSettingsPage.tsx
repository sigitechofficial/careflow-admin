import * as React from 'react'
import { CheckCircle2, RotateCcw, Settings2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import type { CheckScoring } from '../types'
import { useMockInspectionSettings, useSaveMockInspectionSettings } from '../hooks'
import { InfoTip } from '../components/InfoTip'

/** The statement scores, lowest first, with their colour dot. */
const LEVELS = [
  { score: 1, label: 'Significant shortfalls', dot: 'bg-destructive' },
  { score: 2, label: 'Some shortfalls', dot: 'bg-warning' },
  { score: 3, label: 'Good standard', dot: 'bg-success/65' },
  { score: 4, label: 'Exceptional standard', dot: 'bg-success' },
] as const

const ANSWERS = [
  { key: 'metPoints', label: 'Met', on: 'border-success bg-success text-success-foreground' },
  { key: 'partlyMetPoints', label: 'Partially met', on: 'border-warning bg-warning text-warning-foreground' },
  { key: 'notMetPoints', label: 'Not met', on: 'border-destructive bg-destructive text-destructive-foreground' },
] as const

/** Why these settings cannot be saved (the same rules as the API), or null. */
export function settingsProblem(s: CheckScoring): string | null {
  const values = Object.values(s)
  if (!values.every(v => Number.isInteger(v))) return 'Use whole numbers.'
  if (s.notMetPoints < 0 || s.metPoints > 10) return 'Points must be between 0 and 10.'
  if (!(s.metPoints > s.partlyMetPoints && s.partlyMetPoints > s.notMetPoints))
    return 'Met must score more than Partially met, and Partially met more than Not met.'
  if (!(s.score2Percent > 0 && s.score2Percent < s.score3Percent && s.score3Percent < s.score4Percent && s.score4Percent <= 100))
    return 'Each score must need a higher % than the one below it, up to 100%.'
  return null
}

/** The score a statement gets from `points` out of `most` with these settings. */
function scoreFor(s: CheckScoring, points: number, most: number) {
  const reaches = (p: number) => points * 100 >= most * p
  return reaches(s.score4Percent) ? 4 : reaches(s.score3Percent) ? 3 : reaches(s.score2Percent) ? 2 : 1
}

const pick = (s: CheckScoring): CheckScoring => ({
  metPoints: s.metPoints,
  partlyMetPoints: s.partlyMetPoints,
  notMetPoints: s.notMetPoints,
  score4Percent: s.score4Percent,
  score3Percent: s.score3Percent,
  score2Percent: s.score2Percent,
})

/** Governance → CQC settings: how mock inspection check answers become a statement's score. */
export default function MockInspectionSettingsPage() {
  const canManage = useAuthStore(s => s.can('cqc_mock_inspection.manage'))
  const query = useMockInspectionSettings()
  const save = useSaveMockInspectionSettings()
  const [tab, setTab] = React.useState<'levels' | 'points'>('levels')
  const [form, setForm] = React.useState<CheckScoring | null>(null)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const server = query.data ? pick(query.data) : null
  React.useEffect(() => {
    if (server && !form) setForm(server)
  }, [server, form])

  const set = (patch: Partial<CheckScoring>) => {
    setSaved(false)
    setError(null)
    setForm(f => (f ? { ...f, ...patch } : f))
  }
  const problem = form ? settingsProblem(form) : null
  const changed = !!form && !!server && JSON.stringify(form) !== JSON.stringify(server)

  const onSave = () => {
    if (!form || problem) return
    setError(null)
    save.mutate(form, {
      onSuccess: data => {
        setForm(pick(data))
        setSaved(true)
      },
      onError: e => setError(e instanceof ApiError ? e.message : 'Could not save the settings.'),
    })
  }

  return (
    <div className="flex flex-col gap-4" data-testid="mock-settings-page">
      <PageHeader
        title="CQC settings"
        description="Choose how the answers to the checks (Met, Partially met, Not met) turn into each quality statement's score."
        icon={<Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Governance' },
          { label: 'CQC settings' },
        ]}
      />

      {query.error ? <p className="text-sm text-destructive">Could not load the settings.</p> : null}
      {!form ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {form && query.data ? (
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap gap-1 border-b border-border px-3 pt-3" role="tablist">
            {(
              [
                ['levels', 'Score levels'],
                ['points', 'Answer points'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                data-testid={`mock-settings-tab-${key}`}
                className={cn(
                  '-mb-px rounded-t-md border px-4 py-2 text-sm font-medium',
                  tab === key ? 'border-border border-b-card bg-card text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{tab === 'levels' ? 'Score levels' : 'Answer points'}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {tab === 'levels'
                    ? 'Each answer earns points. Choose the % of the most points a statement needs for each score.'
                    : 'Choose how many points each answer is worth.'}{' '}
                  Saved settings apply to new mock inspections only; ones already started keep their own.
                </p>
              </div>
              {canManage ? (
                <Button variant="outline" size="sm" onClick={() => set(pick(query.data.defaults))} data-testid="mock-settings-reset">
                  <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                  Reset to default
                </Button>
              ) : null}
            </div>

            {tab === 'levels' ? <LevelsEditor form={form} editable={canManage} onChange={set} /> : null}
            {tab === 'points' ? <PointsEditor form={form} editable={canManage} onChange={set} /> : null}

            <Example form={form} />

            {problem ? (
              <p className="text-sm font-medium text-destructive" data-testid="mock-settings-problem">
                {problem}
              </p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {saved ? (
              <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-success" data-testid="mock-settings-saved">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Saved. New mock inspections will give a score of 4 at {form.score4Percent}% or more, 3 at {form.score3Percent}%,
                  2 at {form.score2Percent}%, and 1 below that. Met is worth {form.metPoints}, Partially met {form.partlyMetPoints}{' '}
                  and Not met {form.notMetPoints} points.
                </span>
              </div>
            ) : null}

            {canManage ? (
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" disabled={!changed || save.isPending} onClick={() => server && set(server)}>
                  Cancel
                </Button>
                <Button disabled={!changed || !!problem || save.isPending} onClick={onSave} data-testid="mock-settings-save">
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            ) : (
              <p className="border-t border-border pt-4 text-sm text-muted-foreground">Only people who can manage mock inspections can change these.</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}

/** The four scores, best first: the % each needs, as one table that reads top to bottom. */
function LevelsEditor({ form, editable, onChange }: { form: CheckScoring; editable: boolean; onChange: (p: Partial<CheckScoring>) => void }) {
  const rows = [
    { score: 4, key: 'score4Percent' },
    { score: 3, key: 'score3Percent' },
    { score: 2, key: 'score2Percent' },
    { score: 1, key: null },
  ] as const
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground" data-testid="mock-settings-how">
        <p className="font-semibold">How the score is worked out</p>
        <ol className="mt-1.5 list-decimal space-y-1 pl-5">
          <li>
            Each check gets points for its answer: Met {form.metPoints}, Partially met {form.partlyMetPoints}, Not met {form.notMetPoints}{' '}
            (change these in <b>Answer points</b>).
          </li>
          <li>The points are added up and turned into a %. Every check Met is 100%.</li>
          <li>The % gives the score in the table below. Change a number to change what each score needs.</li>
        </ol>
      </div>
      <div className="overflow-hidden rounded-xl border border-border" data-testid="mock-settings-levels">
        {rows.map(r => {
          const l = LEVELS.find(x => x.score === r.score)!
          return (
            <div
              key={r.score}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              data-testid={`mock-settings-level-${r.score}`}
            >
              <span className="flex items-center gap-2.5">
                <span className={cn('h-3.5 w-3.5 shrink-0 rounded-full', l.dot)} aria-hidden />
                <span className="text-sm">
                  <b>Score {r.score}</b> <span className="text-muted-foreground">{l.label}</span>
                </span>
              </span>
              {r.key ? (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">if</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form[r.key]}
                    disabled={!editable}
                    onChange={e => onChange({ [r.key]: Number(e.target.value) })}
                    aria-label={`Lowest % for a score of ${r.score}`}
                    className="w-20 rounded-md border border-input bg-card px-2 py-1.5 text-right font-semibold tabular-nums disabled:opacity-60"
                    data-testid={`mock-settings-${r.key}`}
                  />
                  <span className="w-20 text-muted-foreground">% or more</span>
                </label>
              ) : (
                <span className="text-sm">
                  <span className="text-muted-foreground">if less than </span>
                  <b className="tabular-nums">{form.score2Percent}%</b>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PointsEditor({ form, editable, onChange }: { form: CheckScoring; editable: boolean; onChange: (p: Partial<CheckScoring>) => void }) {
  return (
    <div className="max-w-md space-y-2">
      <div className="grid grid-cols-[1fr_6rem] gap-2 text-xs font-medium text-muted-foreground">
        <span>Answer</span>
        <span className="flex items-center gap-1">
          Points
          <InfoTip label="points">The most a statement can get is the number of checks × the points for Met.</InfoTip>
        </span>
      </div>
      {ANSWERS.map(a => (
        <div key={a.key} className="grid grid-cols-[1fr_6rem] gap-2">
          <span className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{a.label}</span>
          <input
            type="number"
            min={0}
            max={10}
            value={form[a.key]}
            disabled={!editable}
            onChange={e => onChange({ [a.key]: Number(e.target.value) })}
            aria-label={`Points for ${a.label}`}
            className="rounded-md border border-input bg-primary/10 px-3 py-2 text-center text-sm font-semibold tabular-nums disabled:opacity-60"
            data-testid={`mock-settings-${a.key}`}
          />
        </div>
      ))}
    </div>
  )
}

const EXAMPLE_ANSWERS = ['metPoints', 'partlyMetPoints', 'notMetPoints'] as const

/** A worked example: a statement with three checks (one of each answer), one row per check. */
function Example({ form }: { form: CheckScoring }) {
  if (settingsProblem(form)) return null
  const points = EXAMPLE_ANSWERS.reduce((n, k) => n + form[k], 0)
  const most = form.metPoints * EXAMPLE_ANSWERS.length
  const percent = Math.round((points / most) * 1000) / 10
  const score = scoreFor(form, points, most)
  const level = LEVELS.find(l => l.score === score)
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3" data-testid="mock-settings-example">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example: a statement with 3 checks</p>
      <table className="w-full max-w-md text-sm">
        <tbody>
          {EXAMPLE_ANSWERS.map((k, i) => {
            const a = ANSWERS.find(x => x.key === k)!
            return (
              <tr key={i} className="border-b border-border/60">
                <td className="py-1.5 pr-3 text-muted-foreground">Check {i + 1}</td>
                <td className="py-1.5 pr-3">
                  <span className={cn('rounded-md border-2 px-2 py-0.5 text-xs font-bold uppercase', a.on)}>{a.label}</span>
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {form[k]} point{form[k] === 1 ? '' : 's'}
                </td>
              </tr>
            )
          })}
          <tr>
            <td className="py-1.5 pr-3 font-semibold" colSpan={2}>
              Total
            </td>
            <td className="py-1.5 text-right font-semibold tabular-nums">
              {points} of {most}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm text-foreground">
        {points} of {most} points is <b>{percent}%</b>, so this statement scores <b>{score}</b> ({level?.label}).
      </p>
    </div>
  )
}
