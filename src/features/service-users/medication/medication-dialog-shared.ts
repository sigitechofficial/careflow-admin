/** Shared field constants for Add / Edit medication dialogs. */

export const MEDICATION_SELECT_NONE = '__none__'

export const HOW_ASSISTED_OPTIONS = [
  'Self',
  'Prompting',
  'Supervision',
  'Full assistance',
  'Not applicable',
] as const

export const MEDICATION_TEXTAREA_CLASS =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export function howAssistedToSelectValue(value: string | null | undefined): string {
  if (!value?.trim()) return MEDICATION_SELECT_NONE
  if (HOW_ASSISTED_OPTIONS.includes(value as (typeof HOW_ASSISTED_OPTIONS)[number])) {
    return value
  }
  return MEDICATION_SELECT_NONE
}
