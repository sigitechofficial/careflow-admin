import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { TrainingEventsPanel } from '@/features/learning/components/TrainingEventsPanel'

export default function LearningTrainingEventsPage() {
  return (
    <LearningSectionLayout title="Training events" description="Scheduled classroom and blended sessions." testId="learning-training-events-page">
      <TrainingEventsPanel />
    </LearningSectionLayout>
  )
}
