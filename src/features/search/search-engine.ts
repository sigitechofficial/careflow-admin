import { EVERYDAY_WORDS } from './everyday-words'

/** Something the box can find: a page, a tab, a setting, a how-to answer. */
export type FindEntry = {
  id: string
  kind: 'page' | 'tab' | 'setting' | 'howto'
  /** The main words (the page, tab or setting name). */
  title: string
  /** Where it is ("General Settings › App Setting"). */
  context?: string
  /** Other words that should find it (help text, everyday words). */
  keywords?: string
  href: string
  search?: Record<string, string>
  /** Text to scroll to and highlight on arrival (a setting's label). */
  highlight?: string
  /** One-line answer (how-to entries). */
  answer?: string
}

export type ScoredEntry = FindEntry & { score: number }

export const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9:]+/g, ' ')
    .trim()

const words = (s: string) => normalise(s).split(' ').filter(Boolean)

/** Words that say nothing about what is wanted ("how do I add a reviewer" → add, reviewer). */
const STOP = new Set(['a', 'an', 'the', 'to', 'of', 'for', 'in', 'on', 'and', 'or', 'my', 'i', 'do', 'does', 'how', 'can', 'where', 'is', 'are', 'what', 'with', 'we', 'our', 'me', 'it', 'be', 'set', 'up', 'find', 'see', 'show', 'page', 'screen', 'option'])

/** Edit distance up to `max` (enough for typos), with an early exit above it. */
function close(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false
  let prev = new Int32Array(b.length + 1).map((_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = new Int32Array(b.length + 1)
    cur[0] = i
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost)
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return false
    prev = cur
  }
  return prev[b.length]! <= max
}

/** How well one typed word matches a list of words: exact 3, start of a word 2, small typo 1, none 0. */
function wordScore(q: string, target: string[], typos = true): number {
  let best = 0
  for (const t of target) {
    if (t === q) return 3
    if (t.startsWith(q) && q.length >= 2) best = Math.max(best, 2)
    else if (typos && q.length >= 4 && t.length >= 4 && close(q, t, q.length >= 7 ? 2 : 1)) best = Math.max(best, 1)
  }
  return best
}

type Prepared = { entry: FindEntry; title: string[]; context: string[]; keywords: string[]; titleText: string; allText: string }

export function prepare(entries: FindEntry[]): Prepared[] {
  return entries.map(entry => {
    const title = words(entry.title)
    const context = words(entry.context ?? '')
    const keywords = words(entry.keywords ?? '')
    return { entry, title, context, keywords, titleText: normalise(entry.title), allText: ` ${[...title, ...context, ...keywords].join(' ')} ` }
  })
}

/** Known everyday phrases, longest first ("logged out", "right to work"), to read a query phrase by phrase. */
const PHRASES = [...EVERYDAY_WORDS.keys()].map(normalise).filter(p => p.includes(' ')).sort((a, b) => b.length - a.length)

/**
 * What was typed, as terms: each word, or a known phrase ("logged out"), with its everyday alternatives
 * ("ppe" → equipment, gloves...). Alternatives may be phrases; they are matched as whole phrases.
 */
export function queryTerms(query: string): string[][] {
  let rest = ` ${normalise(query)} `
  const found: string[] = []
  for (const phrase of PHRASES) {
    if (rest.includes(` ${phrase} `)) {
      found.push(phrase)
      rest = rest.replace(` ${phrase} `, ' ')
    }
  }
  const typed = rest.trim().split(' ').filter(Boolean)
  const meaningful = typed.filter(w => !STOP.has(w))
  const list = [...found, ...(meaningful.length || found.length ? meaningful : typed)]
  return list.map(term => {
    const alts = new Set<string>([term])
    const group = EVERYDAY_WORDS.get(term) ?? [...EVERYDAY_WORDS].find(([k]) => normalise(k) === term)?.[1]
    for (const g of group ?? []) alts.add(normalise(g))
    return [...alts].filter(Boolean)
  })
}

/** How well one term (a word, or a phrase) matches an entry's words. */
function termScore(a: string, p: Prepared, weight: number): number {
  if (a.includes(' ')) {
    if (!p.allText.includes(` ${a} `)) return 0
    return (` ${p.title.join(' ')} `.includes(` ${a} `) ? 9 : 4.5) * weight
  }
  // Typos only for what was typed, never for its everyday alternatives ("masks" must not find "tasks").
  const typos = weight === 1
  return Math.max(wordScore(a, p.title, typos) * 3, wordScore(a, p.context, typos) * 1.5, wordScore(a, p.keywords, typos)) * weight
}

/**
 * Every typed word must match somewhere (the name, where it is, or its other words, directly or through an
 * everyday word or a small typo). Names count most; whole-phrase and start-of-name matches rank first.
 */
export function rank(prepared: Prepared[], query: string, limit = 40): ScoredEntry[] {
  const terms = queryTerms(query)
  if (!terms.length) return []
  const phrase = normalise(query)
  const out: ScoredEntry[] = []
  for (const p of prepared) {
    let total = 0
    let ok = true
    for (const alts of terms) {
      let best = 0
      // The term as typed counts fully; an everyday alternative a little less.
      for (const [i, a] of alts.entries()) best = Math.max(best, termScore(a, p, i === 0 ? 1 : 0.8))
      if (!best) {
        ok = false
        break
      }
      total += best
    }
    if (!ok) continue
    if (p.titleText === phrase) total += 12
    else if (p.titleText.startsWith(phrase)) total += 6
    else if (phrase.length > 3 && p.titleText.includes(phrase)) total += 3
    // Pages and tabs before the many settings, when equally good.
    total += p.entry.kind === 'page' ? 1 : p.entry.kind === 'tab' ? 0.5 : p.entry.kind === 'howto' ? 0.75 : 0
    out.push({ ...p.entry, score: total })
  }
  return out.sort((a, b) => b.score - a.score || a.title.length - b.title.length).slice(0, limit)
}
