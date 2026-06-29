export const DELIVERED_TASK_STATUSES = [
  'DELIVERED',
  'PARTIAL',
  'NOT_DELIVERED',
  'NOT_APPLICABLE',
  'REFUSED',
] as const

export type DeliveredTaskStatus = (typeof DELIVERED_TASK_STATUSES)[number]

export type CarePlanDeliveryTaskTemplate = {
  fieldKey: string
  label: string
  fieldType: string
  expectedValue: string | boolean | null
  expectedDisplay: string
}

export type CarePlanDeliveryPlanTemplate = {
  carePathwayFormId: string
  formName: string
  pictureUrl: string | null
  instanceId: string | null
  publishedVersionId: string | null
  publishedVersionNumber: number | null
  isPublished: boolean
  tasks: CarePlanDeliveryTaskTemplate[]
}

export type DeliveredCarePlanTask = {
  fieldKey: string
  label: string
  fieldType: string
  expectedValue?: string | boolean | null
  status: DeliveredTaskStatus
  notes?: string
}

export type DeliveredCarePlanDetail = {
  carePathwayFormId: string
  carePlanInstanceId?: string
  publishedVersionId?: string
  publishedVersionNumber?: number
  formName: string
  planDelivered: boolean
  planNotes?: string
  extraCareNotes?: string
  tasks: DeliveredCarePlanTask[]
}

export type CarePlanDeliveryTasksResponse = {
  linkedCarePlanFormIds: string[]
  plans: CarePlanDeliveryPlanTemplate[]
  savedDelivery?: DeliveredCarePlanDetail[]
  savedExtraCareNotes?: string
}

export const DELIVERED_TASK_STATUS_LABELS: Record<DeliveredTaskStatus, string> = {
  DELIVERED: 'Delivered',
  PARTIAL: 'Partially delivered',
  NOT_DELIVERED: 'Not delivered',
  NOT_APPLICABLE: 'Not applicable',
  REFUSED: 'Refused',
}
