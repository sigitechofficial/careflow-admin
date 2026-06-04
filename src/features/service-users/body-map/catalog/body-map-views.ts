/** Posture diagrams (leaning / sitting) — separate from anatomy prototype views. */
export type BodyMapPostureView = 'leaning' | 'sitting'

export const BODY_MAP_POSTURE_TABS: { id: BodyMapPostureView; label: string }[] = [
  { id: 'leaning', label: 'Leaning' },
  { id: 'sitting', label: 'Sitting' },
]

export const POSTURE_DIAGRAM_URL: Record<BodyMapPostureView, string> = {
  leaning: '/body-map/leaning.svg',
  sitting: '/body-map/sitting.svg',
}

export type BodyMapDiagramTab = 'standard' | BodyMapPostureView

export const BODY_MAP_DIAGRAM_TABS: { id: BodyMapDiagramTab; label: string }[] = [
  { id: 'standard', label: 'Standing / regions' },
  { id: 'leaning', label: 'Leaning' },
  { id: 'sitting', label: 'Sitting' },
]

/** Canvas view keys — same as careflow-body-map.html */
export type BodyMapCanvasView =
  | 'dual'
  | 'face'
  | 'head_back'
  | 'chest'
  | 'abdomen'
  | 'torso_back'
  | 'arm_l'
  | 'arm_r'
  | 'leg_l'
  | 'leg_r'
  | 'hand_l'
  | 'hand_r'
  | 'foot_l'
  | 'foot_r'

export const BODY_MAP_VIEW_TABS: { id: BodyMapCanvasView; label: string; zoom?: boolean }[] = [
  { id: 'dual', label: 'Front & back' },
  { id: 'face', label: 'Face', zoom: true },
  { id: 'head_back', label: 'Head (back)', zoom: true },
  { id: 'chest', label: 'Chest', zoom: true },
  { id: 'abdomen', label: 'Abdomen', zoom: true },
  { id: 'torso_back', label: 'Back', zoom: true },
  { id: 'arm_l', label: 'Left arm', zoom: true },
  { id: 'arm_r', label: 'Right arm', zoom: true },
  { id: 'leg_l', label: 'Left leg', zoom: true },
  { id: 'leg_r', label: 'Right leg', zoom: true },
  { id: 'hand_l', label: 'Left hand', zoom: true },
  { id: 'hand_r', label: 'Right hand', zoom: true },
  { id: 'foot_l', label: 'Left foot', zoom: true },
  { id: 'foot_r', label: 'Right foot', zoom: true },
]

export const VIEW_LABELS: Record<string, string> = {
  dual: 'Front and back',
  front: 'Front',
  back: 'Back',
  face: 'Face',
  head_back: 'Head (back)',
  chest: 'Chest',
  abdomen: 'Abdomen',
  torso_back: 'Back (close-up)',
  arm_l: 'Left arm',
  arm_r: 'Right arm',
  leg_l: 'Left leg',
  leg_r: 'Right leg',
  hand_l: 'Left hand',
  hand_r: 'Right hand',
  foot_l: 'Left foot',
  foot_r: 'Right foot',
  leaning: 'Leaning',
  sitting: 'Sitting',
}

export const VIEW_PERSPECTIVE: Record<string, string> = {
  dual: 'Front and back of the body on one diagram',
  face: 'Front of the face — facing the person',
  head_back: 'Back of the head and neck — behind the person',
  chest: 'Front of the chest (anterior)',
  abdomen: 'Front of the abdomen (anterior)',
  torso_back: 'Back of the trunk (posterior)',
  arm_l: 'Front of the left arm',
  arm_r: 'Front of the right arm',
  leg_l: 'Front of the left leg',
  leg_r: 'Front of the right leg',
  hand_l: 'Palm of the left hand',
  hand_r: 'Palm of the right hand',
  foot_l: 'Sole of the left foot',
  foot_r: 'Sole of the right foot',
  leaning: 'Body map while leaning',
  sitting: 'Body map while sitting',
}
