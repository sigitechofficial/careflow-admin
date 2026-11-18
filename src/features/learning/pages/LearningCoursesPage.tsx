import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { CoursesPanel } from '@/features/learning/components/CoursesPanel'

export default function LearningCoursesPage() {
  return (
    <LearningSectionLayout
      title="Courses"
      description="Manage the course catalogue. Course categories are in Learning settings."
      testId="learning-courses-page"
    >
      <div className="space-y-8">
        <PolicyContextPanel moduleType="TRAINING" scope="SECTION" sectionKey="courses" />
        <CoursesPanel />
      </div>
    </LearningSectionLayout>
  )
}
