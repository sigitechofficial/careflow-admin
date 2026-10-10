import * as React from 'react'
import { orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toastApiError, toastInfo, toastSuccess } from '@/shared/lib/toast'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { Button } from '@/shared/ui/button'
import { fetchVisitObservations } from '@/features/scheduling/api/scheduling.api'
import { flattenVisitObservationBodyMapPins } from '@/features/scheduling/utils/visit-observation-body-map-pins.util'
import { VisitPhotoThumbnails } from '@/features/scheduling/components/VisitPhotoThumbnails'
import { BodyMapVideoList } from '@/features/service-users/body-map/components/BodyMapVideoList'
import { VoiceNoteList } from '@/features/scheduling/components/VoiceNoteList'
import { useVisitVoiceNotes } from '@/features/scheduling/hooks/useVisitVoiceNotes'
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
import { recordTypeLabel } from '@/features/service-users/body-map/catalog/record-types'
import type { BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'
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
  const { serviceUserId, scheduledJobId } = visitContext
  const { data, isLoading } = useServiceUserBodyMap(serviceUserId, false, {
    refetchOnMount: 'always',
    staleTime: 0,
  })
  const { create } = useBodyMapMutations(serviceUserId)
  const voiceNoteLookup = useVisitVoiceNotes(scheduledJobId)

  const obsQuery = useQuery({
    queryKey: ['visit-observations', scheduledJobId],
    queryFn: ({ signal }) => fetchVisitObservations(scheduledJobId, { signal }),
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const records = data?.records ?? []
  const visitRecords = React.useMemo(
    () => records.filter((r) => r.scheduledJobId === scheduledJobId),
    [records, scheduledJobId],
  )
  const chartMaxNumber = React.useMemo(
    () => records.reduce((max, r) => Math.max(max, r.canvasDisplayNumber ?? 0), 0),
    [records],
  )
  const [showFullClientChart, setShowFullClientChart] = React.useState(false)
  const canvasRecords = showFullClientChart ? records : visitRecords

  const observationOverlayPins = React.useMemo(
    () => flattenVisitObservationBodyMapPins(obsQuery.data?.recordedThisVisit ?? [], chartMaxNumber),
    [obsQuery.data?.recordedThisVisit, chartMaxNumber],
  )

  const [markMode, setMarkMode] = React.useState(true)
  const [diagramTab, setDiagramTab] = React.useState<BodyMapDiagramTab>('standard')
  const [pendingMarker, setPendingMarker] = React.useState<PendingMarker | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const [sgOpen, setSgOpen] = React.useState(false)
  const [pendingSubmit, setPendingSubmit] = React.useState<WizardSubmitValues | null>(null)

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
          ? orgDatetimeLocalToIso(values.firstNoticedAt)
          : undefined,
        noticedByType: values.noticedByType,
        nextReviewAt: values.nextReviewAt
          ? orgDatetimeLocalToIso(values.nextReviewAt)
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
        Tap the diagram to place a marker, then complete the observation form. By default only markers
        from this visit are shown.
        {visitRecords.length > 0 ? (
          <span className="ml-1 font-medium text-foreground">
            {visitRecords.length} chart record{visitRecords.length === 1 ? '' : 's'} on this visit
          </span>
        ) : (
          <span className="ml-1">No chart records on this visit yet.</span>
        )}
        {observationOverlayPins.length > 0 ? (
          <span className="ml-1 font-medium text-sky-700">
            {observationOverlayPins.length} observation pin
            {observationOverlayPins.length === 1 ? '' : 's'} (blue)
          </span>
        ) : null}
        {records.length > visitRecords.length ? (
          <span className="ml-1">
            ({records.length - visitRecords.length} older active marker
            {records.length - visitRecords.length === 1 ? '' : 's'} on client chart — toggle below
            to show.)
          </span>
        ) : null}
        .
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
            records={canvasRecords}
            overlayMarkers={observationOverlayPins}
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
            records={canvasRecords}
            overlayMarkers={observationOverlayPins}
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
        {records.length > visitRecords.length ? (
          <Button
            type="button"
            size="sm"
            variant={showFullClientChart ? 'default' : 'outline'}
            onClick={() => setShowFullClientChart((v) => !v)}
          >
            {showFullClientChart ? 'This visit only' : 'Show full client chart'}
          </Button>
        ) : null}
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

      {visitRecords.length > 0 ? (
        <ul className="space-y-2">
          {visitRecords.map((record) => {
            const marker = record.markers[0]
            return (
              <li
                key={record.id}
                className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {recordTypeLabel(record.recordType as BodyMapRecordTypeCode)}
                    {marker?.bodyPart ? ` — ${marker.bodyPart}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatOrganisationDateTime(record.createdAt)}
                  </p>
                </div>
                {record.description ? (
                  <p className="mt-0.5 text-sm text-foreground">{record.description}</p>
                ) : null}
                <VoiceNoteList
                  voiceNotes={[
                    ...voiceNoteLookup.forSource('body_map', record.id),
                    ...voiceNoteLookup.byEntryPrefix('body_map_review', `${record.id}:`),
                  ]}
                  label="Carer voice notes"
                />
                <VisitPhotoThumbnails photos={record.photos} />
                <BodyMapVideoList videos={record.videos} />
              </li>
            )
          })}
        </ul>
      ) : null}

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
