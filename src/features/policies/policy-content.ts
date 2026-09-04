export type PolicyTextDoc = {
  type: 'text'
  version: 1
  text: string
}

export type PolicyTiptapDoc = {
  type: 'tiptap'
  version: 1
  doc: Record<string, unknown>
}

export function isPolicyTextDoc(value: unknown): value is PolicyTextDoc {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return row.type === 'text' && typeof row.text === 'string'
}

export function isPolicyTiptapDoc(value: unknown): value is PolicyTiptapDoc {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return row.type === 'tiptap' && row.doc != null && typeof row.doc === 'object'
}

export function isBlankPolicyHtml(html: string | null | undefined): boolean {
  if (!html) return true
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim() === ''
}

export function extractPolicyText(contentJson: unknown, contentHtml?: string | null): string {
  if (typeof contentHtml === 'string' && contentHtml.trim() && !isBlankPolicyHtml(contentHtml)) {
    return contentHtml
  }
  if (isPolicyTextDoc(contentJson)) return contentJson.text
  if (contentJson && typeof contentJson === 'object' && 'text' in contentJson) {
    const text = (contentJson as { text?: unknown }).text
    if (typeof text === 'string') return text
  }
  return typeof contentHtml === 'string' ? contentHtml : ''
}

export function buildPolicyContent(
  html: string,
  json?: Record<string, unknown> | null,
): { contentJson: PolicyTiptapDoc | PolicyTextDoc; contentHtml: string } {
  const trimmed = html.replace(/\s+$/g, '')
  if (json && Object.keys(json).length) {
    return {
      contentJson: { type: 'tiptap', version: 1, doc: json },
      contentHtml: trimmed,
    }
  }
  return {
    contentJson: { type: 'text', version: 1, text: trimmed },
    contentHtml: trimmed,
  }
}

export function htmlForPolicyDisplay(contentJson: unknown, contentHtml?: string | null): string {
  const raw = (typeof contentHtml === 'string' && contentHtml.trim() ? contentHtml : extractPolicyText(contentJson, contentHtml)).trim()
  if (!raw) return ''
  if (!/<\/?[a-z][\s\S]*>/i.test(raw)) {
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />')
  }
  return raw
}

export function editorHtmlFromVersion(contentJson: unknown, contentHtml?: string | null): string {
  if (typeof contentHtml === 'string' && contentHtml.trim()) return contentHtml
  if (isPolicyTextDoc(contentJson)) return contentJson.text
  return ''
}

export type PolicySourceBadge = 'Written' | 'PDF' | 'DOC' | 'DOCX'

export function policySourceBadge(version?: {
  hasDocument?: boolean
  mimeType?: string | null
  fileName?: string | null
  contentKind?: 'EDITOR' | 'UPLOAD'
} | null): PolicySourceBadge {
  const name = version?.fileName?.toLowerCase() ?? ''
  const mime = version?.mimeType?.toLowerCase() ?? ''
  const uploaded = Boolean(version?.hasDocument || version?.contentKind === 'UPLOAD' || name || mime)
  if (!uploaded) return 'Written'
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'PDF'
  if (mime.includes('wordprocessingml') || name.endsWith('.docx')) return 'DOCX'
  if (mime.includes('msword') || name.endsWith('.doc')) return 'DOC'
  return 'PDF'
}
