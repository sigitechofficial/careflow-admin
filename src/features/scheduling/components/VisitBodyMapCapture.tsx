import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toastApiError, toastInfo, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
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
import { useBodyMapMutations, useServiceUserBodyMap } from '@/features/service-users/body-map/hooks/useBodyMap'
import type { BodyMapSafeguardingCheckPayload } from '@/features/service-users/body-map/types'
import { recordViewToApiBodyView, prototypeSideToApi } from '@/features/service-users/body-map/utils/body-map-coords'
import type { ScheduleVisitContext } from '@/features/scheduling/utils/schedule-visit-context.util'
import { SafeguardingChecklistDialog } from '@/features/service-users/body-map/components/SafeguardingChecklistDialog'

type Props = {
  visitContext: ScheduleVisitContext
  onRecorded?: (recordId: string) => void
}

export function VisitBodyMapCapture({ visitContext, onRecorded }: Props) {
  const { serviceUserId } = visitContext
  const { data, isLoading } = useServiceUserBodyMap(serviceUserId, false)
  const { create } = useBodyMapMutations(serviceUserId)

  const [markMode, setMarkMode] = React.useState(true)
  const [diagramTab, setDiagramTab] = React.useState<BodyMapDiagramTab>('standard')
  const [pendingMarker, setPendingMarker] = React.useState<PendingMarker | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const [sgOpen, setSgOpen] = React.useState(false)
  const [pendingSubmit, setPendingSubmit] = React.useState<WizardSubmitValues | null>(null)

  const records = data?.records ?? []

  const handlePlaceMarker = (coords: PlaceMarkerPayload) => {
    setMarkMode(true)
    setPendingMarker(coords)
    setAddOpen(true)
    toastInfo(
      coords.summaryLabel
        ? `Record on: ${coords.summaryLabel}`
        : 'Marker placed — complete the form',
    )
  }

  const handleDiagramTabChange = (tab: BodyMapDiagramTab) => {
    setDiagramTab(tab)
    if (!pendingMarker) return
    if (tab !== 'standard' && pendingMarker.canvasView !== tab) {
      setPendingMarker(null)
    }
    if (
      tab === 'standard' &&
      (pendingMarker.canvasView === 'leaning' || pendingMarker.canvasView === 'sitting')
    ) {
      setPendingMarker(null)
    }
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
        recordedDuringVisit: true,
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
          ? new Date(values.firstNoticedAt).toISOString()
          : undefined,
        noticedByType: values.noticedByType,
        nextReviewAt: values.nextReviewAt
          ? new Date(values.nextReviewAt).toISOString()
          : undefined,
        safeguardingTriggered: values.safeguardingTriggered,
        managerReviewRequired: values.safeguardingTriggered || undefined,
        safeguardingCheck,
        woundAssessment: values.woundAssessment,
        pressureAssessment: values.pressureAssessment,
        medicationSite: values.medicationSite,
        observationDetails: details,
        bodyView: recordViewToApiBodyView(pendingMarker.recordView),
        side: values.side ?? prototypeSideToApi(pendingMarker.side),
        specificLocation: values.specificLocation ?? pendingMarker.summaryLabel,
        xCoordinate: pendingMarker.x,
        yCoordinate: pendingMarker.y,
        scheduledJobId: visitContext.scheduledJobId,
        scheduledVisitId: visitContext.scheduledVisitId,
      })
      setAddOpen(false)
      setPendingMarker(null)
      setPendingSubmit(null)
      toastSuccess('Body map saved', 'Observation linked to this visit.')
      onRecorded?.(row.id)
    } catch (error) {
      toastApiError(error, 'Could not save body map record')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading body map…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tap the diagram to place a marker, then complete the observation form. Records are linked to
        this scheduled visit.
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
          {BODY_MAP_DIAGRAM_TABS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={diagramTab === tab.id ? 'default' : 'outline'}
              className="h-7 px-2.5 text-xs"
              onClick={() => handleDiagramTabChange(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        {diagramTab === 'standard' ? (
          <BodyMapCanvas
            embedded
            records={records}
            pendingMarker={pendingMarker}
            selectedRecordId={null}
            markMode={markMode}
            showCleared={false}
            showMeds
            onPlaceMarker={handlePlaceMarker}
            onSelectRecord={() => undefined}
            className="max-h-[min(420px,50vh)] border-0"
          />
        ) : (
          <BodyMapPostureCanvas
            embedded
            posture={diagramTab}
            records={records}
            pendingMarker={pendingMarker}
            selectedRecordId={null}
            markMode={markMode}
            showCleared={false}
            showMeds
            onPlaceMarker={handlePlaceMarker}
            onSelectRecord={() => undefined}
            className="max-h-[min(420px,50vh)] border-0"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={markMode ? 'default' : 'outline'}
          onClick={() => setMarkMode(true)}
        >
          Place marker
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!pendingMarker}
          onClick={() => setAddOpen(true)}
        >
          Add observation
        </Button>
      </div>

      <AddBodyMapRecordWizard
        open={addOpen}
        onOpenChange={setAddOpen}
        serviceUserId={serviceUserId}
        pendingMarker={pendingMarker}
        saving={create.isPending}
        onSubmit={(values) => {
          if (values.safeguardingTriggered) {
            setPendingSubmit(values)
            setSgOpen(true)
            return
          }
          void saveRecord(values)
        }}
      />

      <SafeguardingChecklistDialog
        open={sgOpen}
        onOpenChange={setSgOpen}
        onComplete={(check) => {
          if (!pendingSubmit) return
          void saveRecord(pendingSubmit, check)
          setSgOpen(false)
        }}
      />
    </div>
  )
}
