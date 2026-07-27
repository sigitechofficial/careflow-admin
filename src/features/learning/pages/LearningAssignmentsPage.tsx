import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { AssignmentsPanel } from '@/features/learning/components/AssignmentsPanel'

export default function LearningAssignmentsPage() {
  return (
    <LearningSectionLayout title="Assignments" description="Course assignments and bulk allocation." testId="learning-assignments-page">
      <AssignmentsPanel />
    </LearningSectionLayout>
  )
}
