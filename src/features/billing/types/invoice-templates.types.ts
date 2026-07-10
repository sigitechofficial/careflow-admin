import type { BillingCardStatus, BillingFrequency } from '@/features/billing/types/billing-cards.types'

export type InvoiceTemplateType = 'PDF' | 'XLSX' | 'CSV' | 'XML' | 'JSON' | 'API'

export type InvoiceTemplateScope = 'ORGANISATION_DEFAULT' | 'FUNDER' | 'FUNDING_CONTRACT'

export type InvoiceTemplateLayoutPreset =
  | 'STANDARD'
  | 'LOCAL_AUTHORITY'
  | 'NHS'
  | 'PRIVATE_CLIENT'

export type InvoiceTemplateField = {
  id?: string
  label: string
  systemFieldKey: string
  isRequired: boolean
  sortOrder: number
}

export type InvoiceTemplate = {
  id: string
  name: string
  code: string
  templateType: InvoiceTemplateType
  version: string
  scope: InvoiceTemplateScope
  funderId?: string | null
  serviceUserFundingId?: string | null
  deliveryMethod?: string | null
  groupingRule?: string | null
  fileNamePattern?: string | null
  billingFrequency: BillingFrequency
  layoutPreset: InvoiceTemplateLayoutPreset
  includeRemittance: boolean
  status: BillingCardStatus
  effectiveFrom: string
  effectiveTo?: string | null
  notes?: string | null
  fields: InvoiceTemplateField[]
  funder?: { id: string; name: string; code: string | null } | null
  serviceUserFunding?: {
    id: string
    packageName: string | null
    fundingReference: string | null
    serviceUser?: { id: string; firstName: string; lastName: string; preferredName: string | null }
  } | null
  _count?: { defaultFunders: number; defaultFundings: number }
}

export type InvoiceTemplateInput = {
  name: string
  code: string
  templateType: InvoiceTemplateType
  version: string
  scope: InvoiceTemplateScope
  funderId?: string | null
  serviceUserFundingId?: string | null
  deliveryMethod?: string | null
  groupingRule?: string | null
  fileNamePattern?: string | null
  billingFrequency: BillingFrequency
  layoutPreset: InvoiceTemplateLayoutPreset
  includeRemittance: boolean
  status: BillingCardStatus
  effectiveFrom: string
  effectiveTo?: string | null
  notes?: string | null
  fields: InvoiceTemplateField[]
}

export type InvoiceTemplateSystemField = {
  key: string
  label: string
  group?: string
}

export type InvoiceTemplateSystemFieldCatalog = {
  fields: InvoiceTemplateSystemField[]
  groups: Array<{ id: string; label: string }>
}

export type InvoiceTemplateLayoutPresetDefinition = {
  key: InvoiceTemplateLayoutPreset
  name: string
  description: string
  usedBy: string
  templateType: InvoiceTemplateType
  billingFrequency: BillingFrequency
  deliveryMethod: string
  groupingRule: string
  fileNamePattern: string
  includeRemittance: boolean
  scope: InvoiceTemplateScope
  status: BillingCardStatus
  fields: Array<{
    systemFieldKey: string
    label: string
    isRequired: boolean
  }>
}

export const INVOICE_LAYOUT_PRESET_OPTIONS: Array<{
  value: InvoiceTemplateLayoutPreset
  label: string
  subtitle: string
}> = [
  {
    value: 'STANDARD',
    label: 'Standard',
    subtitle: 'Birdie / Access — weekly PDF for any payer',
  },
  {
    value: 'LOCAL_AUTHORITY',
    label: 'Local authority',
    subtitle: 'Council Excel upload — client ref, PO, hours',
  },
  {
    value: 'NHS',
    label: 'NHS',
    subtitle: 'CHC / CCG billing with NHS number',
  },
  {
    value: 'PRIVATE_CLIENT',
    label: 'Private client',
    subtitle: 'Family invoice with remittance slip',
  },
]

export function layoutPresetLabel(preset: InvoiceTemplateLayoutPreset): string {
  return INVOICE_LAYOUT_PRESET_OPTIONS.find(o => o.value === preset)?.label ?? preset
}

export type InvoiceTemplateResolveResult = {
  source: 'EXPLICIT_FUNDING' | 'EXPLICIT_FUNDER' | 'ORGANISATION_DEFAULT' | 'MATCHED_SCOPE' | 'NONE'
  invoiceTemplate: InvoiceTemplate | null
  fundingId: string | null
  funderId: string | null
}

export type InvoiceTemplateValidationResult = {
  templateId: string
  serviceUserId: string
  fundingId: string | null
  isValid: boolean
  issues: Array<{ fieldKey: string; label: string; message: string }>
  requiredFieldCount: number
}

export const INVOICE_TEMPLATE_TYPE_OPTIONS: Array<{ value: InvoiceTemplateType; label: string }> = [
  { value: 'PDF', label: 'PDF' },
  { value: 'XLSX', label: 'Excel (XLSX)' },
  { value: 'CSV', label: 'CSV' },
  { value: 'XML', label: 'XML' },
  { value: 'JSON', label: 'JSON / API' },
  { value: 'API', label: 'API export' },
]

export const INVOICE_TEMPLATE_SCOPE_OPTIONS: Array<{ value: InvoiceTemplateScope; label: string }> = [
  { value: 'ORGANISATION_DEFAULT', label: 'Organisation default' },
  { value: 'FUNDER', label: 'Funder profile' },
  { value: 'FUNDING_CONTRACT', label: 'Funding contract' },
]

export const INVOICE_GROUPING_PRESETS = [
  'One invoice per service user',
  'One invoice per funder',
  'One invoice per billing contact',
  'One invoice per purchase order',
  'One invoice per care package',
  'One consolidated council file',
] as const

export const INVOICE_DELIVERY_PRESETS = [
  'Email',
  'Council portal upload',
  'Secure upload',
  'Download',
  'Accounting API sync',
] as const

export function formatInvoiceTemplateScope(template: InvoiceTemplate): string {
  switch (template.scope) {
    case 'ORGANISATION_DEFAULT':
      return 'Organisation default'
    case 'FUNDER':
      return template.funder?.name ? `Funder: ${template.funder.name}` : 'Funder profile'
    case 'FUNDING_CONTRACT': {
      const su = template.serviceUserFunding?.serviceUser
      const suName = su
        ? [su.preferredName || su.firstName, su.lastName].filter(Boolean).join(' ')
        : null
      return suName ? `Contract: ${suName}` : 'Funding contract'
    }
    default:
      return template.scope
  }
}

export function slugInvoiceTemplateCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}
