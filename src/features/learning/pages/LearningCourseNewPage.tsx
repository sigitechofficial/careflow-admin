import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { CourseCreateForm } from '@/features/learning/components/CourseCreateForm'

export default function LearningCourseNewPage() {
  return (
    <LearningSectionLayout
      title="New course"
      description="Set up the course basics. Lessons, quizzes and completion rules come next in the builder."
      testId="learning-course-new-page"
    >
      <CourseCreateForm />
    </LearningSectionLayout>
  )
}
