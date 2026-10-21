import * as React from 'react'
import { FilePlus2, Plus, Printer, Save, Send, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { printPathwayCarePlan } from '@/features/specialist-pathways/print-pathway-plan'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreatePathwayPlan,
  useDecidePathwayPlan,
  useUpdatePathwayPlan,
} from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import { NEED_AREAS, PLAN_STATUS_LABELS, fmtDate } from '@/features/specialist-pathways/pathway-labels'
import type {
  PathwayCase,
  PathwayPlanContent,
  PlanConsent,
  PlanNeed,
  SpecialistPathwayPlanStatus,
} from '@/features/specialist-pathways/types/specialist-pathway.types'

type Props = { caseData: PathwayCase }

const STATUS_CLASS: Record<SpecialistPathwayPlanStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  RETURNED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  SUPERSEDED: 'bg-muted text-muted-foreground line-through',
}

const EMPTY_NEED: PlanNeed = { area: '', need: '', outcome: '', support: '', whoHelps: '', frequency: '' }
const EMPTY_CONSENT: PlanConsent = { agreed: false, agreedBy: '', relationship: '', date: '', method: '' }

const inputClass = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
const areaClass = 'min-h-[60px] w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm'

function StatusChip({ status }: { status: SpecialistPathwayPlanStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {PLAN_STATUS_LABELS[status]}
    </span>
  )
}

/** Normalise stored content into the editable shape (keeps legacy text). */
function toDraft(c: PathwayPlanContent | undefined): PathwayPlanContent {
  return {
    summary: c?.summary ?? '',
    needs: c?.needs?.length ? c.needs : [{ ...EMPTY_NEED }],
    consent: { ...EMPTY_CONSENT, ...(c?.consent ?? {}) },
    reviewDate: c?.reviewDate ?? '',
    goals: c?.goals,
    support: c?.support,
  }
}

/* ─── read-only view ─────────────────────────────────────────────────── */

function PlanView({ content }: { content: PathwayPlanContent }) {
  const needs = content.needs ?? []
  const legacy = Boolean(content.goals || content.support)
  return (
    <div className="flex flex-col gap-4 text-sm">
      {content.summary && <p className="whitespace-pre-wrap">{content.summary}</p>}
      {needs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Area / need</th>
                <th className="px-3 py-2 font-medium">Outcome wanted</th>
                <th className="px-3 py-2 font-medium">Support</th>
                <th className="px-3 py-2 font-medium">Who · how often</th>
              </tr>
            </thead>
            <tbody>
              {needs.map((n, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium">{n.area || '—'}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{n.need}</p>
                  </td>
                  <td className="whitespace-pre-wrap px-3 py-2">{n.outcome || '—'}</td>
                  <td className="whitespace-pre-wrap px-3 py-2">{n.support || '—'}</td>
                  <td className="px-3 py-2">
                    {[n.whoHelps, n.frequency].filter(Boolean).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {legacy && (
        <div className="rounded-lg border border-dashed border-border p-3">
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Previous format</p>
          {content.goals && <p className="whitespace-pre-wrap"><span className="font-medium">Goals: </span>{content.goals}</p>}
          {content.support && <p className="whitespace-pre-wrap"><span className="font-medium">Support: </span>{content.support}</p>}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Consent: </span>
          {content.consent?.agreed
            ? `Agreed by ${content.consent.agreedBy || '—'}${content.consent.relationship ? ` (${content.consent.relationship})` : ''}${content.consent.date ? ` on ${fmtDate(content.consent.date)}` : ''}${content.consent.method ? ` · ${content.consent.method}` : ''}`
            : 'Not recorded'}
        </p>
        <p>
          <span className="text-muted-foreground">Plan review date: </span>
          {fmtDate(content.reviewDate)}
        </p>
      </div>
    </div>
  )
}

/* ─── editor ─────────────────────────────────────────────────────────── */

function PlanEditor({ value, onChange }: { value: PathwayPlanContent; onChange: (v: PathwayPlanContent) => void }) {
  const needs = value.needs ?? []
  const consent = value.consent ?? EMPTY_CONSENT
  const setNeed = (i: number, patch: Partial<PlanNeed>) =>
    onChange({ ...value, needs: needs.map((n, idx) => (idx === i ? { ...n, ...patch } : n)) })
  const setConsent = (patch: Partial<PlanConsent>) => onChange({ ...value, consent: { ...consent, ...patch } })

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Plan summary</span>
        <textarea
          className={areaClass}
          value={value.summary ?? ''}
          onChange={e => onChange({ ...value, summary: e.target.value })}
          placeholder="A short overview of the person and how we will support them"
        />
      </label>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Needs, outcomes & support</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...value, needs: [...needs, { ...EMPTY_NEED }] })}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Add need
          </Button>
        </div>
        <datalist id="pathway-need-areas">
          {NEED_AREAS.map(a => (
            <option key={a} value={a} />
          ))}
        </datalist>
        {needs.map((n, i) => (
          <div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Need {i + 1}</span>
              {needs.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...value, needs: needs.filter((_, idx) => idx !== i) })}
                  aria-label={`Remove need ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs">
                Area
                <input className={inputClass} list="pathway-need-areas" value={n.area} onChange={e => setNeed(i, { area: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                What the need is
                <input className={inputClass} value={n.need} onChange={e => setNeed(i, { need: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Outcome the person wants
                <textarea className={areaClass} value={n.outcome} onChange={e => setNeed(i, { outcome: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Support / what we will do
                <textarea className={areaClass} value={n.support} onChange={e => setNeed(i, { support: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Who helps
                <input className={inputClass} value={n.whoHelps} onChange={e => setNeed(i, { whoHelps: e.target.value })} placeholder="e.g. Carers, family, district nurse" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                How often
                <input className={inputClass} value={n.frequency} onChange={e => setNeed(i, { frequency: e.target.value })} placeholder="e.g. Every morning visit" />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={consent.agreed} onChange={e => setConsent({ agreed: e.target.checked })} />
          The person (or their representative) has agreed to this plan
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs">
            Agreed by
            <Input value={consent.agreedBy} onChange={e => setConsent({ agreedBy: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Relationship
            <Input value={consent.relationship} onChange={e => setConsent({ relationship: e.target.value })} placeholder="Self, daughter, LPA…" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Date
            <Input type="date" value={consent.date} onChange={e => setConsent({ date: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            How agreed
            <Input value={consent.method} onChange={e => setConsent({ method: e.target.value })} placeholder="In person, phone, Easy Read…" />
          </label>
        </div>
      </div>

      <label className="flex max-w-xs flex-col gap-1.5 text-sm">
        <span className="font-medium">Plan review date</span>
        <Input type="date" value={value.reviewDate ?? ''} onChange={e => onChange({ ...value, reviewDate: e.target.value })} />
      </label>
    </div>
  )
}

/* ─── panel ──────────────────────────────────────────────────────────── */

export function PathwayCarePlanPanel({ caseData }: Props) {
  const userId = useAuthStore(s => s.user?.id ?? null)
  const can = useAuthStore(s => s.can)
  const canManage = can('specialist_pathways.manage')
  const canApprove = can('specialist_pathways.approve')
  const closed = caseData.status === 'CLOSED'

  const createPlan = useCreatePathwayPlan(caseData.id)
  const updatePlan = useUpdatePathwayPlan(caseData.id)
  const decidePlan = useDecidePathwayPlan(caseData.id)

  const plans = caseData.plans ?? []
  const latest = plans[0]
  const history = plans.slice(1)

  const [draft, setDraft] = React.useState<PathwayPlanContent>(() => toDraft(latest?.content))
  const [comment, setComment] = React.useState('')

  React.useEffect(() => {
    if (latest?.status === 'DRAFT') setDraft(toDraft(latest.content))
  }, [latest?.id, latest?.status, latest?.content])

  const isDraft = latest?.status === 'DRAFT'
  const isSubmitted = latest?.status === 'SUBMITTED'
  const ownSubmission = isSubmitted && latest?.submittedById === userId
  const busy = createPlan.isPending || updatePlan.isPending || decidePlan.isPending
  const canStartNew =
    canManage && !closed && (!latest || ['APPROVED', 'RETURNED', 'SUPERSEDED'].includes(latest.status))

  const save = (submit: boolean) => {
    if (!latest) return
    updatePlan.mutate(
      { planId: latest.id, content: draft, submit },
      {
        onSuccess: () => toastSuccess(submit ? 'Care plan submitted for approval' : 'Draft saved'),
        onError: e => toastApiError(e, submit ? 'Could not submit care plan' : 'Could not save draft'),
      },
    )
  }

  const decide = (decision: 'APPROVE' | 'RETURN') => {
    if (!latest) return
    decidePlan.mutate(
      { planId: latest.id, decision, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          toastSuccess(decision === 'APPROVE' ? 'Care plan approved' : 'Care plan returned')
          setComment('')
        },
        onError: e => toastApiError(e, 'Could not record decision'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pathway-care-plan-panel">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {!latest ? 'No care plan yet' : `Current: version ${latest.version}`}
        </p>
        <div className="flex gap-2">
          {latest && (
            <Button
              variant="outline"
              onClick={() => {
                if (!printPathwayCarePlan(caseData)) toastApiError(null, 'Allow pop-ups to print the care plan')
              }}
            >
              <Printer className="mr-2 h-4 w-4" aria-hidden />
              Print / PDF
            </Button>
          )}
          {canStartNew && (
            <Button
              variant="outline"
              onClick={() =>
                createPlan.mutate(undefined, {
                  onSuccess: () => toastSuccess(latest ? 'New version started from the current plan' : 'Draft care plan created'),
                  onError: e => toastApiError(e, 'Could not create draft'),
                })
              }
              disabled={busy}
            >
              <FilePlus2 className="mr-2 h-4 w-4" aria-hidden />
              {latest ? 'Start new version' : 'Create care plan'}
            </Button>
          )}
        </div>
      </div>

      {latest && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              Care plan v{latest.version}
              <StatusChip status={latest.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isDraft && canManage && !closed ? (
              <PlanEditor value={draft} onChange={setDraft} />
            ) : (
              <PlanView content={latest.content ?? {}} />
            )}

            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              {latest.submittedByName && (
                <p>Submitted by {latest.submittedByName} on {fmtDate(latest.submittedAt)}</p>
              )}
              {latest.decidedByName && (
                <p>
                  {latest.status === 'RETURNED' ? 'Returned' : 'Approved'} by {latest.decidedByName} on{' '}
                  {fmtDate(latest.decidedAt)}
                </p>
              )}
            </div>
            {latest.comment && (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">Comment: </span>
                {latest.comment}
              </p>
            )}

            {isDraft && canManage && !closed && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button variant="outline" onClick={() => save(false)} disabled={busy}>
                  <Save className="mr-2 h-4 w-4" aria-hidden />
                  Save draft
                </Button>
                <Button onClick={() => save(true)} disabled={busy}>
                  <Send className="mr-2 h-4 w-4" aria-hidden />
                  Submit for approval
                </Button>
              </div>
            )}

            {isSubmitted && canApprove && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {ownSubmission ? (
                  <p className="text-sm text-muted-foreground">
                    You submitted this plan, so someone else must approve or return it.
                  </p>
                ) : (
                  <>
                    <textarea
                      className={areaClass}
                      placeholder="Comment (required when returning)"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => decide('APPROVE')} disabled={busy}>
                        <ThumbsUp className="mr-2 h-4 w-4" aria-hidden />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => decide('RETURN')}
                        disabled={busy || comment.trim() === ''}
                      >
                        <ThumbsDown className="mr-2 h-4 w-4" aria-hidden />
                        Return
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Version history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {history.map(plan => (
              <div key={plan.id} className="flex items-center justify-between text-sm">
                <span>
                  v{plan.version}
                  {plan.decidedByName ? ` · ${plan.decidedByName}` : ''}{' '}
                  <span className="text-muted-foreground">{fmtDate(plan.decidedAt ?? plan.updatedAt)}</span>
                </span>
                <StatusChip status={plan.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
