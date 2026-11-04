import { Link } from '@tanstack/react-router'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { BulkGenerateRotaCandidatesPanel } from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaCandidatesPanel'
import { BulkGenerateRotaParametersSection } from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaParametersSection'
import { BulkGenerateRotaResultDialog } from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaResultDialog'
import { BulkGenerateRotaSummaryCards } from '@/features/scheduling/components/bulk-generate-rota/BulkGenerateRotaSummaryCards'
import { useBulkGenerateRotaPage } from '@/features/scheduling/hooks/useBulkGenerateRotaPage'

function BulkGenerateRotaPageContent() {
  const page = useBulkGenerateRotaPage()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-5 md:p-6">
      <PageHeader
        title="Bulk generate rota"
        description={
          page.locationFilterDisabled
            ? 'Create scheduled jobs and visits from active visit plans for the selected header location. Carers are not assigned — allocate staff on Schedule Jobs after generating.'
            : 'Create scheduled jobs and visits from active visit plans. Carers are not assigned — allocate staff on Schedule Jobs after generating.'
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Scheduling', href: '/scheduling/schedule-jobs' },
          { label: 'Bulk generate rota' },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link to="/scheduling/schedule-jobs">Open Schedule Jobs</Link>
        </Button>
      </PageHeader>

      {page.summary ? <BulkGenerateRotaSummaryCards summary={page.summary} /> : null}

      <BulkGenerateRotaParametersSection
        generateFrom={page.generateFrom}
        generateTo={page.generateTo}
        generateToPlaceholder={page.generateToPlaceholder}
        defaultRotaHorizonDays={page.defaultRotaHorizonDays}
        defaultRotaHorizonMode={page.defaultRotaHorizonMode}
        defaultRotaToDateLabel={page.defaultRotaToDateLabel}
        showDefaultRotaRange={page.showDefaultRotaRange}
        timezoneHint={page.timezoneHint}
        isFromToday={page.isFromToday}
        backfillDays={page.backfillDays}
        scheduleAreaId={page.scheduleAreaId}
        generateReadyOnly={page.generateReadyOnly}
        scheduleAreas={page.scheduleAreas}
        onGenerateFromChange={page.setGenerateFrom}
        onGenerateToChange={page.setGenerateTo}
        onUseToday={page.setGenerateFromToToday}
        onBackfillDaysChange={page.setBackfillDays}
        onScheduleAreaIdChange={page.setScheduleAreaId}
        onGenerateReadyOnlyChange={page.setGenerateReadyOnly}
      />

      <BulkGenerateRotaCandidatesPanel
        selectedCount={page.selectedPlanIds.size}
        search={page.search}
        locationId={page.locationId}
        locationFilterDisabled={page.locationFilterDisabled}
        listReadyOnly={page.listReadyOnly}
        locations={page.locationsQuery.data?.locations ?? []}
        visibleCandidates={page.visibleCandidates}
        selectedPlanIds={page.selectedPlanIds}
        allReadySelected={page.allReadySelected}
        readyVisibleCount={page.readyVisible.length}
        isLoading={page.candidatesQuery.isLoading}
        hasError={!!page.candidatesQuery.error}
        isGenerating={page.generateMutation.isPending}
        onSearchChange={page.setSearch}
        onLocationIdChange={page.setLocationId}
        onListReadyOnlyChange={page.setListReadyOnly}
        onTogglePlan={page.togglePlan}
        onToggleAllReady={page.toggleAllReady}
        onGenerate={page.handleGenerate}
      />

      <BulkGenerateRotaResultDialog
        open={page.resultDialogOpen}
        onOpenChange={page.setResultDialogOpen}
        result={page.lastResult}
      />
    </div>
  )
}

export default function BulkGenerateRotaPage() {
  const hasApi = !!getApiBaseUrl()

  if (!hasApi) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL.</p>
    )
  }

  return (
    <ErrorBoundary
      title="Bulk generate rota failed to load"
      description="Try again. If the problem persists, refresh the page or contact support."
      onReset={() => window.location.reload()}
    >
      <BulkGenerateRotaPageContent />
    </ErrorBoundary>
  )
}
