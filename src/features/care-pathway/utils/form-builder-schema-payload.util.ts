import type {
  CareFormFieldRow,
  CareFormSectionRow,
} from '@/features/care-pathway/types/care-pathway.types'
import {
  parseConditionalLogic,
  type FieldConditionalLogic,
} from '@/features/care-pathway/utils/form-builder-conditional-logic.util'
import {
  fieldTypeUsesOptions,
  parseFieldOptions,
  serializeFieldOptions,
} from '@/features/care-pathway/utils/form-builder-field-options.util'

/**
 * Builds the `PATCH /form-builder/:id/schema` body.
 *
 * Saved care plan answers are keyed `${sectionId}:${fieldId}`, so the API updates rows in
 * place by id. Rows loaded from the server keep their id; rows added in the builder carry
 * a draft id (`tmp-…`) that is sent as `clientId` for fields, so a "show when" rule can
 * point at a field created in the same save. Draft ids never reach the database.
 */

const DRAFT_ROW_PREFIX = 'tmp-'
let draftRowSeq = 0

/** Unique id for a section/field that has not been saved yet. Never contains ':'. */
export function draftRowId(): string {
  draftRowSeq += 1
  return `${DRAFT_ROW_PREFIX}${Date.now().toString(36)}-${draftRowSeq.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function isDraftRowId(id: string): boolean {
  return id.startsWith(DRAFT_ROW_PREFIX)
}

export type SaveSchemaFieldPayload = {
  id?: string
  clientId?: string
  label: string
  fieldKey?: string
  fieldType: CareFormFieldRow['fieldType']
  placeholder?: string
  helpText?: string
  required: boolean
  sortOrder: number
  optionsJson?: { options: string[] }
  /** null clears stored rules (omitting would keep them). */
  conditionalLogicJson: FieldConditionalLogic | null
  validationJson: Record<string, unknown> | null
}

export type SaveSchemaSectionPayload = {
  id?: string
  title: string
  description?: string
  sortOrder: number
  fields: SaveSchemaFieldPayload[]
}

function hasContent(field: CareFormFieldRow): boolean {
  return field.fieldType === 'SECTION_TEXT'
    ? Boolean(field.label.trim() || field.helpText?.trim())
    : field.label.trim().length > 0
}

/**
 * Drops "show when" rules whose controlling field is no longer in `sections` (removed, or
 * about to be skipped because it is blank). Returns the same array when nothing changed.
 */
export function pruneDanglingConditions(sections: CareFormSectionRow[]): CareFormSectionRow[] {
  const liveFieldIds = new Set(sections.flatMap((s) => s.fields.map((f) => f.id)))
  let changed = false
  const next = sections.map((section) => {
    let sectionChanged = false
    const fields = section.fields.map((field) => {
      const logic = parseConditionalLogic(field.conditionalLogicJson)
      if (!logic?.showWhen?.length) return field
      const kept = logic.showWhen.filter((rule) => liveFieldIds.has(rule.fieldId))
      if (kept.length === logic.showWhen.length) return field
      sectionChanged = true
      return { ...field, conditionalLogicJson: kept.length ? { showWhen: kept } : null }
    })
    if (!sectionChanged) return section
    changed = true
    return { ...section, fields }
  })
  return changed ? next : sections
}

/** Sections the builder will actually save: titled sections, labelled fields, re-indexed. */
export function sectionsToSave(sections: CareFormSectionRow[]): CareFormSectionRow[] {
  return pruneDanglingConditions(
    sections
      .map((section) => ({
        ...section,
        title: section.title.trim(),
        fields: section.fields
          .filter(hasContent)
          .map((field) => ({ ...field, label: field.label.trim() })),
      }))
      .filter((section) => section.title.length > 0)
      .map((section, si) => ({
        ...section,
        sortOrder: si,
        fields: section.fields.map((field, fi) => ({ ...field, sortOrder: fi })),
      })),
  )
}

export function buildSaveSchemaPayload(sections: CareFormSectionRow[]): SaveSchemaSectionPayload[] {
  return sectionsToSave(sections).map((section) => ({
    ...(isDraftRowId(section.id) ? {} : { id: section.id }),
    title: section.title,
    description: section.description?.trim() || undefined,
    sortOrder: section.sortOrder,
    fields: section.fields.map((field) => {
      const options = parseFieldOptions(field.optionsJson)
      return {
        ...(isDraftRowId(field.id) ? { clientId: field.id } : { id: field.id }),
        label: field.label,
        fieldKey: field.fieldKey?.trim().toLowerCase() || undefined,
        fieldType: field.fieldType,
        placeholder: field.placeholder?.trim() || undefined,
        helpText: field.helpText?.trim() || undefined,
        required: field.fieldType === 'SECTION_TEXT' ? false : field.required,
        sortOrder: field.sortOrder,
        optionsJson: fieldTypeUsesOptions(field.fieldType)
          ? (serializeFieldOptions(options) ?? undefined)
          : undefined,
        conditionalLogicJson: parseConditionalLogic(field.conditionalLogicJson),
        validationJson: field.validationJson ?? null,
      }
    }),
  }))
}
