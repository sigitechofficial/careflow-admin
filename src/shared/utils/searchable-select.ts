/** Minimum option count before a select uses the searchable Combobox control. */
export const SEARCHABLE_SELECT_MIN_OPTIONS = 8

export function shouldUseSearchableSelect(optionCount: number): boolean {
  return optionCount >= SEARCHABLE_SELECT_MIN_OPTIONS
}
