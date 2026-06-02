/**
 * Canonical ordering for assessment subsection refs (e.g. 12.5 < 12.5a < 12.5b < 12.8 < 12.8a < 12.10).
 * Matches enterprise spec / paper form sequence — not "first visible question" order.
 */

type ParsedSpecRef = {
  major: number
  minor: number
  suffix: string
}

function parseSpecRef(ref: string): ParsedSpecRef | null {
  const m = /^(\d+)\.(\d+)([a-z]*)$/i.exec(ref.trim())
  if (!m) return null
  return { major: Number(m[1]), minor: Number(m[2]), suffix: (m[3] ?? '').toLowerCase() }
}

export function compareSpecRefs(a: string, b: string): number {
  if (a === b) return 0
  if (a === '_other') return 1
  if (b === '_other') return -1

  const pa = parseSpecRef(a)
  const pb = parseSpecRef(b)
  if (!pa && !pb) return a.localeCompare(b)
  if (!pa) return 1
  if (!pb) return -1

  if (pa.major !== pb.major) return pa.major - pb.major
  if (pa.minor !== pb.minor) return pa.minor - pb.minor
  if (!pa.suffix && pb.suffix) return -1
  if (pa.suffix && !pb.suffix) return 1
  return pa.suffix.localeCompare(pb.suffix)
}
