import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { CertificatesPanel } from '@/features/learning/components/CertificatesPanel'

export default function LearningCertificatesPage() {
  return (
    <LearningSectionLayout title="Certificates" description="Issued learning certificates." testId="learning-certificates-page">
      <CertificatesPanel />
    </LearningSectionLayout>
  )
}
