import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { LearningDashboardPanel } from '@/features/learning/components/LearningDashboardPanel'

export default function LearningDashboardPage() {
  return (
    <LearningSectionLayout
      title="Dashboard"
      description="Who is not up to date, and what needs doing today."
      testId="learning-dashboard-page"
    >
      <LearningDashboardPanel />
    </LearningSectionLayout>
  )
}
