import { CalendarClock, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { BulkVisitPlanScheduleCandidate } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import { BulkGenerateRotaCandidatesTable } from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaCandidatesTable'
import { BulkGenerateRotaCandidatesToolbar } from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaCandidatesToolbar'
import type { LocationLookup } from '@/features/settings/location-management/location-management.types'

type Props = {
  selectedCount: number
  search: string
  locationId: string
  locationFilterDisabled?: boolean
  listReadyOnly: boolean
  locations: LocationLookup[]
  visibleCandidates: BulkVisitPlanScheduleCandidate[]
  selectedPlanIds: ReadonlySet<string>
  allReadySelected: boolean
  readyVisibleCount: number
  isLoading: boolean
  hasError: boolean
  isGenerating: boolean
  onSearchChange: (value: string) => void
  onLocationIdChange: (value: string) => void
  onListReadyOnlyChange: (value: boolean) => void
  onTogglePlan: (planId: string, ready: boolean) => void
  onToggleAllReady: () => void
  onGenerate: () => void
}

export function BulkGenerateRotaCandidatesPanel({
  selectedCount,
  search,
  locationId,
  locationFilterDisabled = false,
  listReadyOnly,
  locations,
  visibleCandidates,
  selectedPlanIds,
  allReadySelected,
  readyVisibleCount,
  isLoading,
  hasError,
  isGenerating,
  onSearchChange,
  onLocationIdChange,
  onListReadyOnlyChange,
  onTogglePlan,
  onToggleAllReady,
  onGenerate,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Visit plans</h2>
          <p className="text-xs text-muted-foreground">
            {selectedCount} selected · ready = call pattern configured (carers assigned separately)
            {locationFilterDisabled ? ' · filtered by header location' : null}
          </p>
        </div>
        <BulkGenerateRotaCandidatesToolbar
          search={search}
          locationId={locationId}
          locationFilterDisabled={locationFilterDisabled}
          listReadyOnly={listReadyOnly}
          locations={locations}
          onSearchChange={onSearchChange}
          onLocationIdChange={onLocationIdChange}
          onListReadyOnlyChange={onListReadyOnlyChange}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : hasError ? (
        <p className="p-6 text-sm text-destructive">Could not load visit plan candidates.</p>
      ) : visibleCandidates.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No active visit plans match these filters.
        </p>
      ) : (
        <BulkGenerateRotaCandidatesTable
          rows={visibleCandidates}
          selectedPlanIds={selectedPlanIds}
          allReadySelected={allReadySelected}
          readyVisibleCount={readyVisibleCount}
          onTogglePlan={onTogglePlan}
          onToggleAllReady={onToggleAllReady}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          After generating, open Schedule Jobs to allocate carers and refresh the board.
        </p>
        <Button onClick={onGenerate} disabled={isGenerating || selectedCount === 0}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CalendarClock className="mr-2 h-4 w-4" />
          )}
          Generate rota ({selectedCount})
        </Button>
      </div>
    </div>
  )
}
