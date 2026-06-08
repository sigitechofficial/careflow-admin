import * as React from 'react'
import {
  BODY_MAP_RECORD_TYPES,
  recordTypesFromLookups,
  type BodyMapRecordTypeCode,
} from '@/features/service-users/body-map/catalog/record-types'
import { useBodyMapLookups } from '@/features/service-users/body-map/hooks/useBodyMapLookups'
import { VIEW_LABELS } from '@/features/service-users/body-map/catalog/body-map-views'
import {
  BodyPartCombobox,
  isClinicalBodyPart,
} from '@/features/service-users/body-map/components/BodyPartCombobox'
import type { PrototypeMarkerCoords } from '@/features/service-users/body-map/utils/body-map-coords'
import { prototypeSideToApi } from '@/features/service-users/body-map/utils/body-map-coords'
import type {
  BodyMapMedicationSitePayload,
  BodyMapPressureAssessmentPayload,
  BodyMapRiskLevel,
  BodyMapSide,
  BodyMapWoundAssessmentPayload,
} from '@/features/service-users/body-map/types'
import {
  buildMedicationSitePayload,
  emptyMedicationSiteWizardState,
  medicationSiteWizardValid,
  MedicationSiteWizardFields,
  type MedicationSiteWizardState,
} from '@/features/service-users/body-map/components/MedicationSiteWizardFields'
import { useBodyMapSiteMedications } from '@/features/service-users/body-map/hooks/useBodyMapSiteMedications'
import { usePatchRotationWarning } from '@/features/service-users/body-map/hooks/usePatchRotationWarning'
import { recordViewToApiBodyView } from '@/features/service-users/body-map/utils/body-map-coords'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import type { PlaceMarkerPayload } from '@/features/service-users/body-map/components/BodyMapCanvas'
import { BodyMapMarkerPreview } from '@/features/service-users/body-map/components/BodyMapMarkerPreview'

export type PendingMarker = PrototypeMarkerCoords

export type WizardSubmitValues = {
  recordType: BodyMapRecordTypeCode
  subType: string
  bodyPart: string
  side?: BodyMapSide
  specificLocation?: string
  description: string
  riskLevel: BodyMapRiskLevel
  causeSummary: string
  actionSummary: string
  nextReviewAt: string
  firstNoticedAt: string
  noticedByType?: string
  observationDetails: Record<string, unknown>
  safeguardingTriggered: boolean
  woundAssessment?: BodyMapWoundAssessmentPayload
  pressureAssessment?: BodyMapPressureAssessmentPayload
  medicationSite?: BodyMapMedicationSitePayload
}

const BASE_STEPS = ['Type', 'Location', 'Observation', 'Cause', 'Action'] as const
const MEDICATION_STEPS = ['Type', 'Location', 'MAR link', 'Observation', 'Cause', 'Action'] as const

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  pendingMarker: PendingMarker | null
  saving: boolean
  onSubmit: (values: WizardSubmitValues) => void
  onRequestPlaceMarker?: () => void
  /** Update marker from wizard preview / leaning-sitting canvas. */
  onPlaceMarker?: (coords: PlaceMarkerPayload) => void
  preselectedMedicationId?: string
}

function needsSafeguarding(
  recordType: BodyMapRecordTypeCode,
  subType: string,
  causeKnown: string,
  consistent: string,
): boolean {
  if (recordType !== 'INJURY' && recordType !== 'SAFEGUARDING') return false
  const sub = subType.toLowerCase()
  return (
    sub.includes('unexplained') || causeKnown === 'no' || consistent === 'no'
  )
}

export function AddBodyMapRecordWizard({
  open,
  onOpenChange,
  serviceUserId,
  pendingMarker,
  saving,
  onSubmit,
  onRequestPlaceMarker,
  onPlaceMarker,
  preselectedMedicationId,
}: Props) {
  const [step, setStep] = React.useState(0)
  const [medSiteState, setMedSiteState] = React.useState<MedicationSiteWizardState>(
    emptyMedicationSiteWizardState,
  )
  const { eligibleMedications } = useBodyMapSiteMedications(serviceUserId, open)
  const bodyMapLookupsQuery = useBodyMapLookups(open)
  const recordTypesList = React.useMemo(
    () => recordTypesFromLookups(bodyMapLookupsQuery.data),
    [bodyMapLookupsQuery.data],
  )
  const [purpose, setPurpose] = React.useState('New observation')
  const [recordType, setRecordType] = React.useState<BodyMapRecordTypeCode>('INJURY')
  const [subType, setSubType] = React.useState('')
  const [firstNoticedAt, setFirstNoticedAt] = React.useState('')
  const [noticedDuring, setNoticedDuring] = React.useState('Visit')
  const [bodyPart, setBodyPart] = React.useState('')
  const [side, setSide] = React.useState('Centre')
  const [locNote, setLocNote] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [painLevel, setPainLevel] = React.useState('0')
  const [skinIntact, setSkinIntact] = React.useState('Intact')
  const [riskLevel, setRiskLevel] = React.useState<BodyMapRiskLevel>('MEDIUM')
  const [causeKnown, setCauseKnown] = React.useState('yes')
  const [consistent, setConsistent] = React.useState('yes')
  const [causeText, setCauseText] = React.useState('')
  const [actionSummary, setActionSummary] = React.useState('')
  const [managerInformed, setManagerInformed] = React.useState('Yes')
  const [nextReviewAt, setNextReviewAt] = React.useState('')
  const [reviewRequired, setReviewRequired] = React.useState('yes')
  const [woundType, setWoundType] = React.useState('Skin tear')
  const [exudate, setExudate] = React.useState('None')
  const [dressing, setDressing] = React.useState('')
  const [riskTool, setRiskTool] = React.useState('Waterlow')
  const [blanching, setBlanching] = React.useState('Not assessed')
  const [repositioningRecorded, setRepositioningRecorded] = React.useState('Yes')

  const typeDef = recordTypesList.find(t => t.value === recordType)
  const sgWarn = needsSafeguarding(recordType, subType, causeKnown, consistent)
  const isMedication = recordType === 'MEDICATION'
  const steps = isMedication ? MEDICATION_STEPS : BASE_STEPS
  const stepKey = steps[step] ?? steps[0]

  const patchRotationQuery = usePatchRotationWarning(serviceUserId, {
    enabled: open && isMedication,
    subType,
    bodyView: pendingMarker ? recordViewToApiBodyView(pendingMarker.recordView) : undefined,
    x: pendingMarker?.x,
    y: pendingMarker?.y,
  })

  React.useEffect(() => {
    if (!open) return
    setStep(0)
    setMedSiteState(emptyMedicationSiteWizardState())
    setSubType(typeDef?.subTypes[0] ?? '')
    if (!firstNoticedAt) {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      setFirstNoticedAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      )
    }
  }, [open, recordType, typeDef?.subTypes, firstNoticedAt])

  React.useEffect(() => {
    if (purpose === 'Medication site' && recordType !== 'MEDICATION') {
      setRecordType('MEDICATION')
    }
  }, [purpose, recordType])

  React.useEffect(() => {
    if (open && preselectedMedicationId) {
      setRecordType('MEDICATION')
      setPurpose('Medication site')
    }
  }, [open, preselectedMedicationId])

  const markerPlacementKey = pendingMarker
    ? [
        pendingMarker.canvasView,
        pendingMarker.recordView,
        pendingMarker.x.toFixed(2),
        pendingMarker.y.toFixed(2),
        pendingMarker.regionId ?? '',
      ].join('|')
    : ''

  const lastSyncedPlacementKey = React.useRef('')

  React.useEffect(() => {
    if (!pendingMarker) {
      lastSyncedPlacementKey.current = ''
      return
    }
    if (markerPlacementKey === lastSyncedPlacementKey.current) return
    lastSyncedPlacementKey.current = markerPlacementKey

    const fromMarker = pendingMarker.bodyPart?.trim() ?? ''
    setBodyPart(isClinicalBodyPart(fromMarker) ? fromMarker : '')
    if (pendingMarker.side) setSide(pendingMarker.side)
    if (pendingMarker.summaryLabel) setLocNote(pendingMarker.summaryLabel)
    else {
      const vl = VIEW_LABELS[pendingMarker.recordView] ?? pendingMarker.recordView
      setLocNote(
        `${pendingMarker.side} ${pendingMarker.bodyPart} at ${pendingMarker.x.toFixed(1)}%, ${pendingMarker.y.toFixed(1)}% on ${vl}`,
      )
    }
  }, [markerPlacementKey, pendingMarker])

  const postureInteractivePreview =
    Boolean(onPlaceMarker) &&
    stepKey === 'Location' &&
    (pendingMarker?.canvasView === 'leaning' || pendingMarker?.canvasView === 'sitting')

  const canNext = () => {
    if (stepKey === 'Type') return Boolean(subType)
    if (stepKey === 'Location') return Boolean(pendingMarker && isClinicalBodyPart(bodyPart))
    if (stepKey === 'MAR link') return medicationSiteWizardValid(subType, medSiteState)
    if (stepKey === 'Observation') return Boolean(description.trim())
    if (stepKey === 'Cause') return true
    return Boolean(actionSummary.trim())
  }

  const measurementFromDescription = () => {
    const m = description.match(/\d+\s*cm/i)
    return m ? m[0] : undefined
  }

  const handleFinish = () => {
    if (!pendingMarker || !isClinicalBodyPart(bodyPart)) return
    if (isMedication && !medicationSiteWizardValid(subType, medSiteState)) return
    const selectedMed = eligibleMedications.find(m => m.id === medSiteState.serviceUserMedicationId)
    onSubmit({
      recordType,
      subType,
      bodyPart: bodyPart.trim(),
      side: prototypeSideToApi(side),
      specificLocation: locNote.trim() || pendingMarker?.summaryLabel,
      description,
      riskLevel,
      causeSummary: causeText.trim() || (causeKnown === 'no' ? 'Cause unknown' : ''),
      actionSummary,
      nextReviewAt: reviewRequired === 'yes' ? nextReviewAt : '',
      firstNoticedAt,
      noticedByType: noticedDuring,
      observationDetails: {
        purpose,
        noticedDuring,
        painLevel: Number(painLevel),
        skinIntact,
        causeKnown,
        consistentWithInjury: consistent,
        managerInformed,
        reviewRequired: reviewRequired === 'yes',
      },
      safeguardingTriggered: sgWarn,
      woundAssessment:
        recordType === 'WOUND'
          ? {
              woundType,
              exudate,
              dressing: dressing.trim() || undefined,
              measurements: measurementFromDescription(),
            }
          : undefined,
      pressureAssessment:
        recordType === 'PRESSURE'
          ? {
              riskTool,
              blanching,
              skinIntact,
              repositioningRecorded,
              nonBlanching: blanching.toLowerCase().includes('non') ? 'Yes' : 'No',
            }
          : undefined,
      medicationSite: isMedication
        ? buildMedicationSitePayload(medSiteState, selectedMed)
        : undefined,
    })
  }

  const wizardForm = (
    <>
        <div className="flex flex-wrap gap-1 border-b border-border px-5 py-2">
          {steps.map((label, i) => (
            <span
              key={label}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium',
                i === step
                  ? 'bg-indigo-100 text-indigo-900'
                  : i < step
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60',
              )}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <DialogBody className="max-h-[min(60vh,520px)] overflow-y-auto">
          {stepKey === 'Type' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">
                Record purpose
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                >
                  <option>New observation</option>
                  <option>Review existing concern</option>
                  <option>Medication site</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Record type
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={recordType}
                  onChange={e => {
                    const next = e.target.value as BodyMapRecordTypeCode
                    setRecordType(next)
                    if (next === 'MEDICATION') setPurpose('Medication site')
                  }}
                >
                  {recordTypesList.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Sub-type
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={subType}
                  onChange={e => setSubType(e.target.value)}
                >
                  {(typeDef?.subTypes ?? []).map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Date & time noticed
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={firstNoticedAt}
                  onChange={e => setFirstNoticedAt(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Noticed during
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={noticedDuring}
                  onChange={e => setNoticedDuring(e.target.value)}
                >
                  <option>Visit</option>
                  <option>Personal care</option>
                  <option>Medication round</option>
                  <option>Incident</option>
                  <option>Review</option>
                </select>
              </label>
            </div>
          ) : null}

          {stepKey === 'Location' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tap a body region on the map or click any spot for a precise marker. Required before
                continuing.
              </p>
              {!pendingMarker && onRequestPlaceMarker ? (
                <Button type="button" variant="outline" size="sm" onClick={onRequestPlaceMarker}>
                  Open map to place marker
                </Button>
              ) : null}
              {pendingMarker ? (
                <p className="rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
                  {pendingMarker.summaryLabel ?? `${pendingMarker.side} ${pendingMarker.bodyPart}`} ·{' '}
                  {VIEW_LABELS[pendingMarker.recordView] ?? pendingMarker.recordView} (
                  {pendingMarker.x.toFixed(1)}%, {pendingMarker.y.toFixed(1)}%)
                </p>
              ) : null}
              <label className="block text-sm font-medium">
                Body part
                <div className="mt-1">
                  <BodyPartCombobox
                    value={bodyPart}
                    onChange={setBodyPart}
                    canvasView={pendingMarker?.canvasView}
                  />
                </div>
              </label>
              <label className="block text-sm font-medium">
                Side
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={side}
                  onChange={e => setSide(e.target.value)}
                >
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                  <option value="Centre">Centre</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Exact location note
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={locNote}
                  onChange={e => setLocNote(e.target.value)}
                  placeholder="Auto-filled when you tap a region"
                />
              </label>
            </div>
          ) : null}

          {stepKey === 'MAR link' ? (
            <MedicationSiteWizardFields
              serviceUserId={serviceUserId}
              subType={subType}
              onSubTypeChange={setSubType}
              state={medSiteState}
              onStateChange={patch => setMedSiteState(s => ({ ...s, ...patch }))}
              preselectedMedicationId={preselectedMedicationId}
              patchRotationWarnings={patchRotationQuery.data?.warnings ?? []}
            />
          ) : null}

          {stepKey === 'Observation' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">
                Description
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Pain (0–10)
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  max={10}
                  value={painLevel}
                  onChange={e => setPainLevel(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Skin intact
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={skinIntact}
                  onChange={e => setSkinIntact(e.target.value)}
                >
                  <option>Intact</option>
                  <option>Broken</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Risk level
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={riskLevel}
                  onChange={e => setRiskLevel(e.target.value as BodyMapRiskLevel)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>
              {recordType === 'WOUND' ? (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 sm:col-span-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Wound assessment (CQC skin integrity)
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Wound type
                      <select
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={woundType}
                        onChange={e => setWoundType(e.target.value)}
                      >
                        <option>Skin tear</option>
                        <option>Open wound</option>
                        <option>Surgical wound</option>
                        <option>Pressure related</option>
                        <option>Moisture lesion</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium">
                      Exudate
                      <select
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={exudate}
                        onChange={e => setExudate(e.target.value)}
                      >
                        <option>None</option>
                        <option>Low</option>
                        <option>Moderate</option>
                        <option>High</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium sm:col-span-2">
                      Current dressing
                      <Input
                        className="mt-1"
                        value={dressing}
                        onChange={e => setDressing(e.target.value)}
                        placeholder="Dressing type"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
              {recordType === 'PRESSURE' ? (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 sm:col-span-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pressure area (NICE-aligned)
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Risk tool
                      <select
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={riskTool}
                        onChange={e => setRiskTool(e.target.value)}
                      >
                        <option>Waterlow</option>
                        <option>Braden</option>
                        <option>Local tool</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium">
                      Blanching
                      <select
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={blanching}
                        onChange={e => setBlanching(e.target.value)}
                      >
                        <option>Blanching</option>
                        <option>Non-blanching</option>
                        <option>Not assessed</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium">
                      Repositioning recorded
                      <select
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={repositioningRecorded}
                        onChange={e => setRepositioningRecorded(e.target.value)}
                      >
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </label>
                  </div>
                  {blanching.toLowerCase().includes('non') ? (
                    <p className="text-xs text-amber-800">
                      Non-blanching redness will flag this record for manager review.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {stepKey === 'Cause' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Is cause known?
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={causeKnown}
                  onChange={e => setCauseKnown(e.target.value)}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Consistent with injury?
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={consistent}
                  onChange={e => setConsistent(e.target.value)}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                What caused it?
                <Input
                  className="mt-1"
                  value={causeText}
                  onChange={e => setCauseText(e.target.value)}
                  placeholder="If known"
                />
              </label>
              {sgWarn ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Safeguarding checklist will be required — unexplained or inconsistent pattern
                  detected.
                </p>
              ) : null}
            </div>
          ) : null}

          {stepKey === 'Action' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Manager informed
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={managerInformed}
                  onChange={e => setManagerInformed(e.target.value)}
                >
                  <option>Yes</option>
                  <option>No</option>
                  <option>N/A</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Next review required
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reviewRequired}
                  onChange={e => setReviewRequired(e.target.value)}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              {reviewRequired === 'yes' ? (
                <label className="block text-sm font-medium sm:col-span-2">
                  Next review date
                  <Input
                    className="mt-1"
                    type="datetime-local"
                    value={nextReviewAt}
                    onChange={e => setNextReviewAt(e.target.value)}
                  />
                </label>
              ) : null}
              <label className="block text-sm font-medium sm:col-span-2">
                Immediate action taken
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={actionSummary}
                  onChange={e => setActionSummary(e.target.value)}
                  required
                />
              </label>
            </div>
          ) : null}
        </DialogBody>
    </>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={pendingMarker ? 'full' : 'lg'}
        className={cn(pendingMarker && 'max-h-[min(92vh,900px)] grid-rows-[auto_1fr_auto]')}
      >
        <DialogHeader>
          <DialogTitle>Add body map record</DialogTitle>
        </DialogHeader>

        {pendingMarker ? (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside className="flex min-h-[min(42vh,380px)] shrink-0 flex-col border-b border-border bg-slate-50/40 lg:min-h-0 lg:w-[min(46%,520px)] lg:border-b-0 lg:border-r">
              <BodyMapMarkerPreview
                active={open}
                variant="panel"
                marker={pendingMarker}
                recordType={recordType}
                subType={subType}
                interactive={postureInteractivePreview}
                onPlaceMarker={onPlaceMarker}
                className="h-full min-h-0"
              />
            </aside>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{wizardForm}</div>
          </div>
        ) : (
          wizardForm
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep(s => Math.max(0, s - 1))}
          >
            Back
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step < steps.length - 1 ? (
            <Button
              type="button"
              disabled={!canNext()}
              onClick={() => setStep(s => s + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              disabled={saving || !canNext()}
              onClick={handleFinish}
            >
              {saving ? 'Saving…' : 'Save record'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
