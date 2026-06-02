import type { ServiceUserDetailReference, ServiceUserReferenceItemPayload } from '@/features/service-users/api'

/** Stored on `ServiceUserReference` for contacts-tab consent toggles (not profile SU_* fields). */
export const SU_CONTACT_REF = {
  consentFamily: 'SU_CONTACT_CONSENT_FAMILY',
  shareCarePlan: 'SU_CONTACT_SHARE_CARE_PLAN',
} as const

/** Merge consent flags into the full reference list for `PATCH /service-users/:id` (avoids dropping other refs). */
export function mergeServiceUserContactConsentRefs(
  refs: ServiceUserDetailReference[],
  consentFamily: boolean,
  shareCarePlan: boolean,
): ServiceUserReferenceItemPayload[] {
  const strip = new Set<string>([SU_CONTACT_REF.consentFamily, SU_CONTACT_REF.shareCarePlan])
  const out: ServiceUserReferenceItemPayload[] = refs
    .filter(r => !strip.has(r.referenceType))
    .map(r => ({
      id: r.id,
      referenceType: r.referenceType,
      referenceValue: r.referenceValue,
      notes: r.notes ?? undefined,
    }))
  const pushOn = (type: string, on: boolean) => {
    if (!on) return
    const prev = refs.find(r => r.referenceType === type)
    if (prev) out.push({ id: prev.id, referenceType: type, referenceValue: 'true' })
    else out.push({ referenceType: type, referenceValue: 'true' })
  }
  pushOn(SU_CONTACT_REF.consentFamily, consentFamily)
  pushOn(SU_CONTACT_REF.shareCarePlan, shareCarePlan)
  return out
}

export function contactConsentFromReferences(refs: ServiceUserDetailReference[]): {
  consentFamily: boolean
  shareCarePlan: boolean
} {
  return {
    consentFamily: refs.some(
      r => r.referenceType === SU_CONTACT_REF.consentFamily && r.referenceValue === 'true',
    ),
    shareCarePlan: refs.some(
      r => r.referenceType === SU_CONTACT_REF.shareCarePlan && r.referenceValue === 'true',
    ),
  }
}
