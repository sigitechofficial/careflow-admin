import * as React from 'react'
import {
  AlertTriangle,
  Award,
  BookOpen,
  ClipboardCheck,
  Clock,
  Eye,
  FileText,
  Info,
  Layers,
  ListChecks,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { CheckLine, InfoRow, Panel, SideCard, TwoColumn } from '@/features/learning/components/builder-layout'
import { plural } from '@/features/learning/components/CourseSidebarCards'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useLearningCategories,
  useLearningPublishCheck,
  useLearningSettings,
  usePublishLearningCourse,
} from '@/features/learning/hooks/useLearning'
import {
  CREATABLE_COURSE_TYPES,
  LEARNING_COURSE_TYPE_OPTIONS,
  LEARNING_DELIVERY_METHOD_OPTIONS,
  type LearningCourse,
  type LearningCourseVersion,
  type LearningPublishIssue,
  type LearningPublishStep,
} from '@/features/learning/types/learning.types'

type Props = {
  course: LearningCourse
  version: LearningCourseVersion
  canPublish: boolean
  onGoTo: (step: LearningPublishStep) => void
  onPreview: () => void
  onPublished: () => void
}


function IssueList({
  issues,
  tone,
  onGoTo,
}: {
  issues: LearningPublishIssue[]
  tone: 'block' | 'warn'
  onGoTo: (step: LearningPublishStep) => void
}) {
  const Icon = tone === 'block' ? XCircle : AlertTriangle
  return (
    <ul className="space-y-1.5">
      {issues.map((issue, i) => (
        <li key={`${issue.code}-${i}`} className="flex items-start gap-2 text-sm">
          <Icon
            className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'block' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}
          />
          <span className="flex-1">{issue.message}</span>
          {issue.step !== 'Review and publish' ? (
            <button type="button" className="shrink-0 text-xs text-primary hover:underline" onClick={() => onGoTo(issue.step)}>
              Go to {issue.step}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** Builder step 5: summary, the API's publish check, change summary and the publish confirmation. */
export function CourseReviewTab({ course, version, canPublish, onGoTo, onPreview, onPublished }: Props) {
  const checkQuery = useLearningPublishCheck(course.id, canPublish)
  const categoriesQuery = useLearningCategories({ limit: 100 })
  const { data: settings } = useLearningSettings()
  const publishMut = usePublishLearningCourse()
  const [changeSummary, setChangeSummary] = React.useState('')
  const [summaryError, setSummaryError] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const check = checkQuery.data
  const summaryRequired = version.versionNumber > 1
  const lessons = (version.sections ?? []).flatMap(s => s.contentItems ?? [])
  const quizzes = version.assessments ?? []
  const moduleQuizzes = quizzes.filter(a => a.sectionId)
  const finals = quizzes.filter(a => !a.sectionId)
  const requiredModuleQuizzes = moduleQuizzes.filter(a => a.isRequired !== false)
  const category = categoriesQuery.data?.rows.find(c => c.id === course.categoryId)?.name ?? '—'
  const typeLabel =
    CREATABLE_COURSE_TYPES.find(t => t.value === course.courseType)?.label ??
    LEARNING_COURSE_TYPE_OPTIONS.find(t => t.value === course.courseType)?.label ??
    '—'
  const deliveryLabel = LEARNING_DELIVERY_METHOD_OPTIONS.find(o => o.value === course.deliveryMethod)?.label ?? '—'
  const validity = version.certificateValidityDays ?? settings?.defaultCertificateValidityDays

  const openConfirm = async () => {
    if (summaryRequired && !changeSummary.trim()) {
      setSummaryError('Write what changed in this version')
      return
    }
    const fresh = await checkQuery.refetch()
    if (fresh.data?.canPublish) setConfirmOpen(true)
  }

  const isWithdrawn = course.status === 'WITHDRAWN'

  /** Withdrawn course: "Save version" keeps the draft and the course withdrawn (the draft is already saved). */
  const keepDraft = () => {
    setConfirmOpen(false)
    toastSuccess(`Version ${version.versionNumber} kept as a draft. The course is still withdrawn.`)
  }

  const publish = async () => {
    try {
      await publishMut.mutateAsync({
        id: course.id,
        changeSummary: changeSummary.trim() || undefined,
        reactivate: isWithdrawn ? true : undefined,
      })
      toastSuccess(
        isWithdrawn
          ? `Version ${version.versionNumber} published and the course is active again`
          : `Version ${version.versionNumber} published`,
      )
      setConfirmOpen(false)
      setChangeSummary('')
      onPublished()
    } catch (err) {
      setConfirmOpen(false)
      void checkQuery.refetch()
      toastApiError(err instanceof ApiError ? err : new Error('Publish failed'))
    }
  }

  const passed = check
    ? [
        !check.blockers.some(b => ['title', 'archived'].includes(b.code)) ? 'Course title and code are set' : null,
        !check.blockers.some(b => ['category', 'type', 'delivery', 'type_delivery'].includes(b.code))
          ? 'Category, type and delivery method are valid'
          : null,
        !check.blockers.some(b => ['no_lessons', 'empty_module', 'lesson_invalid'].includes(b.code)) && lessons.length
          ? 'Every module has lessons with content'
          : null,
        !check.blockers.some(b => ['quiz_empty', 'question_invalid', 'no_final'].includes(b.code)) && quizzes.length
          ? 'Every quiz has valid questions'
          : null,
        !check.blockers.some(b => b.step === 'Finish and certificate') ? 'Completion rules are consistent' : null,
      ].filter((x): x is string => !!x)
    : []

  return (
    <TwoColumn
      main={
        <div className="space-y-5" data-testid="course-review-tab">
          <Panel title="Review course" description="Check the setup of this version, fix any problems, then publish.">
            <div className="grid gap-x-8 gap-y-1 rounded-lg border border-border p-4 md:grid-cols-2">
              <div>
                <InfoRow label="Course title" value={course.title} />
                <InfoRow label="Course code" value={<span className="font-mono text-xs">{course.code}</span>} />
                <InfoRow label="Category" value={category} />
                <InfoRow label="Course type" value={typeLabel} />
                <InfoRow label="Delivery method" value={deliveryLabel} />
                <InfoRow label="Version" value={`v${version.versionNumber}`} />
              </div>
              <div>
                <InfoRow icon={<Layers className="h-4 w-4" />} label="Modules" value={version.sections?.length ?? 0} />
                <InfoRow icon={<BookOpen className="h-4 w-4" />} label="Lessons" value={`${lessons.length} (${lessons.filter(l => l.isRequired !== false).length} required)`} />
                <InfoRow icon={<ClipboardCheck className="h-4 w-4" />} label="Module quizzes" value={`${moduleQuizzes.length} (${requiredModuleQuizzes.length} required)`} />
                <InfoRow icon={<Award className="h-4 w-4" />} label="Final assessments" value={finals.length} />
                <InfoRow icon={<Clock className="h-4 w-4" />} label="Estimated duration" value={course.estimatedDurationMinutes ? `${course.estimatedDurationMinutes} min` : '—'} />
              </div>
            </div>
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Completion requirements" icon={<ListChecks className="h-5 w-5" />}>
              <CheckLine state="on">Complete all required lessons ({lessons.filter(l => l.isRequired !== false).length})</CheckLine>
              {[...requiredModuleQuizzes, ...finals].map(q => (
                <CheckLine key={q.id} state="on">
                  Pass "{q.title}" (≥ {q.passingScore}%)
                </CheckLine>
              ))}
              <CheckLine state={version.requiresPracticalAssessment ? 'on' : 'off'}>Practical competency sign-off</CheckLine>
              <CheckLine state={version.requiresManagerApproval ? 'on' : 'off'}>Manager approval</CheckLine>
            </Panel>
            <Panel title="Certificate and training settings" icon={<Award className="h-5 w-5" />}>
              <InfoRow label="Certificate" value={version.certificateEnabled ? 'Enabled' : 'Not enabled'} />
              <InfoRow label="CPD minutes" value={version.cpdMinutes ?? '—'} />
              <InfoRow label="Certificate validity" value={version.certificateEnabled && validity ? `${validity} days` : '—'} />
              <InfoRow label="Refresher" value={version.refresherFrequencyDays ? 'On expiry' : '—'} />
              <InfoRow label="Mandatory" value={course.isMandatory ? 'Yes' : 'No'} />
            </Panel>
          </div>

          <Panel title="Course content preview" icon={<BookOpen className="h-5 w-5" />}>
            {(version.sections ?? []).length ? (
              <ol className="space-y-2">
                {(version.sections ?? []).map((m, i) => {
                  const q = moduleQuizzes.filter(x => x.sectionId === m.id).length
                  return (
                    <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{m.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.contentItems?.length ?? 0} lessons · {q} quizzes
                        </span>
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => onGoTo('Course outline')}>
                        View
                      </Button>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No modules yet.</p>
            )}
          </Panel>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Versioning note. </span>
              Once published, v{version.versionNumber} is locked. To make changes later, create v{version.versionNumber + 1}.
              Older versions stay for history and carer records.
            </p>
          </div>
        </div>
      }
      side={
        <>
          {canPublish ? (
            <SideCard
              title="Validation checklist"
              icon={<ShieldCheck className="h-4 w-4" />}
              testId="validation-checklist"
              badge={
                check ? (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] ${check.blockers.length ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'}`}
                  >
                    {check.blockers.length ? plural(check.blockers.length + check.warnings.length, 'issue', 'issues') : 'Ready'}
                  </span>
                ) : undefined
              }
            >
              {checkQuery.isLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                </p>
              ) : check ? (
                <div className="space-y-3">
                  {passed.length ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
                      <p className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Passed checks ({passed.length})</p>
                      {passed.map(p => (
                        <CheckLine key={p} state="on">
                          {p}
                        </CheckLine>
                      ))}
                    </div>
                  ) : null}
                  {check.warnings.length ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
                      <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">Warnings ({check.warnings.length})</p>
                      <IssueList issues={check.warnings} tone="warn" onGoTo={onGoTo} />
                    </div>
                  ) : null}
                  {check.blockers.length ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                      <p className="mb-1 text-xs font-medium text-destructive">Blocking errors ({check.blockers.length})</p>
                      <IssueList issues={check.blockers} tone="block" onGoTo={onGoTo} />
                    </div>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => void checkQuery.refetch()} disabled={checkQuery.isFetching}>
                    <RefreshCw className={`mr-1 h-4 w-4 ${checkQuery.isFetching ? 'animate-spin' : ''}`} />
                    Check again
                  </Button>
                </div>
              ) : null}
            </SideCard>
          ) : null}

          {canPublish ? (
            <SideCard title="What changed in this version" icon={<FileText className="h-4 w-4" />}>
              <FormField
                label={summaryRequired ? 'Change summary' : 'Change summary (optional)'}
                required={summaryRequired}
                error={summaryError ?? undefined}
                hint="Kept in the version history."
              >
                <Textarea
                  value={changeSummary}
                  rows={3}
                  maxLength={1000}
                  placeholder="Initial version, added a module, updated the quiz…"
                  onChange={e => {
                    setChangeSummary(e.target.value)
                    if (summaryError) setSummaryError(null)
                  }}
                />
              </FormField>
            </SideCard>
          ) : null}

          {canPublish ? (
            <SideCard title="Publish course" icon={<Rocket className="h-4 w-4" />} testId="publish-card">
              <p className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                Publishing makes this version available for assignment. It becomes read-only, and a new draft is needed for future changes.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onPreview}>
                  <Eye className="mr-1 h-4 w-4" />
                  Preview as carer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={() => void openConfirm()}
                  disabled={!check?.canPublish || publishMut.isPending || checkQuery.isFetching}
                >
                  Publish version {version.versionNumber}
                </Button>
              </div>
            </SideCard>
          ) : (
            <SideCard title="Read only" icon={<Info className="h-4 w-4" />}>
              <p className="text-sm text-muted-foreground">This version is not a draft, so it cannot be published again.</p>
            </SideCard>
          )}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Publish version {version.versionNumber}?</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2 text-sm">
            <p>After publishing, this version cannot be changed. To change it later you create a new version.</p>
            {isWithdrawn ? (
              <p>
                This course is withdrawn. Publish and re-activate opens it again, so new assignments get version{' '}
                {version.versionNumber}. Carers already doing an older version keep it. Save version keeps this
                version as a draft and the course stays withdrawn.
              </p>
            ) : version.versionNumber > 1 ? (
              <p>New assignments get version {version.versionNumber}. Carers already doing an older version keep it.</p>
            ) : (
              <p>The course can then be assigned to carers.</p>
            )}
            {check?.warnings.length ? (
              <p className="text-amber-700 dark:text-amber-400">
                {check.warnings.length} warning{check.warnings.length === 1 ? '' : 's'} still open.
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            {isWithdrawn ? (
              <Button type="button" variant="outline" onClick={keepDraft} disabled={publishMut.isPending}>
                Save version
              </Button>
            ) : null}
            <Button type="button" onClick={() => void publish()} disabled={publishMut.isPending}>
              {isWithdrawn ? 'Publish and re-activate' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      }
    />
  )
}
