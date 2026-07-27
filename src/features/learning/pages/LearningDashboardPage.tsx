import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { LearningDashboardPanel } from '@/features/learning/components/LearningDashboardPanel'

export default function LearningDashboardPage() {
  return (
    <LearningSectionLayout
      title="Dashboard"
      description="Complete Learning module flow, organisation KPIs, and activity overview."
      testId="learning-dashboard-page"
    >
      <LearningDashboardPanel />
    </LearningSectionLayout>
  )
}
