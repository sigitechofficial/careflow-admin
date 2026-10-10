import { Link } from '@tanstack/react-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/data-table'
import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import { PolicyAckStatusBadge } from '@/features/policies/components/PolicyAcknowledgementPanels'
import { useMyPolicyAcknowledgements } from '@/features/policies/hooks/usePolicies'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import { DOCUMENT_TYPE_LABEL } from '@/features/policies/policy-labels'
import { formatPolicyDate } from '@/features/policies/policy-format'

/** The signed-in user's read-and-sign list: policies assigned to them, outstanding first. */
export default function MyPoliciesToReadPage() {
  const q = useMyPolicyAcknowledgements()
  const d = q.data
  return (
    <PolicySectionLayout
      title="My policies to read"
      description={
        d ? `${d.outstanding} of ${d.total} policies still need your signature. Open a policy, read it, then confirm.` : 'Policies assigned to you to read and sign.'
      }
      testId="my-policies-to-read-page"
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : !d?.items.length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No policies are assigned to you to read and sign.
                </TableCell>
              </TableRow>
            ) : (
              d.items.map(item => (
                <TableRow key={item.versionId}>
                  <TableCell>
                    <Link to={POLICY_PATHS.detail} params={{ policyId: item.documentId }} className="font-medium hover:text-primary hover:underline">
                      {item.title}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{item.reference}{item.category ? ` · ${item.category}` : ''}</span>
                  </TableCell>
                  <TableCell>{DOCUMENT_TYPE_LABEL[item.documentType]}</TableCell>
                  <TableCell>{item.versionLabel}</TableCell>
                  <TableCell>{formatPolicyDate(item.publishedAt)}</TableCell>
                  <TableCell>
                    <PolicyAckStatusBadge status={item.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PolicySectionLayout>
  )
}
