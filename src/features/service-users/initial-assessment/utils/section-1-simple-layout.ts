/** §1 groups using the simplified readable form layout (profile + person-centred). */
export const SECTION_1_SIMPLE_GROUPS = new Set(['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8'])

export function isSection1SimpleGroup(specRef: string | undefined | null): boolean {
  return Boolean(specRef && SECTION_1_SIMPLE_GROUPS.has(specRef))
}
