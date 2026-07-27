import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { CoursesPanel } from '@/features/learning/components/CoursesPanel'
import { CategoriesPanel } from '@/features/learning/components/CategoriesPanel'

export default function LearningCoursesPage() {
  return (
    <LearningSectionLayout
      title="Courses"
      description="Manage course catalogue and categories."
      testId="learning-courses-page"
    >
      <div className="space-y-8">
        <CoursesPanel />
        <CategoriesPanel />
      </div>
    </LearningSectionLayout>
  )
}
