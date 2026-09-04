import type { PolicyDocumentType } from '@/features/policies/types/policy.types'

export const DOCUMENT_TYPE_LABEL: Record<PolicyDocumentType, string> = {
  POLICY: 'Policy',
  PROCEDURE: 'Procedure',
  PROTOCOL: 'Protocol',
  GUIDELINE: 'Guideline',
  FORM: 'Form',
  TEMPLATE: 'Template',
}
