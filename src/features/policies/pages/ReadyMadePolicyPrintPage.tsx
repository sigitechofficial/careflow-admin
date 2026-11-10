import { Link, useParams, useSearch } from '@tanstack/react-router'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
import { useLibraryPolicy } from '@/features/policies/api/policy-library.api'
import { formatPolicyDate } from '@/features/policies/policy-format'
import { PolicyDownloadButtons } from '@/features/policies/components/PolicyDownloadButtons'
import { PRINT_ACTION_CLASS, PRINT_BACK_CLASS, PolicyPrintDocument, PrintBackLabel } from '@/features/policies/components/PolicyPrintDocument'
import { PrintLoading, PrintMissing } from './PolicyPrintPage'

const TYPE_LABELS: Record<string, string> = { POLICY: 'Policy', PROCEDURE: 'Procedure', PROTOCOL: 'Protocol', GUIDELINE: 'Guideline' }

/**
 * /policies/ready-made/$libraryId/print: a ready-made policy from the library as a printed document, with Download
 * PDF and Word. Says on the page that it is a ready-made template (or that the organisation has adopted it) and
 * lists its legislation and guidance.
 */
export default function ReadyMadePolicyPrintPage() {
  const { libraryId } = useParams({ strict: false }) as { libraryId: string }
  const search = useSearch({ strict: false }) as { print?: string }
  const query = useLibraryPolicy(libraryId)
  const p = query.data

  if (query.isLoading) return <PrintLoading />
  if (!p) return <PrintMissing backTo="/policies/ready-made" />

  const kind = TYPE_LABELS[p.documentType] ?? 'Policy'
  return (
    <PolicyPrintDocument
      kindLabel={kind}
      reference={p.reference}
      title={p.title}
      summary={p.summary}
      notice={{
        tone: 'info',
        content: p.adoptedPolicyId ? (
          <>
            <strong>Ready-made {kind.toLowerCase()}</strong> from the CareFlow policy library (revision {p.revision}). Your organisation has adopted it: its own
            copy in Policies is the version staff follow.
          </>
        ) : (
          <>
            <strong>Ready-made {kind.toLowerCase()}</strong> from the CareFlow policy library (revision {p.revision}). It is not your organisation’s policy
            until it is adopted, reviewed and published.
          </>
        ),
      }}
      details={[
        ['Reference', p.reference],
        ['Revision', String(p.revision)],
        ['Category', p.category.name],
        ['Type', kind],
        ['Researched', formatPolicyDate(p.researchedOn)],
        ['Review', `Every ${p.reviewFrequencyMonths} months`],
      ]}
      body={<RichTextHtml className="policy-print-content" data-testid="policy-print-content" html={p.contentHtml} />}
      appendix={
        p.regulatoryBasis.length ? (
          <section className="policy-print-appendix">
            <h2>Legislation and guidance</h2>
            <ul>
              {p.regulatoryBasis.map(r => (
                <li key={`${r.source}-${r.url}`}>
                  {r.source}
                  {r.url ? <span className="policy-print-url"> {r.url}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
      footer={`${p.reference} · ${p.title} · ready-made revision ${p.revision}`}
      documentTitle={`${p.reference} ${p.title} (ready-made)`}
      back={
        <Link to="/policies/ready-made" className={PRINT_BACK_CLASS}>
          <PrintBackLabel>Back to ready-made policies</PrintBackLabel>
        </Link>
      }
      actions={<PolicyDownloadButtons target={{ kind: 'library', libraryId: p.id }} className={PRINT_ACTION_CLASS} />}
      autoPrint={search.print !== '0'}
    />
  )
}
