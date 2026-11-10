/**
 * Ready-made surveys keep their sections as a heading on each question. Consecutive questions
 * with the same heading form a section; the heading is shown once, before the first of them.
 */
export function withSectionHeadings<T extends { sectionTitle?: string | null }>(
  items: readonly T[],
): Array<{ item: T; index: number; heading: string | null }> {
  let previous: string | null = null
  return items.map((item, index) => {
    const title = item.sectionTitle?.trim() || null
    const heading = title && title !== previous ? title : null
    previous = title
    return { item, index, heading }
  })
}
