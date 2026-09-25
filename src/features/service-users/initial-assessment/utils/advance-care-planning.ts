/** Advance care planning worksheet — paper forms (holistic tab 13). */

export type AdvanceCarePlanningProxyContact = {
  name?: string
  tel?: string
  lpoa?: boolean | null
}

export type AdvanceCarePlanningMetadata = {
  patientName?: string
  address?: string
  dateOfBirth?: string
  hospitalOrNhsNumber?: string
  dateCompleted?: string
  gpDetails?: string
  hospitalContact?: string
  familyMemberName?: string
  familyContactTel?: string
  professionalName?: string
  professionalRole?: string
  professionalContactTel?: string
  patientSignature?: string
  patientSignatureDate?: string
  nextOfKinSignature?: string
  nextOfKinSignatureDate?: string
  homecareProfessionalSignature?: string
  homecareProfessionalSignatureDate?: string
  reviewDate?: string
  personalValues?: string
  carePreferences?: string
  concernsAndFears?: string
  legalAdvanceDecision?: boolean | null
  legalAdvanceDecisionDetails?: string
  proxyContact1?: AdvanceCarePlanningProxyContact
  proxyContact2?: AdvanceCarePlanningProxyContact
  placeOfCareFirstChoice?: string
  placeOfCareSecondChoice?: string
  placeOfCareComments?: string
  specialRequests?: string
  thirdPartyComments?: string
}

export const ACP_FIVE_STEPS = [
  {
    number: 1,
    title: 'Think',
    text: 'about the future - what is important to you, what you want to happen or not to happen if you became unwell',
  },
  {
    number: 2,
    title: 'Talk',
    text: 'with family and friends, and ask someone to be your proxy spokesperson or Lasting Power of Attorney (LPA) if you could no longer speak for yourself',
  },
  {
    number: 3,
    title: 'Record',
    text: 'write down your thoughts as your own ACP, including your spokesperson and store this safely.',
  },
  {
    number: 4,
    title: 'Discuss',
    text: 'your plans with your doctor, nurses or carers, and this might include a further discussion about resuscitation (DNAR or Respect) or refusing further treatment (ADRT)',
  },
  {
    number: 5,
    title: 'Share',
    text: 'this information with others who need to know about you, through your health records or other means, and review it regularly.',
  },
] as const

export const ACP_DISCUSSION_BRANCHES = [
  {
    title: 'What you do want to happen',
    content: 'AS-Statement of wishes and preferences',
  },
  {
    title: 'What you do not want to happen',
    content: 'ADRT-Advance Decisions to refuse treatment',
  },
  {
    title: 'Who will speak for you',
    content: 'Proxy or LPA- Lasting power of Attorney',
  },
] as const

export const THINKING_AHEAD_INTRO_PARAGRAPHS = [
  'The goal is to provide the best care by understanding patient and family needs and preferences for the future.',
  'The aim of an Advance Care Planning Discussion is to record priorities and needs. The philosophy is "hoping for the best but preparing for the worst."',
  'This is an Advance Statement (what the patient DOES WISH to happen), which is different from a legally binding Advance Decision (ADRT — what a patient DOES NOT wish to happen), in line with the Mental Capacity Act (2005).',
  'This is a dynamic document that should be discussed early and can be reviewed and adapted as needed.',
] as const

export function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

export function defaultAdvanceCarePlanningMetadata(): AdvanceCarePlanningMetadata {
  return {}
}

export function normalizeAdvanceCarePlanningMetadata(raw: unknown): AdvanceCarePlanningMetadata {
  if (!raw || typeof raw !== 'object') return defaultAdvanceCarePlanningMetadata()
  const row = raw as AdvanceCarePlanningMetadata

  const normalizeContact = (c: unknown): AdvanceCarePlanningProxyContact | undefined => {
    if (!c || typeof c !== 'object') return undefined
    const contact = c as AdvanceCarePlanningProxyContact
    return {
      name: typeof contact.name === 'string' ? contact.name : undefined,
      tel: typeof contact.tel === 'string' ? contact.tel : undefined,
      lpoa: contact.lpoa ?? undefined,
    }
  }

  return {
    patientName: typeof row.patientName === 'string' ? row.patientName : undefined,
    address: typeof row.address === 'string' ? row.address : undefined,
    dateOfBirth: typeof row.dateOfBirth === 'string' ? row.dateOfBirth : undefined,
    hospitalOrNhsNumber:
      typeof row.hospitalOrNhsNumber === 'string' ? row.hospitalOrNhsNumber : undefined,
    dateCompleted: typeof row.dateCompleted === 'string' ? row.dateCompleted : undefined,
    gpDetails: typeof row.gpDetails === 'string' ? row.gpDetails : undefined,
    hospitalContact: typeof row.hospitalContact === 'string' ? row.hospitalContact : undefined,
    familyMemberName: typeof row.familyMemberName === 'string' ? row.familyMemberName : undefined,
    familyContactTel: typeof row.familyContactTel === 'string' ? row.familyContactTel : undefined,
    professionalName: typeof row.professionalName === 'string' ? row.professionalName : undefined,
    professionalRole: typeof row.professionalRole === 'string' ? row.professionalRole : undefined,
    professionalContactTel:
      typeof row.professionalContactTel === 'string' ? row.professionalContactTel : undefined,
    patientSignature: typeof row.patientSignature === 'string' ? row.patientSignature : undefined,
    patientSignatureDate:
      typeof row.patientSignatureDate === 'string' ? row.patientSignatureDate : undefined,
    nextOfKinSignature:
      typeof row.nextOfKinSignature === 'string' ? row.nextOfKinSignature : undefined,
    nextOfKinSignatureDate:
      typeof row.nextOfKinSignatureDate === 'string' ? row.nextOfKinSignatureDate : undefined,
    homecareProfessionalSignature:
      typeof row.homecareProfessionalSignature === 'string'
        ? row.homecareProfessionalSignature
        : undefined,
    homecareProfessionalSignatureDate:
      typeof row.homecareProfessionalSignatureDate === 'string'
        ? row.homecareProfessionalSignatureDate
        : undefined,
    reviewDate: typeof row.reviewDate === 'string' ? row.reviewDate : undefined,
    personalValues: typeof row.personalValues === 'string' ? row.personalValues : undefined,
    carePreferences: typeof row.carePreferences === 'string' ? row.carePreferences : undefined,
    concernsAndFears: typeof row.concernsAndFears === 'string' ? row.concernsAndFears : undefined,
    legalAdvanceDecision: row.legalAdvanceDecision ?? undefined,
    legalAdvanceDecisionDetails:
      typeof row.legalAdvanceDecisionDetails === 'string'
        ? row.legalAdvanceDecisionDetails
        : undefined,
    proxyContact1: normalizeContact(row.proxyContact1),
    proxyContact2: normalizeContact(row.proxyContact2),
    placeOfCareFirstChoice:
      typeof row.placeOfCareFirstChoice === 'string' ? row.placeOfCareFirstChoice : undefined,
    placeOfCareSecondChoice:
      typeof row.placeOfCareSecondChoice === 'string' ? row.placeOfCareSecondChoice : undefined,
    placeOfCareComments:
      typeof row.placeOfCareComments === 'string' ? row.placeOfCareComments : undefined,
    specialRequests: typeof row.specialRequests === 'string' ? row.specialRequests : undefined,
    thirdPartyComments:
      typeof row.thirdPartyComments === 'string' ? row.thirdPartyComments : undefined,
  }
}

export function isAdvanceCarePlanningComplete(
  meta: AdvanceCarePlanningMetadata | undefined,
): boolean {
  if (!meta) return false
  if (!meta.dateCompleted?.trim()) return false
  if (!boolAnswered(meta.legalAdvanceDecision)) return false
  if (!meta.personalValues?.trim()) return false
  if (!meta.carePreferences?.trim()) return false
  if (!meta.concernsAndFears?.trim()) return false
  return true
}
