import DOMPurify from 'dompurify'

/**
 * Rich-text HTML from the API (policy text, care plan text, factsheets) is cut down to an allow-list
 * before it is put into the page. The API already sanitises it when it is saved
 * (careflow-api src/common/utils/rich-text-html.util.ts, same allow-list); this is the second layer,
 * and covers anything stored before that existed.
 *
 * Kept: headings h1-h4, paragraphs, strong/b, em/i, u, s, code/pre, quotes, lists, links, tables,
 * line breaks and rules. Links keep only http, https and mailto hrefs, open in a new tab at most and
 * always get rel="noopener noreferrer". Only text alignment survives in a style attribute.
 */
export const RICH_TEXT_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'a',
  'table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'colspan', 'rowspan', 'style']

const ALIGNABLE = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'TH', 'TD'])
const LINK_PROTOCOL = /^(?:https?:|mailto:)/i
const TEXT_ALIGN = /(?:^|;)\s*text-align\s*:\s*(left|right|center|justify)\s*(?:;|$)/i
const SPAN = /^[1-9]\d{0,2}$/

let purifier: ReturnType<typeof DOMPurify> | null = null

/** One DOMPurify instance with CareFlow's hooks, so the hooks never leak into other DOMPurify use. */
function getPurifier() {
  if (purifier) return purifier
  const instance = DOMPurify(window)

  instance.addHook('uponSanitizeAttribute', (node, data) => {
    const name = data.attrName
    if (name === 'style') {
      const align = ALIGNABLE.has(node.nodeName) ? TEXT_ALIGN.exec(data.attrValue)?.[1] : undefined
      if (align) data.attrValue = `text-align:${align.toLowerCase()}`
      else data.keepAttr = false
    } else if (name === 'colspan' || name === 'rowspan') {
      if (!(node.nodeName === 'TH' || node.nodeName === 'TD') || !SPAN.test(data.attrValue.trim())) data.keepAttr = false
    } else if (name === 'href' || name === 'target' || name === 'rel') {
      if (node.nodeName !== 'A') data.keepAttr = false
    }
  })

  instance.addHook('afterSanitizeAttributes', node => {
    if (node.nodeName !== 'A') return
    const href = node.getAttribute('href')?.trim() ?? ''
    if (href && LINK_PROTOCOL.test(href)) {
      node.setAttribute('rel', 'noopener noreferrer')
    } else {
      node.removeAttribute('href')
      node.removeAttribute('rel')
    }
    const target = node.getAttribute('target')
    if (target !== null) {
      if (target.trim().toLowerCase() === '_blank') node.setAttribute('target', '_blank')
      else node.removeAttribute('target')
    }
  })

  purifier = instance
  return instance
}

/** Allow-listed copy of rich-text HTML, safe to render with dangerouslySetInnerHTML. */
export function sanitizeRichTextHtml(html: string | null | undefined): string {
  if (!html) return ''
  return getPurifier().sanitize(html, {
    ALLOWED_TAGS: RICH_TEXT_ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: LINK_PROTOCOL,
    // DOMPurify checks every other attribute's value against ALLOWED_URI_REGEXP too; these are
    // checked by the hooks above instead.
    ADD_URI_SAFE_ATTR: ['colspan', 'rowspan', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    KEEP_CONTENT: true,
  })
}
