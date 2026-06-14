import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatDate } from '@/shared/lib/utils'
import { toastInfo } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { AssessmentSourceBadge } from '@/features/service-users/assessments/components/AssessmentSourceBadge'
import { AssessmentReviewBadge } from '@/features/service-users/assessments/components/AssessmentReviewBadge'
import { AssessmentAuditTrailPanel } from '@/features/service-users/assessments/components/AssessmentAuditTrailPanel'
import { AssessmentHistoryList } from '@/features/service-users/assessments/components/AssessmentHistoryList'
import { AddAssessmentDialog } from '@/features/service-users/assessments/components/AddAssessmentDialog'
import { AssessmentCaptureDialog } from '@/features/service-users/assessments/components/AssessmentCaptureDialog'
import { AssessmentCompletionDrawer } from '@/features/service-users/assessments/components/AssessmentCompletionDrawer'
import {
  useAssessmentCompletion,
  useServiceUserAssessments,
} from '@/features/service-users/assessments/hooks/useServiceUserAssessments'
import type {
  AssessmentCatalogueItem,
  AssessmentCompletion,
  AssessmentCompletionUser,
  ServiceUserAssessmentLine,
} from '@/features/service-users/assessments/types'

const formatAssessmentUser = (user?: AssessmentCompletionUser | string | null) => {
  if (!user) return '—'
  if (typeof user === 'string') return user
  const name = user.name ?? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email || '—'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Props = {
  serviceUserId: string
  serviceUserName: string
}

export function ServiceUserAssessmentsPanel({ serviceUserId, serviceUserName }: Props) {
  const can = useAuthStore((s) => s.can)
  const canRead =
    can('service_users.assessments.read') ||
    can('service_users.initial_assessment.read') ||
    can('service_users.read')

  const assessmentsQuery = useServiceUserAssessments(serviceUserId, canRead)
  const assessments = assessmentsQuery.data ?? []

  const [expandedKeys, setExpandedKeys] = React.useState<Record<string, boolean>>({})
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [activeCompletionId, setActiveCompletionId] = React.useState<string | null>(null)
  const [captureOpen, setCaptureOpen] = React.useState(false)
  const [captureMode, setCaptureMode] = React.useState<'repeat' | 'add'>('add')
  const [captureAssessmentKey, setCaptureAssessmentKey] = React.useState<string | null>(null)
  const [captureTitle, setCaptureTitle] = React.useState<string | null>(null)
  const [captureInitialSummary, setCaptureInitialSummary] = React.useState<string | null>(null)
  const [captureInitialSnapshot, setCaptureInitialSnapshot] = React.useState<Record<string, unknown> | null>(
    null,
  )
  const [captureCarePathwayFormId, setCaptureCarePathwayFormId] = React.useState<string | null>(null)
  const [repeatCompletionId, setRepeatCompletionId] = React.useState<string | null>(null)

  const completionQuery = useAssessmentCompletion(serviceUserId, activeCompletionId, drawerOpen)
  const repeatCompletionQuery = useAssessmentCompletion(
    serviceUserId,
    repeatCompletionId,
    captureOpen && captureMode === 'repeat',
  )

  React.useEffect(() => {
    if (!captureOpen || captureMode !== 'repeat') return
    if (!repeatCompletionQuery.data) return
    setCaptureInitialSummary(repeatCompletionQuery.data.summary ?? '')
    setCaptureInitialSnapshot(repeatCompletionQuery.data.data ?? null)
  }, [captureOpen, captureMode, repeatCompletionQuery.data])

  const toggleHistory = React.useCallback((assessmentKey: string) => {
    setExpandedKeys((prev) => ({ ...prev, [assessmentKey]: !prev[assessmentKey] }))
  }, [])

  const openCompletion = React.useCallback((completion: AssessmentCompletion | null) => {
    if (!completion?.id) {
      toastInfo('No completion yet', 'This assessment has no completed record to view.')
      return
    }
    setActiveCompletionId(completion.id)
    setDrawerOpen(true)
  }, [])

  const openLatestCompletion = React.useCallback(
    (assessment: ServiceUserAssessmentLine) => {
      if (!assessment.latestCompletionId) {
        toastInfo('No completion yet', 'This assessment has no completed record to view.')
        return
      }
      setActiveCompletionId(assessment.latestCompletionId)
      setDrawerOpen(true)
    },
    [],
  )

  const overdueCount = assessments.filter((a) => a.review?.status === 'overdue').length
  const dueSoonCount = assessments.filter((a) => a.review?.status === 'due_soon').length

  const handleRepeat = React.useCallback((assessment: ServiceUserAssessmentLine) => {
    if (!assessment.latestCompletionId) {
      setCaptureMode('add')
      setCaptureAssessmentKey(assessment.assessmentKey)
      setCaptureTitle(assessment.title)
      setCaptureInitialSummary(null)
      setCaptureInitialSnapshot(null)
      setCaptureCarePathwayFormId(null)
      setRepeatCompletionId(null)
      setCaptureOpen(true)
      return
    }
    setCaptureMode('repeat')
    setCaptureAssessmentKey(assessment.assessmentKey)
    setCaptureTitle(assessment.title)
    setCaptureInitialSummary(assessment.summary ?? '')
    setCaptureInitialSnapshot(null)
    setCaptureCarePathwayFormId(null)
    setRepeatCompletionId(assessment.latestCompletionId)
    setCaptureOpen(true)
  }, [])

  const handleAddSelect = React.useCallback((item: AssessmentCatalogueItem) => {
    setAddOpen(false)
    setCaptureMode('add')
    setCaptureAssessmentKey(item.assessmentKey)
    setCaptureTitle(item.title)
    setCaptureInitialSummary(null)
    setCaptureInitialSnapshot(null)
    setRepeatCompletionId(null)
    setCaptureCarePathwayFormId(
      item.source === 'MANUAL' && UUID_RE.test(item.assessmentKey) ? item.assessmentKey : null,
    )
    setCaptureOpen(true)
  }, [])

  if (!canRead) {
    return (
      <div data-testid="su-assessments-panel">
        <p className="text-sm text-muted-foreground">You do not have access to assessments.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="su-assessments-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Assessments registry</h3>
          <p className="text-xs text-muted-foreground">
            Initial Assessment holistic tools and care pathway assessment forms. Scheduled reviews follow
            CQC/NICE guidance and show as reminders only; you can complete or repeat any assessment at
            any time. First completion may come from IA submit.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => setAddOpen(true)}
          data-testid="su-assessment-add"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add assessment
        </Button>
      </div>

      {(overdueCount > 0 || dueSoonCount > 0) && (
        <div
          className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950"
          role="status"
          data-testid="su-assessment-review-alerts"
        >
          {overdueCount > 0 && (
            <p>
              <strong>{overdueCount}</strong> assessment{overdueCount === 1 ? '' : 's'} have overdue
              scheduled reviews — you can still complete them now using Repeat or Add.
            </p>
          )}
          {dueSoonCount > 0 && (
            <p className={overdueCount > 0 ? 'mt-1' : undefined}>
              <strong>{dueSoonCount}</strong> assessment{dueSoonCount === 1 ? '' : 's'} due for review
              soon.
            </p>
          )}
          <p className="mt-2">
            <Link
              to="/assessments/review-queue"
              className="font-medium text-amber-950 underline underline-offset-2"
            >
              Open organisation review queue
            </Link>
          </p>
        </div>
      )}

      {assessmentsQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading assessments…
        </div>
      )}
      {assessmentsQuery.error && !assessmentsQuery.isLoading && (
        <p className="text-sm text-destructive" role="alert">
          Unable to load assessments.
        </p>
      )}
      {!assessmentsQuery.isLoading && !assessmentsQuery.error && assessments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No assessments yet. Complete the Initial Assessment to see promoted items here.
        </p>
      )}

      <div className="space-y-3">
        {assessments.map((assessment) => (
          <div
            key={assessment.assessmentKey}
            className="rounded-md border border-border/70 bg-white/80 p-3 shadow-sm"
            data-testid={`su-assessment-row-${assessment.assessmentKey}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-[12rem]">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{assessment.title}</h4>
                  <AssessmentSourceBadge source={assessment.latestCompletionSource ?? undefined} />
                  <AssessmentReviewBadge review={assessment.review} compact />
                </div>
                <p className="text-xs text-muted-foreground">
                  {assessment.summary?.trim() || 'Summary will appear after completion.'}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="font-medium text-foreground">
                  {assessment.latestCompletedAt ? formatDate(assessment.latestCompletedAt) : '—'}
                </div>
                <div>{formatAssessmentUser(assessment.latestCompletedBy)}</div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => openLatestCompletion(assessment)}
              >
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => handleRepeat(assessment)}
              >
                {assessment.latestCompletionId ? 'Repeat' : 'Complete'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => toggleHistory(assessment.assessmentKey)}
              >
                {expandedKeys[assessment.assessmentKey] ? 'Hide history' : 'History'}
              </Button>
            </div>

            {expandedKeys[assessment.assessmentKey] && (
              <div className="mt-3 rounded-md border border-dashed border-border/70 bg-muted/20 p-3">
                <AssessmentHistoryList
                  serviceUserId={serviceUserId}
                  assessmentKey={assessment.assessmentKey}
                  onSelectCompletion={openCompletion}
                  activeCompletionId={activeCompletionId}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <AssessmentAuditTrailPanel serviceUserId={serviceUserId} enabled={canRead} />

      <AssessmentCompletionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        completion={completionQuery.data}
        isLoading={completionQuery.isLoading}
        error={completionQuery.error}
        serviceUserId={serviceUserId}
      />

      <AddAssessmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        serviceUserId={serviceUserId}
        onSelect={handleAddSelect}
      />

      {captureAssessmentKey && captureTitle && (
        <AssessmentCaptureDialog
          open={captureOpen}
          onOpenChange={(next) => {
            setCaptureOpen(next)
            if (!next) {
              setRepeatCompletionId(null)
            }
          }}
          serviceUserId={serviceUserId}
          assessmentKey={captureAssessmentKey}
          title={captureTitle}
          initialSummary={captureInitialSummary ?? undefined}
          initialSnapshot={captureInitialSnapshot ?? undefined}
          repeatFromCompletionId={repeatCompletionId}
          carePathwayFormId={captureCarePathwayFormId}
          mode={captureMode}
        />
      )}
    </div>
  )
}
