export type CarePathwayFormType = 'CARE_PLAN' | 'ASSESSMENT' | 'SERVICE_FORM' | 'STAFF_FORM'
export type CarePathwayFormStatus = 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'ARCHIVED'
export type FormFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'TIME'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'YES_NO'
  | 'RICH_TEXT'
  | 'SUMMERNOTE'
  | 'FILE_UPLOAD'
  | 'SIGNATURE'
  | 'PHOTO'
  | 'SECTION_TEXT'

export type PathwayActionType = 'CHECKLIST' | 'OBSERVATION'

export type CarePathwayOverview = {
  tabs: { id: string; label: string }[]
  purpose: string
  wizardSteps: string[]
  implementationStatus: Record<string, boolean>
}

export type PathwayChecklistRow = {
  id: string
  name: string
  icon: string | null
  carePlanId: string | null
  analysisGroupId: string | null
  observationEnabled: boolean
  recordPhoto: boolean
  familyShare: boolean
  groupAction: boolean
  items: { id: string; itemText: string; sortOrder: number }[]
}

export type PathwayActionRow = {
  id: string
  actionName: string
  actionIcon: string
  instruction: string | null
  actionType: PathwayActionType
  carersCount: number
  startTime: string | null
  endTime: string | null
  notesMandatory: boolean
  photoAllowed: boolean
  allowFamilyShare: boolean
  checklistIds: string[]
  checklists: { id: string; name: string }[]
}

export type CareFormListRow = {
  id: string
  name: string
  description: string | null
  formType: CarePathwayFormType
  status: CarePathwayFormStatus
  lastPublishedAt: string | null
  publishedById: string | null
  versionLabel: string
  pictureUrl?: string | null
}

export type CareFormFieldRow = {
  id: string
  label: string
  fieldType: FormFieldType
  placeholder: string | null
  helpText: string | null
  required: boolean
  optionsJson: unknown
  validationJson: Record<string, unknown> | null
  conditionalLogicJson: Record<string, unknown> | null
  sortOrder: number
}

export type CareFormSectionRow = {
  id: string
  title: string
  description: string | null
  sortOrder: number
  fields: CareFormFieldRow[]
}

export type CareFormDetail = CareFormListRow & {
  pictureUrl: string | null
  currentVersionId: string | null
  sections: CareFormSectionRow[]
}

export type ListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type { CarePlanTextTemplate } from '@/features/care-pathway/api/care-plan-text.api'
export type {
  FormSelectionEntry,
  FormSelectionGroup,
  SelectableForm,
} from '@/features/care-pathway/api/form-selection.api'
export type { CarePictureRow } from '@/features/care-pathway/api/picture-gallery.api'
