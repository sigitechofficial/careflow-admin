import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import { PolicyLibraryPanel } from '@/features/policies/components/PolicyLibraryPanel'

export default function PoliciesLibraryPage() {
  return (
    <PolicySectionLayout
      title="Policy Library"
      description="Create, review, and publish organisation policies."
      testId="policies-library-page"
    >
      <PolicyLibraryPanel />
    </PolicySectionLayout>
  )
}
