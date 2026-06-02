/** Aligns with GET /body-map/lookups → medicationSubTypeByMarTypeCode */
export const MAR_TYPE_TO_BODY_MAP_SUBTYPE: Record<string, string> = {
  CREAM: 'Cream application',
  OINTMENT: 'Cream application',
  LOTION: 'Cream application',
  PATCH: 'Patch site',
  INJECTION: 'Injection site',
  SPRAY: 'Spray site',
}

export function isCreamLikeSubType(subType: string): boolean {
  const s = subType.toLowerCase()
  return s.includes('cream') || s.includes('ointment') || s.includes('lotion')
}

export function isPatchSubType(subType: string): boolean {
  return subType.toLowerCase().includes('patch')
}
