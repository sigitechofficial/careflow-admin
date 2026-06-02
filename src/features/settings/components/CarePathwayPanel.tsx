import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  ImageIcon,
  LayoutGrid,
  Users,
} from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import type { CarePathwayTabId } from '@/features/settings/care-pathway/care-pathway.types'
import { CARE_PATHWAY_TAB_IDS } from '@/features/settings/care-pathway/care-pathway.types'
import { CarePathwayWizardPanel } from '@/features/settings/components/care-pathway/CarePathwayWizardPanel'
import { CarePathwaySectionPanel } from '@/features/settings/components/care-pathway/CarePathwaySectionPanel'
import { PathwayChecklistsTab } from '@/features/care-pathway/components/PathwayChecklistsTab'
import { PathwayActionsTab } from '@/features/care-pathway/components/PathwayActionsTab'
import { FormSelectionTab } from '@/features/care-pathway/components/FormSelectionTab'
import { CarePlanTextTab } from '@/features/care-pathway/components/CarePlanTextTab'
import { PictureGalleryTab } from '@/features/care-pathway/components/PictureGalleryTab'
import { FormBuilderTab } from '@/features/care-pathway/components/FormBuilderTab'

const CARE_PATHWAY_TABS: { id: CarePathwayTabId; label: string; Icon: LucideIcon }[] = [
  { id: 'wizard', label: 'Wizard', Icon: LayoutGrid },
  { id: 'form-builder', label: 'Form Builder', Icon: Users },
  { id: 'form-selection', label: 'Form Selection', Icon: Users },
  { id: 'care-plan-text', label: 'Care Plan Text', Icon: Users },
  { id: 'checklists', label: 'Checklists', Icon: BarChart3 },
  { id: 'actions', label: 'Actions', Icon: BookOpen },
  { id: 'gallery', label: 'Gallery', Icon: ImageIcon },
]

function isCarePathwayTabId(value: string): value is CarePathwayTabId {
  return CARE_PATHWAY_TAB_IDS.includes(value as CarePathwayTabId)
}

export function CarePathwayPanel() {
  const navigate = useNavigate()
  const search = useRouterState({ select: s => s.location.search as { tab?: string } })
  const activeTab: CarePathwayTabId =
    search.tab && isCarePathwayTabId(search.tab) ? search.tab : 'wizard'

  const setTab = (tab: CarePathwayTabId) => {
    void navigate({
      to: '/settings/care-pathway',
      search: { tab } as Record<string, string>,
    })
  }

  return (
    <div className="space-y-6" data-testid="care-pathway-panel">
      <nav
        className="flex flex-wrap gap-0 border-b border-border"
        aria-label="Care pathway sections"
        data-testid="care-pathway-tabs"
      >
        {CARE_PATHWAY_TABS.map(tab => {
          const isActive = tab.id === activeTab
          const Icon = tab.Icon
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`care-pathway-tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={cn(
                'flex min-w-[5.5rem] shrink-0 flex-col items-center gap-1 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:min-w-[6.5rem] sm:px-4 sm:text-sm',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5 stroke-[1.5]" aria-hidden />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {activeTab === 'wizard' && <CarePathwayWizardPanel />}
      {activeTab === 'form-builder' && <FormBuilderTab />}
      {activeTab === 'form-selection' && <FormSelectionTab />}
      {activeTab === 'care-plan-text' && <CarePlanTextTab />}
      {activeTab === 'checklists' && <PathwayChecklistsTab />}
      {activeTab === 'actions' && <PathwayActionsTab />}
      {activeTab === 'gallery' && <PictureGalleryTab />}
    </div>
  )
}
