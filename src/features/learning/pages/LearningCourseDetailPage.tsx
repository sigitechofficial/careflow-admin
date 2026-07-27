import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Pencil } from 'lucide-react'
import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { CourseBuilderPanel } from '@/features/learning/components/CourseBuilderPanel'
import { CourseFormDialog } from '@/features/learning/components/CourseFormDialog'
import {
  useArchiveLearningCourse,
  useCreateLearningCourseVersion,
  useLearningCourse,
  useUnpublishLearningCourse,
} from '@/features/learning/hooks/useLearning'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { Button } from '@/shared/ui/button'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'

export default function LearningCourseDetailPage() {
  const { courseId } = useParams({ strict: false }) as { courseId: string }
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('learning.courses.manage'))
  const courseQuery = useLearningCourse(courseId)
  const createVersionMut = useCreateLearningCourseVersion()
  const unpublishMut = useUnpublishLearningCourse()
  const archiveMut = useArchiveLearningCourse()
  const [editOpen, setEditOpen] = React.useState(false)

  const course = courseQuery.data

  const onNewVersion = async () => {
    try {
      await createVersionMut.mutateAsync({ id: courseId })
      toastSuccess('Draft version created')
      void courseQuery.refetch()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed'))
    }
  }

  const onUnpublish = async () => {
    if (
      !window.confirm(
        'Unpublish this course to Draft? It will no longer be available for new assignments until republished. Existing assignments and certificates are kept.',
      )
    ) {
      return
    }
    try {
      await unpublishMut.mutateAsync(courseId)
      toastSuccess('Course unpublished to Draft')
      void courseQuery.refetch()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed'))
    }
  }

  const onArchive = async () => {
    if (!window.confirm('Archive this course?')) return
    try {
      await archiveMut.mutateAsync(courseId)
      toastSuccess('Course archived')
      void navigate({ to: LEARNING_PATHS.courses })
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed'))
    }
  }

  if (courseQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!course) {
    return <p className="p-6 text-sm text-muted-foreground">Course not found.</p>
  }

  return (
    <LearningSectionLayout
      title={course.title}
      description={course.shortDescription ?? 'Course builder and version management.'}
      testId="learning-course-detail-page"
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" asChild>
          <Link to={LEARNING_PATHS.courses}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to courses
          </Link>
        </Button>
        <LearningStatusBadge status={course.status} />
        <span className="font-mono text-xs text-muted-foreground">{course.code}</span>
        {canManage ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit details
            </Button>
            <Button size="sm" variant="outline" onClick={() => void onNewVersion()}>
              New version
            </Button>
            {course.status === 'PUBLISHED' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void onUnpublish()}
                disabled={unpublishMut.isPending}
              >
                Unpublish to Draft
              </Button>
            ) : null}
            {course.status !== 'ARCHIVED' ? (
              <Button size="sm" variant="outline" onClick={() => void onArchive()}>
                Archive
              </Button>
            ) : null}
          </>
        ) : null}
      </div>

      <CourseBuilderPanel course={course} onCourseUpdated={() => void courseQuery.refetch()} />

      <CourseFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        course={course}
        onCreated={() => void courseQuery.refetch()}
      />
    </LearningSectionLayout>
  )
}
