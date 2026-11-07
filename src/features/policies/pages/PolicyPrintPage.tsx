import { Link, useParams, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
import { usePolicy, usePolicyVersion, usePolicyVersions } from '@/features/policies/hooks/usePolicies'
import { extractPolicyText, htmlForPolicyDisplay, isBlankPolicyHtml } from '@/features/policies/policy-content'
import { formatPolicyDate } from '@/features/policies/policy-format'
import { DOCUMENT_TYPE_LABEL } from '@/features/policies/policy-labels'
import { PolicySourceDocument } from '@/features/policies/components/PolicySourceDocument'
import { PolicyDownloadButtons } from '@/features/policies/components/PolicyDownloadButtons'
import { PRINT_ACTION_CLASS, PRINT_BACK_CLASS, PolicyPrintDocument, PrintBackLabel } from '@/features/policies/components/PolicyPrintDocument'
import { POLICY_IN_PROGRESS_STATUSES, type PolicyVersion } from '@/features/policies/types/policy.types'

/** Status words on paper. */
const STATUS_WORDS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved, not yet published',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

/** The version printed: the published one, else the current one, else the version being worked on. */
export function versionToPrint(versions: PolicyVersion[], current: PolicyVersion | null | undefined): PolicyVersion | null {
  return versions.find(v => v.status === 'PUBLISHED') ?? current ?? versions.find(v => POLICY_IN_PROGRESS_STATUSES.includes(v.status)) ?? null
}

/**
 * /policies/$policyId/print: one of your policies as a printed document (?version= picks a version; the published
 * one otherwise), with Download PDF and Download Word. Anything not published is marked DRAFT on every page.
 */
export default function PolicyPrintPage() {
  const { policyId } = useParams({ strict: false }) as { policyId: string }
  const search = useSearch({ strict: false }) as { version?: string; print?: string }
  const policyQuery = usePolicy(policyId)
  const versionsQuery = usePolicyVersions(policyId)
  const askedQuery = usePolicyVersion(policyId, search.version)

  const doc = policyQuery.data
  const version = search.version ? (askedQuery.data ?? null) : versionToPrint(versionsQuery.data ?? [], doc?.currentVersion)
  const loading = policyQuery.isLoading || versionsQuery.isLoading || Boolean(search.version && askedQuery.isLoading)

  if (loading) return <PrintLoading />
  if (!doc || !version) return <PrintMissing />

  const isDraft = version.status !== 'PUBLISHED'
  const uploaded = version.hasDocument || version.contentKind === 'UPLOAD'
  const empty = !uploaded && isBlankPolicyHtml(version.contentHtml) && !extractPolicyText(version.contentJson, version.contentHtml)
  const typeLabel = DOCUMENT_TYPE_LABEL[doc.documentType] ?? 'Policy'

  return (
    <PolicyPrintDocument
      kindLabel={typeLabel}
      reference={doc.reference}
      title={doc.title}
      summary={doc.description}
      watermark={isDraft ? 'DRAFT' : null}
      notice={
        isDraft
          ? {
              tone: 'draft',
              content: (
                <>
                  <strong>Draft.</strong> This version ({version.versionLabel}) is not published. Do not use it as the current policy.
                </>
              ),
            }
          : null
      }
      details={[
        ['Reference', doc.reference],
        ['Version', version.versionLabel],
        ['Status', STATUS_WORDS[version.status] ?? version.status],
        ['Effective date', formatPolicyDate(version.effectiveDate)],
        ['Review date', formatPolicyDate(version.reviewDate)],
        ['Published', version.publishedAt ? formatPolicyDate(version.publishedAt) : '—'],
        ['Category', doc.primaryCategory?.name ?? '—'],
        ['Type', typeLabel],
      ]}
      body={
        uploaded ? (
          <div className="policy-print-uploaded">
            <p>
              The text of this policy is in its uploaded document{version.fileName ? ` (${version.fileName})` : ''}. Open it to print the policy itself;
              this page can be printed as its cover sheet.
            </p>
            <div className="policy-print-hide">
              <PolicySourceDocument policyId={doc.id} version={version} />
            </div>
          </div>
        ) : empty ? (
          <p className="policy-print-empty">This version has no text yet.</p>
        ) : (
          <RichTextHtml className="policy-print-content" data-testid="policy-print-content" html={htmlForPolicyDisplay(version.contentJson, version.contentHtml)} />
        )
      }
      footer={`${doc.reference} · ${doc.title} · ${version.versionLabel}${isDraft ? ' · DRAFT' : ''}`}
      documentTitle={`${doc.reference} ${doc.title} ${version.versionLabel}`}
      back={
        <Link to="/policies/$policyId" params={{ policyId: doc.id }} className={PRINT_BACK_CLASS}>
          <PrintBackLabel>Back to policy</PrintBackLabel>
        </Link>
      }
      actions={uploaded ? null : <PolicyDownloadButtons target={{ kind: 'policy', policyId: doc.id, versionId: version.id }} className={PRINT_ACTION_CLASS} />}
      autoPrint={search.print !== '0'}
    />
  )
}

export function PrintLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 bg-neutral-100 text-sm text-neutral-600">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparing the policy for printing…
    </div>
  )
}

export function PrintMissing({ backTo = '/policies' }: { backTo?: '/policies' | '/policies/ready-made' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-100 text-sm text-neutral-700">
      <p>This policy could not be loaded for printing.</p>
      <Link to={backTo} className="text-teal-700 underline underline-offset-2">
        Back to policies
      </Link>
    </div>
  )
}
