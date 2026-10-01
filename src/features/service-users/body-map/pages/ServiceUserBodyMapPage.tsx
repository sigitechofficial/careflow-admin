import * as React from 'react'
import { orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import { ChevronDown, Loader2, MapPin, MoreHorizontal, Plus, Printer } from 'lucide-react'
import { toastApiError, toastInfo, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { cn } from '@/shared/lib/utils'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import {
  AddBodyMapRecordWizard,
  type PendingMarker,
  type WizardSubmitValues,
} from '@/features/service-users/body-map/components/AddBodyMapRecordWizard'
import type { PlaceMarkerPayload } from '@/features/service-users/body-map/components/BodyMapCanvas'
import { BodyMapCanvas } from '@/features/service-users/body-map/components/BodyMapCanvas'
import { BodyMapPostureCanvas } from '@/features/service-users/body-map/components/BodyMapPostureCanvas'
import {
  BODY_MAP_DIAGRAM_TABS,
  type BodyMapDiagramTab,
} from '@/features/service-users/body-map/catalog/body-map-views'
import { readMarkerPlacement } from '@/features/service-users/body-map/utils/body-map-coords'
import { BodyMapRecordsTable } from '@/features/service-users/body-map/components/BodyMapRecordsTable'
import { RecordDetailDrawer } from '@/features/service-users/body-map/components/RecordDetailDrawer'
import { CloseBodyMapRecordDialog } from '@/features/service-users/body-map/components/CloseBodyMapRecordDialog'
import { SafeguardingChecklistDialog } from '@/features/service-users/body-map/components/SafeguardingChecklistDialog'
import { BodyMapCqcEvidenceView } from '@/features/service-users/body-map/components/BodyMapCqcEvidenceView'
import { BodyMapAttentionPanel, useBodyMapAttentionData } from '@/features/service-users/body-map/components/BodyMapAttentionPanel'
import { BodyMapSummaryStrip } from '@/features/service-users/body-map/components/BodyMapSummaryStrip'
import {
  canCloseBodyMap,
  canCreateBodyMap,
  canExportBodyMap,
  canReviewBodyMap,
  canUpdateBodyMap,
  isBodyMapInspectionOnly,
} from '@/features/service-users/body-map/body-map-permissions'
import { downloadBodyMapCqcPdf, fetchBodyMapExport } from '@/features/service-users/body-map/api'
import { useAuthStore } from '@/features/auth/store'
import {
  useBodyMapMutations,
  useBodyMapSummary,
  useServiceUserBodyMap,
} from '@/features/service-users/body-map/hooks/useBodyMap'
import { recordViewToApiBodyView, prototypeSideToApi } from '@/features/service-users/body-map/utils/body-map-coords'
import { parseBodyMapVisitSearch } from '@/features/service-users/body-map/utils/body-map-visit-navigation'
import type {
  BodyMapRecordRow,
  BodyMapSafeguardingCheckPayload,
} from '@/features/service-users/body-map/types'

export default function ServiceUserBodyMapPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const printRef = React.useRef<HTMLDivElement>(null)
  const [mainView, setMainView] = React.useState<'map' | 'records' | 'attention'>('map')
  const [diagramTab, setDiagramTab] = React.useState<BodyMapDiagramTab>('standard')
  const { data: profile, isLoading: profileLoading } = useServiceUser(serviceUserId)
  const [showCleared, setShowCleared] = React.useState(false)
  const [showMeds, setShowMeds] = React.useState(true)
  const [medSitesOnly, setMedSitesOnly] = React.useState(false)
  const search = useSearch({ strict: false }) as {
    linkMedicationId?: string
    view?: 'export'
    from?: string
    scheduledJobId?: string
    scheduledVisitId?: string
    returnTo?: string
    recordId?: string
  }
  const focusRecordIdFromUrl = search.recordId
  const visitSearch = parseBodyMapVisitSearch(search)
  const visitContextActive = visitSearch.from === 'schedule-visit' && Boolean(visitSearch.scheduledJobId)
  const showCqcEvidence = search.view === 'export'
  const linkMedicationIdFromUrl = search.linkMedicationId
  const [linkMedicationId, setLinkMedicationId] = React.useState<string | undefined>()
  const effectiveLinkMedicationId = linkMedicationId ?? linkMedicationIdFromUrl
  const [markMode, setMarkMode] = React.useState(true)
  const [selectedRecordId, setSelectedRecordId] = React.useState<string | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const [pendingMarker, setPendingMarker] = React.useState<PendingMarker | null>(null)
  const [sgOpen, setSgOpen] = React.useState(false)
  const [pendingSubmit, setPendingSubmit] = React.useState<WizardSubmitValues | null>(null)
  const [closeTarget, setCloseTarget] = React.useState<BodyMapRecordRow | null>(null)
  const [exporting, setExporting] = React.useState(false)
  const permissions = useAuthStore(s => s.user?.permissions) ?? []
  const canCreate = canCreateBodyMap(permissions)
  const canClose = canCloseBodyMap(permissions)
  const canReview = canReviewBodyMap(permissions)
  const canExport = canExportBodyMap(permissions)
  const inspectionOnly = isBodyMapInspectionOnly(permissions)
  const [pdfLoading, setPdfLoading] = React.useState(false)

  const { data, isLoading, error } = useServiceUserBodyMap(serviceUserId, showCleared)
  const { data: summary } = useBodyMapSummary(serviceUserId)
  const attention = useBodyMapAttentionData(serviceUserId, summary)
  const { create, close, addReview } = useBodyMapMutations(serviceUserId)

  const records = data?.records ?? []
  const tableRecords = medSitesOnly
    ? records.filter(r => r.recordType === 'MEDICATION')
    : records
  const selectedRecord = records.find(r => r.id === selectedRecordId) ?? null

  React.useEffect(() => {
    if (!linkMedicationIdFromUrl) return
    setMarkMode(true)
    toastInfo('Place the medication site on the body map, then link to the MAR chart line')
  }, [linkMedicationIdFromUrl])

  // Open the record passed via ?recordId= (e.g. from an incident's "On body map"
  // badge). Runs once per record id, after records load, so it doesn't override
  // a later manual selection/close.
  const focusedRecordRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!focusRecordIdFromUrl) return
    if (focusedRecordRef.current === focusRecordIdFromUrl) return
    if (records.some(r => r.id === focusRecordIdFromUrl)) {
      focusedRecordRef.current = focusRecordIdFromUrl
      setSelectedRecordId(focusRecordIdFromUrl)
    }
  }, [focusRecordIdFromUrl, records])

  React.useEffect(() => {
    if (mainView === 'attention' && !attention.isLoading && attention.itemCount === 0) {
      setMainView('map')
    }
  }, [attention.isLoading, attention.itemCount, mainView])

  const handlePlaceMarker = (coords: PlaceMarkerPayload) => {
    setMarkMode(true)
    setPendingMarker(coords)
    setAddOpen(true)
    toastInfo(
      coords.summaryLabel
        ? `Record on: ${coords.summaryLabel}`
        : 'Marker placed — complete the form in the wizard',
    )
  }

  const handleAddRecordClick = () => {
    if (!pendingMarker) {
      setMarkMode(true)
      toastInfo('Tap a body region or any point on the diagram first')
      return
    }
    setAddOpen(true)
  }

  const diagramTabForRecord = (record: BodyMapRecordRow): BodyMapDiagramTab => {
    const marker = record.markers[0]
    if (!marker) return 'standard'
    const { canvasView } = readMarkerPlacement(record, marker)
    if (canvasView === 'leaning' || canvasView === 'sitting') return canvasView
    return 'standard'
  }

  const handleSelectRecord = (record: BodyMapRecordRow) => {
    setSelectedRecordId(record.id)
    setDiagramTab(diagramTabForRecord(record))
  }

  const saveRecord = async (
    values: WizardSubmitValues,
    safeguardingCheck?: BodyMapSafeguardingCheckPayload,
  ) => {
    if (!pendingMarker) return
    try {
      const details = {
        ...values.observationDetails,
        recordView: pendingMarker.recordView,
        canvasView: pendingMarker.canvasView,
        regionId: pendingMarker.regionId ?? undefined,
      }
      const row = await create.mutateAsync({
        serviceUserId,
        recordType: values.recordType,
        subType: values.subType,
        bodyPart: values.bodyPart,
        description: values.description || undefined,
        riskLevel: values.riskLevel,
        causeSummary: values.causeSummary || undefined,
        actionSummary: values.actionSummary || undefined,
        firstNoticedAt: values.firstNoticedAt
          ? orgDatetimeLocalToIso(values.firstNoticedAt)
          : undefined,
        noticedByType: values.noticedByType,
        nextReviewAt: values.nextReviewAt
          ? orgDatetimeLocalToIso(values.nextReviewAt)
          : undefined,
        safeguardingTriggered: values.safeguardingTriggered,
        managerReviewRequired: values.safeguardingTriggered || undefined,
        safeguardingCheck: safeguardingCheck,
        woundAssessment: values.woundAssessment,
        pressureAssessment: values.pressureAssessment,
        medicationSite: values.medicationSite,
        observationDetails: details,
        bodyView: recordViewToApiBodyView(pendingMarker.recordView),
        side: values.side ?? prototypeSideToApi(pendingMarker.side),
        specificLocation: values.specificLocation ?? pendingMarker.summaryLabel,
        xCoordinate: pendingMarker.x,
        yCoordinate: pendingMarker.y,
        ...(visitSearch.scheduledJobId
          ? {
              scheduledJobId: visitSearch.scheduledJobId,
              scheduledVisitId: visitSearch.scheduledVisitId,
            }
          : {}),
      })
      setAddOpen(false)
      setPendingMarker(null)
      setPendingSubmit(null)
      setSelectedRecordId(row.id)
      if (row.warnings?.length) {
        toastInfo(row.warnings.join(' '))
      }
      toastSuccess(
        values.safeguardingTriggered
          ? 'Record saved — safeguarding flagged for manager review'
          : 'Body map record saved',
      )
    } catch (e) {
      toastApiError(e, 'Could not save body map record')
    }
  }

  const handleWizardSubmit = (values: WizardSubmitValues) => {
    if (values.safeguardingTriggered) {
      setPendingSubmit(values)
      setSgOpen(true)
      return
    }
    void saveRecord(values)
  }

  const handleCloseRecord = (recordId: string) => {
    const rec = records.find(r => r.id === recordId)
    if (rec) setCloseTarget(rec)
  }

  const handleExportEvidence = async () => {
    setExporting(true)
    try {
      const data = await fetchBodyMapExport(serviceUserId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `body-map-evidence-${serviceUserId.slice(0, 8)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Evidence pack downloaded')
    } catch (e) {
      toastApiError(e, 'Could not export body map evidence')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-destructive">
        Missing service user. Open body map from a service user profile.
      </div>
    )
  }

  if (profileLoading && !profile) {
    return (
      <div className={SERVICE_USER_MODULE_PAGE_CLASS}>
        <ServiceUserModuleHeader serviceUserId={serviceUserId} />
        <ServiceUserModuleTabs serviceUserId={serviceUserId} />
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    const msg = error instanceof Error ? error.message : 'Could not load body map'
    return (
      <div className="space-y-2 p-6 text-sm text-destructive">
        <p>{msg}</p>
        <p className="text-muted-foreground">
          If you see forbidden (403), log out and back in after running{' '}
          <code className="text-xs">npx prisma db seed</code> in careadmin-backend.
        </p>
      </div>
    )
  }

  return (
    <div className={cn(SERVICE_USER_MODULE_PAGE_CLASS, 'print:block')} ref={printRef}>
      <div className="print:hidden">
        <ServiceUserModuleHeader serviceUserId={serviceUserId} detail={profile} />
        <ServiceUserModuleTabs serviceUserId={serviceUserId} />
        {visitContextActive ? (
          <div className="mx-3 mt-2 rounded-lg border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-950 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100 sm:mx-4">
            <p className="font-medium">Recording during a scheduled visit</p>
            <p className="mt-1 text-xs text-teal-900/80 dark:text-teal-200">
              New observations will be linked to this rota visit.
            </p>
            {visitSearch.returnTo ? (
              <Button type="button" variant="outline" size="sm" className="mt-2" asChild>
                <Link to={visitSearch.returnTo}>Back to visit workspace</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-2 px-3 py-3 sm:px-4 sm:py-4">
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center print:hidden">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : showCqcEvidence ? (
          canExport ? (
            <BodyMapCqcEvidenceView serviceUserId={serviceUserId} />
          ) : (
            <p className="text-sm text-muted-foreground">
              You do not have permission to view CQC evidence export.
            </p>
          )
        ) : (
          <>
            {/* Toolbar + KPIs */}
            <div className="flex flex-col gap-2 print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto sm:justify-end">
                {inspectionOnly ? (
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-medium text-sky-900">
                    Inspection mode
                  </span>
                ) : null}
                {!inspectionOnly ? (
                  <>
                    <Button
                      type="button"
                      variant={markMode ? 'default' : 'outline'}
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        setMarkMode(m => !m)
                        if (!markMode) setPendingMarker(null)
                      }}
                    >
                      <MapPin className="mr-1 size-3.5" />
                      {markMode ? 'Marking' : 'Mark'}
                    </Button>
                    {canCreate ? (
                      <Button type="button" size="sm" className="h-8" onClick={handleAddRecordClick}>
                        <Plus className="mr-1 size-3.5" />
                        Add
                      </Button>
                    ) : null}
                  </>
                ) : null}
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={handlePrint}>
                  <Printer className="size-3.5" />
                  <span className="sr-only sm:not-sr-only sm:ml-1">Print</span>
                </Button>
                {canExport ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-8 gap-1">
                        Export
                        <ChevronDown className="size-3.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          to="/service-users/$serviceUserId/body-map"
                          params={{ serviceUserId }}
                          search={showCqcEvidence ? {} : { view: 'export' as const }}
                        >
                          CQC evidence pack
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={exporting} onClick={() => void handleExportEvidence()}>
                        {exporting ? 'Downloading JSON…' : 'Download JSON'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={pdfLoading}
                        onClick={() => {
                          setPdfLoading(true)
                          void downloadBodyMapCqcPdf(serviceUserId)
                            .catch(e => toastApiError(e, 'Could not download PDF'))
                            .finally(() => setPdfLoading(false))
                        }}
                      >
                        {pdfLoading ? 'Downloading PDF…' : 'Download PDF'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="size-8 lg:hidden">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">More links</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/body-map/review-queue">Review queue</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/service-users/$serviceUserId/medication" params={{ serviceUserId }}>
                        MAR / eMAR
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/service-users/$serviceUserId/care-plan" params={{ serviceUserId }}>
                        Care plan
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>
              <BodyMapSummaryStrip summary={summary} />
            </div>

            {/* Map | Records | Attention tabs */}
            <div className="flex items-center gap-1 border-b border-border print:hidden">
              <button
                type="button"
                className={cn(
                  'border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
                  mainView === 'map'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setMainView('map')}
              >
                Map
              </button>
              <button
                type="button"
                className={cn(
                  'border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
                  mainView === 'records'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setMainView('records')}
              >
                Records ({tableRecords.length})
              </button>
              {!attention.isLoading && attention.itemCount > 0 ? (
                <button
                  type="button"
                  className={cn(
                    'border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
                    mainView === 'attention'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                    attention.urgent && mainView !== 'attention' && 'text-amber-800',
                  )}
                  onClick={() => setMainView('attention')}
                >
                  Attention ({attention.itemCount})
                </button>
              ) : null}
            </div>

            {mainView === 'attention' ? (
              <BodyMapAttentionPanel
                variant="tab"
                serviceUserId={serviceUserId}
                summary={summary}
                onSelectRecord={id => {
                  const rec = records.find(r => r.id === id)
                  if (rec) handleSelectRecord(rec)
                  else setSelectedRecordId(id)
                  setMainView('map')
                }}
              />
            ) : null}

            {mainView === 'map' ? (
              <div className="flex min-h-0 flex-1 flex-col lg:min-h-[calc(100dvh-13rem)]">
                <div className="flex flex-wrap items-center gap-1 border-b border-border print:hidden">
                  {BODY_MAP_DIAGRAM_TABS.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      className={cn(
                        'border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
                        diagramTab === tab.id
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => {
                        setDiagramTab(tab.id)
                        if (
                          pendingMarker &&
                          tab.id !== 'standard' &&
                          pendingMarker.canvasView !== tab.id
                        ) {
                          setPendingMarker(null)
                        }
                        if (
                          pendingMarker &&
                          tab.id === 'standard' &&
                          (pendingMarker.canvasView === 'leaning' ||
                            pendingMarker.canvasView === 'sitting')
                        ) {
                          setPendingMarker(null)
                        }
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div
                  className={cn(
                    'grid min-h-0 flex-1 gap-3',
                    selectedRecord && 'lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]',
                  )}
                >
                  {diagramTab === 'standard' ? (
                    <BodyMapCanvas
                      className="h-full min-h-[380px] lg:min-h-0"
                      records={records}
                      pendingMarker={pendingMarker}
                      selectedRecordId={selectedRecordId}
                      markMode={markMode}
                      showCleared={showCleared}
                      showMeds={showMeds}
                      onShowClearedChange={setShowCleared}
                      onShowMedsChange={setShowMeds}
                      onPlaceMarker={handlePlaceMarker}
                      onSelectRecord={id => {
                        setSelectedRecordId(id)
                      }}
                    />
                  ) : (
                    <BodyMapPostureCanvas
                      posture={diagramTab}
                      className="h-full min-h-[380px] lg:min-h-0"
                      records={records}
                      pendingMarker={pendingMarker}
                      selectedRecordId={selectedRecordId}
                      markMode={markMode}
                      showCleared={showCleared}
                      showMeds={showMeds}
                      onShowClearedChange={setShowCleared}
                      onShowMedsChange={setShowMeds}
                      onPlaceMarker={handlePlaceMarker}
                      onSelectRecord={id => {
                        setSelectedRecordId(id)
                      }}
                    />
                  )}
                  {selectedRecord ? (
                    <div className="min-h-[280px] lg:min-h-0 lg:max-h-none">
                      <RecordDetailDrawer
                        record={selectedRecord}
                        serviceUserId={serviceUserId}
                        canClose={canClose}
                        canReview={canReview}
                        canUpdate={canCreateBodyMap(permissions) || canUpdateBodyMap(permissions)}
                        onClose={() => setSelectedRecordId(null)}
                        onCloseRecord={canClose ? handleCloseRecord : undefined}
                        onAddReview={
                          canReview
                            ? (recordId, payload) =>
                                addReview.mutate(
                                  { recordId, ...payload },
                                  {
                                    onSuccess: () => toastSuccess('Review recorded'),
                                    onError: e => toastApiError(e, 'Could not save review'),
                                  },
                                )
                            : undefined
                        }
                        closing={close.isPending}
                        reviewing={addReview.isPending}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : mainView === 'records' ? (
              <div className="min-h-0 flex-1 space-y-2 overflow-auto print:break-before-page">
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <FilterToggle
                    checked={showCleared}
                    onChange={setShowCleared}
                    label="Show resolved"
                  />
                  <FilterToggle
                    checked={medSitesOnly}
                    onChange={setMedSitesOnly}
                    label="Medication sites only"
                  />
                </div>
                <BodyMapRecordsTable
                  records={tableRecords}
                  selectedRecordId={selectedRecordId}
                  onSelect={record => {
                    handleSelectRecord(record)
                    setMainView('map')
                  }}
                />
              </div>
            ) : null}
          </>
        )}

        <AddBodyMapRecordWizard
          open={addOpen}
        onOpenChange={open => {
          setAddOpen(open)
          if (!open) setLinkMedicationId(undefined)
        }}
        serviceUserId={serviceUserId}
        pendingMarker={pendingMarker}
        saving={create.isPending}
        preselectedMedicationId={effectiveLinkMedicationId}
        onSubmit={handleWizardSubmit}
        onPlaceMarker={handlePlaceMarker}
        onRequestPlaceMarker={() => {
          setAddOpen(false)
          setMarkMode(true)
        }}
        />

        <SafeguardingChecklistDialog
        open={sgOpen}
        onOpenChange={setSgOpen}
        onComplete={sg => {
          if (pendingSubmit) void saveRecord(pendingSubmit, sg)
        }}
        />

        <CloseBodyMapRecordDialog
        record={closeTarget}
        open={Boolean(closeTarget)}
        onOpenChange={open => {
          if (!open) setCloseTarget(null)
        }}
        saving={close.isPending}
        onConfirm={async payload => {
          if (!closeTarget) return
          try {
            await close.mutateAsync({ recordId: closeTarget.id, ...payload })
            setCloseTarget(null)
            setSelectedRecordId(null)
            toastSuccess('Record closed')
          } catch (e) {
            toastApiError(e, 'Could not close record')
          }
        }}
        />
      </div>
    </div>
  )
}

function FilterToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-full border px-2.5 py-0.5 font-medium transition-colors',
        checked
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:bg-muted',
      )}
      onClick={() => onChange(!checked)}
    >
      {label}
    </button>
  )
}
