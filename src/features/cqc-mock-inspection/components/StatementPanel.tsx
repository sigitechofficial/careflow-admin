import * as React from 'react'
import { AlertTriangle, Download, EyeOff, FileText, Paperclip } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'
import { toastSuccess } from '@/shared/lib/toast'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { CheckScoring, MockAction, MockStatement, StatementPolicy, StatementSurvey } from '../types'
import { useScoreMockStatement } from '../hooks'
import { CATEGORY_LABEL, SOURCE_LABEL, levelsSummary, pointsSummary } from '../labels'
import { HELP } from '../help'
import { InfoTip } from './InfoTip'
import { SurveyList } from './RelatedSurveys'
import { PolicyList } from './RelatedPolicies'
import {
  DropdownSection,
  StatementChecks,
  needsNote,
  sameCheckAnswers,
  scoreFromChecks,
  toCheckAnswers,
} from './StatementChecks'
import type { ActionCheck } from './ActionsSection'

function EvidenceList({ statement, inspectionId }: { statement: MockStatement; inspectionId: string }) {
  const canAddEvidence = useAuthStore(s => s.can('cqc_evidence.manage'))
  if (statement.gap) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm" data-testid="mock-statement-gap">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <span>
          No current CQC evidence for this statement. An inspector would expect to see some; add evidence in CQC
          evidence and refresh the inspection.
          {canAddEvidence ? (
            <Link
              to="/governance/cqc-evidence"
              search={{ add: statement.id, from: inspectionId }}
              className="ml-1 font-medium text-primary hover:underline"
              data-testid="mock-add-evidence"
            >
              Add evidence
            </Link>
          ) : null}
        </span>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {statement.evidence.map(e => (
        <div key={e.evidenceId} className="rounded-md border border-border p-3 text-sm" data-testid="mock-statement-evidence">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium text-foreground">{e.title}</div>
                <div className="text-xs text-muted-foreground">
                  {SOURCE_LABEL[e.sourceType] ?? e.sourceType}
                  {e.sourceLabel ? ` · ${e.sourceLabel}` : ''} · {CATEGORY_LABEL[e.categoryCode] ?? e.categoryCode} ·{' '}
                  {formatOrganisationDate(e.date)}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {e.attachmentCount ? (
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  {e.attachmentCount}
                </span>
              ) : null}
              {e.reviewOverdue ? (
                <Badge size="sm" variant="warning">
                  Review overdue
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      ))}
      {statement.hiddenEvidenceCount ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <EyeOff className="h-3.5 w-3.5" />
          {statement.hiddenEvidenceCount} more from surveys whose results you cannot see.
        </p>
      ) : null}
    </div>
  )
}

/** One quality statement: its evidence, the score and the reviewer's notes. */
export function StatementPanel({
  inspectionId,
  statement,
  scale,
  checkScoring,
  editable,
  onAddAction,
  onSaved,
  surveys,
  policies,
  onEvidencePack,
  actions,
  onCheckAction,
  actionControls,
}: {
  inspectionId: string
  statement: MockStatement
  scale: { score: number; label: string }[]
  /** How this inspection turns check answers into a score. */
  checkScoring?: CheckScoring
  editable: boolean
  onAddAction: () => void
  onSaved: () => void
  /** Ready-made surveys for this statement (only for users who may see surveys). */
  surveys?: StatementSurvey[]
  /** Ready-made policies behind this statement (only for users who may see policies). */
  policies?: StatementPolicy[]
  /** Opens the evidence pack for this statement (only for users who may download packs). */
  onEvidencePack?: () => void
  /** The statement's improvement actions. */
  actions?: MockAction[]
  /** Opens "Create action" for one check (only for people who may add actions). */
  onCheckAction?: (check: ActionCheck) => void
  /** Edit and Delete beside each action under a check (only for people who may change actions). */
  actionControls?: (action: MockAction) => React.ReactNode
}) {
  const mutation = useScoreMockStatement(inspectionId)
  const [score, setScore] = React.useState<number | null>(statement.score)
  const savedChecks = React.useMemo(() => toCheckAnswers(statement.checks ?? []), [statement.checks])
  const [checks, setChecks] = React.useState(savedChecks)
  const [showMissingNotes, setShowMissingNotes] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // The page mounts one panel per statement (key = statement id), so state starts from the saved values.

  const checksChanged = !sameCheckAnswers(checks, savedChecks)
  // A statement with checks is scored from their answers by the server; one without (none in the
  // library today) keeps the 1–4 boxes so it can still be scored.
  const scoredByChecks = scoreFromChecks(statement.guidance, checks).total > 0
  const dirty = (!scoredByChecks && score !== statement.score) || checksChanged

  const onSave = async () => {
    setError(null)
    if ([...checks.values()].some(needsNote)) {
      setShowMissingNotes(true)
      setError('Add a note to every check that is not met or partially met.')
      return
    }
    setShowMissingNotes(false)
    const answers = [...checks.values()].map(c => ({ ...c, note: c.note?.trim() || null }))
    try {
      await mutation.mutateAsync({
        statementId: statement.id,
        body: { ...(scoredByChecks ? {} : { score }), ...(checksChanged ? { checks: answers } : {}) },
      })
      toastSuccess('Saved', statement.title)
      onSaved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.')
    }
  }

  return (
    <div className="space-y-5" data-testid="mock-statement-panel">
      <div>
        <h3 className="text-base font-semibold text-foreground">{statement.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{statement.summary}</p>
      </div>

      {statement.guidance ? (
        <StatementChecks
          guidance={statement.guidance}
          focus={statement.focus}
          answers={checks}
          onChange={setChecks}
          editable={editable}
          showMissingNotes={showMissingNotes}
          actions={actions}
          onCreateAction={onCheckAction}
          actionControls={actionControls}
          heading={
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-medium text-foreground">What to check</h4>
                <InfoTip label="what to check">{HELP.whatToCheck}</InfoTip>
              </div>
              {checkScoring ? (
                <p className="text-xs text-muted-foreground" data-testid="mock-check-scoring">
                  {pointsSummary(checkScoring)}. {levelsSummary(checkScoring)}.
                </p>
              ) : null}
            </div>
          }
        />
      ) : null}

      {policies?.length || surveys?.length ? (
        <div className="space-y-2">
          {policies?.length ? (
            <DropdownSection
              title={`Policies that apply (${policies.length})`}
              meta={`${policies.filter(p => p.adoptedPolicyId).length} of ${policies.length} adopted`}
              hint="The policies an inspector would expect to see behind this statement. Make sure yours are adopted and up to date."
              testId="mock-related-policies"
            >
              <PolicyList policies={policies} limit={6} columns={2} />
            </DropdownSection>
          ) : null}
          {surveys?.length ? (
            <DropdownSection
              title={`Surveys that help (${surveys.length})`}
              hint="Ready-made surveys that ask people about this, the most focused first. Their results come into CQC evidence when the survey closes."
              testId="mock-related-surveys"
            >
              <SurveyList surveys={surveys} limit={4} columns={2} />
            </DropdownSection>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-medium text-foreground">
            Evidence{statement.snapshotAt ? ` (as at ${formatOrganisationDate(statement.snapshotAt)})` : ''}
          </h4>
          <InfoTip label="evidence">{HELP.evidence}</InfoTip>
        </div>
        <EvidenceList statement={statement} inspectionId={inspectionId} />
      </section>

      {scoredByChecks ? null : (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-medium text-foreground">Score</h4>
            <InfoTip label="score">{HELP.score}</InfoTip>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Score">
            {scale.map(s => (
              <button
                key={s.score}
                type="button"
                role="radio"
                aria-checked={score === s.score}
                disabled={!editable}
                onClick={() => setScore(score === s.score ? null : s.score)}
                data-testid={`mock-score-${s.score}`}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                  score === s.score ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:bg-muted/30',
                )}
              >
                <div className="text-lg font-semibold tabular-nums">{s.score}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {editable || onEvidencePack ? (
        <div className="flex flex-wrap justify-end gap-2">
          {onEvidencePack ? (
            <Button
              variant="ghost"
              onClick={onEvidencePack}
              aria-label="Evidence pack for this statement"
              data-testid="mock-statement-evidence-pack"
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden />
              Evidence pack
            </Button>
          ) : null}
          {editable ? (
            <>
              <Button variant="outline" onClick={onAddAction} data-testid="mock-add-action-for-statement">
                Add action
              </Button>
              <Button onClick={() => void onSave()} disabled={!dirty || mutation.isPending} data-testid="mock-save-statement">
                {mutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
