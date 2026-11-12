import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, User, XCircle } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import { useCandidate } from '@/features/hr/recruitment/hooks/useRecruitment'
import { RecruitmentStageBadge } from '@/features/hr/recruitment/components/RecruitmentStatusBadges'
import { CandidateDocumentsPanel } from '@/features/hr/recruitment/components/CandidateDocumentsPanel'
import { SurveyContactPreferencesSection } from '@/features/surveys/reminders/SurveyContactPreferencesSection'
import {
  PIPELINE_STAGES,
  candidateStageLabel,
  formatDateTime,
} from '@/features/hr/recruitment/utils/recruitment-display.util'
import type { CandidateDetail, CandidateStage } from '@/features/hr/recruitment/api/recruitment.api'
import { Button } from '@/shared/ui/button'
import { FlowStepper, StepPanel } from '@/features/hr/recruitment/components/flow/flow-ui'
import { ApplicationStep } from '@/features/hr/recruitment/components/flow/ApplicationStep'
import { ScreeningStep } from '@/features/hr/recruitment/components/flow/ScreeningStep'
import {
  ArrangeInterviewDialog,
  InterviewStep,
  hasPositiveInterview,
} from '@/features/hr/recruitment/components/flow/InterviewStep'
import { OfferDialog, OfferResponseDialog, OfferStep } from '@/features/hr/recruitment/components/flow/OfferStep'
import { ChecksStep, ClearDialog } from '@/features/hr/recruitment/components/flow/ChecksStep'
import { HireStep } from '@/features/hr/recruitment/components/flow/HireStep'
import {
  CloseApplicationDialog,
  ConfirmMoveDialog,
} from '@/features/hr/recruitment/components/flow/StageMoveDialogs'

const STEP_TEXT: Record<CandidateStage, { title: string; description: string }> = {
  APPLIED: {
    title: '1. Application',
    description: "Check the candidate's details and record their full employment history, explaining any gaps.",
  },
  SCREENING: {
    title: '2. Screening',
    description: 'A short call to check the basics before inviting the candidate to interview.',
  },
  INTERVIEW: {
    title: '3. Interview',
    description: 'Interview with values-based questions, score the answers and record the recommendation.',
  },
  OFFER: {
    title: '4. Conditional offer',
    description: 'Offer the job on condition that the pre-employment checks come back satisfactory.',
  },
  VETTING: {
    title: '5. Pre-employment checks',
    description: 'Verify every check the law requires (CQC Schedule 3) before the candidate can start.',
  },
  ACCEPTED: {
    title: '6. Cleared to start',
    description: 'A manager has signed off the checks. Create the employee record to hire the candidate.',
  },
  REJECTED: { title: 'Rejected', description: '' },
  WITHDRAWN: { title: 'Withdrawn', description: '' },
}

type MoveConfirm = { to: CandidateStage; title: string; description: string; confirmLabel: string }

/** The buttons under the current step: go back one step, close the application, and the action that moves on. */
function StepFooter({
  candidate,
  canConvert,
  onMove,
  onClose,
  onArrangeInterview,
  onMakeOffer,
  onOfferReply,
  onClear,
}: {
  candidate: CandidateDetail
  canConvert: boolean
  onMove: (m: MoveConfirm) => void
  onClose: () => void
  onArrangeInterview: () => void
  onMakeOffer: () => void
  onOfferReply: (accepted: boolean) => void
  onClear: () => void
}) {
  const idx = PIPELINE_STAGES.indexOf(candidate.stage)
  const prev = idx > 0 ? PIPELINE_STAGES[idx - 1] : null

  let primary: React.ReactNode = null
  let hint: string | null = null
  switch (candidate.stage) {
    case 'APPLIED':
      primary = (
        <Button
          type="button"
          onClick={() =>
            onMove({
              to: 'SCREENING',
              title: 'Start screening',
              description: 'Move the candidate to screening to ask the basic questions.',
              confirmLabel: 'Start screening',
            })
          }
        >
          Start screening <ArrowRight className="h-4 w-4" />
        </Button>
      )
      break
    case 'SCREENING':
      if (candidate.hasRightToWork === null) hint = 'Answer the screening questions first.'
      else if (candidate.hasRightToWork === false) hint = 'The candidate needs the right to work in the UK.'
      primary = (
        <Button type="button" disabled={!!hint} onClick={onArrangeInterview}>
          Arrange interview <ArrowRight className="h-4 w-4" />
        </Button>
      )
      break
    case 'INTERVIEW':
      if (!hasPositiveInterview(candidate)) hint = 'Record an interview with a “Hire” or “Maybe” recommendation first.'
      primary = (
        <Button type="button" disabled={!!hint} onClick={onMakeOffer}>
          Make conditional offer <ArrowRight className="h-4 w-4" />
        </Button>
      )
      break
    case 'OFFER':
      primary = (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOfferReply(false)}>
            Candidate declined
          </Button>
          <Button type="button" onClick={() => onOfferReply(true)}>
            Candidate accepted <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )
      break
    case 'VETTING':
      if (!canConvert) hint = 'A manager with hiring permission signs off the checks.'
      else if (candidate.clearanceBlockers.length) hint = `${candidate.clearanceBlockers.length} item(s) still to do.`
      primary = (
        <Button type="button" disabled={!!hint} onClick={onClear}>
          Clear to start <ArrowRight className="h-4 w-4" />
        </Button>
      )
      break
    default:
      break
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {prev ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onMove({
                to: prev,
                title: `Back to ${candidateStageLabel(prev)}`,
                description:
                  candidate.stage === 'ACCEPTED'
                    ? 'This removes the manager sign-off. The checks must be cleared again.'
                    : candidate.stage === 'VETTING'
                      ? "The checks are kept. The candidate's reply to the offer will need recording again."
                      : 'Nothing recorded is lost.',
                confirmLabel: 'Go back',
              })
            }
          >
            <ArrowLeft className="h-4 w-4" /> Back to {candidateStageLabel(prev)}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onClose}>
          <XCircle className="h-4 w-4" /> Reject / withdrawn
        </Button>
      </div>
      {primary ? (
        <div className="flex flex-wrap items-center gap-3">
          {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
          {primary}
        </div>
      ) : null}
    </>
  )
}

export default function CandidateDetailPage() {
  const { candidateId } = useParams({ strict: false }) as { candidateId: string }
  const canUpdate = useAuthStore.getState().can('hr.candidates.update')
  const canConvert = useAuthStore.getState().can('hr.candidates.convert')
  const query = useCandidate(candidateId)
  const candidate = query.data

  const closed = candidate?.stage === 'REJECTED' || candidate?.stage === 'WITHDRAWN'
  const hired = !!candidate?.convertedEmployeeId
  /** The step the candidate is at (a closed application shows the step it was closed at). */
  const flowStage: CandidateStage = candidate
    ? closed
      ? candidate.stageBeforeClosing ?? 'APPLIED'
      : candidate.stage
    : 'APPLIED'

  const [viewing, setViewing] = React.useState<CandidateStage>(flowStage)
  React.useEffect(() => setViewing(flowStage), [flowStage])

  const [moveConfirm, setMoveConfirm] = React.useState<MoveConfirm | null>(null)
  const [closeOpen, setCloseOpen] = React.useState(false)
  const [arrangeOpen, setArrangeOpen] = React.useState(false)
  const [offerOpen, setOfferOpen] = React.useState(false)
  const [offerReply, setOfferReply] = React.useState<boolean | null>(null)
  const [clearOpen, setClearOpen] = React.useState(false)
  /** A "Before clearing to start" item points at the Application step. */
  const [focus, setFocus] = React.useState<{ target: 'CONSENT' | 'EMPLOYMENT_HISTORY'; key: number } | null>(null)

  if (query.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading candidate…</p>
  }
  if (!candidate) {
    return <p className="p-6 text-sm text-muted-foreground">Candidate not found.</p>
  }

  const canEdit = canUpdate && !hired && !closed
  const isCurrent = viewing === candidate.stage && !closed && !hired
  const text = STEP_TEXT[viewing]

  let content: React.ReactNode
  switch (viewing) {
    case 'APPLIED':
      content = <ApplicationStep candidate={candidate} canEdit={canEdit} focus={focus} />
      break
    case 'SCREENING':
      content = <ScreeningStep candidate={candidate} canEdit={canEdit} />
      break
    case 'INTERVIEW':
      content = <InterviewStep candidate={candidate} canEdit={canEdit} />
      break
    case 'OFFER':
      content = <OfferStep candidate={candidate} canEdit={canEdit} />
      break
    case 'VETTING':
      content = (
        <ChecksStep
          candidate={candidate}
          canEdit={canEdit}
          onGoToApplication={target => {
            setViewing('APPLIED')
            setFocus({ target, key: Date.now() })
          }}
        />
      )
      break
    default:
      content = <HireStep candidate={candidate} canConvert={canConvert && !closed} />
  }

  return (
    <div className="flex flex-col gap-4" data-testid="hr-candidate-detail-page">
      <PageHeader
        title={candidate.name}
        description={`${candidate.candidateReference} · ${candidate.vacancyTitle ?? 'Vacancy'}`}
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <User className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Candidates', href: '/hr/candidates' },
          { label: candidate.name },
        ]}
      >
        {hired ? (
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Hired</span>
        ) : (
          <RecruitmentStageBadge stage={candidate.stage} />
        )}
      </PageHeader>

      {closed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="text-sm">
            <p className="font-medium text-red-700 dark:text-red-300">
              {candidateStageLabel(candidate.stage)} at {candidateStageLabel(flowStage)}
            </p>
            {candidate.outcomeReason ? <p className="text-muted-foreground">{candidate.outcomeReason}</p> : null}
            {candidate.stage === 'REJECTED' && candidate.rejectionEmailedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Candidate emailed {formatDateTime(candidate.rejectionEmailedAt)}
              </p>
            ) : null}
          </div>
          {canUpdate && candidate.stageBeforeClosing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setMoveConfirm({
                  to: candidate.stageBeforeClosing!,
                  title: 'Reopen application',
                  description: `The candidate goes back to ${candidateStageLabel(candidate.stageBeforeClosing!)}.`,
                  confirmLabel: 'Reopen',
                })
              }
            >
              Reopen
            </Button>
          ) : null}
        </div>
      ) : null}

      {candidate.emailUsedByEmployee && !hired && !closed ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300">
          <p>
            <span className="font-medium">{candidate.email}</span> is already used by employee{' '}
            <Link
              to="/hr/employees/$employeeId"
              params={{ employeeId: candidate.emailUsedByEmployee.employeeId }}
              className="font-medium underline underline-offset-2"
            >
              {candidate.emailUsedByEmployee.name}
            </Link>
            . If this is the same person, check before carrying on. Otherwise correct the candidate&apos;s email
            (Application → Edit details), or enter a different email when you hire.
          </p>
        </div>
      ) : null}

      <FlowStepper stage={flowStage} hired={hired} viewing={viewing} onView={setViewing} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <StepPanel
            title={text.title}
            description={isCurrent || viewing === 'ACCEPTED' ? text.description : `${text.description} (Step completed — you can still view it.)`}
            footer={
              isCurrent && canUpdate ? (
                <StepFooter
                  candidate={candidate}
                  canConvert={canConvert}
                  onMove={setMoveConfirm}
                  onClose={() => setCloseOpen(true)}
                  onArrangeInterview={() => setArrangeOpen(true)}
                  onMakeOffer={() => setOfferOpen(true)}
                  onOfferReply={setOfferReply}
                  onClear={() => setClearOpen(true)}
                />
              ) : undefined
            }
          >
            {content}
          </StepPanel>

          <SurveyContactPreferencesSection subjectKind="CANDIDATE" subjectId={candidateId} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-sm font-medium">Documents</h2>
            <CandidateDocumentsPanel candidateId={candidateId} />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-sm font-medium">History</h2>
            {candidate.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <ul className="space-y-3">
                {candidate.timeline.map(entry => (
                  <li key={entry.id} className="border-l-2 border-border pl-3 text-sm">
                    <p className="font-medium">
                      {entry.fromStage && entry.fromStage !== entry.toStage
                        ? `${candidateStageLabel(entry.fromStage)} → ${candidateStageLabel(entry.toStage)}`
                        : candidateStageLabel(entry.toStage)}
                    </p>
                    {entry.notes ? <p className="mt-0.5 text-xs text-muted-foreground">{entry.notes}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                      {entry.changedBy ? ` · ${entry.changedBy.name}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmMoveDialog
        candidate={candidate}
        to={moveConfirm?.to ?? null}
        title={moveConfirm?.title ?? ''}
        description={moveConfirm?.description ?? ''}
        confirmLabel={moveConfirm?.confirmLabel ?? ''}
        onOpenChange={o => !o && setMoveConfirm(null)}
      />
      <CloseApplicationDialog candidate={candidate} open={closeOpen} onOpenChange={setCloseOpen} />
      <ArrangeInterviewDialog candidate={candidate} open={arrangeOpen} onOpenChange={setArrangeOpen} />
      <OfferDialog candidate={candidate} open={offerOpen} onOpenChange={setOfferOpen} />
      <OfferResponseDialog candidate={candidate} accepted={offerReply} onOpenChange={o => !o && setOfferReply(null)} />
      <ClearDialog candidate={candidate} open={clearOpen} onOpenChange={setClearOpen} />
    </div>
  )
}
