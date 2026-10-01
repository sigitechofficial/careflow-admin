import { cn } from '@/shared/lib/utils'

export type HubTabId =
  | 'form'
  | 'waterlow'
  | 'submissions'
  | 'versions'
  | 'review'
  | 'schedule'
  | 'audit'
  | 'compare'

const TABS: { id: HubTabId; label: string }[] = [
  { id: 'form', label: 'Assessment form' },
  { id: 'waterlow', label: 'Waterlow' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'versions', label: 'Versions & history' },
  { id: 'review', label: 'Manager review' },
  { id: 'schedule', label: 'Actions & care plans' },
  { id: 'audit', label: 'Audit trail' },
  { id: 'compare', label: 'Compare' },
]

type Props = {
  active: HubTabId
  submissionCount?: number
  openActionsCount?: number
  carePlanRecommendationCount?: number
  waterlowScore?: number | null
  onChange: (tab: HubTabId) => void
}

export function InitialAssessmentHubTabs({
  active,
  submissionCount,
  openActionsCount,
  carePlanRecommendationCount,
  waterlowScore,
  onChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            active === tab.id
              ? 'bg-background text-teal-800 shadow-sm dark:text-teal-300'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.id === 'submissions' && submissionCount != null && submissionCount > 0 ? (
            <span className="ml-1.5 text-xs opacity-70">({submissionCount})</span>
          ) : null}
          {tab.id === 'waterlow' && waterlowScore != null && waterlowScore > 0 ? (
            <span className="ml-1.5 font-mono text-xs font-semibold opacity-90">{waterlowScore}</span>
          ) : null}
          {tab.id === 'schedule' && openActionsCount != null && openActionsCount > 0 ? (
            <span className="ml-1.5 rounded-full bg-teal-100 px-1.5 text-xs font-semibold text-teal-900 dark:bg-teal-950 dark:text-teal-200">
              {openActionsCount}
            </span>
          ) : null}
          {tab.id === 'schedule' &&
          carePlanRecommendationCount != null &&
          carePlanRecommendationCount > 0 ? (
            <span
              className="ml-1.5 rounded-full bg-sky-100 px-1.5 text-xs font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-200"
              title="Care plan recommendations"
            >
              {carePlanRecommendationCount} CP
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
