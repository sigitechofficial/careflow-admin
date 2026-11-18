import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * Dates and times on screen follow Settings › General › Time zone & formats.
 * Every screen formats through the organisation formatters in
 * `@/shared/lib/organisation-display-format.store` (formatOrganisationDay / Date / DateTime / Time)
 * or the `useOrganisationDisplayFormat()` hook, and every date or time box is DateInput / TimeInput /
 * DateTimeInput / MonthInput. This guard fails when a screen:
 *  - prints a stored date as-is (2026-11-04),
 *  - uses the browser's own date or time format (toLocaleDateString(), toLocaleTimeString, hour12),
 *  - uses the browser's own date/time box (<input type="date">).
 * A line that genuinely needs a raw value (a file name, an API value) ends with `// date-format-ok: <why>`.
 */

const SRC = join(__dirname, '..')

/** The formatters themselves, and code that never renders. */
const SKIP_FILES = new Set(
  [
    'shared/lib/display-format.util.ts',
    'shared/lib/organisation-display-format.store.ts',
    'shared/lib/operational-day.util.ts',
    'shared/lib/date-time-entry.ts',
    'shared/ui/date-time-input.tsx',
    'features/settings/organisation-timezone.ts',
    'features/search/catalog.generated.ts',
  ].map(p => p.split('/').join(sep)),
)

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'test') continue
      out.push(...sourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec|stories)\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

/** A field that holds a stored day or time-stamp, by naming convention. */
const DATE_FIELD = String.raw`(?!format|fmt)[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*(?:Date|[a-z]At|[a-z]On|Until|[dD]ateFrom|[dD]ateTo|effectiveFrom|effectiveTo|validFrom|validTo)`

const RULES: Array<{ name: string; test: (line: string, file: string) => boolean }> = [
  { name: "browser date format (toLocaleDateString() with the browser's language)", test: line => /\.toLocaleDateString\(\s*(\)|undefined|\[\])/.test(line) },
  { name: 'browser time format (toLocaleTimeString)', test: line => /\.toLocaleTimeString\(/.test(line) && !/'en-GB'/.test(line) },
  { name: '12-hour clock (hour12: true)', test: line => /hour12:\s*true/.test(line) },
  {
    name: 'browser date-and-time format (date.toLocaleString())',
    test: line => /(Date\([^)]*\)|[dD]ate|At|On)\)?\.toLocaleString\((\)|undefined)/.test(line),
  },
  {
    name: 'date-fns US pattern (PPP, MMM d, h:mm a)',
    test: line => /\bformat\([^)]*,\s*["'](PPP|PP|MMM d(, yyyy)?|h:mm a|hh:mm a|MM\/dd\/yyyy)["']/.test(line),
  },
  {
    name: 'browser date/time box (<input type="date|time|datetime-local|month">)',
    test: (line, file) =>
      file.endsWith('.tsx') && /<(input|Input)\b[^>]*\btype=["'{]+\s*["']?(date|time|datetime-local|month)\b/.test(line),
  },
  {
    name: 'stored date printed as-is in the page',
    test: (line, file) => {
      if (!file.endsWith('.tsx')) return false
      // Declarations, imports, destructuring and type lines are not shown text.
      if (/^\s*(import|export|const|let|var|function|type|interface|return\s*\{)\b/.test(line)) return false
      if (/\}\s*(:|=)(?!=)/.test(line) || /\(\s*\{/.test(line)) return false
      // {row.startDate}  {row.endDate ?? '—'}  ${a.effectiveTo}  {x.createdAt.slice(0, 10)}
      const raw = new RegExp(String.raw`(?:^\s*|>\s*|[\s(]|\$)\{\s*(${DATE_FIELD})(?:\.slice\(0,\s*10\))?\s*(?:\}|\?\?)`)
      const m = raw.exec(line)
      if (!m) return false
      // Building a value, not showing one: new Date(`${day}T12:00`), keys, validation messages, flags.
      if (/new Date\(`|\bkey=|T\$\{|\}T[\d$]|[eE]rrors?\??\./.test(line)) return false
      if (/^(labelOn|outOfDate|isOn|turnedOn)$/.test(m[1].split('.').pop() ?? '')) return false
      // Attribute values and keys are not shown text.
      const before = line.slice(0, m.index + 1)
      return !/(=\s*$|\w=\{?$)/.test(before) && !/\b(value|key|min|max|defaultValue|id|htmlFor|to|from|href|data-[\w-]+)=\{\s*$/.test(before)
    },
  },
]

describe('dates and times on screen follow the organisation settings', () => {
  it('no screen prints raw dates or uses the browser date/time format', () => {
    const problems: string[] = []
    for (const file of sourceFiles(SRC)) {
      const rel = relative(SRC, file)
      if (SKIP_FILES.has(rel)) continue
      const lines = readFileSync(file, 'utf8').split(/\r?\n/)
      lines.forEach((line, i) => {
        if (/date-format-ok:/.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line)) return
        for (const rule of RULES) if (rule.test(line, file)) problems.push(`${rel.split(sep).join('/')}:${i + 1}  ${rule.name}\n    ${line.trim().slice(0, 140)}`)
      })
    }
    expect(problems, `\n${problems.length} place(s) to fix:\n${problems.join('\n')}`).toEqual([])
  })

  it('full dates and times are never built with the browser formatter (options can span lines)', () => {
    const problems: string[] = []
    // toLocaleDateString('en-GB', { day, month, year }) / toLocaleString(…, { hour }) / new Intl.DateTimeFormat(…, { … })
    const call = /(\.toLocale(?:Date|Time)?String\(\s*(?:['"][^'"]*['"]|undefined|\[\])\s*,\s*\{([^}]*)\}|new Intl\.DateTimeFormat\(\s*[^,)]*,\s*\{([^}]*)\})/g
    for (const file of sourceFiles(SRC)) {
      const rel = relative(SRC, file)
      if (SKIP_FILES.has(rel)) continue
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(call)) {
        const opts = m[2] ?? m[3] ?? ''
        const fullDate = /\bday\s*:/.test(opts) && /\byear\s*:/.test(opts)
        const time = /\bhour\s*:/.test(opts)
        const lineNo = text.slice(0, m.index).split('\n').length
        const lineText = text.split(/\r?\n/)[lineNo - 1] ?? ''
        if ((fullDate || time) && !/date-format-ok:/.test(lineText)) {
          problems.push(`${rel.split(sep).join('/')}:${lineNo}  ${fullDate ? 'full date' : 'time'} in the browser's style`)
        }
      }
    }
    expect(problems, `\n${problems.length} place(s) to fix:\n${problems.join('\n')}`).toEqual([])
  })
})
