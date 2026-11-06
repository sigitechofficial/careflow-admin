/**
 * A CSV cell: quoted when it holds a comma, quote or line break. Text a spreadsheet would run as a
 * formula (starting with = + - @, a tab or a carriage return) gets a leading apostrophe and quotes,
 * so it shows as typed and never runs (CSV / formula injection: names and answers are typed by
 * people outside the organisation). Numbers, including negative ones, stay numbers.
 */
export function csvEscape(value: string | number | null | undefined): string {
  if (typeof value === 'number') return String(value)
  const text = value == null ? '' : String(value)
  const formula = /^[=+\-@\t\r]/.test(text) && !/^[+-]?\d+(\.\d+)?$/.test(text)
  const raw = formula ? `'${text}` : text
  return formula || /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

/** Rows → CSV text, with a BOM so Excel reads UTF-8 (en dashes, accents) correctly. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return `﻿${rows.map(r => r.map(csvEscape).join(',')).join('\r\n')}\r\n`
}

/** Save CSV text as a file in the browser. */
export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
