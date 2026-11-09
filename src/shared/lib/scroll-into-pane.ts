/**
 * Scroll `el` to the top of the panel that scrolls it (the app's <main>), leaving the window where it is.
 * Element.scrollIntoView also scrolls the window, which moves the whole app shell off screen. With `tolerance`, it
 * moves only when the element is further than that from where it should be (for a second look after loading).
 */
export function scrollIntoPane(el: HTMLElement, offset = 16, tolerance = 0) {
  let pane: HTMLElement | null = el.parentElement
  while (pane) {
    const overflow = getComputedStyle(pane).overflowY
    if ((overflow === 'auto' || overflow === 'scroll') && pane.scrollHeight > pane.clientHeight) break
    pane = pane.parentElement
  }
  if (!pane) {
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - offset, behavior: 'smooth' })
    return
  }
  const by = el.getBoundingClientRect().top - pane.getBoundingClientRect().top - offset
  // Already there (within `tolerance` px), or the pane cannot scroll further: leave it.
  if (Math.abs(by) <= tolerance) return
  pane.scrollBy({ top: by, behavior: 'smooth' })
}
