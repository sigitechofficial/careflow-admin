import type { CareFormFieldRow, FormFieldType } from '@/features/care-pathway/types/care-pathway.types'
import { parseMultiSelectValue } from '@/features/care-pathway/utils/form-builder-field-options.util'
import { parseStoredFileValue } from '@/features/care-pathway/utils/form-builder-file-value.util'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'

/** How one care plan answer is shown on the read page. */
export type CarePlanReadAnswer =
  | { kind: 'empty' }
  | { kind: 'text'; text: string }
  | { kind: 'html'; html: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'file'; name: string }

/** The answers of a form section are stored as `sectionId:fieldId` (see CarePathwayFormRenderer). */
export function carePlanValueKey(sectionId: string, fieldId: string): string {
  return `${sectionId}:${fieldId}`
}

const HTML_TAG = /<[a-z!/][\s\S]*>/i

function plainOrHtml(text: string): CarePlanReadAnswer {
  const t = text.trim()
  if (!t) return { kind: 'empty' }
  if (!HTML_TAG.test(t)) return { kind: 'text', text: t }
  // Rich text with no words in it (e.g. "<p><br></p>") is empty.
  const words = t.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return words ? { kind: 'html', html: t } : { kind: 'empty' }
}

export function formatCarePlanAnswer(
  field: Pick<CareFormFieldRow, 'fieldType' | 'label'>,
  value: string | boolean | undefined,
): CarePlanReadAnswer {
  const type = field.fieldType as FormFieldType
  if (value === undefined || value === null || value === '') return { kind: 'empty' }

  if (type === 'YES_NO' || type === 'CHECKBOX') {
    if (value === true || value === 'true') return { kind: 'text', text: 'Yes' }
    if (value === false || value === 'false') return { kind: 'text', text: 'No' }
    return { kind: 'empty' }
  }
  if (typeof value !== 'string') return { kind: 'text', text: String(value) }

  if (type === 'MULTI_SELECT') {
    const items = parseMultiSelectValue(value).filter((v) => v.trim())
    return items.length ? { kind: 'list', items } : { kind: 'empty' }
  }
  if (type === 'DATE') {
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? { kind: 'text', text: formatOrganisationDate(value) } : plainOrHtml(value)
  }
  if (type === 'SIGNATURE') {
    return value.startsWith('data:image') ? { kind: 'image', src: value, alt: `${field.label} signature` } : { kind: 'empty' }
  }
  if (type === 'PHOTO' || type === 'FILE_UPLOAD') {
    const stored = parseStoredFileValue(value)
    if (!stored) return { kind: 'empty' }
    return stored.mimeType.startsWith('image/')
      ? { kind: 'image', src: stored.dataUrl, alt: stored.fileName }
      : { kind: 'file', name: stored.fileName }
  }
  return plainOrHtml(value)
}
