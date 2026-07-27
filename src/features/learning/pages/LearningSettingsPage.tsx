import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { LearningSettingsPanel } from '@/features/learning/components/LearningSettingsPanel'

export default function LearningSettingsPage() {
  return (
    <LearningSectionLayout title="Settings" description="Organisation learning configuration." testId="learning-settings-page">
      <LearningSettingsPanel />
    </LearningSectionLayout>
  )
}
