/** Types a person can choose when adding evidence (survey results arrive from surveys by themselves). */
export const MANUAL_SOURCE_TYPES = ['AUDIT', 'TRAINING', 'INCIDENT_LEARNING', 'COMPLAINT', 'COMPLIMENT', 'POLICY', 'MANUAL'] as const
export type ManualSourceType = (typeof MANUAL_SOURCE_TYPES)[number]

/** Files that can be attached (the API checks what is inside too). */
export const EVIDENCE_FILE_ACCEPT = '.pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg'
export const EVIDENCE_FILE_MAX_BYTES = 25 * 1024 * 1024
