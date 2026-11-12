import * as React from 'react'
import { useRouterState, type useNavigate } from '@tanstack/react-router'

const PENDING_KEY = 'careflow-find-highlight'
const RECENT_KEY = 'careflow-find-recent'
const MAX_RECENT = 8

export type FindTarget = {
  id: string
  title: string
  context?: string
  href: string
  search?: Record<string, string>
  highlight?: string
}

/** Open a result; a setting's label is scrolled to and highlighted on arrival. Remembered as a recent search. */
export function openFindTarget(navigate: ReturnType<typeof useNavigate>, target: FindTarget, userId?: string | null) {
  try {
    if (target.highlight) sessionStorage.setItem(PENDING_KEY, JSON.stringify({ text: target.highlight, at: Date.now() }))
    rememberRecent(userId, target)
  } catch {
    // Storage blocked: open the page without the extras.
  }
  void navigate({ to: target.href, search: target.search && Object.keys(target.search).length ? target.search : undefined } as never)
}

// ─── Recent searches (this browser, per person) ─────────────────────────────
const recentKey = (userId?: string | null) => `${RECENT_KEY}:${userId ?? 'anon'}`

export function readRecent(userId?: string | null): FindTarget[] {
  try {
    const raw = localStorage.getItem(recentKey(userId))
    const list = raw ? (JSON.parse(raw) as FindTarget[]) : []
    return Array.isArray(list) ? list.filter(x => x && typeof x.href === 'string' && typeof x.title === 'string') : []
  } catch {
    return []
  }
}

function rememberRecent(userId: string | null | undefined, target: FindTarget) {
  const list = [target, ...readRecent(userId).filter(x => x.id !== target.id)].slice(0, MAX_RECENT)
  localStorage.setItem(recentKey(userId), JSON.stringify(list))
}

export function clearRecent(userId?: string | null) {
  try {
    localStorage.removeItem(recentKey(userId))
  } catch {
    // nothing to clear
  }
}

// ─── Jump to and highlight ──────────────────────────────────────────────────
/** The visible element whose own text is exactly this label (a setting's row), inside the page. */
function findLabelElement(text: string): HTMLElement | null {
  const want = text.replace(/\s+/g, ' ').trim().toLowerCase()
  const root = document.querySelector('main') ?? document.body
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const t = node.textContent?.replace(/\s+/g, ' ').trim().toLowerCase()
    if (t !== want) continue
    const el = node.parentElement
    if (el && el.offsetParent !== null) return el
  }
  return null
}

/**
 * After opening a setting from the search, scroll to it and highlight it for a moment. The page may still be
 * loading its data, so it keeps looking for a few seconds. Mounted once in the app layout.
 */
export function FindHighlighter() {
  const location = useRouterState({ select: s => s.location.href })
  React.useEffect(() => {
    let pending: { text: string; at: number } | null = null
    try {
      const raw = sessionStorage.getItem(PENDING_KEY)
      pending = raw ? JSON.parse(raw) : null
    } catch {
      pending = null
    }
    if (!pending || Date.now() - pending.at > 15_000) return
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      const el = findLabelElement(pending!.text)
      if (!el && tries < 40) return
      window.clearInterval(timer)
      try {
        sessionStorage.removeItem(PENDING_KEY)
      } catch {
        // ignore
      }
      if (!el) return
      // The whole row reads better than the label text alone.
      const row = (el.closest('[data-setting-row], label, li, tr') as HTMLElement | null) ?? el.parentElement ?? el
      row.scrollIntoView({ block: 'center', behavior: 'smooth' })
      row.classList.add('find-highlight')
      window.setTimeout(() => row.classList.remove('find-highlight'), 3500)
    }, 150)
    return () => window.clearInterval(timer)
  }, [location])
  return null
}
