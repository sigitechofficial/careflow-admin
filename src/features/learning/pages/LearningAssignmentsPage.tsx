import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { AssignmentsPanel } from '@/features/learning/components/AssignmentsPanel'

export default function LearningAssignmentsPage() {
  return (
    <LearningSectionLayout title="Assignments" description="Course assignments and bulk allocation." testId="learning-assignments-page">
      <div className="space-y-8">
        <PolicyContextPanel moduleType="TRAINING" scope="SECTION" sectionKey="assignments" />
        <AssignmentsPanel />
      </div>
    </LearningSectionLayout>
  )
}
