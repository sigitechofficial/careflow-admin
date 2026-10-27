import * as React from 'react'
import { Pencil, Plus, ShieldAlert } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAddPathwayRisk, useUpdatePathwayRisk } from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import {
  IMPACT_LABELS,
  LIKELIHOOD_LABELS,
  RISK_CATEGORIES,
  RISK_LEVEL_CLASS,
  RISK_LEVEL_LABELS,
  fmtDate,
  riskLevelOf,
} from '@/features/specialist-pathways/pathway-labels'
import type { PathwayCase, PathwayRisk, RiskInput } from '@/features/specialist-pathways/types/specialist-pathway.types'

const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
const areaClass = 'min-h-[64px] w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm'

function ScoreChip({ score }: { score: number }) {
  const level = riskLevelOf(score)
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_LEVEL_CLASS[level]}`}>
      {score} · {RISK_LEVEL_LABELS[level]}
    </span>
  )
}

type FormState = {
  title: string
  category: string
  description: string
  likelihood: number
  impact: number
  controls: string
  reviewDate: string
}

const blank: FormState = { title: '', category: '', description: '', likelihood: 3, impact: 3, controls: '', reviewDate: '' }

function fromRisk(r: PathwayRisk): FormState {
  return {
    title: r.title,
    category: r.category ?? '',
    description: r.description ?? '',
    likelihood: r.likelihood,
    impact: r.impact,
    controls: r.controls ?? '',
    reviewDate: r.reviewDate ? r.reviewDate.slice(0, 10) : '',
  }
}

function RiskForm({
  categories,
  initial,
  busy,
  onSave,
  onCancel,
}: {
  categories: string[]
  initial: FormState
  busy: boolean
  onSave: (v: RiskInput) => void
  onCancel: () => void
}) {
  const [f, setF] = React.useState<FormState>(initial)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(p => ({ ...p, [k]: v }))
  const score = f.likelihood * f.impact

  const submit = () => {
    if (!f.title.trim()) {
      toastApiError(null, 'Give the risk a short title')
      return
    }
    onSave({
      title: f.title.trim(),
      category: f.category.trim() || undefined,
      description: f.description.trim() || undefined,
      likelihood: f.likelihood,
      impact: f.impact,
      controls: f.controls.trim() || undefined,
      reviewDate: f.reviewDate || undefined,
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Risk</span>
          <Input value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Leaves home at night" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Category</span>
          <input
            className={selectClass}
            list="pathway-risk-categories"
            value={f.category}
            onChange={e => set('category', e.target.value)}
          />
          <datalist id="pathway-risk-categories">
            {categories.map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Likelihood</span>
          <select className={selectClass} value={f.likelihood} onChange={e => set('likelihood', Number(e.target.value))}>
            {LIKELIHOOD_LABELS.map((l, i) => (
              <option key={l} value={i + 1}>
                {i + 1} — {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Impact</span>
          <select className={selectClass} value={f.impact} onChange={e => set('impact', Number(e.target.value))}>
            {IMPACT_LABELS.map((l, i) => (
              <option key={l} value={i + 1}>
                {i + 1} — {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">What could happen</span>
          <textarea className={areaClass} value={f.description} onChange={e => set('description', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Controls in place</span>
          <textarea
            className={areaClass}
            value={f.controls}
            onChange={e => set('controls', e.target.value)}
            placeholder="What we do to reduce the risk"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Review by</span>
          <Input type="date" value={f.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
        </label>
        <div className="flex items-end gap-2 text-sm">
          <span className="text-muted-foreground">Score:</span>
          <ScoreChip score={score} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : 'Save risk'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function PathwayRisksPanel({ caseData }: { caseData: PathwayCase }) {
  const canManage = useAuthStore(s => s.can)('specialist_pathways.manage') && caseData.status !== 'CLOSED'
  const add = useAddPathwayRisk(caseData.id)
  const update = useUpdatePathwayRisk(caseData.id)
  const [editing, setEditing] = React.useState<string | 'new' | null>(null)
  const categories = RISK_CATEGORIES[caseData.pathwayType] ?? []
  const open = caseData.risks.filter(r => r.status === 'OPEN')
  const closed = caseData.risks.filter(r => r.status === 'CLOSED')

  const onError = (e: unknown) => toastApiError(e, 'Could not save risk')

  return (
    <div className="flex flex-col gap-4" data-testid="pathway-risks-panel">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {open.length} open risk{open.length === 1 ? '' : 's'} · score = likelihood × impact
        </p>
        {canManage && editing === null && (
          <Button variant="outline" onClick={() => setEditing('new')}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add risk
          </Button>
        )}
      </div>

      {editing === 'new' && (
        <RiskForm
          categories={categories}
          initial={blank}
          busy={add.isPending}
          onCancel={() => setEditing(null)}
          onSave={v =>
            add.mutate(v, {
              onSuccess: () => {
                toastSuccess('Risk added')
                setEditing(null)
              },
              onError,
            })
          }
        />
      )}

      {caseData.risks.length === 0 && editing !== 'new' && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <ShieldAlert className="h-5 w-5" aria-hidden />
            No risks recorded yet.
          </CardContent>
        </Card>
      )}

      {[...open, ...closed].map(r =>
        editing === r.id ? (
          <RiskForm
            key={r.id}
            categories={categories}
            initial={fromRisk(r)}
            busy={update.isPending}
            onCancel={() => setEditing(null)}
            onSave={v =>
              update.mutate(
                { riskId: r.id, ...v },
                {
                  onSuccess: () => {
                    toastSuccess('Risk updated')
                    setEditing(null)
                  },
                  onError,
                },
              )
            }
          />
        ) : (
          <Card key={r.id} className={r.status === 'CLOSED' ? 'opacity-60' : undefined}>
            <CardContent className="flex flex-col gap-2 py-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {r.title}
                    {r.status === 'CLOSED' && <span className="ml-2 text-xs font-normal text-muted-foreground">(closed)</span>}
                  </p>
                  {r.category && <p className="text-xs text-muted-foreground">{r.category}</p>}
                </div>
                <ScoreChip score={r.score} />
              </div>
              {r.description && <p className="whitespace-pre-wrap">{r.description}</p>}
              {r.controls && (
                <p className="whitespace-pre-wrap rounded-md bg-muted/40 px-3 py-2">
                  <span className="font-medium">Controls: </span>
                  {r.controls}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Likelihood {r.likelihood} ({LIKELIHOOD_LABELS[r.likelihood - 1]}) · Impact {r.impact} (
                  {IMPACT_LABELS[r.impact - 1]}) · Review by {fmtDate(r.reviewDate)}
                </span>
                {canManage && (
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(r.id)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate(
                          { riskId: r.id, status: r.status === 'OPEN' ? 'CLOSED' : 'OPEN' },
                          {
                            onSuccess: () => toastSuccess(r.status === 'OPEN' ? 'Risk closed' : 'Risk reopened'),
                            onError,
                          },
                        )
                      }
                    >
                      {r.status === 'OPEN' ? 'Close risk' : 'Reopen'}
                    </Button>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ),
      )}
    </div>
  )
}
