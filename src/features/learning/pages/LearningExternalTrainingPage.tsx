import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { ExternalTrainingPanel } from '@/features/learning/components/ExternalTrainingPanel'

export default function LearningExternalTrainingPage() {
  return (
    <LearningSectionLayout title="External training" description="Off-platform training verification." testId="learning-external-training-page">
      <ExternalTrainingPanel />
    </LearningSectionLayout>
  )
}
