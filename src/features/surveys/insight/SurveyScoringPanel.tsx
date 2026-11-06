import * as React from 'react'
import { Calculator } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { SurveyQuestion, SurveyScoring } from '@/features/surveys/types'
import { useSaveScoring, type ScoreMethod } from './survey-insight'

type Scale = SurveyScoring['scales'][number]
const SCORABLE = new Set(['LIKERT', 'SINGLE_SELECT', 'RATING', 'YES_NO'])
const METHOD_LABELS: Record<ScoreMethod, string> = {
  MEAN: 'Average of the answers (for example 1 to 5, as the HSE indicator tool)',
  PERCENT_OF_MAX: 'Share of the most a person could score (audit score, %)',
}

const blank = (n: number): Scale => ({ key: `scale-${n}-${Math.random().toString(36).slice(2, 7)}`, label: '', questionKeys: [], reversed: [], method: 'MEAN', bands: [] })

/**
 * Survey settings → Scores: scales a scored tool reports (HSE-indicator style areas, audit scores). The first answer
 * of a question scores the most; tick "scored the other way" where agreeing is the worse answer. Results show each
 * scale's average and band from the reporting threshold up.
 */
export function SurveyScoringPanel({ surveyId, questions, scoring, canEdit }: { surveyId: string; questions: SurveyQuestion[]; scoring: SurveyScoring | null | undefined; canEdit: boolean }) {
  const [scales, setScales] = React.useState<Scale[]>(scoring?.scales ?? [])
  const [editing, setEditing] = React.useState(false)
  const save = useSaveScoring(surveyId)
  React.useEffect(() => {
    if (!editing) setScales(scoring?.scales ?? [])
  }, [scoring, editing])
  const scorable = questions.filter(q => q.key && SCORABLE.has(q.questionType))
  const update = (i: number, patch: Partial<Scale>) => setScales(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const submit = async (next: Scale[]) => {
    try {
      await save.mutateAsync(next.length ? { scales: next } : null)
      toastSuccess(next.length ? 'Scores saved' : 'Scores removed')
      setEditing(false)
    } catch (e) {
      toastApiError(e, 'Could not save the scores')
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="scoring-heading" data-testid="survey-scoring">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="scoring-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Calculator className="h-4 w-4 text-muted-foreground" aria-hidden /> Scores
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            For scored tools: group questions into scales and the results show each scale’s score. Nothing is scored for one
            person on screen; scores show only from the reporting threshold up.
          </p>
        </div>
        {canEdit && !editing ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            {scales.length ? 'Change scores' : 'Add scores'}
          </Button>
        ) : null}
      </div>
      {!editing ? (
        scales.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {scales.map(s => (
              <li key={s.key}>
                <span className="font-medium">{s.label}</span>: {s.questionKeys.length} question{s.questionKeys.length === 1 ? '' : 's'},{' '}
                {s.method === 'MEAN' ? 'average' : 'share of the most'}
                {s.bands.length ? ` · bands: ${s.bands.map(b => `${b.label} from ${b.from}`).join(', ')}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">This survey is not scored.</p>
        )
      ) : (
        <div className="mt-3 space-y-4">
          {scales.map((s, i) => (
            <fieldset key={s.key} className="rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-medium">Scale {i + 1}</legend>
              <label className="block text-xs font-medium" htmlFor={`scale-label-${i}`}>Name</label>
              <Input id={`scale-label-${i}`} value={s.label} maxLength={80} onChange={e => update(i, { label: e.target.value })} placeholder="For example: Demands" />
              <label className="mt-2 block text-xs font-medium" htmlFor={`scale-method-${i}`}>How it is scored</label>
              <select
                id={`scale-method-${i}`}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={s.method}
                onChange={e => update(i, { method: e.target.value as ScoreMethod })}
              >
                {(Object.keys(METHOD_LABELS) as ScoreMethod[]).map(m => (
                  <option key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-medium">Questions</p>
              <ul className="mt-1 max-h-56 space-y-1 overflow-y-auto">
                {scorable.map(q => {
                  const on = s.questionKeys.includes(q.key!)
                  return (
                    <li key={q.id} className="flex flex-wrap items-center gap-3 text-sm">
                      <label className="flex min-w-0 flex-1 items-start gap-2">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={e =>
                            update(i, {
                              questionKeys: e.target.checked ? [...s.questionKeys, q.key!] : s.questionKeys.filter(k => k !== q.key),
                              reversed: e.target.checked ? s.reversed : s.reversed.filter(k => k !== q.key),
                            })
                          }
                        />
                        <span>{q.questionText}</span>
                      </label>
                      {on ? (
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={s.reversed.includes(q.key!)}
                            onChange={e => update(i, { reversed: e.target.checked ? [...s.reversed, q.key!] : s.reversed.filter(k => k !== q.key) })}
                          />
                          Scored the other way
                        </label>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs font-medium">Bands (optional)</p>
              {s.bands.map((b, j) => (
                <div key={j} className="mt-1 flex gap-2">
                  <Input
                    aria-label={`Band ${j + 1} name`}
                    value={b.label}
                    maxLength={60}
                    onChange={e => update(i, { bands: s.bands.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })}
                    placeholder="For example: Good"
                  />
                  <Input
                    aria-label={`Band ${j + 1} starts at`}
                    type="number"
                    className="w-28"
                    value={b.from}
                    onChange={e => update(i, { bands: s.bands.map((x, k) => (k === j ? { ...x, from: Number(e.target.value) } : x)) })}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => update(i, { bands: s.bands.filter((_, k) => k !== j) })}>
                    Remove band
                  </Button>
                </div>
              ))}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={s.bands.length >= 6} onClick={() => update(i, { bands: [...s.bands, { label: '', from: 0 }] })}>
                  Add a band
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setScales(prev => prev.filter((_, j) => j !== i))}>
                  Remove scale
                </Button>
              </div>
            </fieldset>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={scales.length >= 12} onClick={() => setScales(prev => [...prev, blank(prev.length + 1)])}>
              Add a scale
            </Button>
            <Button type="button" size="sm" disabled={save.isPending} onClick={() => void submit(scales)}>
              Save scores
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
