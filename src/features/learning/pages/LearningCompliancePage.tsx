import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { ComplianceMatrixPanel } from '@/features/learning/components/ComplianceMatrixPanel'

export default function LearningCompliancePage() {
  return (
    <LearningSectionLayout title="Compliance" description="Training compliance matrix and exports." testId="learning-compliance-page">
      <ComplianceMatrixPanel />
    </LearningSectionLayout>
  )
}
