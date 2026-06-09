import type { BodyMapRecordRow } from '@/features/service-users/body-map/types'

export type BodyMapRecordTypeLookupEntry = {
  code: string
  label: string
  markerColorHex?: string | null
  subTypes: BodyMapRecordSubTypeLookupEntry[]
}

export type BodyMapRecordSubTypeLookupEntry = {
  name: string
  code?: string
  markerColorHex?: string | null
}

export type BodyMapMarkerColorCatalog = {
  recordTypes: BodyMapRecordTypeLookupEntry[]
  colorByRecordTypeCode: Record<string, string>
  colorBySubTypeName: Record<string, string>
}

/** Default pin colours — used when lookup data has no markerColorHex. */
export const DEFAULT_BODY_MAP_MARKER_COLORS: Record<string, string> = {
  INJURY: '#dc2626',
  WOUND: '#7c3aed',
  PRESSURE: '#ea580c',
  MEDICATION: '#2563eb',
  PAIN: '#db2777',
  SKIN: '#ca8a04',
  DEVICE: '#475569',
  SAFEGUARDING: '#7f1d1d',
}

export const DEFAULT_BODY_MAP_SUBTYPE_COLORS: Record<string, string> = {
  'patch site': '#3b82f6',
  'injection site': '#0d9488',
  'spray site': '#0891b2',
  'cream application': '#2563eb',
}

function normalizeHex(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined
  const withHash = raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toLowerCase() : undefined
}

export function buildBodyMapMarkerColorCatalog(
  recordTypes: BodyMapRecordTypeLookupEntry[] | undefined,
): BodyMapMarkerColorCatalog {
  const colorByRecordTypeCode: Record<string, string> = { ...DEFAULT_BODY_MAP_MARKER_COLORS }
  const colorBySubTypeName: Record<string, string> = { ...DEFAULT_BODY_MAP_SUBTYPE_COLORS }

  for (const type of recordTypes ?? []) {
    const typeCode = type.code.toUpperCase()
    const typeColor = normalizeHex(type.markerColorHex)
    if (typeColor) colorByRecordTypeCode[typeCode] = typeColor

    for (const sub of type.subTypes ?? []) {
      const subColor = normalizeHex(sub.markerColorHex)
      if (subColor) {
        colorBySubTypeName[sub.name.trim().toLowerCase()] = subColor
      }
    }
  }

  return {
    recordTypes: recordTypes ?? [],
    colorByRecordTypeCode,
    colorBySubTypeName,
  }
}

export function resolveBodyMapMarkerColor(
  catalog: BodyMapMarkerColorCatalog | undefined,
  record: Pick<BodyMapRecordRow, 'recordType' | 'subType' | 'safeguardingTriggered'>,
): string {
  const fallback = '#64748b'
  if (!catalog) {
    if (record.safeguardingTriggered || record.recordType === 'SAFEGUARDING') {
      return DEFAULT_BODY_MAP_MARKER_COLORS.SAFEGUARDING ?? fallback
    }
    return DEFAULT_BODY_MAP_MARKER_COLORS[record.recordType] ?? fallback
  }

  if (record.safeguardingTriggered || record.recordType === 'SAFEGUARDING') {
    return (
      catalog.colorByRecordTypeCode.SAFEGUARDING ??
      DEFAULT_BODY_MAP_MARKER_COLORS.SAFEGUARDING ??
      fallback
    )
  }

  const subKey = record.subType?.trim().toLowerCase()
  if (subKey && catalog.colorBySubTypeName[subKey]) {
    return catalog.colorBySubTypeName[subKey]
  }

  const typeKey = record.recordType.toUpperCase()
  return catalog.colorByRecordTypeCode[typeKey] ?? DEFAULT_BODY_MAP_MARKER_COLORS[typeKey] ?? fallback
}

export function bodyMapLegendItems(
  catalog: BodyMapMarkerColorCatalog | undefined,
): { label: string; color: string }[] {
  const fallback = '#64748b'
  if (!catalog?.recordTypes.length) {
    return [
      { label: 'Injury / mark', color: DEFAULT_BODY_MAP_MARKER_COLORS.INJURY ?? fallback },
      { label: 'Wound', color: DEFAULT_BODY_MAP_MARKER_COLORS.WOUND ?? fallback },
      { label: 'Pressure area', color: DEFAULT_BODY_MAP_MARKER_COLORS.PRESSURE ?? fallback },
      { label: 'Medication site', color: DEFAULT_BODY_MAP_MARKER_COLORS.MEDICATION ?? fallback },
      { label: 'Patch site', color: DEFAULT_BODY_MAP_SUBTYPE_COLORS['patch site'] ?? fallback },
      { label: 'Injection site', color: DEFAULT_BODY_MAP_SUBTYPE_COLORS['injection site'] ?? fallback },
      { label: 'Spray site', color: DEFAULT_BODY_MAP_SUBTYPE_COLORS['spray site'] ?? fallback },
      { label: 'Pain', color: DEFAULT_BODY_MAP_MARKER_COLORS.PAIN ?? fallback },
      { label: 'Skin condition', color: DEFAULT_BODY_MAP_MARKER_COLORS.SKIN ?? fallback },
      { label: 'Safeguarding', color: DEFAULT_BODY_MAP_MARKER_COLORS.SAFEGUARDING ?? fallback },
    ]
  }

  const items: { label: string; color: string }[] = []
  for (const type of catalog.recordTypes) {
    const typeColor =
      catalog.colorByRecordTypeCode[type.code.toUpperCase()] ??
      DEFAULT_BODY_MAP_MARKER_COLORS[type.code.toUpperCase()] ??
      '#64748b'
    items.push({ label: type.label, color: typeColor })

    if (type.code.toUpperCase() === 'MEDICATION') {
      for (const sub of type.subTypes) {
        const subColor =
          catalog.colorBySubTypeName[sub.name.trim().toLowerCase()] ?? typeColor
        if (subColor !== typeColor) {
          items.push({ label: sub.name, color: subColor })
        }
      }
    }
  }
  return items
}
