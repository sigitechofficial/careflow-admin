import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { LearningReportsPanel } from '@/features/learning/components/LearningReportsPanel'

export default function LearningReportsPage() {
  return (
    <LearningSectionLayout title="Reports" description="Learning assignment and compliance reports." testId="learning-reports-page">
      <LearningReportsPanel />
    </LearningSectionLayout>
  )
}
