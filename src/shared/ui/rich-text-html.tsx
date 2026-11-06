import * as React from 'react'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text'

export type RichTextHtmlProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> & {
  /** Rich-text HTML from the API or a user. It is sanitised before it reaches the page. */
  html: string | null | undefined
}

/**
 * Renders saved rich text (policies, care plan text, factsheets). Use this instead of
 * dangerouslySetInnerHTML for any HTML that came from a user or the API.
 */
export function RichTextHtml({ html, ...props }: RichTextHtmlProps) {
  const safe = React.useMemo(() => sanitizeRichTextHtml(html), [html])
  return <div {...props} dangerouslySetInnerHTML={{ __html: safe }} />
}
