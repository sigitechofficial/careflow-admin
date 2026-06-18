import type { BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'

export type BodyMapBodyView = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'FACE' | 'HAND' | 'FOOT'
export type BodyMapSide = 'LEFT' | 'RIGHT' | 'CENTRE'
export type BodyMapRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type BodyMapRecordStatus =
  | 'ACTIVE'
  | 'REVIEW_DUE'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'AWAITING_REVIEW'

export type BodyMapMarkerRow = {
  id: string
  bodyMapRecordId: string
  bodyView: BodyMapBodyView
  side: BodyMapSide | null
  bodyPart: string
  specificLocation: string | null
  xCoordinate: number
  yCoordinate: number
  markerNumber: number
  markerType: BodyMapRecordTypeCode
  riskLevel: BodyMapRiskLevel
  status: BodyMapRecordStatus
  isVisible: boolean
  createdAt: string
}

export type BodyMapRecordRow = {
  id: string
  serviceUserId: string
  recordType: BodyMapRecordTypeCode
  subType: string | null
  title: string | null
  description: string | null
  riskLevel: BodyMapRiskLevel
  status: BodyMapRecordStatus
  firstNoticedAt: string | null
  causeSummary: string | null
  actionSummary: string | null
  observationDetails: Record<string, unknown> | null
  reviewRequired: boolean
  nextReviewAt: string | null
  safeguardingTriggered: boolean
  managerReviewRequired: boolean
  closedAt: string | null
  closureNote: string | null
  scheduledJobId?: string | null
  scheduledVisitId?: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
  markers: BodyMapMarkerRow[]
  reviews: {
    id: string
    conditionStatus: string
    reviewNote: string | null
    reviewedAt: string
    reviewDetails?: Record<string, unknown> | null
  }[]
  photos?: {
    id: string
    fileUrl: string
    consentStatus: string
    caption: string | null
    createdAt: string
  }[]
  safeguardingCheck?: BodyMapSafeguardingCheck | null
  woundAssessment?: BodyMapWoundAssessment | null
  pressureAssessment?: BodyMapPressureAssessment | null
  links?: BodyMapLink[]
  medicationSite?: BodyMapMedicationSite | null
  serviceUserName?: string | null
}

export type BodyMapEmollientFireRisk =
  | 'NOT_APPLICABLE'
  | 'NOT_ASSESSED'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'

export type BodyMapMedicationSite = {
  id: string
  bodyMapRecordId: string
  serviceUserMedicationId: string
  lastAdministrationEventId: string | null
  medicineNameSnapshot: string
  strength: string | null
  frequencyText: string | null
  appliedAt: string | null
  appliedById: string | null
  appliedByName: string | null
  consentGiven: boolean | null
  marLinkedAt: string | null
  amountOrThickness: string | null
  reasonForApplication: string | null
  fireRiskEmollient: BodyMapEmollientFireRisk | null
  outcomeNote: string | null
  oldPatchPresent: boolean | null
  oldPatchRemoved: boolean | null
  oldPatchRemovalAt: string | null
  oldPatchBodyPart: string | null
  oldPatchNotes: string | null
  disposalRecorded: boolean | null
  nextChangeDue: string | null
  siteRotationChecked: boolean | null
  secondStaffCheck: boolean | null
  siteRotationNotes: string | null
  assessmentData: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  medication?: {
    id: string
    medicationName: string
    strength: string | null
    frequencyText: string | null
    status: string
    medicationType: { id: string; code: string; name: string; requiresBodyMapSite?: boolean } | null
    route: { id: string; code: string; name: string; requiresBodyMapSite?: boolean } | null
  } | null
  lastAdministrationEvent?: {
    id: string
    actualDateTime: string | null
    status: string
    medicationNameSnapshot: string | null
  } | null
}

export type BodyMapMedicationSitePayload = {
  serviceUserMedicationId: string
  lastAdministrationEventId?: string
  medicineNameSnapshot?: string
  strength?: string
  frequencyText?: string
  appliedAt?: string
  appliedById?: string
  consentGiven?: boolean
  amountOrThickness?: string
  reasonForApplication?: string
  fireRiskEmollient?: BodyMapEmollientFireRisk
  outcomeNote?: string
  oldPatchPresent?: boolean
  oldPatchRemoved?: boolean
  oldPatchRemovalAt?: string
  oldPatchBodyPart?: string
  oldPatchNotes?: string
  disposalRecorded?: boolean
  nextChangeDue?: string
  siteRotationChecked?: boolean
  secondStaffCheck?: boolean
  siteRotationNotes?: string
  assessmentData?: Record<string, unknown>
}

export type MedicationBodyMapSiteLookup = {
  linked: boolean
  bodyMapRecordId: string | null
  medicationSite: BodyMapMedicationSite | null
  record: BodyMapRecordRow | null
}

export type BodyMapWoundAssessment = {
  id: string
  woundType: string | null
  exudate: string | null
  dressing: string | null
  nextDressingChange: string | null
  measurements: string | null
  infectionSigns: string | null
  professionalInvolvement: string | null
  assessmentData: Record<string, unknown> | null
  woundLifecycleStatus?: string | null
  woundLifecycleLabel?: string | null
  createdAt: string
  updatedAt: string
}

export type BodyMapGovernanceAlertRow = BodyMapAlertRow & {
  serviceUserName: string | null
}

export type BodyMapPressureAssessment = {
  id: string
  riskTool: string | null
  blanching: string | null
  skinIntact: string | null
  repositioningRecorded: string | null
  nonBlanching: string | null
  repositioningFrequency: string | null
  pressureEquipment: string | null
  assessmentData: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type BodyMapLinkedModule =
  | 'CARE_PLAN'
  | 'MAR'
  | 'INCIDENT'
  | 'RISK_ASSESSMENT'
  | 'REFERRAL'
  | 'CARE_NOTE'
  | 'SCHEDULED_VISIT'

export type BodyMapLink = {
  id: string
  linkedModule: BodyMapLinkedModule
  linkedRecordId: string
  label: string | null
  createdAt: string
}

export type BodyMapSafeguardingCheck = {
  id: string
  causeKnown: string | null
  explanationConsistent: string | null
  happenedBefore: string | null
  immediateRisk: string | null
  managerInformed: string | null
  incidentRequired: string | null
  referralRequired: string | null
  referralReason: string | null
  managerNotes: string | null
  completedAt: string
}

export type BodyMapReviewQueueRecord = BodyMapRecordRow & { queueReasons: string[] }

export type BodyMapWoundReviewFields = {
  progressionComparison?: 'BETTER' | 'SAME' | 'WORSE'
  painChange?: string
  dressingChanged?: boolean
  treatmentFollowed?: boolean
  measurements?: string
  dressing?: string
  nextDressingChange?: string
}

export type BodyMapWoundReviewPayload = {
  conditionStatus: string
  reviewNote?: string
  actionTaken?: string
  escalationRequired?: boolean
  nextReviewAt?: string
  woundReview?: BodyMapWoundReviewFields
}

export type BodyMapAlertRow = {
  id: string
  serviceUserId: string
  bodyMapRecordId: string | null
  alertType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  message: string
  createdAt: string
  record: {
    id: string
    recordType: string
    subType: string | null
    title: string | null
  } | null
}

export type BodyMapMedicationAlerts = {
  missingBodyMapSiteCount: number
  missingBodyMapSites: {
    medicationId: string
    medicationName: string
    medicationTypeCode: string | null
  }[]
  overduePatchChangeCount: number
  overduePatchChanges: {
    recordId: string
    medicationId: string
    medicineName: string
    nextChangeDue: string | null
    bodyPart: string | null
  }[]
}

export type BodyMapSummary = {
  activeCount: number
  reviewDueCount: number
  highRiskCount: number
  safeguardingCount?: number
  lastReviewAt: string | null
  medicationAlerts?: BodyMapMedicationAlerts
}

export type BodyMapRecordRowWithWarnings = BodyMapRecordRow & { warnings?: string[] }

export type BodyMapSafeguardingCheckPayload = {
  causeKnown?: string
  explanationConsistent?: string
  happenedBefore?: string
  immediateRisk: string
  managerInformed: string
  incidentRequired?: string
  referralRequired: string
  referralReason?: string
  managerReviewRequired?: boolean
  managerNotes?: string
  checklistData?: Record<string, unknown>
}

export type CreateBodyMapRecordPayload = {
  serviceUserId: string
  recordType: BodyMapRecordTypeCode
  subType?: string
  description?: string
  riskLevel?: BodyMapRiskLevel
  causeSummary?: string
  actionSummary?: string
  firstNoticedAt?: string
  noticedByType?: string
  nextReviewAt?: string
  safeguardingTriggered?: boolean
  managerReviewRequired?: boolean
  observationDetails?: Record<string, unknown>
  bodyView: BodyMapBodyView
  side?: BodyMapSide
  bodyPart: string
  specificLocation?: string
  xCoordinate: number
  yCoordinate: number
  safeguardingCheck?: BodyMapSafeguardingCheckPayload
  woundAssessment?: BodyMapWoundAssessmentPayload
  pressureAssessment?: BodyMapPressureAssessmentPayload
  medicationSite?: BodyMapMedicationSitePayload
  scheduledJobId?: string
  scheduledVisitId?: string
}

export type BodyMapWoundAssessmentPayload = {
  woundType?: string
  exudate?: string
  dressing?: string
  nextDressingChange?: string
  measurements?: string
  infectionSigns?: string
  professionalInvolvement?: string
}

export type BodyMapPressureAssessmentPayload = {
  riskTool?: string
  blanching?: string
  skinIntact?: string
  repositioningRecorded?: string
  nonBlanching?: string
  repositioningFrequency?: string
  pressureEquipment?: string
}

export type CloseBodyMapRecordPayload = {
  closureNote: string
  managerSignOff?: boolean
}
