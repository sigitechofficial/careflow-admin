export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages?: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export type PaginatedResult<T> = {
  rows: T[]
  meta?: PaginationMeta
}

export type PolicyStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'SUPERSEDED'
  | 'ARCHIVED'

export type PolicyDocumentType =
  | 'POLICY'
  | 'PROCEDURE'
  | 'PROTOCOL'
  | 'GUIDELINE'
  | 'FORM'
  | 'TEMPLATE'

export type PolicyDocumentSource = 'EDITOR' | 'UPLOAD' | 'CATALOGUE'

export type PolicyAudienceTargetType =
  | 'ALL_EMPLOYEES'
  | 'ROLE'
  | 'JOB_TITLE'
  | 'WORK_AREA'
  | 'LOCATION'

export type PolicyLinkModuleType =
  | 'CARE_PLAN'
  | 'INITIAL_ASSESSMENT'
  | 'RISK_ASSESSMENT'
  | 'MEDICATION'
  | 'INCIDENT'
  | 'SAFEGUARDING'
  | 'VISIT'
  | 'EMPLOYEE'
  | 'HR'
  | 'TRAINING'
  | 'RECRUITMENT'
  | 'AUDIT'
  | 'BUSINESS_CONTINUITY'
  | 'BRANCH'
  | 'EQUIPMENT'
  | 'INFECTION_CONTROL'

export type PolicyLinkScope = 'MODULE' | 'FORM_TEMPLATE' | 'SECTION' | 'RECORD'

export type PolicyCategory = {
  id: string
  name: string
  code: string
  description: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type PolicyTag = {
  id: string
  name: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type PolicyApplicability = {
  id?: string
  organisationWide: boolean
  locationId: string | null
  serviceTypeCode: string | null
}

export type PolicyAudience = {
  id?: string
  targetType: PolicyAudienceTargetType
  roleId: string | null
  jobTitleId: string | null
  workAreaId: string | null
  locationId: string | null
}

export type PolicyLink = {
  id?: string
  moduleType: PolicyLinkModuleType
  scope: PolicyLinkScope
  recordId: string | null
  sectionKey: string | null
  label: string | null
}

export type PolicyVersion = {
  id: string
  documentId: string
  versionMajor: number
  versionMinor: number
  versionLabel: string
  status: PolicyStatus
  titleSnapshot: string | null
  contentJson: Record<string, unknown> | null
  contentHtml: string | null
  changeSummary: string | null
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  hasDocument: boolean
  contentKind: 'EDITOR' | 'UPLOAD'
  effectiveDate: string | null
  reviewDate: string | null
  publishedAt: string | null
  publishedById: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  applicability: PolicyApplicability[]
  audiences: PolicyAudience[]
  links: PolicyLink[]
}

export type PolicyDocument = {
  id: string
  reference: string
  title: string
  description: string | null
  documentType: PolicyDocumentType
  source: PolicyDocumentSource
  primaryCategoryId: string
  primaryCategory: Pick<PolicyCategory, 'id' | 'name' | 'code'> | null
  tags: Array<{ id: string; name: string }>
  parentDocumentId: string | null
  currentVersionId: string | null
  status: PolicyStatus
  isCatalogue: boolean
  ownerId: string | null
  reviewerId: string | null
  approverId: string | null
  createdById: string | null
  createdAt: string
  updatedAt: string
  currentVersion: PolicyVersion | null
}

export type PolicyListParams = {
  page?: number
  limit?: number
  search?: string
  status?: PolicyStatus
  categoryId?: string
  documentType?: PolicyDocumentType
  ownerId?: string
  reviewDateFrom?: string
  reviewDateTo?: string
  locationId?: string
  serviceTypeCode?: string
}

export type ApplicablePoliciesParams = {
  page?: number
  limit?: number
  locationId?: string
  serviceTypeCode?: string
  moduleType?: PolicyLinkModuleType
  scope?: PolicyLinkScope
  recordId?: string
  sectionKey?: string
}

export type PolicyCategoryListParams = {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

export type PolicyTagListParams = {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

export type PolicyApplicabilityInput = {
  organisationWide: boolean
  locationId?: string
  serviceTypeCode?: string
}

export type PolicyAudienceInput = {
  targetType: PolicyAudienceTargetType
  roleId?: string
  jobTitleId?: string
  workAreaId?: string
  locationId?: string
}

export type PolicyLinkInput = {
  moduleType: PolicyLinkModuleType
  scope: PolicyLinkScope
  recordId?: string
  sectionKey?: string
  label?: string
}

export type PolicyWriteInput = {
  title: string
  reference: string
  documentType: PolicyDocumentType
  primaryCategoryId: string
  source?: PolicyDocumentSource
  description?: string
  ownerId?: string
  reviewerId?: string
  approverId?: string
  contentJson?: Record<string, unknown>
  contentHtml?: string
  effectiveDate?: string
  reviewDate?: string
  applicability?: PolicyApplicabilityInput[]
  audiences?: PolicyAudienceInput[]
  links?: PolicyLinkInput[]
  tagIds?: string[]
}

export type PolicyCategoryInput = {
  name: string
  code: string
  description?: string
  displayOrder?: number
}

export const POLICY_STATUS_OPTIONS: Array<{ value: PolicyStatus; label: string }> = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SUPERSEDED', label: 'Superseded' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export const POLICY_DOCUMENT_TYPE_OPTIONS: Array<{ value: PolicyDocumentType; label: string }> = [
  { value: 'POLICY', label: 'Policy' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'PROTOCOL', label: 'Protocol' },
  { value: 'GUIDELINE', label: 'Guideline' },
  { value: 'FORM', label: 'Form' },
  { value: 'TEMPLATE', label: 'Template' },
]

export const POLICY_LINK_MODULE_OPTIONS: Array<{ value: PolicyLinkModuleType; label: string }> = [
  { value: 'CARE_PLAN', label: 'Care Plans' },
  { value: 'INITIAL_ASSESSMENT', label: 'Initial Assessment' },
  { value: 'RISK_ASSESSMENT', label: 'Risk Assessment' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'INCIDENT', label: 'Incidents' },
  { value: 'SAFEGUARDING', label: 'Safeguarding' },
  { value: 'VISIT', label: 'Visits' },
  { value: 'EMPLOYEE', label: 'Employees' },
  { value: 'HR', label: 'HR' },
  { value: 'TRAINING', label: 'Learning' },
  { value: 'RECRUITMENT', label: 'Recruitment' },
  { value: 'AUDIT', label: 'Audit' },
  { value: 'BUSINESS_CONTINUITY', label: 'Business Continuity' },
  { value: 'BRANCH', label: 'Branches' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'INFECTION_CONTROL', label: 'Infection Control' },
]

export const POLICY_IN_PROGRESS_STATUSES: PolicyStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED']
