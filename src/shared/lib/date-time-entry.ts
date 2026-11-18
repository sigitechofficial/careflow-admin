import type { DateDisplayFormat } from './display-format.util'

/**
 * Typing and showing dates and times in the organisation's format (Settings › General › Time zone & formats),
 * while the value stays in the standard form every form already uses: "YYYY-MM-DD", "HH:mm",
 * "YYYY-MM-DDTHH:mm" and "YYYY-MM". The browser's own date and time boxes follow the browser's language
 * instead (a US Chrome shows 06/15/2026 and 2:30 PM), so CareFlow uses these everywhere.
 */
export type DateTimeEntryKind = 'date' | 'time' | 'datetime-local' | 'month'

const pad = (n: number, len = 2) => String(n).padStart(len, '0')

/** What the person sees and types, e.g. "dd/mm/yyyy". */
export function entryPattern(kind: DateTimeEntryKind, format: DateDisplayFormat): string {
  const date = format === 'MM_DD_YYYY' ? 'mm/dd/yyyy' : format === 'YYYY_MM_DD' ? 'yyyy-mm-dd' : 'dd/mm/yyyy'
  const month = format === 'YYYY_MM_DD' ? 'yyyy-mm' : 'mm/yyyy'
  if (kind === 'date') return date
  if (kind === 'time') return 'hh:mm'
  if (kind === 'month') return month
  return `${date} hh:mm`
}

function validDate(y: number, m: number, d: number): boolean {
  if (!(y >= 1000 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** "2026-06-15" → "15/06/2026" (or the organisation's order). Anything else is returned unchanged. */
export function showDate(iso: string, format: DateDisplayFormat): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso
  const [, y, mo, d] = m
  return format === 'MM_DD_YYYY' ? `${mo}/${d}/${y}` : format === 'YYYY_MM_DD' ? `${y}-${mo}-${d}` : `${d}/${mo}/${y}`
}

/** "15/06/2026" (in the organisation's order; any separator, 2-digit years as 20xx) → "2026-06-15", or null. */
export function readDate(text: string, format: DateDisplayFormat): string | null {
  const t = text.trim()
  if (!t) return null
  // The standard form is always understood too (pasted values, "2026-06-15").
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)
  if (iso) {
    const [y, mo, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    return validDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null
  }
  let parts = t.split(/[^0-9]+/).filter(Boolean)
  // Digits only: 15062026 / 20260615.
  if (parts.length === 1 && /^\d{8}$/.test(parts[0]!)) {
    const s = parts[0]!
    parts = format === 'YYYY_MM_DD' ? [s.slice(0, 4), s.slice(4, 6), s.slice(6)] : [s.slice(0, 2), s.slice(2, 4), s.slice(4)]
  }
  if (parts.length !== 3) return null
  const [a, b, c] = parts.map(Number) as [number, number, number]
  let y: number, mo: number, d: number
  if (format === 'YYYY_MM_DD') [y, mo, d] = [a, b, c]
  else if (format === 'MM_DD_YYYY') [mo, d, y] = [a, b, c]
  else [d, mo, y] = [a, b, c]
  if (y < 100) y += 2000
  return validDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null
}

/** "14:30" stays "14:30"; "9.5" / "0930" / "9:30" → "09:30"; an hour alone ("14") → "14:00". Always 24-hour. */
export function readTime(text: string): string | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  const pm = /p\.?m?\.?$/.test(t)
  const am = /a\.?m?\.?$/.test(t)
  const core = t.replace(/\s*[ap]\.?m?\.?$/, '')
  let h: number, m: number
  const digits = core.replace(/\D/g, '')
  if (/^\d{1,2}$/.test(core)) [h, m] = [Number(core), 0]
  else if (/^\d{3,4}$/.test(core)) [h, m] = [Number(digits.slice(0, -2)), Number(digits.slice(-2))]
  else {
    const p = core.split(/[^0-9]+/).filter(Boolean)
    if (p.length !== 2) return null
    ;[h, m] = [Number(p[0]), Number(p[1])]
  }
  if (pm && h < 12) h += 12
  if (am && h === 12) h = 0
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? `${pad(h)}:${pad(m)}` : null
}

/** "2026-06" → "06/2026" (or "2026-06" for the year-first format). */
export function showMonth(iso: string, format: DateDisplayFormat): string {
  const m = /^(\d{4})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso
  return format === 'YYYY_MM_DD' ? `${m[1]}-${m[2]}` : `${m[2]}/${m[1]}`
}

export function readMonth(text: string, format: DateDisplayFormat): string | null {
  const p = text.trim().split(/[^0-9]+/).filter(Boolean).map(Number)
  if (p.length !== 2) return null
  let [y, mo] = format === 'YYYY_MM_DD' ? [p[0]!, p[1]!] : [p[1]!, p[0]!]
  if (y < 100) y += 2000
  return y >= 1000 && y <= 9999 && mo >= 1 && mo <= 12 ? `${y}-${pad(mo)}` : null
}

/** A stored value → what the box shows. */
export function showEntry(kind: DateTimeEntryKind, iso: string, format: DateDisplayFormat): string {
  if (!iso) return ''
  if (kind === 'date') return showDate(iso.slice(0, 10), format)
  if (kind === 'time') return iso.slice(0, 5)
  if (kind === 'month') return showMonth(iso.slice(0, 7), format)
  const [d, t] = iso.split('T')
  return t ? `${showDate(d ?? '', format)} ${t.slice(0, 5)}` : showDate(d ?? '', format)
}

/** What was typed → the stored value, or null when it isn't a real date/time yet. */
export function readEntry(kind: DateTimeEntryKind, text: string, format: DateDisplayFormat): string | null {
  if (kind === 'date') return readDate(text, format)
  if (kind === 'time') return readTime(text)
  if (kind === 'month') return readMonth(text, format)
  const t = text.trim()
  const m = /^(.*?)[\sT,]+(\d{1,2}[:.]?\d{0,2}\s*(?:[ap]\.?m?\.?)?)$/i.exec(t)
  const date = readDate(m ? m[1]! : t, format)
  if (!date) return null
  const time = m ? readTime(m[2]!) : '00:00'
  return time ? `${date}T${time}` : null
}

/** Inside min/max (all in the same standard form, so plain string comparison works). */
export function withinRange(value: string, min?: string | number, max?: string | number): boolean {
  if (min != null && min !== '' && value < String(min)) return false
  if (max != null && max !== '' && value > String(max)) return false
  return true
}
