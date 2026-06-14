import type { FormFieldType } from '@/features/care-pathway/types/care-pathway.types'

export const FIELD_TYPES_WITH_OPTIONS: FormFieldType[] = ['SELECT', 'RADIO', 'MULTI_SELECT']

export const OPTIONS_PRESETS: Record<string, string[]> = {
  'Yes / No': ['Yes', 'No'],
  'Yes / No / N/A': ['Yes', 'No', 'N/A'],
  'Level 0': ['LEVEL 0', 'NOT APPLICABLE'],
  'Level 1': ['LEVEL 1A', 'LEVEL 1B'],
  'Level 2': ['LEVEL 2A', 'LEVEL 2B'],
}

export function fieldTypeUsesOptions(fieldType: FormFieldType): boolean {
  return FIELD_TYPES_WITH_OPTIONS.includes(fieldType)
}

export function parseFieldOptions(optionsJson: unknown): string[] {
  if (!optionsJson) return []
  if (Array.isArray(optionsJson)) {
    return optionsJson.map((option) => String(option).trim()).filter(Boolean)
  }
  if (typeof optionsJson === 'object' && optionsJson !== null && 'options' in optionsJson) {
    const opts = (optionsJson as { options: unknown }).options
    if (Array.isArray(opts)) {
      return opts.map((option) => String(option).trim()).filter(Boolean)
    }
  }
  return []
}

export function serializeFieldOptions(options: string[]): { options: string[] } | null {
  const cleaned = options.map((option) => option.trim()).filter(Boolean)
  return cleaned.length ? { options: cleaned } : null
}

export function parseMultiSelectValue(value: string | boolean | undefined): string[] {
  if (typeof value !== 'string' || !value.trim()) return []
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {
      /* fall through */
    }
  }
  return value.split('|').map((part) => part.trim()).filter(Boolean)
}

export function serializeMultiSelectValue(selected: string[]): string {
  return selected.join('|')
}
