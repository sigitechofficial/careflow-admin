/**
 * Dev-only automatic UI trace: clicks, fields, navigation, modals, API calls.
 * Export JSONL and share with debugging (e.g. paste into Cursor).
 */

export type UiTraceCategory = 'CLICK' | 'INPUT' | 'NAV' | 'MODAL' | 'API' | 'FLOW' | 'SYSTEM' | 'CONFIRM'

export type UiTraceEntry = {
  ts: number
  category: UiTraceCategory
  message: string
  path: string
  data?: Record<string, unknown>
}

const MAX_ENTRIES = 3000
const buffer: UiTraceEntry[] = []
let started = false
const trackedDialogs = new Map<Element, string>()

function currentPath(): string {
  return typeof window !== 'undefined' ? window.location.pathname : ''
}

function push(entry: UiTraceEntry): void {
  buffer.push(entry)
  if (buffer.length > MAX_ENTRIES) buffer.shift()
}

export function traceUi(
  category: UiTraceCategory,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!import.meta.env.DEV) return
  push({
    ts: Date.now(),
    category,
    message,
    path: currentPath(),
    data,
  })
}

export function getUiTraceBuffer(): UiTraceEntry[] {
  return [...buffer]
}

export function clearUiTrace(): void {
  buffer.length = 0
  traceUi('SYSTEM', 'trace_cleared')
}

export function downloadUiTrace(): void {
  const lines = buffer.map((e) => JSON.stringify(e)).join('\n')
  const blob = new Blob([lines], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const a = document.createElement('a')
  a.href = url
  a.download = `care-admin-ui-trace-${stamp}.jsonl`
  a.click()
  URL.revokeObjectURL(url)
}

function describeClickTarget(el: HTMLElement): Record<string, unknown> {
  const interactive = el.closest(
    'button, a[href], [role="button"], [role="menuitem"], [role="tab"], [role="switch"], [role="radio"], label',
  ) as HTMLElement | null
  const target = interactive ?? el
  const text = (target.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
  const dialog = target.closest('[role="dialog"]')
  const dialogTitle = dialog?.querySelector('[data-slot="dialog-title"], h2')?.textContent?.trim()
  return {
    text: text || null,
    tag: target.tagName,
    role: target.getAttribute('role'),
    type: target.getAttribute('type'),
    id: target.id || null,
    name: target.getAttribute('name'),
    ariaLabel: target.getAttribute('aria-label'),
    dataTestId: target.getAttribute('data-testid'),
    inDialog: Boolean(dialog),
    dialogTitle: dialogTitle ?? null,
  }
}

function describeField(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): Record<string, unknown> {
  const dialog = el.closest('[role="dialog"]')
  const dialogTitle = dialog?.querySelector('[data-slot="dialog-title"], h2')?.textContent?.trim()
  let value: unknown = el.value
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') value = el.checked
    if (el.type === 'password') value = '[redacted]'
  }
  const str = typeof value === 'string' ? value.slice(0, 300) : value
  return {
    tag: el.tagName,
    inputType: el instanceof HTMLInputElement ? el.type : null,
    id: el.id || null,
    name: el.name || null,
    ariaLabel: el.getAttribute('aria-label'),
    value: str,
    inDialog: Boolean(dialog),
    dialogTitle: dialogTitle ?? null,
  }
}

function dialogTitle(el: Element): string {
  return el.querySelector('[data-slot="dialog-title"], h2')?.textContent?.trim() ?? 'Dialog'
}

function scanDialogs(): void {
  document.querySelectorAll('[role="dialog"]').forEach((d) => {
    if (!(d instanceof HTMLElement) || d.offsetParent === null) return
    if (!trackedDialogs.has(d)) {
      const title = dialogTitle(d)
      trackedDialogs.set(d, title)
      traceUi('MODAL', 'open', { title })
    }
  })
  for (const [el, title] of trackedDialogs) {
    if (!document.contains(el) || (el instanceof HTMLElement && el.offsetParent === null)) {
      trackedDialogs.delete(el)
      traceUi('MODAL', 'close', { title })
    }
  }
}

function hookNativeConfirm(): void {
  const native = window.confirm.bind(window)
  window.confirm = (message?: string): boolean => {
    const text = String(message ?? '').slice(0, 300)
    traceUi('CONFIRM', 'show', { message: text })
    const ok = native(message)
    traceUi('CONFIRM', ok ? 'accepted' : 'dismissed', { message: text })
    return ok
  }
}

function hookFetch(): void {
  const native = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    const start = Date.now()
    try {
      const res = await native(input, init)
      const apiPath = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
      traceUi('API', res.ok ? 'response' : 'error_response', {
        method,
        path: apiPath,
        status: res.status,
        ms: Date.now() - start,
      })
      return res
    } catch (error) {
      const apiPath = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
      traceUi('API', 'network_error', { method, path: apiPath, error: String(error) })
      throw error
    }
  }
}

export function startDevUiTrace(): void {
  if (!import.meta.env.DEV || started) return
  started = true

  traceUi('SYSTEM', 'trace_started')

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    traceUi('CLICK', 'click', describeClickTarget(target))
  }

  const onChange = (event: Event) => {
    const el = event.target
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) {
      return
    }
    traceUi('INPUT', 'change', describeField(el))
  }

  const onFocusIn = (event: FocusEvent) => {
    const el = event.target
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) {
      return
    }
    traceUi('INPUT', 'focus', describeField(el))
  }

  document.addEventListener('click', onClick, true)
  document.addEventListener('change', onChange, true)
  document.addEventListener('focusin', onFocusIn, true)

  const dialogObserver = new MutationObserver(() => scanDialogs())
  dialogObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] })

  hookNativeConfirm()
  hookFetch()
}
