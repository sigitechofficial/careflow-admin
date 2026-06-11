export type CodeNameLookupRow = { id: string; name: string; code: string }

/** Resolve a stored profile reference value to a lookup code (supports legacy name text). */
export function resolveStoredLookupCode(
  stored: string | null | undefined,
  rows: ReadonlyArray<CodeNameLookupRow>,
): string {
  const value = stored?.trim()
  if (!value) return ''
  const upper = value.toUpperCase()
  const byCode = rows.find((r) => r.code.toUpperCase() === upper)
  if (byCode) return byCode.code
  const byName = rows.find((r) => r.name === value)
  if (byName) return byName.code
  return value
}

/** Build select rows for profile forms; keeps unknown legacy values selectable. */
export function profileLookupSelectRows(
  rows: ReadonlyArray<CodeNameLookupRow>,
  currentValue: string,
): Array<{ id: string; name: string }> {
  const code = resolveStoredLookupCode(currentValue, rows)
  const mapped = rows.map((r) => ({ id: r.code, name: r.name }))
  if (!code) return mapped
  if (mapped.some((r) => r.id === code)) return mapped
  const legacy = currentValue.trim()
  if (!legacy) return mapped
  return [{ id: legacy, name: `${legacy} (saved value — pick a standard option to replace)` }, ...mapped]
}
