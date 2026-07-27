import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { CourseFormDialog } from '@/features/learning/components/CourseFormDialog'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'
import type { LearningCourse } from '@/features/learning/types/learning.types'

export default function LearningCourseNewPage() {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(true)

  const onCreated = (course: LearningCourse) => {
    void navigate({ to: LEARNING_PATHS.courseDetail, params: { courseId: course.id } })
  }

  return (
    <LearningSectionLayout
      title="New course"
      description="Create a course shell — then add content in the builder."
      testId="learning-course-new-page"
    >
      <p className="text-sm text-muted-foreground">
        Complete the form to create a draft course with version 1.
      </p>
      <CourseFormDialog
        open={open}
        onOpenChange={v => {
          setOpen(v)
          if (!v) void navigate({ to: LEARNING_PATHS.courses })
        }}
        onCreated={onCreated}
      />
    </LearningSectionLayout>
  )
}
