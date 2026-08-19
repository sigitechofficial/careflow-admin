/** Shared parsing of Nest / Prisma error bodies so UI never renders `[object Object]`. */

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  middleName: 'Middle name',
  preferredName: 'Preferred name',
  nhsNumber: 'NHS number',
  nationalInsuranceNumber: 'NI number',
  email: 'Email',
  phone: 'Phone',
  mobile: 'Mobile',
  dateOfBirth: 'Date of birth',
  serviceStartDate: 'Service start',
  serviceEndDate: 'Service end',
  serviceUserNumber: 'Service user number',
  statusId: 'Status',
  titleId: 'Title',
  genderId: 'Gender',
  maritalStatusId: 'Marital status',
  careTypeId: 'Care type',
  fundingTypeId: 'Funding type',
  riskLevelId: 'Risk level',
  locationId: 'Zone & branch',
  keyWorkerId: 'Key worker',
  namedNurseId: 'Named nurse',
  notes: 'Notes',
  addressLine1: 'Address line 1',
  addressLine2: 'Address line 2',
  town: 'Town',
  county: 'County',
  country: 'Country',
  postcode: 'Postcode',
  latitude: 'Latitude',
  longitude: 'Longitude',
  keySafeNumber: 'Key safe number',
  accessInstructions: 'Access instructions',
  username: 'Username',
}

const KNOWN_FIELDS = Object.keys(FIELD_LABELS)

export function humanFieldLabel(field: string): string {
  const key = extractFieldKey(field)
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  const spaced = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : field
}

export function extractFieldKey(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (FIELD_LABELS[value]) return value
  const constraint = value.match(/_([A-Za-z][A-Za-z0-9]*)_(?:key|fkey)$/)
  if (constraint?.[1]) return constraint[1]
  if (value.includes('.')) return value.split('.').pop() ?? value
  return value
}

function isModelName(value: string): boolean {
  return /^[A-Z][A-Za-z]+$/.test(value) && !value.endsWith('Id')
}

function fieldsFromTarget(target: unknown): string[] {
  const items = Array.isArray(target) ? target : target != null ? [target] : []
  const fields: string[] = []
  for (const item of items) {
    const key = extractFieldKey(String(item))
    if (!key || isModelName(key)) continue
    fields.push(key)
  }
  return fields
}

function constraintTexts(constraints: unknown): string[] {
  if (Array.isArray(constraints)) {
    return constraints.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
  }
  if (constraints && typeof constraints === 'object') {
    return Object.values(constraints as Record<string, unknown>).filter(
      (c): c is string => typeof c === 'string' && c.trim() !== '',
    )
  }
  return []
}

function friendlyMessage(field: string, raw: string): string {
  const label = humanFieldLabel(field)
  const text = raw.replace(new RegExp(`^${field}\\s*[:\\-]?\\s*`, 'i'), '').trim() || raw
  if (/should not be empty|must not be empty|is required/i.test(text)) {
    return `${label} is required`
  }
  if (/must be a string$/i.test(text) && !/shorter|longer|uuid|email|date/i.test(text)) {
    return `${label} is required`
  }
  if (/already exists|unique constraint|already in use/i.test(text)) {
    return `${label} is already in use`
  }
  if (/not a valid selection|invalid reference/i.test(text)) {
    return `${label} is not a valid selection`
  }
  if (text.toLowerCase().startsWith(label.toLowerCase())) return text
  return `${label}: ${text}`
}

function fieldFromClassValidatorMessage(raw: string): string | null {
  const trimmed = raw.trim()
  for (const field of KNOWN_FIELDS) {
    if (trimmed === field || trimmed.startsWith(`${field} `) || trimmed.startsWith(`${field}:`)) {
      return field
    }
  }
  return null
}

/** Turn one Nest / Prisma `errors[]` item into a readable sentence. */
export function stringifyApiErrorItem(item: unknown): string {
  if (typeof item === 'string') {
    const field = fieldFromClassValidatorMessage(item)
    return field ? friendlyMessage(field, item) : item
  }
  if (item == null) return ''
  if (typeof item !== 'object') return String(item)

  const row = item as Record<string, unknown>
  const property =
    (typeof row.property === 'string' && row.property) ||
    (typeof row.field === 'string' && row.field) ||
    ''

  if (Array.isArray(row.children) && row.children.length > 0) {
    const nested = row.children.map(stringifyApiErrorItem).filter(Boolean)
    if (nested.length) return nested.join('; ')
  }

  if (typeof row.message === 'string' && row.message.trim()) {
    return property ? friendlyMessage(property, row.message) : row.message.trim()
  }

  const constraints = constraintTexts(row.constraints)
  if (constraints.length) {
    const joined = constraints.join(', ')
    return property ? friendlyMessage(property, joined) : joined
  }

  if (row.target != null) {
    const fields = fieldsFromTarget(row.target)
    if (fields.length) {
      return `${fields.map(humanFieldLabel).join(', ')} is already in use`
    }
    return 'A unique value is already in use'
  }

  if (property) {
    if (row.code === 'P2003') return `${humanFieldLabel(property)} is not a valid selection`
    if (row.code === 'P2002') return `${humanFieldLabel(property)} is already in use`
    return `${humanFieldLabel(property)} is invalid`
  }

  if (typeof row.code === 'string') {
    if (row.code === 'P2002') return 'A unique value is already in use'
    if (row.code === 'P2003') return 'A related record was not found (invalid reference)'
    return `Database error (${row.code})`
  }

  try {
    const json = JSON.stringify(row)
    if (json && json !== '{}' && json.length < 240 && !json.includes('[object Object]')) return json
  } catch {
    /* ignore */
  }
  return ''
}

function stringifyMessageValue(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value.map(stringifyApiErrorItem).filter(Boolean).join('; ')
  }
  if (value && typeof value === 'object') return stringifyApiErrorItem(value)
  return ''
}

/** Turn Nest validation `errors[]` into a readable single-line message. */
export function formatApiErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body.trim()) return body.trim()
  if (typeof body !== 'object' || body === null) return fallback || 'Request failed'

  const record = body as { message?: unknown; errors?: unknown }
  const errors = record.errors
  if (Array.isArray(errors) && errors.length > 0) {
    const detail = errors.map(stringifyApiErrorItem).filter(Boolean).join('; ')
    if (detail && !detail.includes('[object Object]')) return detail
  }

  const fromMessage = stringifyMessageValue(record.message)
  if (fromMessage && fromMessage !== 'Validation failed' && !fromMessage.includes('[object Object]')) {
    return fromMessage
  }

  const safeFallback = fallback.trim() && !fallback.includes('[object Object]') ? fallback.trim() : ''
  return safeFallback || 'Request failed'
}

/** Map API error body items onto form field keys. */
export function parseApiFieldErrors(body: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof body !== 'object' || body === null) return out

  const record = body as { message?: unknown; errors?: unknown }
  const items: unknown[] = []
  if (Array.isArray(record.errors)) items.push(...record.errors)
  if (Array.isArray(record.message)) items.push(...record.message)
  if (typeof record.message === 'string' && record.message.trim()) items.push(record.message)

  for (const item of items) {
    if (typeof item === 'string') {
      const field = fieldFromClassValidatorMessage(item)
      if (!field) continue
      const msg = friendlyMessage(field, item)
      out[field] = out[field] ? `${out[field]}; ${msg}` : msg
      continue
    }
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const keys = new Set<string>()
    if (typeof row.property === 'string') keys.add(extractFieldKey(row.property))
    if (typeof row.field === 'string') keys.add(extractFieldKey(row.field))
    for (const key of fieldsFromTarget(row.target)) keys.add(key)

    const msg = stringifyApiErrorItem(item)
    if (!msg) continue
    for (const key of keys) {
      if (!key || isModelName(key)) continue
      out[key] = out[key] ? `${out[key]}; ${msg}` : msg
    }
  }

  return out
}
