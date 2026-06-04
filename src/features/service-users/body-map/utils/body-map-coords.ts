import type { BodyMapBodyView, BodyMapMarkerRow, BodyMapRecordRow, BodyMapSide } from '@/features/service-users/body-map/types'

/** Prototype record-view string (front, back, face, arm_l, …) */
export type BodyMapRecordView = string

export type PrototypeMarkerCoords = {
  recordView: BodyMapRecordView
  canvasView: string
  x: number
  y: number
  bodyPart: string
  side: string
  regionId?: string | null
  summaryLabel?: string
  freeClick?: boolean
}

export function prototypeSideToApi(side: string): BodyMapSide {
  if (side === 'Left') return 'LEFT'
  if (side === 'Right') return 'RIGHT'
  return 'CENTRE'
}

export function apiSideToPrototype(side: BodyMapSide | null | undefined): string {
  if (side === 'LEFT') return 'Left'
  if (side === 'RIGHT') return 'Right'
  return 'Centre'
}

export function recordViewToApiBodyView(recordView: string): BodyMapBodyView {
  if (recordView === 'leaning' || recordView === 'sitting') return 'FRONT'
  if (recordView === 'back' || recordView === 'head_back' || recordView === 'torso_back') return 'BACK'
  if (recordView === 'face') return 'FACE'
  if (recordView.startsWith('hand_')) return 'HAND'
  if (recordView.startsWith('foot_')) return 'FOOT'
  if (recordView === 'arm_l' || recordView === 'leg_l') return 'LEFT'
  if (recordView === 'arm_r' || recordView === 'leg_r') return 'RIGHT'
  return 'FRONT'
}

export function readMarkerPlacement(
  record: BodyMapRecordRow,
  marker: BodyMapMarkerRow,
): { recordView: string; canvasView: string; regionId?: string } {
  const obs = record.observationDetails as {
    recordView?: string
    canvasView?: string
    regionId?: string
  } | null
  const recordView =
    obs?.recordView ?? (marker.bodyView === 'BACK' ? 'back' : marker.bodyView === 'FACE' ? 'face' : 'front')
  const canvasView =
    obs?.canvasView ?? (recordView === 'back' || recordView === 'front' ? 'dual' : recordView)
  return { recordView, canvasView, regionId: obs?.regionId }
}

export function markerToPrototypeRecord(
  record: BodyMapRecordRow,
  marker: BodyMapMarkerRow,
): { view: string; x: number; y: number; markerType: string; status: string } {
  const { recordView } = readMarkerPlacement(record, marker)
  return {
    view: recordView,
    x: marker.xCoordinate,
    y: marker.yCoordinate,
    markerType: record.recordType.toLowerCase(),
    status: marker.status === 'CLOSED' || marker.status === 'RESOLVED' ? 'resolved' : 'active',
  }
}
