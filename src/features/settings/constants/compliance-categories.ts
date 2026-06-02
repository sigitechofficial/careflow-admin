import type { ComplianceCategory } from '@/features/settings/types'

export const COMPLIANCE_CATEGORIES: { value: ComplianceCategory; label: string }[] = [
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'SAFEGUARDING', label: 'Safeguarding' },
  { value: 'RIGHT_TO_WORK', label: 'Right to work' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'CLINICAL', label: 'Clinical' },
  { value: 'IDENTITY', label: 'Identity' },
  { value: 'HEALTH_AND_SAFETY', label: 'Health & safety' },
  { value: 'DRIVING', label: 'Driving' },
  { value: 'PROFESSIONAL_REGISTRATION', label: 'Professional registration' },
  { value: 'OTHER', label: 'Other' },
]
