import * as React from 'react'
import { cn } from '@/shared/lib/utils'

export type PolicySectionLink = { id: string; label: string }

/** The nearest parent that scrolls (the app's content area), or null for the page itself. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return null
}

/**
 * Scrolls only the content area so the part sits just under the tabs. scrollIntoView would also
 * scroll the app's outer frame (sidebar and all) when the last part is short, leaving a gap below.
 */
function scrollToSection(id: string, nav: HTMLElement | null) {
  const target = document.getElementById(id)
  if (!target) return
  const gap = (nav?.offsetHeight ?? 0) + 12
  const box = scrollParent(target)
  if (box) {
    const top = target.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - gap
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  } else {
    window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - gap), behavior: 'smooth' })
  }
}

/**
 * Tabs under the policy title listing every part of the page (Summary, Content, Version history…).
 * Each tab jumps to its part; the page keeps every part on it, so links straight to one part
 * (#staff-acknowledgements from the weekly manager summary) still work. The tab for the part on
 * screen is underlined. Stays at the top while the page scrolls.
 */
export function PolicySectionNav({ sections, testId = 'policy-section-nav' }: { sections: PolicySectionLink[]; testId?: string }) {
  const [active, setActive] = React.useState(sections[0]?.id ?? '')
  const ids = sections.map(s => s.id).join('|')

  // Underline the part nearest the top of the screen.
  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top)
          else visible.delete(e.target.id)
        }
        const first = ids.split('|').find(id => visible.has(id))
        if (first) setActive(first)
      },
      { rootMargin: '-96px 0px -55% 0px' },
    )
    for (const id of ids.split('|')) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  return (
    <nav
      aria-label="Sections of this policy"
      data-testid={testId}
      className="sticky top-0 z-10 -mx-1 overflow-x-auto border-b border-border bg-background px-1"
    >
      <ul className="flex min-w-max gap-0">
        {sections.map(s => (
          <li key={s.id}>
            <button
              type="button"
              aria-current={active === s.id ? 'true' : undefined}
              onClick={e => {
                setActive(s.id)
                scrollToSection(s.id, e.currentTarget.closest('nav'))
              }}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active === s.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
