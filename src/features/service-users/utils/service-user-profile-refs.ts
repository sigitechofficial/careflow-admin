/** Stored in `ServiceUserReference` for fields not on core `ServiceUser` model. */
export const SU_PROFILE_REF = {
  suffix: 'SU_PROFILE_SUFFIX',
  maidenName: 'SU_PROFILE_MAIDEN_NAME',
  placeOfBirth: 'SU_PROFILE_PLACE_OF_BIRTH',
  religion: 'SU_PROFILE_RELIGION',
  ethnicity: 'SU_PROFILE_ETHNICITY',
  sexualOrientation: 'SU_PROFILE_SEXUAL_ORIENTATION',
  disability: 'SU_PROFILE_DISABILITY',
  maternity: 'SU_PROFILE_MATERNITY',
  language: 'SU_PROFILE_LANGUAGE',
  preferredContactMethod: 'SU_PROFILE_PREF_CONTACT',
  emailType: 'SU_PROFILE_EMAIL_TYPE',
  otherContactMethod: 'SU_PROFILE_OTHER_CONTACT',
  dateOfDeath: 'SU_PROFILE_DATE_OF_DEATH',
  nhsNumberStatus: 'SU_PROFILE_NHS_NUMBER_STATUS',
  sex: 'SU_PROFILE_SEX',
  phoneType: 'SU_PROFILE_PHONE_TYPE',
  phonePreference: 'SU_PROFILE_PHONE_PREF',
  emailPreference: 'SU_PROFILE_EMAIL_PREF',
  changePreference: 'SU_PROFILE_CHANGE_PREFERENCE',
  orderNumber: 'SU_PROFILE_ORDER_NUMBER',
  scanType: 'SU_PROFILE_SCAN_TYPE',
  scanCode: 'SU_PROFILE_SCAN_CODE',
  caseNumber: 'SU_PROFILE_CASE_NUMBER',
  sprocNumber: 'SU_PROFILE_SPROC_NUMBER',
  lasNumber: 'SU_PROFILE_LAS_NUMBER',
  nhsReferences: 'SU_PROFILE_NHS_REFERENCES',
  asNumber: 'AS_NUMBER',
  referralAuthority: 'SU_PROFILE_REFERRAL_AUTHORITY',
  referralDate: 'SU_PROFILE_REFERRAL_DATE',
  referralSource: 'SU_PROFILE_REFERRAL_SOURCE',
  referralNotes: 'SU_PROFILE_REFERRAL_NOTES',
  referralRecordedBy: 'SU_PROFILE_REFERRAL_RECORDED_BY',
  referralRecordedAt: 'SU_PROFILE_REFERRAL_RECORDED_AT',
  /** How the referral arrived (Email, Phone, Letter, …) and when it was received. */
  referralReceivedVia: 'SU_PROFILE_REFERRAL_RECEIVED_VIA',
  referralReceivedAt: 'SU_PROFILE_REFERRAL_RECEIVED_AT',
} as const

export type SuProfileRefType = (typeof SU_PROFILE_REF)[keyof typeof SU_PROFILE_REF]

export const SU_PROFILE_REF_TYPES = new Set<string>(Object.values(SU_PROFILE_REF))

export type SuProfileReferencePayload = {
  referenceType: string
  referenceValue: string
  notes?: string
  id?: string
}

/** Build create/update references from a map of profile ref type → value (empty skipped). */
export function buildSuProfileReferences(
  profile: Partial<Record<SuProfileRefType, string>>,
  existing?: Array<{ id?: string; referenceType: string; referenceValue: string; notes?: string | null }>,
): SuProfileReferencePayload[] {
  const kept = (existing ?? []).filter((r) => !SU_PROFILE_REF_TYPES.has(r.referenceType))
  const base: SuProfileReferencePayload[] = kept.map((r) => ({
    id: r.id,
    referenceType: r.referenceType,
    referenceValue: r.referenceValue,
    ...(r.notes ? { notes: r.notes } : {}),
  }))

  for (const [type, raw] of Object.entries(profile) as Array<[SuProfileRefType, string | undefined]>) {
    const v = raw?.trim() ?? ''
    if (!v) continue
    const prev = existing?.find((r) => r.referenceType === type)
    if (prev?.id) base.push({ id: prev.id, referenceType: type, referenceValue: v })
    else base.push({ referenceType: type, referenceValue: v })
  }
  return base
}
