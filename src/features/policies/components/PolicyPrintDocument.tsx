import * as React from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { useCompanyStore } from '@/store/company.store'
import { PRINT_CSS } from './policy-print-css'

/** A CSS string literal (for @page margin boxes). */
function cssString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
}

export type PolicyPrintDocumentProps = {
  /** e.g. "Policy", "Procedure". */
  kindLabel: string
  reference: string
  title: string
  summary?: string | null
  /** A boxed note under the title (drafts, ready-made templates). */
  notice?: { tone: 'draft' | 'info'; content: React.ReactNode } | null
  /** Large faint word across every page (e.g. DRAFT). */
  watermark?: string | null
  details: Array<[string, string]>
  body: React.ReactNode
  /** After the text, before the end note (e.g. legal sources). */
  appendix?: React.ReactNode
  /** Left of the page footer on every page; the page number is on the right. */
  footer: string
  /** Browser tab title (also the suggested file name when saved as PDF). */
  documentTitle: string
  /** The way back to the screen (a link styled with PRINT_BACK_CLASS). */
  back: React.ReactNode
  /** Extra toolbar buttons (Download PDF / Word). */
  actions?: React.ReactNode
  /** Open the print box once the page is ready (?print=0 turns it off). */
  autoPrint: boolean
}

export const PRINT_BACK_CLASS = 'policy-print-btn policy-print-btn-ghost'
export const PRINT_ACTION_CLASS = 'policy-print-btn policy-print-btn-ghost'

export function PrintBackLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ArrowLeft className="h-4 w-4" aria-hidden /> {children}
    </>
  )
}

/**
 * A policy as a printed document, without the app around it: A4, the organisation's name and logo, the details
 * table, the text, and on every page the footer and page number. Black on white whatever the app theme. Shared
 * by your own policies and ready-made ones, so both print the same way.
 */
export function PolicyPrintDocument(p: PolicyPrintDocumentProps) {
  const branding = useCompanyStore(s => s.branding)
  const loadBranding = useCompanyStore(s => s.loadBranding)
  const user = useAuthStore(s => s.user)
  const printedRef = React.useRef(false)
  const [printedAt] = React.useState(() => new Date())

  React.useEffect(() => {
    if (!branding) void loadBranding()
  }, [branding, loadBranding])

  React.useEffect(() => {
    const before = window.document.title
    window.document.title = p.documentTitle
    return () => {
      window.document.title = before
    }
  }, [p.documentTitle])

  // Open the print box once the text, fonts and logo are in.
  React.useEffect(() => {
    if (!p.autoPrint || printedRef.current) return
    printedRef.current = true
    let cancelled = false
    const images = Array.from(window.document.querySelectorAll<HTMLImageElement>('.policy-print img'))
    void Promise.all([
      window.document.fonts?.ready,
      ...images.map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              img.addEventListener('load', () => resolve(), { once: true })
              img.addEventListener('error', () => resolve(), { once: true })
            }),
      ),
    ]).then(() => {
      if (!cancelled) window.setTimeout(() => window.print(), 150)
    })
    return () => {
      cancelled = true
    }
  }, [p.autoPrint])

  const org = branding?.displayName || branding?.companyName || ''
  const logo = branding?.displayLogoUrl || branding?.companyLogoUrl || null
  const printedBy = user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || ''
  const printedOn = printedAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="policy-print-screen">
      <style>{PRINT_CSS}</style>
      <style>{`@page { @bottom-left { content: ${cssString(p.footer)}; } @bottom-right { content: "Page " counter(page) " of " counter(pages); } }`}</style>

      <div className="policy-print-toolbar" role="toolbar" aria-label="Print and download">
        {p.back}
        <span className="policy-print-tip">For a clean printed copy, turn off “Headers and footers” in the print box.</span>
        <span className="policy-print-actions">
          {p.actions}
          <button type="button" className="policy-print-btn" onClick={() => window.print()} data-testid="policy-print-now">
            <Printer className="h-4 w-4" aria-hidden /> Print
          </button>
        </span>
      </div>

      <article className="policy-print" data-testid="policy-print">
        {p.watermark ? (
          <div className="policy-print-watermark" aria-hidden>
            {p.watermark}
          </div>
        ) : null}

        <header className="policy-print-masthead">
          <div className="policy-print-org">
            {logo ? <img src={logo} alt="" className="policy-print-logo" /> : null}
            {org ? <span className="policy-print-orgname">{org}</span> : null}
          </div>
          <div className="policy-print-kind">
            <span>{p.kindLabel}</span>
            <span className="policy-print-ref">{p.reference}</span>
          </div>
        </header>

        <h1 className="policy-print-title">{p.title}</h1>
        {p.summary ? <p className="policy-print-summary">{p.summary}</p> : null}

        {p.notice ? (
          <p className={p.notice.tone === 'draft' ? 'policy-print-draft-note' : 'policy-print-info-note'} role="note">
            {p.notice.content}
          </p>
        ) : null}

        <table className="policy-print-details">
          <tbody>
            {Array.from({ length: Math.ceil(p.details.length / 2) }, (_, i) => p.details.slice(i * 2, i * 2 + 2)).map(row => (
              <tr key={row[0]![0]}>
                {row.map(([label, value]) => (
                  <React.Fragment key={label}>
                    <th scope="row">{label}</th>
                    <td>{value}</td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="policy-print-rule" />
        {p.body}
        {p.appendix}

        <footer className="policy-print-end">
          <p className="policy-print-endmark">End of document</p>
          <p>
            Printed {printedOn}
            {printedBy ? ` by ${printedBy}` : ''}. Printed copies are not controlled: check CareFlow for the current version before relying on
            this copy.
          </p>
        </footer>
      </article>
    </div>
  )
}
