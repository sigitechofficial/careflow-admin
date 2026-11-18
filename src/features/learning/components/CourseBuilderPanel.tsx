import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Award,
  ClipboardCheck,
  Eye,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Lock,
  Rocket,
  Send,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateLearningCourseVersion,
  useLearningCourseVersion,
  useLearningCourseVersions,
} from '@/features/learning/hooks/useLearning'
import type { LearningCourse } from '@/features/learning/types/learning.types'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { useAuthStore } from '@/features/auth/store'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'
import { CourseDetailsTab } from '@/features/learning/components/CourseDetailsTab'
import { CourseOutlineTab } from '@/features/learning/components/CourseOutlineTab'
import { CoursePreviewDialog } from '@/features/learning/components/CoursePreviewDialog'
import { FinalAssessmentTab } from '@/features/learning/components/FinalAssessmentTab'
import { CourseCompletionTab } from '@/features/learning/components/CourseCompletionTab'
import { CourseReviewTab } from '@/features/learning/components/CourseReviewTab'

/** Builder tabs (course outline redesign, 13 Nov 2026). */
const STEPS = [
  { id: 'Details', icon: FileText },
  { id: 'Course outline', icon: Layers },
  { id: 'Final assessment', icon: ClipboardCheck },
  { id: 'Finish and certificate', icon: Award },
  { id: 'Review and publish', icon: Rocket },
] as const
type StepId = (typeof STEPS)[number]['id']

type Props = {
  course: LearningCourse
  onCourseUpdated?: () => void
  /** The ⋮ menu (withdraw / archive …), owned by the page. */
  menu?: React.ReactNode
  /** Shown at the top of the content card (policy links). */
  beforeTabs?: React.ReactNode
}

export function CourseBuilderPanel({ course, onCourseUpdated, menu, beforeTabs }: Props) {
  const canManagePermission = useAuthStore(s => s.can('learning.courses.manage'))
  // Details are filled in when the course is created, so the builder opens on the outline.
  const [step, setStep] = React.useState<StepId>('Course outline')
  const [previewOpen, setPreviewOpen] = React.useState(false)

  const versionsQuery = useLearningCourseVersions(course.id)
  // Only a DRAFT can be edited. Without one, show the live (or latest) version read-only.
  const draftVersion = React.useMemo(() => {
    const list = versionsQuery.data ?? []
    return (
      list.find(v => v.status === 'DRAFT') ??
      list.find(v => v.id === course.currentVersionId) ??
      [...list].sort((a, b) => b.versionNumber - a.versionNumber)[0]
    )
  }, [versionsQuery.data, course.currentVersionId])
  const isDraft = draftVersion?.status === 'DRAFT'
  const canManage = canManagePermission && isDraft
  const nextVersionNumber = Math.max(0, ...(versionsQuery.data ?? []).map(v => v.versionNumber)) + 1
  const createVersionMut = useCreateLearningCourseVersion()

  const versionQuery = useLearningCourseVersion(course.id, draftVersion?.id ?? null, !!draftVersion?.id)
  const version = versionQuery.data

  const refreshVersion = () => {
    void versionsQuery.refetch()
    void versionQuery.refetch()
    onCourseUpdated?.()
  }

  const onCreateVersion = async () => {
    try {
      await createVersionMut.mutateAsync({ id: course.id })
      toastSuccess(`Draft v${nextVersionNumber} created. Edit it, then publish it.`)
      refreshVersion()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Could not create a new version'))
    }
  }

  const header = (
    <header className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5" data-testid="course-header">
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link to={LEARNING_PATHS.dashboard} className="hover:text-foreground">Learning</Link>
        <span>/</span>
        <Link to={LEARNING_PATHS.courses} className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <span className="font-medium text-foreground">{course.title}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <GraduationCap className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{course.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <LearningStatusBadge status={course.status} size="sm" />
            <span className="font-mono text-muted-foreground">{course.code}</span>
            {draftVersion ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium" title={isDraft ? 'Draft being edited' : 'Live version'}>
                v{draftVersion.versionNumber}
                {isDraft && course.status !== 'DRAFT' ? ' draft' : ''}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {version ? (
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-1 h-4 w-4" />
              Preview as carer
            </Button>
          ) : null}
          {canManage ? (
            <Button size="sm" onClick={() => setStep('Review and publish')}>
              <Send className="mr-1 h-4 w-4" />
              Publish
            </Button>
          ) : canManagePermission && !isDraft && course.status !== 'ARCHIVED' && draftVersion ? (
            <Button size="sm" onClick={() => void onCreateVersion()} disabled={createVersionMut.isPending}>
              Create version {nextVersionNumber}
            </Button>
          ) : null}
          {menu}
        </div>
      </div>
    </header>
  )

  if (versionsQuery.isLoading || versionQuery.isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!draftVersion) {
    return (
      <div className="space-y-4">
        {header}
        <p className="text-sm text-muted-foreground">This course has no versions.</p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4" data-testid="course-builder-panel">
      {header}

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        {beforeTabs}
        <Tabs value={step} onValueChange={v => setStep(v as StepId)} className="mb-5 min-w-0">
          <div className="overflow-x-auto">
            <TabsList variant="underline" className="h-auto min-w-max justify-start" aria-label="Course builder steps">
              {STEPS.map(({ id, icon: Icon }) => (
                <TabsTrigger key={id} value={id} variant="underline" data-testid={`builder-step-${id}`} className="gap-1.5">
                  <Icon className="h-4 w-4" aria-hidden />
                  {id}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {!isDraft ? (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <Lock className="h-4 w-4 shrink-0" />
            <p className="flex-1">
              Version {draftVersion.versionNumber} is {draftVersion.status.toLowerCase()} and cannot be changed. Carers keep
              this version. To make changes, create version {nextVersionNumber}.
            </p>
          </div>
        ) : null}

        {step === 'Details' && version ? (
          <CourseDetailsTab course={course} version={version} readOnly={!canManage} onSaved={refreshVersion} />
        ) : null}
        {step === 'Course outline' && version ? (
          <CourseOutlineTab course={course} version={version} readOnly={!canManage} onChanged={() => void versionQuery.refetch()} />
        ) : null}
        {step === 'Final assessment' && version ? (
          <FinalAssessmentTab course={course} version={version} readOnly={!canManage} onChanged={() => void versionQuery.refetch()} />
        ) : null}
        {step === 'Finish and certificate' && version ? (
          <CourseCompletionTab course={course} version={version} readOnly={!canManage} onSaved={refreshVersion} />
        ) : null}
        {step === 'Review and publish' && version ? (
          <CourseReviewTab
            course={course}
            version={version}
            canPublish={canManage}
            onGoTo={target => setStep(target)}
            onPreview={() => setPreviewOpen(true)}
            onPublished={refreshVersion}
          />
        ) : null}
      </div>

      {version ? (
        <CoursePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} course={course} version={version} />
      ) : null}
    </div>
  )
}
