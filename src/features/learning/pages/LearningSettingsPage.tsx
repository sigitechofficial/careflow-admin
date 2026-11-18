import { LearningSectionLayout } from '@/features/learning/components/LearningSectionLayout'
import { LearningSettingsPanel } from '@/features/learning/components/LearningSettingsPanel'
import { CategoriesPanel } from '@/features/learning/components/CategoriesPanel'
import { CompetenciesPanel } from '@/features/learning/components/CompetenciesPanel'

export default function LearningSettingsPage() {
  return (
    <LearningSectionLayout title="Settings" description="Organisation learning configuration." testId="learning-settings-page">
      <div className="space-y-8">
        <LearningSettingsPanel />
        {/* Course categories: a fixed, edit-only list, so it lives with the other learning settings. */}
        <div className="border-t border-border pt-8">
          <CategoriesPanel />
        </div>
        <div className="border-t border-border pt-8">
          <CompetenciesPanel />
        </div>
      </div>
    </LearningSectionLayout>
  )
}
