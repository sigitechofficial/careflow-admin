import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { DateInput } from '@/shared/ui/date-time-input'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { feedbackSelectClass, feedbackTextareaClass } from '@/features/complaints/components/FeedbackFormDialog'
import { FieldWithInfo } from '@/features/cqc-mock-inspection/components/InfoTip'
import { useBranchOptions } from '@/features/cqc-mock-inspection/components/StartInspectionDialog'
import { CATEGORY_LABEL, SOURCE_LABEL } from '@/features/cqc-mock-inspection/labels'
import { MANUAL_SOURCE_TYPES, type ManualSourceType } from '../constants'
import type { EvidenceDetail, OverviewKeyQuestion } from '../types'
import { useCreateEvidence, useUpdateEvidence } from '../hooks'
import { HELP } from '../help'

/** Category that usually fits a type, so the form starts sensibly. */
const CATEGORY_FOR: Record<ManualSourceType, string> = {
  AUDIT: 'PROCESSES',
  TRAINING: 'PROCESSES',
  INCIDENT_LEARNING: 'PROCESSES',
  COMPLAINT: 'PEOPLES_EXPERIENCE',
  COMPLIMENT: 'PEOPLES_EXPERIENCE',
  POLICY: 'PROCESSES',
  MANUAL: 'PROCESSES',
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '')

/** "Today + 12 months", the usual time before evidence is checked again. */
function inAYear(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

type Pair = { youSaid: string; weDid: string }

/**
 * Add evidence by hand, or edit it. A survey's evidence keeps the survey's period; the type of evidence cannot change
 * once it is saved. Files are added on the evidence itself after saving.
 */
export function EvidenceFormDialog({
  open,
  onOpenChange,
  keyQuestions,
  evidence = null,
  startStatementIds = [],
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyQuestions: OverviewKeyQuestion[]
  evidence?: EvidenceDetail | null
  startStatementIds?: string[]
  onSaved?: (id: string, created: boolean) => void
}) {
  const editing = !!evidence
  const fromSurvey = evidence?.sourceType === 'SURVEY_RESULT'
  const { wholeOrg, options } = useBranchOptions(open)
  const create = useCreateEvidence()
  const update = useUpdateEvidence(evidence?.id ?? '')
  const pending = create.isPending || update.isPending

  const [title, setTitle] = React.useState('')
  const [summary, setSummary] = React.useState('')
  const [sourceType, setSourceType] = React.useState<ManualSourceType>('AUDIT')
  const [categoryCode, setCategoryCode] = React.useState('PROCESSES')
  const [statementIds, setStatementIds] = React.useState<string[]>([])
  const [periodStart, setPeriodStart] = React.useState('')
  const [periodEnd, setPeriodEnd] = React.useState('')
  const [wholeOrganisation, setWholeOrganisation] = React.useState(true)
  const [locationIds, setLocationIds] = React.useState<string[]>([])
  const [reviewDueAt, setReviewDueAt] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [pairs, setPairs] = React.useState<Pair[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setTitle(evidence?.title ?? '')
    setSummary(evidence?.summary ?? '')
    setSourceType((evidence?.sourceType as ManualSourceType) ?? 'AUDIT')
    setCategoryCode(evidence?.categoryCode ?? 'PROCESSES')
    setStatementIds(evidence ? evidence.statements.filter(s => s.current).map(s => s.id) : startStatementIds)
    setPeriodStart(day(evidence?.periodStart))
    setPeriodEnd(day(evidence?.periodEnd))
    const ids = evidence?.locationIds ?? []
    setWholeOrganisation(evidence ? ids.length === 0 : wholeOrg)
    setLocationIds(evidence ? ids : wholeOrg ? [] : options.slice(0, 1).map(o => o.id))
    setReviewDueAt(evidence ? day(evidence.reviewDueAt) : inAYear())
    setNotes(evidence?.notes ?? '')
    setPairs(evidence?.actions.map(a => ({ youSaid: a.youSaid, weDid: a.weDid })) ?? [])
    setError(null)
    // Only when the dialog opens (not when the branch list loads).
  }, [open])

  const toggleStatement = (id: string) =>
    setStatementIds(cur => (cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]))
  const toggleBranch = (id: string) => setLocationIds(cur => (cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]))

  const onSave = async () => {
    if (title.trim().length < 3) return setError('Give the evidence a title (at least 3 letters).')
    if (!statementIds.length) return setError('Choose at least one quality statement it proves.')
    if (periodStart && periodEnd && periodStart > periodEnd) return setError('The period must start before it ends.')
    if (!wholeOrganisation && !locationIds.length) return setError('Choose the branches it is about.')
    const filled = pairs.filter(p => p.youSaid.trim() || p.weDid.trim())
    if (filled.some(p => !p.youSaid.trim() || !p.weDid.trim())) {
      return setError('Fill in both "You said" and "We did", or remove the line.')
    }
    setError(null)
    const body = {
      title: title.trim(),
      summary: summary.trim(),
      statementIds,
      categoryCode,
      ...(fromSurvey ? {} : { periodStart: periodStart || undefined, periodEnd: periodEnd || undefined }),
      locationIds: wholeOrganisation ? [] : locationIds,
      reviewDueAt: reviewDueAt || undefined,
      notes: notes.trim(),
      actions: filled.map(p => ({ youSaid: p.youSaid.trim(), weDid: p.weDid.trim() })),
    }
    try {
      if (evidence) {
        await update.mutateAsync(body)
        toastSuccess('Evidence saved')
        onOpenChange(false)
        onSaved?.(evidence.id, false)
      } else {
        const created = await create.mutateAsync({ ...body, sourceType })
        toastSuccess('Evidence added', 'You can now attach files to it.')
        onOpenChange(false)
        onSaved?.(created.id, true)
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the evidence.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="evidence-form-dialog">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit evidence' : 'Add evidence'}</DialogTitle>
          <DialogDescription>
            Something you keep that shows the CQC how good your care is, such as an audit, training records or a
            complaint you learned from.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FieldWithInfo id="evidence-title" label="Title" help={HELP.formTitle}>
            <Input
              id="evidence-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Medication audit, Q3 2026"
              maxLength={200}
              data-testid="evidence-title"
            />
          </FieldWithInfo>
          <FieldWithInfo id="evidence-summary" label="What it shows" help={HELP.formSummary}>
            <textarea
              id="evidence-summary"
              className={feedbackTextareaClass}
              rows={3}
              maxLength={4000}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="e.g. 96% of medicine records complete; 3 missed signatures followed up with staff."
              data-testid="evidence-summary"
            />
          </FieldWithInfo>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWithInfo id="evidence-type" label="Type" help={HELP.formType}>
              {editing ? (
                <p className="text-sm text-foreground" id="evidence-type">
                  {SOURCE_LABEL[evidence.sourceType] ?? evidence.sourceType}
                </p>
              ) : (
                <select
                  id="evidence-type"
                  className={feedbackSelectClass}
                  value={sourceType}
                  onChange={e => {
                    const t = e.target.value as ManualSourceType
                    setSourceType(t)
                    setCategoryCode(CATEGORY_FOR[t])
                  }}
                  data-testid="evidence-type"
                >
                  {MANUAL_SOURCE_TYPES.map(t => (
                    <option key={t} value={t}>
                      {SOURCE_LABEL[t] ?? t}
                    </option>
                  ))}
                </select>
              )}
            </FieldWithInfo>
            <FieldWithInfo id="evidence-category" label="Category" help={HELP.formCategory}>
              <select
                id="evidence-category"
                className={feedbackSelectClass}
                value={categoryCode}
                onChange={e => setCategoryCode(e.target.value)}
                data-testid="evidence-category"
              >
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </FieldWithInfo>
          </div>

          <FieldWithInfo id="evidence-statements" label={`Quality statements it proves (${statementIds.length} chosen)`} help={HELP.formStatements}>
            <div
              id="evidence-statements"
              className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-input p-2"
              data-testid="evidence-statements"
            >
              {keyQuestions.map(k => (
                <fieldset key={k.code}>
                  <legend className="text-xs font-semibold text-foreground">{k.title}</legend>
                  <div className="mt-1 grid gap-x-3 gap-y-1 sm:grid-cols-2">
                    {k.statements.map(s => (
                      <label key={s.id} className="flex items-start gap-2 text-xs text-foreground">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 accent-primary"
                          checked={statementIds.includes(s.id)}
                          onChange={() => toggleStatement(s.id)}
                        />
                        <span>{s.title}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </FieldWithInfo>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldWithInfo id="evidence-from" label="Period from" help={HELP.formPeriod}>
              <DateInput
                id="evidence-from"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                disabled={fromSurvey}
                data-testid="evidence-from"
              />
            </FieldWithInfo>
            <FieldWithInfo id="evidence-to" label="Period to" help={HELP.formPeriod}>
              <DateInput
                id="evidence-to"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                disabled={fromSurvey}
                data-testid="evidence-to"
              />
            </FieldWithInfo>
            <FieldWithInfo id="evidence-review" label="Review by" help={HELP.formReview}>
              <DateInput
                id="evidence-review"
                value={reviewDueAt}
                onChange={e => setReviewDueAt(e.target.value)}
                data-testid="evidence-review"
              />
            </FieldWithInfo>
          </div>
          {fromSurvey ? (
            <p className="text-xs text-muted-foreground">The period comes from the survey, so it cannot be changed here.</p>
          ) : null}

          <FieldWithInfo id="evidence-covers" label="Covers" help={HELP.formCovers}>
            <div id="evidence-covers" className="space-y-1.5" data-testid="evidence-covers">
              {wholeOrg ? (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={wholeOrganisation}
                    onChange={e => setWholeOrganisation(e.target.checked)}
                    data-testid="evidence-whole-org"
                  />
                  The whole organisation
                </label>
              ) : null}
              {!wholeOrganisation ? (
                <div className="grid gap-1 sm:grid-cols-2">
                  {options.map(o => (
                    <label key={o.id} className="flex items-center gap-2 text-xs text-foreground">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={locationIds.includes(o.id)}
                        onChange={() => toggleBranch(o.id)}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </FieldWithInfo>

          <FieldWithInfo id="evidence-pairs" label='"You said, we did" (optional)' help={HELP.formPairs}>
            <div id="evidence-pairs" className="space-y-2">
              {pairs.map((p, i) => (
                <div key={i} className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_1fr_auto]" data-testid="evidence-pair">
                  <Input
                    value={p.youSaid}
                    onChange={e => setPairs(cur => cur.map((x, j) => (j === i ? { ...x, youSaid: e.target.value } : x)))}
                    placeholder="You said…"
                    aria-label={`You said ${i + 1}`}
                    maxLength={1000}
                  />
                  <Input
                    value={p.weDid}
                    onChange={e => setPairs(cur => cur.map((x, j) => (j === i ? { ...x, weDid: e.target.value } : x)))}
                    placeholder="We did…"
                    aria-label={`We did ${i + 1}`}
                    maxLength={1000}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPairs(cur => cur.filter((_, j) => j !== i))}
                    aria-label={`Remove line ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
              {pairs.length < 30 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPairs(cur => [...cur, { youSaid: '', weDid: '' }])}
                  data-testid="evidence-add-pair"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Add a line
                </Button>
              ) : null}
            </div>
          </FieldWithInfo>

          <FieldWithInfo id="evidence-notes" label="Notes for your team (optional)" help={HELP.formNotes}>
            <textarea
              id="evidence-notes"
              className={feedbackTextareaClass}
              rows={2}
              maxLength={4000}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              data-testid="evidence-notes"
            />
          </FieldWithInfo>

          {error ? (
            <p className="text-sm text-destructive" data-testid="evidence-form-error">
              {error}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={pending} data-testid="evidence-save">
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add evidence'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
