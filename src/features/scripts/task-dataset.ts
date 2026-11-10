/**
 * Everyday tasks a visit can auto-add in Scripts → Visit Creation, by round. Only names that exist in
 * the task list (Settings → Tasks planner) are used; clinical tasks (catheter, seizure records, …) are
 * never auto-added — choose those by hand. Demo / test set-up data; add or change names here.
 */
export const ROUND_TASKS: Record<string, string[]> = {
  MORNING: [
    'Assisted wash',
    'Dress / undress',
    'Choose clothing',
    'Meal prep',
    'Assist to eat',
    'Encourage fluids',
    'Check pressure areas',
    'Apply emollient / barrier cream',
  ],
  MIDDAY: ['Meal prep', 'Assist to eat', 'Encourage fluids', 'Companionship', 'Assist to move'],
  AFTERNOON: ['Encourage fluids', 'Companionship', 'Assist to move', 'Check pressure areas', 'Emotional support'],
  EVENING: ['Meal prep', 'Assist to eat', 'Encourage fluids', 'Dress / undress', 'Companionship'],
  NIGHT: ['Bed-making', 'Dress / undress', 'Check pressure areas', 'Encourage fluids', 'Transfer (bed <-> chair)'],
}

/** Used after a round's own tasks when more are asked for. */
export const GENERAL_TASKS = ['Encourage fluids', 'Companionship', 'Emotional support']

const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Up to `count` task names for a visit, at random: the round's own first, then general ones — only
 * names in `available` (the task list), never one in `exclude` (already on the round or the visit).
 * Returns the task list's own spelling.
 */
export function pickRoundTasks(
  round: string,
  count: number,
  available: Iterable<string>,
  exclude: Iterable<string>,
  random = Math.random,
): string[] {
  const byNorm = new Map([...available].map((n) => [normName(n), n]))
  const skip = new Set([...exclude].map(normName))
  const shuffle = (list: string[]) =>
    list
      .map((v) => ({ v, k: random() }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.v)
  const pool = [...shuffle(ROUND_TASKS[round.toUpperCase()] ?? []), ...shuffle(GENERAL_TASKS)]
  const out: string[] = []
  for (const name of pool) {
    const real = byNorm.get(normName(name))
    if (!real || skip.has(normName(real)) || out.includes(real)) continue
    out.push(real)
    if (out.length >= count) break
  }
  return out
}
