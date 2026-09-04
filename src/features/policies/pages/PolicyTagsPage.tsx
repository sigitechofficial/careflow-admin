import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import { PolicyTagsPanel } from '@/features/policies/components/PolicyTagsPanel'

export default function PolicyTagsPage() {
  return (
    <PolicySectionLayout
      title="Tags"
      description="Manage tags that can be attached to policies."
      testId="policy-tags-page"
    >
      <PolicyTagsPanel />
    </PolicySectionLayout>
  )
}
