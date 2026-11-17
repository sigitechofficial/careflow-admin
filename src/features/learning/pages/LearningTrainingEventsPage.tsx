import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { TrainingEventsPanel } from '@/features/learning/components/TrainingEventsPanel'

export default function LearningTrainingEventsPage() {
  return (
    <LearningSectionLayout title="Training events" description="Scheduled classroom and blended sessions." testId="learning-training-events-page">
      <div className="space-y-8">
        <PolicyContextPanel moduleType="TRAINING" scope="SECTION" sectionKey="training-events" />
        <TrainingEventsPanel />
      </div>
    </LearningSectionLayout>
  )
}
