import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import type { CarePlanRisks } from '@/features/service-users/care-plans/types'

export type RiskReviewActionInput =
  | { action: 'link'; riskRecordId: string }
  | { action: 'unlink'; linkId: string }
  | { action: 'review'; linkId: string }
  | { action: 'resolve_flag'; flagId: string; note: string }

type Props = {
  data: CarePlanRisks | null | undefined
  canManage: boolean
  busy?: boolean
  onAction: (input: RiskReviewActionInput) => void
}

const CHANGE_TEXT: Record<string, string> = {
  NEW_NEED: 'New need',
  CHANGED_NEED: 'Changed need',
  NO_LONGER_INDICATED: 'No longer indicated',
  NEW_RISK: 'New or higher risk',
  GENERAL: 'Reassessment',
}

const fieldClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

/**
 * Reassessment review flags for this care plan and the IA risks it controls. Nothing here changes
 * the published plan or closes a risk; it records what a manager reviewed.
 */
export function CarePlanRiskReviewPanel({ data, canManage, busy, onAction }: Props) {
  const [resolving, setResolving] = React.useState<string | null>(null)
  const [note, setNote] = React.useState('')
  const [riskId, setRiskId] = React.useState('')
  if (!data) return null
  const openFlags = data.reassessmentFlags.filter((f) => f.status === 'OPEN')

  return (
    <section className="space-y-3 rounded-md border border-border bg-card px-4 py-3 text-sm" data-testid="care-plan-risk-review">
      {openFlags.length > 0 ? (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
          data-testid="care-plan-review-required"
        >
          <p className="font-medium">Review required after reassessment</p>
          <p className="text-xs">The published plan stays in use until you review it.</p>
          <ul className="mt-2 space-y-2">
            {openFlags.map((flag) => (
              <li key={flag.id} className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium">{flag.changeTypes.map((c) => CHANGE_TEXT[c] ?? c).join(' · ')}</p>
                  <p className="text-xs">{flag.reason}</p>
                </div>
                {canManage ? (
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setResolving(flag.id)}>
                    Mark Reviewed
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="font-semibold">Linked risks</h2>
        {data.links.length === 0 ? (
          <p className="text-xs text-muted-foreground">No assessment risks are linked to this care plan.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.links.map((link) => (
              <li key={link.id} className="flex flex-wrap items-start justify-between gap-2 py-2" data-testid="care-plan-risk-row">
                <div className="min-w-0 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{link.risk.riskType.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="text-xs text-muted-foreground">
                      {link.risk.riskLevel} · {link.risk.status}
                    </span>
                    {link.status === 'REVIEW_REQUIRED' ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                        Needs review
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{link.risk.description}</p>
                  {link.risk.controlMeasures ? <p className="text-xs">Controls: {link.risk.controlMeasures}</p> : null}
                  {link.reviewReason ? <p className="text-xs text-amber-800 dark:text-amber-200">{link.reviewReason}</p> : null}
                  {link.risk.supersedeReviewRequired ? (
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      A newer assessment recorded this risk again — decide on it in the assessment&apos;s risk register.
                    </p>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex gap-2">
                    {link.status === 'REVIEW_REQUIRED' ? (
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onAction({ action: 'review', linkId: link.id })}>
                        Mark Reviewed
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onAction({ action: 'unlink', linkId: link.id })}>
                      Unlink
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canManage && data.availableRisks.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-[16rem] flex-1">
              <label htmlFor="care-plan-risk-select" className="text-xs font-medium">
                Link an assessment risk
              </label>
              <select id="care-plan-risk-select" className={fieldClass} value={riskId} onChange={(e) => setRiskId(e.target.value)}>
                <option value="">Choose a risk…</option>
                {data.availableRisks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.riskType.replace(/_/g, ' ').toLowerCase()} — {r.riskLevel} — {r.description.slice(0, 60)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={busy || !riskId}
              onClick={() => {
                onAction({ action: 'link', riskRecordId: riskId })
                setRiskId('')
              }}
            >
              Link Risk
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={resolving != null} onOpenChange={(o) => (o ? null : (setResolving(null), setNote('')))}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Mark reassessment reviewed</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <label htmlFor="care-plan-flag-note" className="text-sm font-medium">
              What did you review or decide? (required)
            </label>
            <textarea id="care-plan-flag-note" rows={3} className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => (setResolving(null), setNote(''))}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || note.trim().length < 3}
              onClick={() => {
                if (resolving) onAction({ action: 'resolve_flag', flagId: resolving, note: note.trim() })
                setResolving(null)
                setNote('')
              }}
            >
              Mark Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
