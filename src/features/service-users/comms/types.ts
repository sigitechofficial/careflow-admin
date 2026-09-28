export type CommunicationNoteShareTarget = 'handover' | 'manager' | 'family'

export type CommunicationNoteRow = {
  id: string
  serviceUserId: string
  name: string
  position: string
  reason: string
  outcome: string
  signature: string | null
  recordedAt: string
  isPrivate: boolean
  shareWith: CommunicationNoteShareTarget[]
  createdAt: string
  updatedAt?: string
}

export type CreateCommunicationNotePayload = {
  name: string
  position: string
  reason: string
  outcome: string
  signature: string | null
  recordedAt: string
  isPrivate: boolean
  shareWith: CommunicationNoteShareTarget[]
}

export const COMMUNICATION_NOTE_POSITIONS = [
  'accounts',
  'Admin',
  'allocation office',
  'Audiologist',
  'care manager',
  'care worker',
  'Chiropodist',
  'Community Nurse',
  'Community Psychiatric Nurse',
  'Continence Nurse',
  'Dementia Nurse',
  'Dentist',
  'Diabetes Nurse',
  'Dietitian',
  'District Nurse',
  'Family member',
  'Field support officer',
  'General Practitioner (GP)',
  'HR',
  'Key Worker',
  'medication',
  'Music Therapist',
  'Occupational Therapist',
  'Office Manager',
  'Optometrist',
  'Other (record in outcome)',
  'Pharmacist',
  'Physiotherapist',
  'Psychologist',
  'Quality assurance',
  'Service User',
  'Services Broker Negotiator',
  'Social Activity Co-ordinator',
  'social service',
  'Social Worker',
  'Speech and Language Therapist',
  'supervisor',
  'System Monitoring Officer',
  'Tissue Viability Nurse',
] as const
