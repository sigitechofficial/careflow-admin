import * as React from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Archive as ArchiveIcon, ArchiveRestore, Loader2, MoreVertical, PauseCircle, PlayCircle } from 'lucide-react'
import { CourseBuilderPanel } from '@/features/learning/components/CourseBuilderPanel'
import {
  useArchiveLearningCourse,
  useLearningCourse,
  useReactivateLearningCourse,
  useUnarchiveLearningCourse,
  useWithdrawLearningCourse,
} from '@/features/learning/hooks/useLearning'
import { Button } from '@/shared/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { FormField, Textarea } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'

export default function LearningCourseDetailPage() {
  const { courseId } = useParams({ strict: false }) as { courseId: string }
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('learning.courses.manage'))
  const courseQuery = useLearningCourse(courseId)
  const withdrawMut = useWithdrawLearningCourse()
  const reactivateMut = useReactivateLearningCourse()
  const archiveMut = useArchiveLearningCourse()
  const unarchiveMut = useUnarchiveLearningCourse()
  const [withdrawOpen, setWithdrawOpen] = React.useState(false)
  const [withdrawReason, setWithdrawReason] = React.useState('')
  const [withdrawError, setWithdrawError] = React.useState<string | null>(null)

  const course = courseQuery.data

  const onWithdraw = async () => {
    const reason = withdrawReason.trim()
    if (!reason) {
      setWithdrawError('Write why the course is withdrawn')
      return
    }
    try {
      await withdrawMut.mutateAsync({ id: courseId, reason })
      toastSuccess('Course withdrawn from new assignments')
      setWithdrawOpen(false)
      setWithdrawReason('')
      void courseQuery.refetch()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed'))
    }
  }

  const onReactivate = async () => {
    if (!window.confirm('Re-activate this course? It can be assigned to carers again.')) return
    try {
      await reactivateMut.mutateAsync(courseId)
      toastSuccess('Course re-activated')
      void courseQuery.refetch()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed'))
    }
  }

  const onUnarchive = async () => {
    const backTo = course?.currentVersionId ? 'Published' : 'Draft'
    if (
      !window.confirm(
        backTo === 'Published'
          ? 'Bring this course back? It becomes Published again and can be assigned to carers.'
          : 'Bring this course back? It was never published, so it goes back to Draft.',
      )
    )
      return
    try {
      const row = await unarchiveMut.mutateAsync(courseId)
      toastSuccess(row.status === 'PUBLISHED' ? 'Course is published again' : 'Course is back in Drafts')
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

  const menuItems = canManage
    ? [
        course.status === 'PUBLISHED'
          ? { label: 'Withdraw', icon: PauseCircle, onSelect: () => { setWithdrawError(null); setWithdrawOpen(true) } }
          : null,
        course.status === 'WITHDRAWN' ? { label: 'Re-activate', icon: PlayCircle, onSelect: () => void onReactivate() } : null,
        course.status !== 'ARCHIVED'
          ? { label: 'Archive', icon: ArchiveIcon, onSelect: () => void onArchive() }
          : { label: 'Un-archive', icon: ArchiveRestore, onSelect: () => void onUnarchive() },
      ].filter((x): x is { label: string; icon: typeof ArchiveIcon; onSelect: () => void } => !!x)
    : []

  const menu = menuItems.length ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="outline" aria-label="More course actions" data-testid="course-more-menu">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {menuItems.map(item => (
          <DropdownMenuItem key={item.label} onSelect={item.onSelect}>
            <item.icon className="mr-2 h-4 w-4" aria-hidden />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="learning-course-detail-page">
      <CourseBuilderPanel
        course={course}
        onCourseUpdated={() => void courseQuery.refetch()}
        menu={menu}
        beforeTabs={<PolicyContextPanel className="mb-4" moduleType="TRAINING" recordId={courseId} sectionKey="course-builder" />}
      />

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Withdraw from new assignments</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Carers can no longer be assigned this course. Carers already doing it can finish, and all
              records and certificates are kept. You can re-activate it later.
            </p>
            <FormField label="Reason" required error={withdrawError ?? undefined}>
              <Textarea
                value={withdrawReason}
                onChange={e => {
                  setWithdrawReason(e.target.value)
                  if (withdrawError) setWithdrawError(null)
                }}
                placeholder="Content is being updated for the new fire procedure"
                maxLength={500}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onWithdraw()} disabled={withdrawMut.isPending}>
              Withdraw course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  )
}
