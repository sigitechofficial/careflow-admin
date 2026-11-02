import * as React from 'react'

const normalise = (s: string | null | undefined) =>
  (s ?? '').replace(/[*✱]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

const CONTROL = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, button[role=combobox]'
const HIGHLIGHT = ['ring-2', 'ring-amber-400', 'ring-offset-4', 'ring-offset-background', 'rounded-md']

/**
 * The field labelled `label` in the page: its control (focused) and the box that holds the label
 * and control (highlighted). A section heading that starts with `label` is found too; then the
 * section is highlighted and the first button in its heading row (e.g. "+ Add") is focused.
 */
function findField(root: HTMLElement, label: string): { box: HTMLElement; control: HTMLElement | null } | null {
  const want = normalise(label)
  const texts = [...root.querySelectorAll<HTMLElement>('label, span, p, div, dt, legend, h2, h3, h4')].filter(
    el => el.childElementCount <= 2 && normalise(el.textContent) === want,
  )
  for (const el of texts) {
    // From the label itself (a <label> wraps its own control), then up to the field's box.
    let box: HTMLElement | null = el
    for (let i = 0; i < 5 && box && box !== root; i++, box = box.parentElement) {
      const control = box.querySelector<HTMLElement>(CONTROL)
      if (control) return { box, control }
    }
  }
  const heading = [...root.querySelectorAll<HTMLElement>('h2, h3, h4')].find(h => normalise(h.textContent).startsWith(want))
  if (!heading) return null
  return {
    box: heading.closest<HTMLElement>('section') ?? heading.parentElement ?? heading,
    control: heading.parentElement?.querySelector<HTMLElement>('button') ?? null,
  }
}

/**
 * Opens a page on one field: links pass the field's label (e.g. `?focus=Date of birth`), and once
 * the form has loaded the field is scrolled into view, focused and briefly highlighted.
 */
export function useFocusField(label: string | undefined) {
  React.useEffect(() => {
    if (!label) return
    let timer: number | undefined
    let highlighted: HTMLElement | null = null
    const started = Date.now()
    const attempt = () => {
      const root = document.querySelector<HTMLElement>('main') ?? document.body
      const found = findField(root, label)
      if (!found) {
        // The form loads after the page; keep looking for a few seconds.
        if (Date.now() - started < 6000) timer = window.setTimeout(attempt, 150)
        return
      }
      found.box.scrollIntoView({ behavior: 'smooth', block: 'center' })
      found.control?.focus({ preventScroll: true })
      highlighted = found.box
      highlighted.classList.add(...HIGHLIGHT)
      timer = window.setTimeout(() => highlighted?.classList.remove(...HIGHLIGHT), 3000)
    }
    timer = window.setTimeout(attempt, 100)
    return () => {
      window.clearTimeout(timer)
      highlighted?.classList.remove(...HIGHLIGHT)
    }
  }, [label])
}
