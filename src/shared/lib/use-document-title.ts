import * as React from 'react'

/**
 * Browser tab titles (WCAG 2.4.2: the first thing a screen reader says on arriving, and the heading
 * on a printed page). Layouts set a title for the route; a page can set a more exact one on top.
 *
 * Titles are kept in a stack in mount order, and the most recent one wins. Removing one (when a page
 * unmounts) shows the one below, whatever order React runs the effects in, so a page's title never
 * outlives the page.
 */
const stack: Array<{ id: number; title: string }> = []
let fallback: string | null = null
let nextId = 0

function apply() {
  if (typeof document === 'undefined') return
  const top = stack[stack.length - 1]
  if (top) document.title = top.title
  else if (fallback !== null) document.title = fallback
}

export function useDocumentTitle(title: string | null | undefined) {
  const id = React.useRef<number | null>(null)
  if (id.current === null) id.current = ++nextId

  React.useEffect(() => {
    if (!title) return
    if (fallback === null && typeof document !== 'undefined') fallback = document.title
    // A layout renders before its pages, so it has the lower id: sorting keeps it below them even
    // when its title changes (and its effect re-runs) after a page has set one.
    const entry = { id: id.current!, title }
    stack.push(entry)
    stack.sort((a, b) => a.id - b.id)
    apply()
    return () => {
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
      apply()
    }
  }, [title])
}
