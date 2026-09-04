import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import { PolicyCategoriesPanel } from '@/features/policies/components/PolicyCategoriesPanel'

export default function PolicyCategoriesPage() {
  return (
    <PolicySectionLayout
      title="Categories"
      description="Manage policy categories used across the library."
      testId="policy-categories-page"
    >
      <PolicyCategoriesPanel />
    </PolicySectionLayout>
  )
}
