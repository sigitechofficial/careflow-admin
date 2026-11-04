export type Rag = 'GREEN' | 'AMBER' | 'RED' | 'NONE'

export const RAG_LABEL: Record<Rag, string> = {
  GREEN: 'Green',
  AMBER: 'Amber',
  RED: 'Red',
  NONE: 'No data',
}

export const RAG_CLASS: Record<Rag, string> = {
  GREEN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  AMBER: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  RED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  NONE: 'bg-muted text-muted-foreground',
}

/** Green is 95% or more, amber 80% or more (same thresholds as the reference governance tools). */
export function ragFromPct(pct: number | null): Rag {
  if (pct === null) return 'NONE'
  if (pct >= 95) return 'GREEN'
  if (pct >= 80) return 'AMBER'
  return 'RED'
}

/** For areas without a percentage: red when anything is overdue, amber when something needs checking. */
export function ragFromCounts(bad: number, warn: number): Rag {
  if (bad > 0) return 'RED'
  if (warn > 0) return 'AMBER'
  return 'GREEN'
}

export function pctOf(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null
}

export type Issue = { tone: 'bad' | 'warn'; count: number; text: string; to: string }

/** One "Needs attention" line, or null when the count is zero. */
export function issue(
  tone: Issue['tone'],
  count: number | null | undefined,
  one: string,
  many: string,
  to: string,
): Issue | null {
  if (!count) return null
  return { tone, count, text: `${count} ${count === 1 ? one : many}`, to }
}
